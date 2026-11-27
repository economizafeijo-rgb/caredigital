/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ingredientById } from "@/lib/nutrition-catalog";
import { parseFoodText } from "@/lib/food-parser";
import { fetchAll } from "@/lib/fetch-all";
import { tagsFor, type ExposureKind } from "@/lib/exposure-tags";
import type { Exposure } from "@/lib/symptom-correlation";

/** Tudo o que foi ingerido (comida, bebida, remédio, suplemento) com os grupos de risco de cada item. */
export function useExposures(patientId: string, ownerId: string, days = 45) {
  const [items, setItems] = useState<Exposure[]>([]);
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
      base("care_nutrition_meal_logs", "id,meal_name,items,recorded_at", "recorded_at"),
      db
        .from("care_client_medications")
        .select("id,name,dose")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId),
      db
        .from("care_client_medication_intakes")
        .select("id,medication_id,taken_at")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .gte("taken_at", since)
        .limit(2000),
      db
        .from("care_supplement_plans")
        .select("id,name,kind")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId),
      db
        .from("care_supplement_intakes")
        .select("id,plan_id,taken_at")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .gte("taken_at", since)
        .limit(2000),
    ]).then(([bev, food, meals, mealLogs, meds, medIn, plans, supIn]: any[]) => {
      if (!active) return;
      const out: Exposure[] = [];
      const push = (id: string, at: string, label: string, kind: ExposureKind) => {
        const t = Date.parse(at);
        if (!label.trim() || Number.isNaN(t)) return;
        out.push({ id, at: t, label: label.trim(), kind, tags: tagsFor(label, kind) });
      };
      for (const r of bev.data ?? [])
        push(`b-${r.id}`, r.consumed_at, String(r.name || r.kind || ""), "bebida");
      for (const r of food.data ?? []) {
        const name = ingredientById.get(r.food_id)?.name ?? String(r.food_id).replace(/_/g, " ");
        push(`p-${r.id}`, r.recorded_at, name, "alimento");
      }
      for (const r of meals.data ?? []) {
        if (r.details?.superseded || r.source === "client_nutrition_library") continue;
        const text = String(r.details?.description || r.details?.title || "");
        parseFoodText(text).forEach((f, i) =>
          push(`m-${r.id}-${i}`, r.happened_at, f.name, "alimento"),
        );
      }
      for (const r of mealLogs.error ? [] : (mealLogs.data ?? [])) {
        const list: string[] = Array.isArray(r.items)
          ? r.items.map((i: any) => (typeof i === "string" ? i : String(i?.name ?? i?.food ?? "")))
          : [];
        const text = [r.meal_name, ...list].filter(Boolean).join(", ");
        parseFoodText(text).forEach((f, i) =>
          push(`l-${r.id}-${i}`, r.recorded_at, f.name, "alimento"),
        );
      }
      const medById = new Map<string, any>(
        (meds.error ? [] : (meds.data ?? [])).map((m: any) => [m.id, m]),
      );
      for (const r of medIn.error ? [] : (medIn.data ?? [])) {
        const m = medById.get(r.medication_id);
        if (m) push(`r-${r.id}`, r.taken_at, `${m.name}${m.dose ? ` ${m.dose}` : ""}`, "remedio");
      }
      const planById = new Map<string, any>(
        (plans.error ? [] : (plans.data ?? [])).map((p: any) => [p.id, p]),
      );
      for (const r of supIn.error ? [] : (supIn.data ?? [])) {
        const p = planById.get(r.plan_id);
        if (p && r.taken_at)
          push(`s-${r.id}`, r.taken_at, String(p.name || "Suplemento"), "suplemento");
      }
      // O mesmo item pode estar em mais de uma tabela: um por rótulo e horário (±10 min).
      out.sort((a, b) => a.at - b.at);
      const uniq: Exposure[] = [];
      for (const e of out)
        if (!uniq.some((o) => o.label === e.label && Math.abs(o.at - e.at) < 600_000)) uniq.push(e);
      setItems(uniq);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [patientId, ownerId, days, reload]);

  return { items, loaded };
}
