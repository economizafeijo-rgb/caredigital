/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ingredientById } from "@/lib/nutrition-catalog";
import { parseFoodText } from "@/lib/food-parser";
import { fetchAll } from "@/lib/fetch-all";
import { detectCaffeine, detectLactose } from "@/lib/intake-detect";

export type IntakeOrigin = "bebida" | "refeicao" | "porcao" | "manual";
export type CaffeineRecord = {
  id: string;
  at: string;
  label: string;
  ml: number | null;
  mg: number;
  origin: IntakeOrigin;
};
export type LactoseRecord = {
  id: string;
  at: string;
  label: string;
  amount: number;
  g: number;
  free: boolean;
  origin: IntakeOrigin;
};

/**
 * Lê tudo o que o paciente registrou (bebidas, refeições, porções da biblioteca e registros manuais)
 * e calcula sozinho a cafeína e a lactose de cada ingestão.
 */
export function useIntakeRecords(patientId: string, ownerId: string, days = 30) {
  const [caffeine, setCaffeine] = useState<CaffeineRecord[]>([]);
  const [lactose, setLactose] = useState<LactoseRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const bump = () => setReload((n) => n + 1);
    window.addEventListener("nv-intake-changed", bump);
    return () => window.removeEventListener("nv-intake-changed", bump);
  }, []);

  useEffect(() => {
    let active = true;
    const db = supabase as any;
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const base = (t: string, cols: string, col: string) =>
      fetchAll((a, b) =>
        db
          .from(t)
          .select(cols)
          .eq("patient_id", patientId)
          .eq("owner_id", ownerId)
          .gte(col, since)
          .order(col)
          .range(a, b),
      );
    void Promise.all([
      base("care_client_beverages", "id,name,kind,amount_ml,consumed_at", "consumed_at"),
      base("care_food_consumptions", "id,food_id,grams,recorded_at", "recorded_at"),
      fetchAll((a, b) =>
        db
          .from("care_activity_log")
          .select("id,happened_at,details,event_type,source")
          .eq("patient_id", patientId)
          .eq("owner_id", ownerId)
          .eq("category", "refeicao")
          .in("event_type", ["confirmed", "logged"])
          .gte("happened_at", since)
          .order("happened_at")
          .range(a, b),
      ),
      base("care_caffeine_logs", "id,at,source,ml,mg", "at"),
    ]).then(([bev, food, meals, manual]: any[]) => {
      if (!active) return;
      const caf: CaffeineRecord[] = [];
      const lac: LactoseRecord[] = [];
      const addBoth = (
        id: string,
        at: string,
        text: string,
        amount: number,
        origin: IntakeOrigin,
        kind?: string | null,
      ) => {
        const c = detectCaffeine(text, amount, kind);
        if (c && c.mg > 0)
          caf.push({
            id: `${origin}-c-${id}`,
            at,
            label: c.label,
            ml: Math.round(amount),
            mg: c.mg,
            origin,
          });
        const l = detectLactose(text, amount);
        if (l)
          lac.push({
            id: `${origin}-l-${id}`,
            at,
            label: l.label,
            amount: Math.round(amount),
            g: l.g,
            free: l.free,
            origin,
          });
      };
      for (const r of bev.data ?? []) {
        const ml = Number(r.amount_ml);
        const text = String(r.name || r.kind || "");
        addBoth(r.id, r.consumed_at, text, ml, "bebida", r.kind);
        // Leite sem nome reconhecível ainda é leite.
        if (r.kind === "leite" && !detectLactose(text, ml))
          lac.push({
            id: `bebida-l-${r.id}`,
            at: r.consumed_at,
            label: "Leite",
            amount: Math.round(ml),
            g: Math.round(ml * 0.048 * 10) / 10,
            free: false,
            origin: "bebida",
          });
      }
      for (const r of food.data ?? []) {
        const name = ingredientById.get(r.food_id)?.name ?? String(r.food_id).replace(/_/g, " ");
        addBoth(r.id, r.recorded_at, name, Number(r.grams), "porcao");
      }
      for (const r of meals.data ?? []) {
        if (r.details?.superseded || r.source === "client_nutrition_library") continue;
        const text = String(r.details?.description || r.details?.title || "");
        parseFoodText(text).forEach((f, i) =>
          addBoth(`${r.id}-${i}`, r.happened_at, f.name, f.grams, "refeicao"),
        );
      }
      // Registros manuais; os automáticos próximos (±10 min) são dispensados para não contar duas vezes.
      const manualRows: CaffeineRecord[] = (manual.error ? [] : (manual.data ?? [])).map(
        (m: any) => ({
          id: m.id,
          at: m.at,
          label: m.source,
          ml: m.ml,
          mg: m.mg,
          origin: "manual" as const,
        }),
      );
      const near = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) < 600_000;
      const merged = [
        ...manualRows,
        ...caf.filter((c) => !manualRows.some((m) => near(m.at, c.at))),
      ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      lac.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      setCaffeine(merged);
      setLactose(lac);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [patientId, ownerId, days, reload]);

  return { caffeine, lactose, loaded };
}
