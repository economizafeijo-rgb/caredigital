import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { estimateNextHydration } from "@/lib/hydration-goal";

export type NextUp = { at: number; from: number | null; detail: string } | null;
export type NextUps = { agua: NextUp; refeicao: NextUp; med: NextUp; supl: NextUp; sono: NextUp; exercicio: NextUp };

const tz = "America/Rio_Branco";
const dayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
const at = (day: string, hhmm: string) => Date.parse(`${day}T${hhmm}:00-05:00`);

/** Próximo horário de cada cuidado, calculado a partir do que está programado e do que já foi registrado hoje. */
export function useNextUps(patientId: string, ownerId: string, waterTarget: number, refreshKey: number): NextUps | null {
  const [state, setState] = useState<NextUps | null>(null);
  useEffect(() => {
    let active = true;
    const db = supabase as any;
    const day = dayKey();
    const from = new Date(day + "T00:00:00-05:00").toISOString();
    let queries: Promise<any>[];
    try { queries = [
      db.from("care_hydration").select("amount_ml,recorded_at").eq("patient_id", patientId).gte("recorded_at", from).order("recorded_at"),
      db.from("care_client_beverages").select("amount_ml,consumed_at").eq("patient_id", patientId).gte("consumed_at", from),
      db.from("care_client_medications").select("id,name,dose,times,active").eq("patient_id", patientId).eq("owner_id", ownerId),
      db.from("care_client_medication_intakes").select("medication_id,slot").eq("patient_id", patientId).eq("taken_on", day),
      db.from("care_supplement_plans").select("id,name,dose,unit,times,active").eq("patient_id", patientId).eq("owner_id", ownerId),
      db.from("care_supplement_intakes").select("plan_id,slot").eq("patient_id", patientId).eq("taken_on", day),
      db.from("care_activity_log").select("category,happened_at,recorded_at").eq("patient_id", patientId).in("category", ["refeicao", "atividade"]).in("event_type", ["confirmed", "logged"]).gte("recorded_at", from),
      db.from("care_sleep_logs").select("bed_at").eq("patient_id", patientId).order("sleep_date", { ascending: false }).limit(7),
    ]; } catch { return () => { active = false; }; } // cliente de dados indisponível (ex.: testes)
    void Promise.all(queries).then(([water, bev, meds, medIn, sup, supIn, acts, sleep]: any[]) => {
      if (!active) return;
      const now = Date.now();
      // Água
      const drinks = [...(water.data ?? []).map((r: any) => ({ t: Date.parse(r.recorded_at), ml: Number(r.amount_ml) })), ...(bev.data ?? []).map((r: any) => ({ t: Date.parse(r.consumed_at), ml: Number(r.amount_ml) }))].sort((a, b) => a.t - b.t);
      const drank = drinks.reduce((s, d) => s + d.ml, 0);
      const last = drinks.at(-1) ?? null;
      const w = waterTarget > 0 ? estimateNextHydration({ remainingMl: Math.max(0, waterTarget - drank), lastIntakeAt: last?.t ?? null, lastAmountMl: last?.ml ?? 0, now, cutoff: at(day, "19:00") }) : null;
      // Medicação e suplementos: próximo horário ainda não registrado
      const nextDose = (plans: any[], taken: Set<string>, idKey: string, label: (p: any) => string) => {
        const all = plans.filter((p) => p.active !== false).flatMap((p) => (p.times ?? []).map((t: string) => ({ p, t, ms: at(day, t) }))).sort((a, b) => a.ms - b.ms);
        const pending = all.filter((x) => !taken.has(`${x.p[idKey]}|${x.t}`) && x.ms >= now - 60 * 60_000);
        const n = pending[0];
        if (!n) return null;
        const prev = all.filter((x) => x.ms < n.ms).at(-1);
        return { at: n.ms, from: prev ? prev.ms : null, detail: label(n.p) };
      };
      const medTaken = new Set<string>((medIn.data ?? []).map((r: any) => `${r.medication_id}|${r.slot}`));
      const supTaken = new Set<string>((supIn.data ?? []).map((r: any) => `${r.plan_id}|${r.slot}`));
      const medPlans = meds.data ?? [];
      // Refeições e atividade
      const mealTimes = (acts.data ?? []).filter((r: any) => r.category === "refeicao").map((r: any) => Date.parse(r.happened_at ?? r.recorded_at)).sort((a: number, b: number) => a - b);
      const lastMeal = mealTimes.at(-1) ?? null;
      const slots = ["07:00", "10:00", "12:30", "15:30", "19:00"].map((t) => at(day, t));
      let meal = lastMeal ? lastMeal + 3 * 3_600_000 : slots.find((t) => t > now - 45 * 60_000) ?? null;
      if (meal && meal > at(day, "21:30")) meal = null;
      const moved = (acts.data ?? []).some((r: any) => r.category === "atividade");
      const moveAt = at(day, "17:30");
      // Sono: média das últimas noites ou 22h30; aviso 30 min antes
      const mins = (sleep.data ?? []).map((l: any) => { const d = new Date(Date.parse(l.bed_at) - 5 * 3_600_000); let m = d.getUTCHours() * 60 + d.getUTCMinutes(); if (m < 720) m += 1440; return m; });
      const avg = mins.length ? Math.round(mins.reduce((a: number, b: number) => a + b, 0) / mins.length) : 22 * 60 + 30;
      let bed = Date.parse(day + "T00:00:00-05:00") + avg * 60_000;
      if (now > bed + 3 * 3_600_000) bed += 86_400_000;
      setState({
        agua: w ? { at: w.at, from: last?.t ?? null, detail: `~${w.suggestedMl} ml` } : null,
        refeicao: meal ? { at: meal, from: lastMeal, detail: "próxima refeição" } : null,
        med: nextDose(medPlans, medTaken, "id", (p) => `${p.name} · ${p.dose}`),
        supl: nextDose(sup.data ?? [], supTaken, "id", (p) => `${p.name} · ${p.dose} ${p.unit}`),
        sono: { at: bed - 30 * 60_000, from: bed - 4 * 3_600_000, detail: "hora de desacelerar" },
        exercicio: moved || now > moveAt + 3 * 3_600_000 ? null : { at: moveAt, from: at(day, "06:00"), detail: "30 min de movimento" },
      });
    }, () => active && setState(null));
    return () => { active = false; };
  }, [patientId, ownerId, waterTarget, refreshKey]);
  return state;
}
