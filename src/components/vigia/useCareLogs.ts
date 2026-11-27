import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Registros por paciente em uma tabela do Supabase, com cópia local se a tabela ainda não existir. */
export function useCareLogs<T extends { id: string; at: string }>(
  table: string,
  columns: string,
  patientId: string,
  ownerId: string,
  days = 30,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [remote, setRemote] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const localKey = `nv-${table}-${patientId}`;

  useEffect(() => {
    let active = true;
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    void (supabase as any)
      .from(table)
      .select(columns)
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .gte("at", since)
      .order("at", { ascending: false })
      .limit(1000)
      .then((r: any) => {
        if (!active) return;
        if (r.error) {
          setRemote(false);
          try {
            setItems(JSON.parse(localStorage.getItem(localKey) ?? "[]"));
          } catch {
            setItems([]);
          }
        } else {
          setRemote(true);
          setItems(r.data ?? []);
        }
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [table, columns, patientId, ownerId, days, tick, localKey]);

  const add = useCallback(
    async (row: Omit<T, "id">) => {
      setError("");
      if (remote) {
        const { error: e } = await (supabase as any)
          .from(table)
          .insert({ ...row, patient_id: patientId, owner_id: ownerId });
        if (e) {
          setError("Não foi possível salvar. Tente novamente.");
          return false;
        }
        setTick((n) => n + 1);
        return true;
      }
      const next = [{ ...row, id: crypto.randomUUID() } as T, ...items];
      try {
        localStorage.setItem(localKey, JSON.stringify(next));
      } catch {
        /* ok */
      }
      setItems(next);
      return true;
    },
    [remote, table, patientId, ownerId, items, localKey],
  );

  const remove = useCallback(
    async (id: string) => {
      if (remote) {
        const { error: e } = await (supabase as any).from(table).delete().eq("id", id);
        if (e) {
          setError("Não foi possível excluir.");
          return;
        }
        setTick((n) => n + 1);
        return;
      }
      const next = items.filter((x) => x.id !== id);
      try {
        localStorage.setItem(localKey, JSON.stringify(next));
      } catch {
        /* ok */
      }
      setItems(next);
    },
    [remote, table, items, localKey],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Omit<T, "id">>) => {
      setError("");
      if (remote) {
        const { error: e } = await (supabase as any).from(table).update(patch).eq("id", id);
        if (e) {
          setError("Não foi possível salvar a alteração.");
          return false;
        }
        setTick((n) => n + 1);
        return true;
      }
      const next = items.map((x) => (x.id === id ? { ...x, ...patch } : x));
      try {
        localStorage.setItem(localKey, JSON.stringify(next));
      } catch {
        /* ok */
      }
      setItems(next);
      return true;
    },
    [remote, table, items, localKey],
  );

  return { items, loaded, remote, error, add, remove, update };
}

/** Líquidos do dia (água + outras bebidas) e meta, para cruzar com micção. */
export function useLiquids(patientId: string, ownerId: string, days = 7) {
  const [liquids, setLiquids] = useState<{ at: string; ml: number }[]>([]);
  const [goalMl, setGoalMl] = useState(0);
  useEffect(() => {
    let active = true;
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const db = supabase as any;
    void Promise.all([
      db
        .from("care_hydration")
        .select("amount_ml,recorded_at")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .gte("recorded_at", since)
        .limit(1000),
      db
        .from("care_client_beverages")
        .select("amount_ml,consumed_at")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .gte("consumed_at", since)
        .limit(1000),
      db
        .from("care_hydration_profiles")
        .select("target_ml,fluid_restriction")
        .eq("patient_id", patientId)
        .maybeSingle(),
    ]).then(([w, b, p]) => {
      if (!active) return;
      setLiquids([
        ...(w.data ?? []).map((x: any) => ({ at: x.recorded_at, ml: x.amount_ml })),
        ...(b.data ?? []).map((x: any) => ({ at: x.consumed_at, ml: x.amount_ml })),
      ]);
      setGoalMl(p.data && !p.data.fluid_restriction ? (p.data.target_ml ?? 0) : 0);
    });
    return () => {
      active = false;
    };
  }, [patientId, ownerId, days]);
  return { liquids, goalMl };
}
