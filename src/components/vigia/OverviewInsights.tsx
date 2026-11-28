import { HeartCell } from "./HeartCell";
import { useEffect, useMemo, useState } from "react";
import { useGoalFx } from "./GoalFx";
import { useCountUp } from "@/hooks/use-count-up";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Droplets,
  Pill,
  Plus,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type MetricKey = "hidratacao" | "alimentacao" | "medicacao" | "atividade";
type Series = { key: MetricKey; days: number[] };
const db = supabase as unknown as { from: (t: string) => any };
const tz = "America/Rio_Branco";
const dayKey = (d: Date | string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d));
const weekday = (key: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" })
    .format(new Date(key + "T12:00:00Z"))
    .replace(".", "");

const meta: Record<
  MetricKey,
  { label: string; icon: LucideIcon; color: string; unit: (v: number) => string; empty: string }
> = {
  hidratacao: {
    label: "Água",
    icon: Droplets,
    color: "#0ea5e9",
    unit: (v) =>
      v >= 1000 ? `${(v / 1000).toFixed(1).replace(".", ",")} L` : `${Math.round(v)} ml`,
    empty: "Registrar água",
  },
  alimentacao: {
    label: "Refeições",
    icon: UtensilsCrossed,
    color: "#10b981",
    unit: (v) => `${v} ${v === 1 ? "refeição" : "refeições"}`,
    empty: "Registrar refeição",
  },
  medicacao: {
    label: "Medicação",
    icon: Pill,
    color: "#8b5cf6",
    unit: (v) => `${v} ${v === 1 ? "dose" : "doses"}`,
    empty: "Ver medicação",
  },
  atividade: {
    label: "Atividade",
    icon: Activity,
    color: "#f97316",
    unit: (v) => `${v} ${v === 1 ? "registro" : "registros"}`,
    empty: "Registrar treino",
  },
};

/** Últimos 7 dias de cada métrica, lidos direto dos registros do usuário (inclui registros fora da agenda). */
function useWeek(patientId: string, ownerId: string, revision: number) {
  const [series, setSeries] = useState<Series[] | null>(null);
  const keys = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dayKey(new Date(Date.now() - (6 - i) * 86400000))),
    [revision],
  );
  // Ao vivo: atualiza sozinho a cada 30 segundos, sem recarregar a página.
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setPulse((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    let active = true;
    const from = new Date(keys[0] + "T00:00:00-05:00").toISOString();
    const bucket = (rows: { at: string; v: number }[]) =>
      keys.map((k) => rows.filter((r) => dayKey(r.at) === k).reduce((a, r) => a + r.v, 0));
    void Promise.all([
      db
        .from("care_hydration")
        .select("amount_ml,recorded_at")
        .eq("patient_id", patientId)
        .gte("recorded_at", from)
        .limit(2000),
      db
        .from("care_nutrition_meal_logs")
        .select("id,recorded_at")
        .eq("patient_id", patientId)
        .gte("recorded_at", from)
        .limit(1000),
      db
        .from("care_food_consumptions")
        .select("meal_group_id,request_id,recorded_at")
        .eq("patient_id", patientId)
        .gte("recorded_at", from)
        .limit(2000),
      db
        .from("care_client_medication_intakes")
        .select("id,taken_at")
        .eq("patient_id", patientId)
        .gte("taken_at", from)
        .limit(1000),
      db
        .from("care_activity_log")
        .select("id,recorded_at")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .eq("category", "atividade")
        .in("event_type", ["confirmed", "logged"])
        .gte("recorded_at", from)
        .limit(1000),
      // Refeições registradas pelo botão "Registrar refeição" e refeições da agenda confirmadas.
      db
        .from("care_activity_log")
        .select("id,happened_at,recorded_at,details")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .eq("category", "refeicao")
        .in("event_type", ["confirmed", "logged"])
        .gte("recorded_at", from)
        .limit(1000),
      db
        .from("care_client_beverages")
        .select("amount_ml,consumed_at")
        .eq("patient_id", patientId)
        .gte("consumed_at", from)
        .limit(2000),
    ]).then(
      ([water, logs, foods, meds, acts, mealActs, bevs]) => {
        if (!active) return;
        // Uma refeição só conta uma vez, mesmo registrada por mais de um caminho (agenda, Alimentação, calculadora):
        // mesma regra do "Meu dia" (registros a menos de 3 min um do outro são a mesma refeição).
        const mealTimes: number[] = [];
        const addMeal = (iso: string) => {
          const t = Date.parse(iso);
          if (mealTimes.some((m) => Math.abs(m - t) < 3 * 60_000)) return;
          mealTimes.push(t);
        };
        const seenReq = new Set<string>();
        for (const m of mealActs?.data ?? []) {
          if (m.details?.superseded) continue;
          const g = m.details?.request_id ?? `act:${m.id}`;
          if (seenReq.has(g)) continue;
          seenReq.add(g);
          addMeal(m.happened_at ?? m.recorded_at);
        }
        for (const r of logs.data ?? []) addMeal(r.recorded_at);
        const seenGroup = new Set<string>();
        for (const f of foods.data ?? []) {
          const g = f.meal_group_id ?? f.request_id;
          if (!g || seenGroup.has(g)) continue;
          seenGroup.add(g);
          addMeal(f.recorded_at);
        }
        setSeries([
          // Água + outras bebidas (suco, chá, café, leite…): todos contam como líquidos do dia.
          {
            key: "hidratacao",
            days: bucket([
              ...(water.data ?? []).map((r: any) => ({
                at: r.recorded_at,
                v: Number(r.amount_ml) || 0,
              })),
              ...(bevs?.data ?? []).map((r: any) => ({
                at: r.consumed_at,
                v: Number(r.amount_ml) || 0,
              })),
            ]),
          },
          {
            key: "alimentacao",
            days: bucket(mealTimes.map((t) => ({ at: new Date(t).toISOString(), v: 1 }))),
          },
          {
            key: "medicacao",
            days: bucket((meds.data ?? []).map((r: any) => ({ at: r.taken_at, v: 1 }))),
          },
          {
            key: "atividade",
            days: bucket((acts.data ?? []).map((r: any) => ({ at: r.recorded_at, v: 1 }))),
          },
        ]);
      },
      () => active && setSeries([]),
    );
    return () => {
      active = false;
    };
  }, [patientId, ownerId, keys, pulse]);
  return { series, keys };
}

const order: MetricKey[] = ["hidratacao", "alimentacao", "medicacao", "atividade"];

/** Meta de hoje por métrica: água pela meta do perfil, 3 refeições, doses programadas e 1 sessão de atividade. */
function targetFor(k: MetricKey, waterGoal: number, scheduled: number) {
  if (k === "hidratacao") return waterGoal || 0;
  if (k === "alimentacao") return Math.max(3, scheduled);
  if (k === "medicacao") return scheduled;
  return 1;
}

/** Comemora quando a meta de hoje é batida (uma vez por dia e por meta). */
function useGoalCelebrations(
  series: Series[],
  waterGoal: number,
  scheduled: Partial<Record<MetricKey, number>>,
) {
  const fx = useGoalFx();
  useEffect(() => {
    const today = dayKey(new Date());
    for (const k of ["hidratacao", "medicacao"] as const) {
      const s = series.find((x) => x.key === k);
      const value = s?.days[s.days.length - 1] ?? 0;
      const target = targetFor(k, waterGoal, scheduled[k] ?? 0);
      if (!target || value < target) continue;
      const key = `nv-goal-hit-${k}-${today}`;
      try {
        if (localStorage.getItem(key)) continue;
        localStorage.setItem(key, "1");
      } catch {
        continue;
      }
      const water = k === "hidratacao";
      fx.push({
        kind: "hit",
        metric: k,
        day: today,
        actual: value,
        target,
        pct: Math.round((value / target) * 100),
        unit: water ? "ml" : "doses",
        title: water ? "Meta de hidratação batida!" : "Todas as doses de hoje tomadas!",
        subtitle: water
          ? `${value.toLocaleString("pt-BR")} de ${target.toLocaleString("pt-BR")} ml`
          : `${value} de ${target} doses`,
        detail: "Excelente constância. Seu progresso foi guardado no histórico.",
      });
    }
  }, [series, waterGoal, scheduled, fx]);
}

/**
 * Painel do dia: pontuação à esquerda e uma coluna por área (hoje, meta e últimos 7 dias).
 * Áreas ainda sem registro ocupam a mesma coluna com um atalho — nunca sobra espaço vazio.
 */
function DayBoard({
  series,
  keys,
  waterGoal,
  scheduled,
  onOpen,
  patientId,
  ageYears,
}: {
  patientId: string;
  ageYears?: number | null;
  series: Series[];
  keys: string[];
  waterGoal: number;
  scheduled: Partial<Record<MetricKey, number>>;
  onOpen: (k: MetricKey) => void;
}) {
  useGoalCelebrations(series, waterGoal, scheduled);
  const cells = order.map((k) => {
    const days = series.find((s) => s.key === k)?.days ?? [0, 0, 0, 0, 0, 0, 0];
    const today = days[6];
    const target = targetFor(k, waterGoal, scheduled[k] ?? 0);
    const prev = days.slice(0, 6);
    const avg = prev.reduce((a, b) => a + b, 0) / Math.max(1, prev.filter((v) => v > 0).length);
    return {
      k,
      days,
      today,
      target,
      empty: days.every((v) => v === 0),
      pct: target ? Math.min(100, Math.round((today / target) * 100)) : null,
      trend: avg > 0 ? Math.round(((today - avg) / avg) * 100) : null,
    };
  });
  const counted = cells.filter((c) => !c.empty && c.pct !== null);
  const score = counted.length
    ? Math.round(counted.reduce((a, c) => a + (c.pct ?? 0), 0) / counted.length)
    : 0;
  const status =
    score >= 85
      ? "Dia excelente"
      : score >= 60
        ? "Bom ritmo"
        : score >= 25
          ? "Em andamento"
          : "Comece o seu dia";
  const shownScore = Math.round(useCountUp(score));
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <section
      aria-label="Painel do dia"
      className="nv-dark nv-scan grid overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#121b45] via-[#0b1230] to-[#080e24] text-white shadow-card lg:grid-cols-[16rem_minmax(0,1fr)]"
    >
      <div className="relative flex flex-col justify-between gap-3 border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-400">
          <span>Pontuação do dia</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            <i className="nv-live size-1.5 rounded-full bg-emerald-400" /> ao vivo
          </span>
        </div>
        <div
          role="img"
          aria-label={`Pontuação ${score} de 100. ${status}.`}
          className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-3"
        >
          <div className="relative size-[7.5rem] shrink-0">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
              <defs>
                <linearGradient id="nv-score-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke="rgba(255,255,255,.08)"
                strokeWidth="9"
              />
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke="url(#nv-score-grad)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * C} ${C}`}
                className="transition-[stroke-dasharray] duration-700"
              />
            </svg>
            <p className="absolute inset-0 grid place-content-center text-center font-display text-4xl font-extrabold leading-none tabular-nums">
              {shownScore}
              <span className="mt-0.5 text-[11px] font-semibold text-slate-400">de 100</span>
            </p>
          </div>
          <p className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-200">
            {status}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-white/10 max-lg:divide-y xl:grid-cols-4 xl:divide-x">
        {cells.map((c, idx) => {
          const m = meta[c.k];
          if (c.k === "medicacao")
            return (
              <div
                key="coracao"
                style={{ ["--c" as string]: "#fb7185" }}
                className={`${idx % 2 === 0 ? "max-xl:border-r max-xl:border-white/10" : ""} ${idx > 1 ? "max-xl:border-t max-xl:border-white/10" : ""} flex min-w-0 flex-col hover:bg-white/[.035]`}
              >
                <HeartCell
                  patientId={patientId}
                  ageYears={ageYears}
                  onOpen={() => onOpen("batimentos" as MetricKey)}
                />
              </div>
            );
          const peak = Math.max(...c.days, c.target || 0, 1);
          return (
            <button
              key={c.k}
              type="button"
              onClick={() => onOpen(c.k)}
              aria-label={c.empty ? `${m.label}: ${m.empty}` : `${m.label}: abrir detalhes`}
              className={`group relative flex min-w-0 flex-col gap-2.5 p-4 text-left transition-colors hover:bg-white/[.05] ${idx % 2 === 0 ? "max-xl:border-r max-xl:border-white/10" : ""} ${idx > 1 ? "max-xl:border-t max-xl:border-white/10" : ""}`}
              style={{ ["--c" as string]: m.color }}
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <span
                  className="grid size-7 place-items-center rounded-lg text-white"
                  style={{ background: m.color }}
                >
                  <m.icon size={13} />
                </span>
                {m.label}
                {!c.empty && c.trend !== null && (
                  <span
                    className={`ml-auto inline-flex items-center gap-0.5 text-[11px] font-bold ${c.trend >= 0 ? "text-emerald-300" : "text-amber-300"}`}
                    title="Hoje comparado à média dos 6 dias anteriores"
                  >
                    {c.trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(c.trend)}%
                  </span>
                )}
              </span>
              {c.empty ? (
                <span className="flex flex-1 flex-col gap-2">
                  <span className="text-xs text-slate-400">Sem registros nos últimos 7 dias</span>
                  <span className="flex min-h-10 flex-1 items-end gap-1" aria-hidden="true">
                    {keys.map((k) => (
                      <i
                        key={k}
                        className="h-1.5 flex-1 rounded-t-[4px]"
                        style={{ background: `color-mix(in srgb, ${m.color} 22%, transparent)` }}
                      />
                    ))}
                  </span>
                  <span
                    className="inline-flex h-8 w-fit items-center gap-1 rounded-full px-3 text-[11px] font-bold text-white transition group-hover:brightness-110"
                    style={{ background: m.color }}
                  >
                    <Plus size={12} /> {m.empty}
                  </span>
                </span>
              ) : (
                <>
                  <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <span className="whitespace-nowrap font-display text-[clamp(1rem,1.5vw,1.25rem)] font-extrabold leading-none tabular-nums">
                      {m.unit(c.today)}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {c.target ? `meta ${m.unit(c.target)}` : "hoje"}
                    </span>
                  </span>
                  {c.pct !== null && (
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <i
                          className="nv-sheen block h-full rounded-full transition-[width] duration-700"
                          style={{ width: `${c.pct}%`, background: m.color }}
                        />
                      </span>
                      <span className="w-10 whitespace-nowrap text-right text-[11px] font-bold tabular-nums">
                        {c.pct}%
                      </span>
                    </span>
                  )}
                  <span
                    className="mt-auto flex h-10 items-end gap-1"
                    role="img"
                    aria-label={`${m.label} nos últimos 7 dias`}
                  >
                    {c.days.map((v, i) => (
                      <i
                        key={keys[i] ?? i}
                        title={`${weekday(keys[i] ?? "")}: ${m.unit(v)}`}
                        className={`flex-1 rounded-t-[4px] ${i === 6 ? "nv-grow-live" : "nv-grow"}`}
                        style={{
                          height: `${Math.max(8, (v / peak) * 100)}%`,
                          background:
                            i === 6 ? m.color : `color-mix(in srgb, ${m.color} 32%, transparent)`,
                          animationDelay: `${i * 70}ms`,
                        }}
                      />
                    ))}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function OverviewInsights({
  patientId,
  ownerId,
  revision,
  waterGoal,
  scheduled,
  onOpen,
  ageYears,
}: {
  ageYears?: number | null;
  patientId: string;
  ownerId: string;
  revision: number;
  waterGoal: number;
  scheduled: Partial<Record<MetricKey, number>>;
  onOpen: (key: MetricKey) => void;
}) {
  const { series, keys } = useWeek(patientId, ownerId, revision);
  if (series === null)
    return (
      <div className="grid gap-3 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="h-60 animate-pulse rounded-2xl bg-muted/60" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted/60" />
          ))}
        </div>
      </div>
    );
  const list = order.map(
    (k) => series.find((s) => s.key === k) ?? { key: k, days: [0, 0, 0, 0, 0, 0, 0] },
  );
  const active = list.filter((s) => s.days.some((v) => v > 0));
  if (!active.length)
    return (
      <DayBoard
        series={list}
        keys={keys}
        waterGoal={waterGoal}
        scheduled={scheduled}
        onOpen={onOpen}
        patientId={patientId}
        ageYears={ageYears}
      />
    );
  return (
    <DayBoard
      series={list}
      keys={keys}
      waterGoal={waterGoal}
      scheduled={scheduled}
      onOpen={onOpen}
      patientId={patientId}
      ageYears={ageYears}
    />
  );
}
