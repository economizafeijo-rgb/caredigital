/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetch-all";
import { acreAddDays, acreDateKey } from "@/lib/acre-time";
import { beverageNutrients } from "@/lib/beverage-nutrients";
import { isBeverageKind } from "@/lib/care-intake-categories";
import { foodMicros, parseFoodText, sumNutrients, type Nutrients } from "@/lib/food-parser";

const empty = (): Nutrients => sumNutrients([]);

/** Nutrientes somados por dia (refeições, bebidas e porções da biblioteca) para períodos longos. */
export function usePeriodNutrition(patientId: string, ownerId: string, days: number) {
  const [byDay, setByDay] = useState<Record<string, Nutrients>>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    const db = supabase as any;
    const from = new Date(
      `${acreAddDays(acreDateKey(), -(days - 1))}T00:00:00-05:00`,
    ).toISOString();
    const q = (t: string, cols: string, col: string) =>
      fetchAll((x, y) =>
        db
          .from(t)
          .select(cols)
          .eq("patient_id", patientId)
          .eq("owner_id", ownerId)
          .gte(col, from)
          .order(col)
          .range(x, y),
      );
    void Promise.all([
      fetchAll((x, y) =>
        db
          .from("care_activity_log")
          .select("details,event_type,source,happened_at")
          .eq("patient_id", patientId)
          .eq("owner_id", ownerId)
          .eq("category", "refeicao")
          .in("event_type", ["confirmed", "logged"])
          .gte("happened_at", from)
          .order("happened_at")
          .range(x, y),
      ),
      q("care_client_beverages", "name,kind,amount_ml,consumed_at", "consumed_at"),
      q(
        "care_food_consumptions",
        "food_id,grams,kcal,protein_g,carbs_g,fat_g,fiber_g,recorded_at",
        "recorded_at",
      ),
    ]).then(
      ([meals, drinks, portions]: any[]) => {
        if (!active) return;
        const lists: Record<string, Nutrients[]> = {};
        const push = (at: string, n: Nutrients) => (lists[acreDateKey(at)] ??= []).push(n);
        for (const r of meals.data ?? []) {
          if (r.details?.superseded || r.source === "client_nutrition_library") continue;
          const text = String(r.details?.description || r.details?.title || "");
          for (const f of parseFoodText(text)) push(r.happened_at, f.nutrients);
        }
        for (const r of drinks.data ?? []) {
          const ml = Number(r.amount_ml);
          const named = parseFoodText(String(r.name || r.kind || ""), ml);
          if (named.length) named.forEach((f) => push(r.consumed_at, f.nutrients));
          else if (isBeverageKind(String(r.kind)) && ml > 0) {
            const b = beverageNutrients(r.kind, ml);
            push(r.consumed_at, {
              ...empty(),
              kcal: b.kcal,
              protein: b.protein,
              carbs: b.carbs,
              fat: b.fat,
            });
          }
        }
        for (const r of portions.data ?? []) {
          const m = foodMicros[r.food_id] ?? [0, 0, 0, 0, 0];
          const k = Number(r.grams) / 100;
          push(r.recorded_at, {
            kcal: Number(r.kcal),
            protein: Number(r.protein_g),
            carbs: Number(r.carbs_g),
            fat: Number(r.fat_g),
            fiber: Number(r.fiber_g),
            vitC: m[0] * k,
            vitA: m[1] * k,
            calcium: m[2] * k,
            iron: m[3] * k,
            potassium: m[4] * k,
          });
        }
        const out: Record<string, Nutrients> = {};
        for (const [d, l] of Object.entries(lists)) out[d] = sumNutrients(l);
        setByDay(out);
        setLoaded(true);
      },
      () => active && setLoaded(true),
    );
    return () => {
      active = false;
    };
  }, [patientId, ownerId, days]);
  return { byDay, loaded };
}
