import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey } from "@/lib/acre-time";

const cache = new Map<string, string | null>();

/**
 * Primeiro dia (horário do Acre) em que a pessoa tem dados na plataforma: o mais antigo entre a
 * criação do prontuário e o primeiro registro de líquido. Antes dele não há o que consultar.
 */
export function usePlatformStart(patientId: string, ownerId: string): string | null {
  const key = `${patientId}:${ownerId}`;
  const [start, setStart] = useState<string | null>(cache.get(key) ?? null);
  useEffect(() => {
    if (!patientId || cache.has(key)) {
      setStart(cache.get(key) ?? null);
      return;
    }
    let active = true;
    const db = supabase as any;
    const first = (table: string, col: string) =>
      db
        .from(table)
        .select(col)
        .eq("patient_id", patientId)
        .order(col, { ascending: true })
        .limit(1)
        .then(
          (r: any) => (r?.data?.[0]?.[col] as string | undefined) ?? null,
          () => null,
        );
    void Promise.all([
      db
        .from("care_patients")
        .select("created_at")
        .eq("id", patientId)
        .limit(1)
        .then(
          (r: any) => (r?.data?.[0]?.created_at as string | undefined) ?? null,
          () => null,
        ),
      first("care_hydration", "recorded_at"),
      first("care_client_beverages", "consumed_at"),
    ]).then((dates: (string | null)[]) => {
      const days = dates
        .filter((d): d is string => !!d && Number.isFinite(Date.parse(d)))
        .map((d) => acreDateKey(d));
      const earliest = days.length ? days.sort()[0] : null;
      cache.set(key, earliest);
      if (active) setStart(earliest);
    });
    return () => {
      active = false;
    };
  }, [key, patientId]);
  return start;
}
