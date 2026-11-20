import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeartPulse, Bluetooth, Square, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bluetoothSupport, HeartRateLink, heartZones, zoneOf } from "@/lib/heart-rate";
import { EcgTrace } from "./EcgTrace";

type Sess = { started_at: string; avg_bpm: number; min_bpm: number; max_bpm: number };
const COLOR = "#f43f5e";

/**
 * Coluna "Coração" do painel do dia.
 * - Sem medições: traçado de eletrocardiograma ilustrativo (ritmo de repouso), claramente identificado como demonstração.
 * - Com medições: última medição, faixa dos últimos 7 dias e traçado no ritmo médio.
 * - Sensor conectado (Bluetooth): batimentos e traçado em tempo real, com a zona de esforço.
 */
export function HeartCell({
  patientId,
  ageYears,
  onOpen,
}: {
  patientId: string;
  ageYears?: number | null;
  onOpen: () => void;
}) {
  const [sessions, setSessions] = useState<Sess[] | null>(null);
  const [live, setLive] = useState<{ bpm: number; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const link = useRef<HeartRateLink | null>(null);
  const support = useMemo(() => bluetoothSupport(), []);
  const { zones } = useMemo(() => heartZones(ageYears), [ageYears]);

  const load = useCallback(async () => {
    const from = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await (supabase as any)
      .from("care_heart_rate_sessions")
      .select("started_at,avg_bpm,min_bpm,max_bpm")
      .eq("patient_id", patientId)
      .gte("started_at", from)
      .order("started_at", { ascending: false })
      .limit(50);
    setSessions(data ?? []);
  }, [patientId]);
  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(id);
  }, [load]);
  useEffect(() => () => void link.current?.disconnect(), []);

  async function start() {
    setMsg("");
    if (support !== "ok") {
      onOpen();
      return;
    }
    setBusy(true);
    const l = new HeartRateLink(
      (s) => setLive({ bpm: s.bpm, name: l.name }),
      (st) => {
        if (st === "desconectado") setLive(null);
      },
    );
    link.current = l;
    try {
      await l.connect();
    } catch {
      setMsg("Não conectou. Ative a transmissão no relógio.");
      link.current = null;
    }
    setBusy(false);
  }
  async function stop() {
    await link.current?.disconnect();
    link.current = null;
    setLive(null);
  }

  const has = !!sessions?.length;
  const last = sessions?.[0];
  const range = useMemo(() => {
    if (!sessions?.length) return null;
    return {
      min: Math.min(...sessions.map((s) => s.min_bpm)),
      max: Math.max(...sessions.map((s) => s.max_bpm)),
      avg: Math.round(sessions.reduce((a, s) => a + s.avg_bpm, 0) / sessions.length),
    };
  }, [sessions]);
  const bpm = live?.bpm ?? last?.avg_bpm ?? 68;
  const zone = zoneOf(bpm, zones);
  const ink = live ? zone.color : has ? COLOR : "#64748b";

  return (
    <div className="group relative flex min-w-0 flex-col gap-2 p-3.5 text-left">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white"
        aria-label="Coração: abrir detalhes"
      >
        <span className="grid size-6 place-items-center text-white" style={{ background: COLOR }}>
          <HeartPulse size={13} />
        </span>
        Coração
        {live ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-300">
            <i className="nv-live size-1.5 rounded-full bg-rose-400" /> ao vivo
          </span>
        ) : (
          <span className="ml-auto text-[11px] font-medium text-slate-500">
            {has ? "última medição" : "demonstração"}
          </span>
        )}
      </button>
      <div className="flex items-baseline justify-between gap-2">
        {live || has ? (
          <span className="font-display text-xl font-extrabold leading-none tabular-nums">
            {bpm}
            <span className="ml-1 text-[11px] font-semibold text-slate-400">bpm</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400">Sem medições nos últimos 7 dias</span>
        )}
        {live ? (
          <span className="text-[11px] font-semibold" style={{ color: zone.color }}>
            {zone.label}
          </span>
        ) : range ? (
          <span className="text-[11px] text-slate-400 tabular-nums">
            7 dias: {range.min}–{range.max}
          </span>
        ) : null}
      </div>
      <div
        className="relative -mx-1 min-h-10 flex-1 overflow-hidden"
        style={{ opacity: live || has ? 1 : 0.55 }}
      >
        <EcgTrace bpm={bpm} color={ink} running className="absolute inset-0 h-full w-full" />
      </div>
      {live ? (
        <button
          type="button"
          onClick={stop}
          className="inline-flex h-7 w-fit items-center gap-1 border border-white/20 px-2.5 text-[11px] font-bold text-white transition hover:bg-white/10"
        >
          <Square size={11} /> Parar
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="inline-flex h-7 w-fit items-center gap-1 px-2.5 text-[11px] font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          style={{ background: COLOR }}
        >
          {support === "ok" ? <Bluetooth size={12} /> : <Activity size={12} />}
          {busy ? "Conectando…" : support === "ok" ? "Monitorar ao vivo" : "Abrir monitor"}
        </button>
      )}
      {msg && <p className="text-[11px] text-amber-300">{msg}</p>}
    </div>
  );
}
