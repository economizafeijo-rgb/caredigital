import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Droplets, Pill, Plus, Sparkles, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type MetricKey = "hidratacao" | "alimentacao" | "medicacao" | "atividade";
type Series = { key: MetricKey; days: number[] };
const db = supabase as unknown as { from: (t: string) => any };
const tz = "America/Rio_Branco";
const dayKey = (d: Date | string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
const weekday = (key: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" }).format(new Date(key + "T12:00:00Z")).replace(".", "");

const meta: Record<MetricKey, { label: string; icon: LucideIcon; color: string; unit: (v: number) => string; empty: string }> = {
  hidratacao: { label: "Água", icon: Droplets, color: "#0ea5e9", unit: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace(".", ",")} L` : `${Math.round(v)} ml`), empty: "Registrar água" },
  alimentacao: { label: "Refeições", icon: UtensilsCrossed, color: "#10b981", unit: (v) => `${v} ${v === 1 ? "refeição" : "refeições"}`, empty: "Registrar refeição" },
  medicacao: { label: "Medicação", icon: Pill, color: "#8b5cf6", unit: (v) => `${v} ${v === 1 ? "dose" : "doses"}`, empty: "Ver medicação" },
  atividade: { label: "Atividade", icon: Activity, color: "#f97316", unit: (v) => `${v} ${v === 1 ? "registro" : "registros"}`, empty: "Registrar treino" },
};

/** Últimos 7 dias de cada métrica, lidos direto dos registros do usuário (inclui registros fora da agenda). */
function useWeek(patientId: string, ownerId: string, revision: number) {
  const [series, setSeries] = useState<Series[] | null>(null);
  const keys = useMemo(() => Array.from({ length: 7 }, (_, i) => dayKey(new Date(Date.now() - (6 - i) * 86400000))), [revision]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let active = true;
    const from = new Date(keys[0] + "T00:00:00-05:00").toISOString();
    const bucket = (rows: { at: string; v: number }[]) => keys.map((k) => rows.filter((r) => dayKey(r.at) === k).reduce((a, r) => a + r.v, 0));
    void Promise.all([
      db.from("care_hydration").select("amount_ml,recorded_at").eq("patient_id", patientId).gte("recorded_at", from).limit(2000),
      db.from("care_nutrition_meal_logs").select("id,recorded_at").eq("patient_id", patientId).gte("recorded_at", from).limit(1000),
      db.from("care_food_consumptions").select("meal_group_id,request_id,recorded_at").eq("patient_id", patientId).gte("recorded_at", from).limit(2000),
      db.from("care_client_medication_intakes").select("id,taken_at").eq("patient_id", patientId).gte("taken_at", from).limit(1000),
      db.from("care_activity_log").select("id,recorded_at").eq("patient_id", patientId).eq("owner_id", ownerId).eq("category", "atividade").in("event_type", ["confirmed", "logged"]).gte("recorded_at", from).limit(1000),
    ]).then(([water, logs, foods, meds, acts]) => {
      if (!active) return;
      const foodGroups = new Map<string, string>();
      for (const f of foods.data ?? []) {
        const g = f.meal_group_id ?? f.request_id;
        if (g && !foodGroups.has(g)) foodGroups.set(g, f.recorded_at);
      }
      setSeries([
        { key: "hidratacao", days: bucket((water.data ?? []).map((r: any) => ({ at: r.recorded_at, v: Number(r.amount_ml) || 0 }))) },
        { key: "alimentacao", days: bucket([...(logs.data ?? []).map((r: any) => ({ at: r.recorded_at, v: 1 })), ...[...foodGroups.values()].map((at) => ({ at, v: 1 }))]) },
        { key: "medicacao", days: bucket((meds.data ?? []).map((r: any) => ({ at: r.taken_at, v: 1 }))) },
        { key: "atividade", days: bucket((acts.data ?? []).map((r: any) => ({ at: r.recorded_at, v: 1 }))) },
      ]);
    }, () => active && setSeries([]));
    return () => { active = false; };
  }, [patientId, ownerId, keys]);
  return { series, keys };
}

function MetricCard({ k, days, keys, goal, scheduled, onOpen, index }: { k: MetricKey; days: number[]; keys: string[]; goal: number; scheduled: number; onOpen: () => void; index: number }) {
  const m = meta[k];
  const today = days[6];
  const prev = days.slice(0, 6);
  const avg = prev.reduce((a, b) => a + b, 0) / Math.max(1, prev.filter((v) => v > 0).length || 1);
  const target = goal || scheduled;
  const pct = target ? Math.min(100, Math.round((today / target) * 100)) : null;
  const max = Math.max(...days, target || 0, 1);
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? 6;
  const trend = avg > 0 ? Math.round(((today - avg) / avg) * 100) : null;
  return (
    <article className="nv-insight nv-rise group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4" style={{ ["--c" as string]: m.color, animationDelay: `${index * 80}ms` }}>
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-35" style={{ background: m.color }} />
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={onOpen} className="flex items-center gap-2 text-sm font-semibold hover:underline">
          <span className="grid size-9 place-items-center rounded-xl text-white shadow-md" style={{ background: `linear-gradient(135deg, ${m.color}, color-mix(in srgb, ${m.color} 60%, #000))` }}><m.icon size={17} /></span>
          {m.label}
        </button>
        {trend !== null && hover === null && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${trend >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(trend)}% vs. média
          </span>
        )}
      </header>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div key={shown} className="nv-fade-in min-w-0">
          <p className="font-display text-2xl font-extrabold leading-none tabular-nums">{m.unit(days[shown])}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {shown === 6 ? (target ? `hoje · meta ${m.unit(target)}` : "hoje") : `${weekday(keys[shown])}, ${keys[shown].slice(8)}/${keys[shown].slice(5, 7)}`}
          </p>
        </div>
        {pct !== null && (
          <div className="relative size-12 shrink-0" title={`${pct}% da meta de hoje`}>
            <svg viewBox="0 0 36 36" className="size-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-muted" strokeWidth="4" />
              <circle cx="18" cy="18" r="15" fill="none" stroke={m.color} strokeWidth="4" strokeLinecap="round" pathLength={100} strokeDasharray={`${pct} 100`} className="nv-ring-draw" />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[10px] font-bold tabular-nums">{pct}%</span>
          </div>
        )}
      </div>
      <div className="mt-3 flex h-16 items-end gap-1.5" onPointerLeave={() => setHover(null)} role="img" aria-label={`${m.label} nos últimos 7 dias`}>
        {days.map((v, i) => (
          <button key={keys[i]} type="button" tabIndex={-1} onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)} aria-label={`${weekday(keys[i])}: ${m.unit(v)}`}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="nv-m-bar w-full rounded-md transition-[opacity,transform] duration-200"
              style={{ height: `${Math.max(6, (v / max) * 100)}%`, background: i === 6 ? m.color : `color-mix(in srgb, ${m.color} 35%, transparent)`, opacity: hover === null || hover === i ? 1 : 0.45, animationDelay: `${i * 50}ms`, animationIterationCount: 1 }} />
            <span className={`text-[10px] capitalize ${i === 6 ? "font-bold text-foreground" : "text-muted-foreground"}`}>{i === 6 ? "hoje" : weekday(keys[i]).slice(0, 3)}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

/**
 * Métricas da Visão geral: só mostra o que o usuário de fato acompanha (tem registro na semana,
 * meta definida ou cuidado programado). Sem nenhuma métrica, mostra um convite para começar.
 */
export function OverviewInsights({ patientId, ownerId, revision, waterGoal, scheduled, onOpen }: {
  patientId: string; ownerId: string; revision: number; waterGoal: number;
  scheduled: Partial<Record<MetricKey, number>>; onOpen: (key: MetricKey) => void;
}) {
  const { series, keys } = useWeek(patientId, ownerId, revision);
  if (series === null)
    return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted/60" />)}</div>;
  const active = series.filter((s) => s.days.some((v) => v > 0) || (s.key === "hidratacao" && waterGoal > 0) || (scheduled[s.key] ?? 0) > 0);
  if (!active.length)
    return (
      <section className="nv-dark relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-[#062019] to-[#0c4a3e] p-5 text-white sm:p-6">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 -z-10 size-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200"><Sparkles size={16} /> Seu painel começa aqui</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold">Registre o primeiro cuidado do dia</h2>
        <p className="mt-1 max-w-[52ch] text-sm text-white/75">As métricas aparecem aqui assim que houver registros. Comece pelo que fizer agora:</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["hidratacao", "alimentacao", "atividade", "medicacao"] as MetricKey[]).map((k) => {
            const m = meta[k];
            return (
              <button key={k} type="button" onClick={() => onOpen(k)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold backdrop-blur transition hover:bg-white/20 active:scale-95">
                <span className="grid size-6 place-items-center rounded-lg" style={{ background: m.color }}><Plus size={14} /></span>{m.empty}
              </button>
            );
          })}
        </div>
      </section>
    );
  return (
    <div className={`grid gap-3 ${active.length === 1 ? "sm:grid-cols-1 xl:max-w-md" : active.length === 2 ? "sm:grid-cols-2" : active.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
      {active.map((s, i) => (
        <MetricCard key={s.key} k={s.key} days={s.days} keys={keys} index={i} goal={s.key === "hidratacao" ? waterGoal : 0} scheduled={scheduled[s.key] ?? 0} onOpen={() => onOpen(s.key)} />
      ))}
    </div>
  );
}
