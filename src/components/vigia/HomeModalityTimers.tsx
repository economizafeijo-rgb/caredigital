import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Droplets, Pill, Sparkles, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey, DAY_CUTOFF_HOUR } from "@/lib/acre-time";
import { estimateNextHydration } from "@/lib/hydration-goal";
import { clientSectionHashes, type ClientSection } from "@/lib/client-pages";
import { CareTimer, useTicker } from "./CareTimer";

type Tone = "water" | "med" | "meal" | "supplement";
export type ModalityTimer = { key: Tone; section: ClientSection; label: string; icon: LucideIcon; at: number | null; title: string; note: string };
const style: Record<Tone, { ring: string; chip: string }> = {
  water: { ring: "border-sky-500/30 bg-sky-500/[.06]", chip: "from-sky-600 to-cyan-500" },
  med: { ring: "border-rose-500/30 bg-rose-500/[.06]", chip: "from-rose-600 to-pink-500" },
  meal: { ring: "border-emerald-500/30 bg-emerald-500/[.06]", chip: "from-emerald-600 to-lime-500" },
  supplement: { ring: "border-violet-500/30 bg-violet-500/[.06]", chip: "from-violet-600 to-amber-500" },
};
const slotAt = (day: string, slot: string) => Date.parse(`${day}T${slot}:00-05:00`);

/** Próximo horário de uma lista de planos (medicamentos ou suplementos) que ainda não foi marcado hoje. */
export function nextPlanSlot(plans: { id: string; name: string; dose: string; times: string[] }[], taken: Set<string>, day: string, now: number) {
  return plans.flatMap(plan => plan.times.map(slot => ({ plan, slot, at: slotAt(day, slot) })))
    .filter(item => !taken.has(`${item.plan.id}|${item.slot}`) && item.at >= now - 60 * 60_000)
    .sort((a, b) => a.at - b.at)[0] ?? null;
}

export function HomeModalityTimers() {
  const [timers, setTimers] = useState<ModalityTimer[] | null>(null);
  const minute = useTicker(60_000);
  useEffect(() => {
    let active = true;
    void (async () => {
      const db = supabase as any;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const grant = await db.from("care_patient_access").select("patient_id").eq("user_id", auth.user.id).limit(1);
      let patientId = grant.data?.[0]?.patient_id as string | undefined;
      if (!patientId) patientId = (await db.from("care_patients").select("id").eq("owner_id", auth.user.id).limit(1)).data?.[0]?.id;
      if (!patientId || !active) return;
      const day = acreDateKey(), now = Date.now();
      const start = new Date(day + "T00:00:00-05:00"), end = new Date(start.getTime() + 86_400_000);
      const cutoff = Date.parse(day + `T${String(DAY_CUTOFF_HOUR).padStart(2, "0")}:00:00-05:00`);
      const [goal, water, tasks, meds, medTaken, sups, supTaken] = await Promise.all([
        db.rpc("care_sync_hydration_goal", { p_patient_id: patientId }),
        db.from("care_hydration").select("amount_ml,recorded_at").eq("patient_id", patientId).gte("recorded_at", start.toISOString()).order("recorded_at", { ascending: false }).limit(1),
        db.from("care_daily_checklist").select("title,category,scheduled_at").eq("patient_id", patientId).is("completed_at", null).gte("scheduled_at", new Date(now - 30 * 60_000).toISOString()).lt("scheduled_at", end.toISOString()).order("scheduled_at").limit(60),
        db.from("care_client_medications").select("id,name,dose,times").eq("patient_id", patientId).eq("active", true),
        db.from("care_client_medication_intakes").select("medication_id,slot").eq("patient_id", patientId).eq("taken_on", day),
        db.from("care_supplement_plans").select("id,name,dose,unit,times").eq("patient_id", patientId).eq("active", true),
        db.from("care_supplement_intakes").select("plan_id,slot").eq("patient_id", patientId).eq("taken_on", day),
      ]);
      if (!active) return;
      const list: ModalityTimer[] = [];
      const target = Number(goal.data?.target_ml ?? 0), consumed = Number(goal.data?.consumed_ml ?? 0);
      const lastWater = water.data?.[0];
      const plan = target > 0 ? estimateNextHydration({ remainingMl: Math.max(0, target - consumed), lastIntakeAt: lastWater ? Date.parse(lastWater.recorded_at) : null, lastAmountMl: lastWater ? Number(lastWater.amount_ml) : 0, now, cutoff }) : null;
      list.push({ key: "water", section: "hidratacao", label: "Hora da água", icon: Droplets, at: plan?.at ?? null,
        title: plan ? `Beber cerca de ${plan.suggestedMl} ml` : target > 0 ? (consumed >= target ? "Meta de hoje atingida" : "Dia de hidratação encerrado") : "Defina sua meta de água",
        note: target > 0 ? `${consumed.toLocaleString("pt-BR")} de ${target.toLocaleString("pt-BR")} ml hoje` : "Abra a hidratação para calcular a meta" });
      const first = (category: string) => (tasks.data ?? []).find((t: any) => t.category === category);
      const medTask = first("medicacao");
      const ownMed = nextPlanSlot(meds.data ?? [], new Set((medTaken.data ?? []).map((r: any) => `${r.medication_id}|${r.slot}`)), day, now);
      const med = [medTask && { at: Date.parse(medTask.scheduled_at), title: medTask.title as string }, ownMed && { at: ownMed.at, title: `${ownMed.plan.name} · ${ownMed.plan.dose}` }].filter(Boolean).sort((a: any, b: any) => a.at - b.at)[0] as { at: number; title: string } | undefined;
      list.push({ key: "med", section: "medicacao", label: "Próximo medicamento", icon: Pill, at: med?.at ?? null, title: med?.title ?? "Nenhuma dose pendente hoje", note: med ? "Confirme a dose no horário" : "Cadastre seus medicamentos e horários" });
      const sup = nextPlanSlot((sups.data ?? []).map((p: any) => ({ ...p, dose: `${Number(p.dose)} ${p.unit}` })), new Set((supTaken.data ?? []).map((r: any) => `${r.plan_id}|${r.slot}`)), day, now);
      list.push({ key: "supplement", section: "suplementos", label: "Próximo suplemento", icon: Sparkles, at: sup?.at ?? null, title: sup ? `${sup.plan.name} · ${sup.plan.dose}` : "Nenhuma dose pendente hoje", note: sup ? "Registre ao tomar" : "Programe seus suplementos" });
      const meal = first("refeicao");
      list.push({ key: "meal", section: "alimentacao", label: "Próxima refeição", icon: UtensilsCrossed, at: meal ? Date.parse(meal.scheduled_at) : null, title: meal?.title ?? "Sem refeição programada", note: meal ? "Registre o que comeu" : "Registre suas refeições quando quiser" });
      setTimers(list);
    })();
    return () => { active = false; };
  }, [minute]);

  if (!timers) return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-44 animate-pulse rounded-3xl bg-muted"/>)}</div>;
  return <section aria-label="Relógios do seu dia" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {timers.map(({ key, section, label, icon: Icon, at, title, note }) => <Link key={key} to="/cliente" hash={clientSectionHashes[section]}
      className={`group flex flex-col rounded-3xl border p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop ${style[key].ring}`}>
      <span className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold text-white ${style[key].chip}`}><Icon size={14}/>{label}</span>
        <ArrowRight size={16} className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"/>
      </span>
      <div className="mt-3 flex-1">{at
        ? <CareTimer target={at} title={title} subtitle={note} tone={key} size="sm" windowMs={key === "water" ? 90 * 60_000 : 3 * 3600_000}/>
        : <div className="flex h-24 items-center gap-3"><span className={`grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white ${style[key].chip}`}><Icon size={26}/></span><span><strong className="block text-sm">{title}</strong><span className="text-xs text-muted-foreground">{note}</span></span></div>}</div>
    </Link>)}
  </section>;
}
