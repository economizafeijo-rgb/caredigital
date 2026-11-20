import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mealKindOf, nextMealSuggestion, nextWaterPlan, type LoggedMeal } from "@/lib/day-plan";

export type NextUp = { at: number; from: number | null; detail: string } | null;
export type NextUps = {
  agua: NextUp;
  refeicao: NextUp;
  med: NextUp;
  supl: NextUp;
  sono: NextUp;
  exercicio: NextUp;
};

const tz = "America/Rio_Branco";
const dayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
const at = (day: string, hhmm: string) => Date.parse(`${day}T${hhmm}:00-05:00`);

/** Próximo horário de cada cuidado, calculado a partir do que está programado e do que já foi registrado hoje. */
export function useNextUps(
  patientId: string,
  ownerId: string,
  waterTarget: number,
  refreshKey: number,
): NextUps | null {
  const [state, setState] = useState<NextUps | null>(null);
  useEffect(() => {
    let active = true;
    const db = supabase as any;
    const day = dayKey();
    const from = new Date(day + "T00:00:00-05:00").toISOString();
    let queries: Promise<any>[];
    try {
      queries = [
        db
          .from("care_hydration")
          .select("amount_ml,recorded_at")
          .eq("patient_id", patientId)
          .gte("recorded_at", from)
          .order("recorded_at"),
        db
          .from("care_client_beverages")
          .select("amount_ml,consumed_at")
          .eq("patient_id", patientId)
          .gte("consumed_at", from),
        db
          .from("care_client_medications")
          .select("id,name,dose,times,active")
          .eq("patient_id", patientId)
          .eq("owner_id", ownerId),
        db
          .from("care_client_medication_intakes")
          .select("medication_id,slot")
          .eq("patient_id", patientId)
          .eq("taken_on", day),
        db
          .from("care_supplement_plans")
          .select("id,name,dose,unit,times,active")
          .eq("patient_id", patientId)
          .eq("owner_id", ownerId),
        db
          .from("care_supplement_intakes")
          .select("plan_id,slot")
          .eq("patient_id", patientId)
          .eq("taken_on", day),
        db
          .from("care_activity_log")
          .select("category,happened_at,recorded_at,details,request_id")
          .eq("patient_id", patientId)
          .in("category", ["refeicao", "atividade"])
          .in("event_type", ["confirmed", "logged"])
          .gte("recorded_at", from),
        db
          .from("care_sleep_logs")
          .select("bed_at")
          .eq("patient_id", patientId)
          .order("sleep_date", { ascending: false })
          .limit(7),
        db
          .from("care_nutrition_meal_logs")
          .select("recorded_at,meal_name,items")
          .eq("patient_id", patientId)
          .gte("recorded_at", from),
      ];
    } catch {
      return () => {
        active = false;
      };
    } // cliente de dados indisponível (ex.: testes)
    void Promise.all(queries).then(
      ([water, bev, meds, medIn, sup, supIn, acts, sleep, mlogs]: any[]) => {
        if (!active) return;
        const now = Date.now();
        // Água
        const drinks = [
          ...(water.data ?? []).map((r: any) => ({
            t: Date.parse(r.recorded_at),
            ml: Number(r.amount_ml),
          })),
          ...(bev.data ?? []).map((r: any) => ({
            t: Date.parse(r.consumed_at),
            ml: Number(r.amount_ml),
          })),
        ].sort((a, b) => a.t - b.t);
        const last = drinks.at(-1) ?? null;
        const w = nextWaterPlan({ targetMl: waterTarget, drinks, now, day });
        // Medicação e suplementos: próximo horário ainda não registrado
        const nextDose = (
          plans: any[],
          taken: Set<string>,
          idKey: string,
          label: (p: any) => string,
        ) => {
          const all = plans
            .filter((p) => p.active !== false)
            .flatMap((p) => (p.times ?? []).map((t: string) => ({ p, t, ms: at(day, t) })))
            .sort((a, b) => a.ms - b.ms);
          const pending = all.filter(
            (x) => !taken.has(`${x.p[idKey]}|${x.t}`) && x.ms >= now - 60 * 60_000,
          );
          const n = pending[0];
          if (!n) return null;
          const prev = all.filter((x) => x.ms < n.ms).at(-1);
          return { at: n.ms, from: prev ? prev.ms : null, detail: label(n.p) };
        };
        const medTaken = new Set<string>(
          (medIn.data ?? []).map((r: any) => `${r.medication_id}|${r.slot}`),
        );
        const supTaken = new Set<string>(
          (supIn.data ?? []).map((r: any) => `${r.plan_id}|${r.slot}`),
        );
        const medPlans = meds.data ?? [];
        // Refeições e atividade
        const seen = new Set<string>();
        const logged: LoggedMeal[] = (acts.data ?? [])
          .filter(
            (r: any) =>
              r.category === "refeicao" &&
              (!r.request_id || (!seen.has(r.request_id) && seen.add(r.request_id))),
          )
          .map((r: any) => ({
            t: Date.parse(r.happened_at ?? r.recorded_at),
            kind:
              mealKindOf(r.details?.kind) ||
              mealKindOf(r.details?.title, r.details?.description, r.details?.meal_name),
          }));
        for (const r of mlogs?.data ?? []) {
          const t = Date.parse(r.recorded_at);
          if (logged.some((m) => Math.abs(m.t - t) < 3 * 60_000)) continue;
          const list = Array.isArray(r.items) ? r.items.join(", ") : "";
          logged.push({ t, kind: mealKindOf(r.meal_name) || mealKindOf(list) });
        }
        const { next: nextMeal, last: lastMealRec } = nextMealSuggestion(logged, day, now);
        const lastMeal = lastMealRec?.t ?? null;
        const meal = nextMeal ? nextMeal.at : null;
        const moved = (acts.data ?? []).some((r: any) => r.category === "atividade");
        const moveAt = at(day, "17:30");
        // Sono: média das últimas noites ou 22h30; aviso 30 min antes
        const mins = (sleep.data ?? []).map((l: any) => {
          const d = new Date(Date.parse(l.bed_at) - 5 * 3_600_000);
          let m = d.getUTCHours() * 60 + d.getUTCMinutes();
          if (m < 720) m += 1440;
          return m;
        });
        const avg = mins.length
          ? Math.round(mins.reduce((a: number, b: number) => a + b, 0) / mins.length)
          : 22 * 60 + 30;
        let bed = Date.parse(day + "T00:00:00-05:00") + avg * 60_000;
        if (now > bed + 3 * 3_600_000) bed += 86_400_000;
        setState({
          agua: w ? { at: w.at, from: last?.t ?? null, detail: `~${w.suggestedMl} ml` } : null,
          refeicao: meal && nextMeal ? { at: meal, from: lastMeal, detail: nextMeal.label } : null,
          med: nextDose(medPlans, medTaken, "id", (p) => `${p.name} · ${p.dose}`),
          supl: nextDose(sup.data ?? [], supTaken, "id", (p) => `${p.name} · ${p.dose} ${p.unit}`),
          sono: { at: bed - 30 * 60_000, from: bed - 4 * 3_600_000, detail: "hora de desacelerar" },
          exercicio:
            moved || now > moveAt + 3 * 3_600_000
              ? null
              : { at: moveAt, from: at(day, "06:00"), detail: "30 min de movimento" },
        });
      },
      () => active && setState(null),
    );
    return () => {
      active = false;
    };
  }, [patientId, ownerId, waterTarget, refreshKey]);
  return state;
}
