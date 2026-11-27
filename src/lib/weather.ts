import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Temperatura por hora em Feijó/AC (Open-Meteo, sem chave). Histórico vem da própria API, então não precisa de coluna nova. */
const LAT = -8.1647;
const LON = -70.3519;
const KEY = "nv-hourly-temps-v1";
type Cache = { at: number; days: number; temps: Record<string, number> };

/** Chave "YYYY-MM-DDTHH" no horário do Acre. */
export function hourKey(value: string | number | Date): string {
  const d = new Date(value);
  const p = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Rio_Branco",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return p.replace(" ", "T").slice(0, 13);
}

export function feel(t: number): { label: string; color: string } {
  if (t <= 20) return { label: "frio", color: "#38bdf8" };
  if (t <= 24) return { label: "fresco", color: "#2dd4bf" };
  if (t <= 29) return { label: "agradável", color: "#a3e635" };
  if (t <= 33) return { label: "quente", color: "#fb923c" };
  return { label: "muito quente", color: "#ef4444" };
}

async function load(days: number): Promise<Record<string, number>> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw) as Cache;
      if (Date.now() - c.at < 30 * 60_000 && c.days >= days) return c.temps;
    }
  } catch {
    /* sem cache */
  }
  const past = Math.min(92, Math.max(1, days));
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m&past_days=${past}&forecast_days=1&timezone=America%2FRio_Branco`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("clima indisponível");
  const j = (await res.json()) as {
    hourly?: { time: string[]; temperature_2m: (number | null)[] };
  };
  const temps: Record<string, number> = {};
  j.hourly?.time.forEach((t, i) => {
    const v = j.hourly!.temperature_2m[i];
    if (v !== null && v !== undefined) temps[t.slice(0, 13)] = Math.round(v * 10) / 10;
  });
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ at: Date.now(), days: past, temps } satisfies Cache),
    );
  } catch {
    /* ignora */
  }
  return temps;
}

/** Guarda no banco as últimas horas de temperatura (no máximo a cada 6 h); ignora erros se a tabela ainda não existe. */
async function archive(patientId: string, ownerId: string, temps: Record<string, number>) {
  const flag = `nv-weather-archived-${patientId}`;
  try {
    if (Date.now() - Number(localStorage.getItem(flag) ?? 0) < 6 * 3_600_000) return;
    const cut = hourKey(Date.now() - 72 * 3_600_000);
    const now = hourKey(Date.now());
    const rows = Object.entries(temps)
      .filter(([h]) => h >= cut && h <= now)
      .map(([hour, temp_c]) => ({ patient_id: patientId, owner_id: ownerId, hour, temp_c }));
    if (!rows.length) return;
    const { error } = await (supabase as any)
      .from("care_weather_hours")
      .upsert(rows, { onConflict: "patient_id,hour" });
    if (!error) localStorage.setItem(flag, String(Date.now()));
  } catch {
    /* clima guardado é opcional */
  }
}

export function useHourlyTemps(days = 8, who?: { patientId: string; ownerId: string }) {
  const [temps, setTemps] = useState<Record<string, number>>({});
  useEffect(() => {
    let alive = true;
    load(days)
      .then((t) => {
        if (!alive) return;
        setTemps(t);
        if (who) void archive(who.patientId, who.ownerId, t);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [days, who?.patientId, who?.ownerId]);
  return {
    temps,
    at: (iso: string | number) => temps[hourKey(iso)] ?? null,
    now: temps[hourKey(Date.now())] ?? null,
  };
}
