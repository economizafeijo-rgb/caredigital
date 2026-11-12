import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, ArrowRight, CalendarCheck2, Droplets, Flame, Pill, Scale, Sparkles, TrendingDown, TrendingUp, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey } from "@/lib/acre-time";
import { clientSectionHashes, type ClientSection } from "@/lib/client-pages";
import { DailyNutritionPanel, useDailyNutrition } from "./DailyNutritionPanel";

type Link_ = { patientId: string; ownerId: string; name: string };
type Metrics = { tasksDone: number; tasksTotal: number; waterMl: number; waterTarget: number; medDone: number; medTotal: number; weight: number | null; weightDelta: number | null; activityMin: number };

function usePatientLink() {
  const [link, setLink] = useState<Link_ | null>(null);
  useEffect(() => {
    void (async () => {
      const db = supabase as any;
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const grant = await db.from("care_patient_access").select("patient_id").eq("user_id", data.user.id).limit(1);
      const id = grant.data?.[0]?.patient_id;
      const patient = id ? await db.from("care_patients").select("id,owner_id,full_name").eq("id", id).limit(1)
        : await db.from("care_patients").select("id,owner_id,full_name").eq("owner_id", data.user.id).limit(1);
      const row = patient.data?.[0];
      if (row) setLink({ patientId: row.id, ownerId: row.owner_id, name: row.full_name });
    })();
  }, []);
  return link;
}

function useMetrics(link: Link_ | null) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  useEffect(() => {
    if (!link) return;
    const db = supabase as any;
    const day = acreDateKey();
    const start = new Date(day + "T00:00:00-05:00");
    const end = new Date(start.getTime() + 86_400_000);
    const week = new Date(start.getTime() - 6 * 86_400_000);
    void Promise.all([
      db.from("care_daily_checklist").select("category,completed_at,scheduled_at").eq("patient_id", link.patientId).gte("scheduled_at", week.toISOString()).lt("scheduled_at", end.toISOString()).limit(1000),
      db.rpc("care_sync_hydration_goal", { p_patient_id: link.patientId }),
      db.from("care_body_measurements").select("weight_kg,recorded_on").eq("patient_id", link.patientId).order("recorded_on", { ascending: false }).limit(2),
      db.from("care_activity_log").select("details").eq("patient_id", link.patientId).eq("category", "atividade").gte("happened_at", week.toISOString()).limit(200),
    ]).then(([tasks, water, weights, activity]: any[]) => {
      const rows = tasks.data ?? [];
      const today = rows.filter((t: any) => Date.parse(t.scheduled_at) >= start.getTime());
      const meds = rows.filter((t: any) => t.category === "medicacao" && Date.parse(t.scheduled_at) < Date.now());
      const w = weights.data ?? [];
      setMetrics({
        tasksDone: today.filter((t: any) => t.completed_at).length, tasksTotal: today.length,
        waterMl: Number(water.data?.consumed_ml ?? 0), waterTarget: Number(water.data?.target_ml ?? 0),
        medDone: meds.filter((t: any) => t.completed_at).length, medTotal: meds.length,
        weight: w[0] ? Number(w[0].weight_kg) : null, weightDelta: w[1] ? Number(w[0].weight_kg) - Number(w[1].weight_kg) : null,
        activityMin: (activity.data ?? []).reduce((total: number, row: any) => total + (Number(row.details?.duration_minutes) || 0), 0),
      });
    }, () => setMetrics(null));
  }, [link]);
  return metrics;
}

function MetricCard({ icon: Icon, label, value, note, pct, gradient, section }: { icon: LucideIcon; label: string; value: string; note: string; pct: number | null; gradient: string; section: ClientSection }) {
  return <Link to="/cliente" hash={clientSectionHashes[section]} className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
    <div aria-hidden="true" className={`absolute -right-8 -top-8 size-24 rounded-full bg-gradient-to-br opacity-20 blur-xl ${gradient}`}/>
    <span className="flex items-center justify-between">
      <span className={`grid size-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm ${gradient}`}><Icon size={19}/></span>
      <ArrowRight size={17} className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"/>
    </span>
    <span className="mt-3 text-sm font-semibold text-muted-foreground">{label}</span>
    <strong className="mt-0.5 text-2xl font-extrabold tabular-nums tracking-tight">{value}</strong>
    <span className="text-xs text-muted-foreground">{note}</span>
    {pct !== null && <span className="mt-3 block h-2 overflow-hidden rounded-full bg-muted"><i className={`block h-full rounded-full bg-gradient-to-r ${gradient}`} style={{ width: Math.min(100, pct) + "%" }}/></span>}
  </Link>;
}

export function HomeClientMetrics() {
  const link = usePatientLink();
  const metrics = useMetrics(link);
  const nutrition = useDailyNutrition(link?.patientId ?? "", link?.ownerId ?? "", link ? 1 : 0);
  if (!link || !metrics) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted"/>)}</div>;
  const pct = (a: number, b: number) => b > 0 ? Math.round(a / b * 100) : null;
  const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return <section aria-label="Seu acompanhamento" className="flex flex-col gap-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Seu acompanhamento</p>
        <h2 className="text-2xl font-extrabold tracking-tight">Olá, {link.name.split(" ")[0]}! Veja como está seu dia</h2></div>
      <div className="flex flex-wrap gap-2">
        <Link to="/cliente" hash={clientSectionHashes.agenda} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"><CalendarCheck2 size={17}/> Abrir agenda</Link>
        <Link to="/cliente" hash={clientSectionHashes.alimentacao} className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-bold transition hover:border-emerald-500 hover:text-emerald-600"><UtensilsCrossed size={17}/> Registrar refeição</Link>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <MetricCard icon={CalendarCheck2} label="Cuidados de hoje" value={`${metrics.tasksDone}/${metrics.tasksTotal}`} note="confirmados" pct={pct(metrics.tasksDone, metrics.tasksTotal)} gradient="from-indigo-600 to-blue-500" section="agenda"/>
      <MetricCard icon={Droplets} label="Hidratação" value={`${fmt(metrics.waterMl / 1000)} L`} note={metrics.waterTarget ? `de ${fmt(metrics.waterTarget / 1000)} L` : "meta a definir"} pct={pct(metrics.waterMl, metrics.waterTarget)} gradient="from-sky-600 to-cyan-500" section="hidratacao"/>
      <MetricCard icon={Pill} label="Adesão à medicação" value={metrics.medTotal ? `${pct(metrics.medDone, metrics.medTotal)}%` : "—"} note={`${metrics.medDone} de ${metrics.medTotal} doses em 7 dias`} pct={pct(metrics.medDone, metrics.medTotal)} gradient="from-rose-600 to-pink-500" section="medicacao"/>
      <MetricCard icon={Flame} label="Calorias hoje" value={`${Math.round(nutrition.total.kcal)}`} note={`de ${nutrition.target.kcal} kcal · ${Math.round(nutrition.total.protein)} g proteína`} pct={pct(nutrition.total.kcal, nutrition.target.kcal)} gradient="from-orange-500 to-amber-500" section="alimentacao"/>
      <MetricCard icon={metrics.weightDelta !== null && metrics.weightDelta < 0 ? TrendingDown : metrics.weightDelta !== null && metrics.weightDelta > 0 ? TrendingUp : Scale} label="Peso" value={metrics.weight ? `${fmt(metrics.weight)} kg` : "—"} note={metrics.weightDelta !== null ? `${metrics.weightDelta > 0 ? "+" : ""}${fmt(metrics.weightDelta)} kg desde o anterior` : "registre seu peso"} pct={null} gradient="from-fuchsia-600 to-pink-500" section="peso"/>
      <MetricCard icon={Activity} label="Atividade (7 dias)" value={`${metrics.activityMin} min`} note="meta OMS: 150 min/semana" pct={Math.round(metrics.activityMin / 150 * 100)} gradient="from-orange-600 to-red-500" section="atividade"/>
    </div>
    <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
      <DailyNutritionPanel data={nutrition} compact/>
      <Link to="/cliente" hash={clientSectionHashes.suplementos} className="group relative isolate flex min-h-[220px] flex-col justify-end overflow-hidden rounded-3xl p-5 text-white shadow-card">
        <img src="/images/painel-suplementos.webp" alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-500 group-hover:scale-105"/>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-violet-950 via-violet-900/70 to-transparent"/>
        <Sparkles size={26}/>
        <strong className="mt-2 text-xl font-extrabold">Central de suplementação</strong>
        <span className="text-sm text-white/80">Doses, horários com timer e dicas de cada suplemento.</span>
        <span className="mt-3 inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-violet-900">Abrir central <ArrowRight size={16}/></span>
      </Link>
    </div>
  </section>;
}
