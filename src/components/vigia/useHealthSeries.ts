/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetch-all";
import { rangeDays, type RangeId } from "@/lib/health-ranges";
import { useIntakeRecords } from "./useIntakeRecords";

export type Pt = { at: string; v: number };
export type UrineRow = { at: string; ml: number | null; volume: string };
export type SymptomRow = { at: string; severity: number };

/** Tudo o que alimenta o painel integrado: líquidos, micção, cafeína, lactose, sintomas e sono. */
export function useHealthSeries(patientId: string, ownerId: string, range: RangeId) {
  const days = rangeDays(range);
  const intake = useIntakeRecords(patientId, ownerId, days);
  const [liquids, setLiquids] = useState<Pt[]>([]);
  const [urine, setUrine] = useState<UrineRow[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomRow[]>([]);
  const [sleep, setSleep] = useState<{ at: string; hours: number; quality: number }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    const db = supabase as any;
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const sinceDay = since.slice(0, 10);
    const q = (t: string, cols: string, col: string) =>
      fetchAll((a, b) =>
        db
          .from(t)
          .select(cols)
          .eq("patient_id", patientId)
          .eq("owner_id", ownerId)
          .gte(col, col === "sleep_date" ? sinceDay : since)
          .order(col)
          .range(a, b),
      );
    void Promise.all([
      q("care_hydration", "amount_ml,recorded_at", "recorded_at"),
      q("care_client_beverages", "amount_ml,consumed_at", "consumed_at"),
      q("care_urination_logs", "at,ml,volume", "at"),
      q("care_lactose_logs", "at,severity", "at"),
      q("care_sleep_logs", "sleep_date,bed_at,wake_at,quality", "sleep_date"),
    ]).then(([w, b, u, s, sl]: any[]) => {
      if (!active) return;
      setLiquids([
        ...(w.data ?? []).map((x: any) => ({ at: x.recorded_at, v: Number(x.amount_ml) || 0 })),
        ...(b.data ?? []).map((x: any) => ({ at: x.consumed_at, v: Number(x.amount_ml) || 0 })),
      ]);
      setUrine(u.error ? readLocal(`nv-care_urination_logs-${patientId}`) : (u.data ?? []));
      setSymptoms(s.error ? readLocal(`nv-care_lactose_logs-${patientId}`) : (s.data ?? []));
      setSleep(
        (sl.data ?? [])
          .map((x: any) => ({
            at: x.wake_at,
            hours: (Date.parse(x.wake_at) - Date.parse(x.bed_at)) / 3_600_000,
            quality: Number(x.quality) || 0,
          }))
          .filter((x: any) => x.hours > 0 && x.hours <= 16),
      );
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [patientId, ownerId, days]);

  return {
    liquids,
    urine,
    symptoms,
    sleep,
    caffeine: intake.caffeine,
    lactose: intake.lactose,
    loaded: loaded && intake.loaded,
  };
}

function readLocal(key: string): any[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}
