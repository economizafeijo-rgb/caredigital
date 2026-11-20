import { useEffect, useMemo, useState } from "react";
import { useGoalFx } from "./GoalFx";
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
        const foodGroups = new Map<string, string>();
        for (const m of mealActs?.data ?? []) {
          if (m.details?.superseded) continue;
          const g = m.details?.request_id ?? `act:${m.id}`;
          if (!foodGroups.has(g)) foodGroups.set(g, m.happened_at ?? m.recorded_at);
        }
        for (const f of foods.data ?? []) {
          const g = f.meal_group_id ?? f.request_id;
          if (g && !foodGroups.has(g)) foodGroups.set(g, f.recorded_at);
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
            days: bucket([
              ...(logs.data ?? []).map((r: any) => ({ at: r.recorded_at, v: 1 })),
              ...[...foodGroups.values()].map((at) => ({ at, v: 1 })),
            ]),
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
  }, [patientId, ownerId, keys]);
  return { series, keys };
}

function MetricCard({
  k,
  days,
  keys,
  goal,
  scheduled,
  onOpen,
  index,
}: {
  k: MetricKey;
  days: number[];
  keys: string[];
  goal: number;
  scheduled: number;
  onOpen: () => void;
  index: number;
}) {
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
  const empty = days.every((v) => v === 0);
  return (
    <article
      className="nv-insight nv-rise group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4"
      style={{ ["--c" as string]: m.color, animationDelay: `${index * 80}ms` }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-35"
        style={{ background: m.color }}
      />
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-2 text-sm font-semibold hover:underline"
        >
          <span
            className="grid size-9 place-items-center rounded-xl text-white shadow-md"
            style={{
              background: `linear-gradient(135deg, ${m.color}, color-mix(in srgb, ${m.color} 60%, #000))`,
            }}
          >
            <m.icon size={17} />
          </span>
          {m.label}
        </button>
        {empty && (
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold text-white transition hover:brightness-110 active:scale-95"
            style={{ background: m.color }}
          >
            <Plus size={12} /> {m.empty}
          </button>
        )}
        {trend !== null && hover === null && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${trend >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}
          >
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}% vs. média
          </span>
        )}
      </header>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div key={shown} className="nv-fade-in min-w-0">
          <p
            className={`font-display text-2xl font-extrabold leading-none tabular-nums ${empty ? "text-muted-foreground" : ""}`}
          >
            {empty ? "Sem registros" : m.unit(days[shown])}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {empty
              ? "Nos últimos 7 dias"
              : shown === 6
                ? target
                  ? `hoje · meta ${m.unit(target)}`
                  : "hoje"
                : `${weekday(keys[shown])}, ${keys[shown].slice(8)}/${keys[shown].slice(5, 7)}`}
          </p>
        </div>
        {pct !== null && !empty && (
          <div className="relative size-12 shrink-0" title={`${pct}% da meta de hoje`}>
            <svg viewBox="0 0 36 36" className="size-full -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                className="text-muted"
                strokeWidth="4"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke={m.color}
                strokeWidth="4"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${pct} 100`}
                className="nv-ring-draw"
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[11px] font-bold tabular-nums">
              {pct}%
            </span>
          </div>
        )}
      </div>
      <div
        className="mt-auto flex h-14 items-end gap-1.5 pt-3"
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`${m.label} nos últimos 7 dias`}
      >
        {days.map((v, i) => (
          <button
            key={keys[i]}
            type="button"
            tabIndex={-1}
            onPointerEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            aria-label={`${weekday(keys[i])}: ${m.unit(v)}`}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <span
              className="nv-m-bar w-full rounded-md transition-[opacity,transform] duration-200"
              style={{
                height: `${empty ? 12 + ((i * 37) % 30) : Math.max(6, (v / max) * 100)}%`,
                background: empty
                  ? "color-mix(in srgb, currentColor 10%, transparent)"
                  : i === 6
                    ? m.color
                    : `color-mix(in srgb, ${m.color} 35%, transparent)`,
                opacity: hover === null || hover === i ? 1 : 0.45,
                animationDelay: `${i * 50}ms`,
                animationIterationCount: 1,
              }}
            />
            <span
              className={`text-[11px] capitalize ${i === 6 ? "font-bold text-foreground" : "text-muted-foreground"}`}
            >
              {i === 6 ? "hoje" : weekday(keys[i]).slice(0, 3)}
            </span>
          </button>
        ))}
      </div>
    </article>
  );
}

/** Valor curto para caber na linha da pontuação (ex.: 1,2 L · 4 · 30 min). */
const short = (v: number, k: MetricKey) =>
  k === "hidratacao"
    ? v >= 1000
      ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`
      : `${Math.round(v)} ml`
    : k === "atividade"
      ? `${Math.round(v)}`
      : `${Math.round(v)}`;
const order: MetricKey[] = ["hidratacao", "alimentacao", "medicacao", "atividade"];

/** Meta de hoje por métrica: água pela meta do perfil, 3 refeições, doses programadas e 1 sessão de atividade. */
function targetFor(k: MetricKey, waterGoal: number, scheduled: number) {
  if (k === "hidratacao") return waterGoal || 2000;
  if (k === "alimentacao") return Math.max(3, scheduled);
  if (k === "medicacao") return scheduled;
  return 1;
}

function ScoreCard({
  series,
  waterGoal,
  scheduled,
  onOpen,
}: {
  series: Series[];
  waterGoal: number;
  scheduled: Partial<Record<MetricKey, number>>;
  onOpen: (k: MetricKey) => void;
}) {
  const fx = useGoalFx();
  // Comemora quando a meta de hoje é batida (uma vez por dia e por meta).
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
  const rows = order
    .filter((k) => (series.find((s) => s.key === k)?.days ?? []).some((v) => v > 0))
    .map((k) => {
      const today = series.find((s) => s.key === k)?.days[6] ?? 0;
      const target = targetFor(k, waterGoal, scheduled[k] ?? 0);
      return {
        k,
        today,
        target,
        pct: target ? Math.min(100, Math.round((today / target) * 100)) : null,
      };
    });
  const counted = rows.filter((r) => r.pct !== null);
  const score = counted.length
    ? Math.round(counted.reduce((a, r) => a + (r.pct ?? 0), 0) / counted.length)
    : 0;
  const status =
    score >= 85
      ? "Dia excelente"
      : score >= 60
        ? "Bom ritmo"
        : score >= 25
          ? "Em andamento"
          : "Comece o seu dia";
  const R = 52,
    C = 2 * Math.PI * R;
  return (
    <section
      aria-label="Pontuação do dia"
      className="nv-dark nv-rise relative isolate flex flex-col overflow-hidden rounded-2xl bg-[#071512] p-4 text-white shadow-card sm:p-5"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-20 -z-10 size-64 rounded-full bg-emerald-400/20 blur-3xl"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-emerald-200">Pontuação do dia</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-emerald-100">
          <i className="nv-live size-1.5 rounded-full bg-emerald-300" /> ao vivo
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div
          className="relative size-28 shrink-0"
          role="img"
          aria-label={`Pontuação ${score} de 100`}
        >
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <defs>
              <linearGradient id="nv-score-g" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#34d399" />
                <stop offset="1" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r={R} fill="none" stroke="#ffffff14" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke="#ffffff10"
              strokeWidth="10"
              strokeDasharray="2 6"
            />
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke="url(#nv-score-g)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - score / 100)}
              style={{
                transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)",
                filter: "drop-shadow(0 0 6px rgba(52,211,153,.55))",
              }}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-center leading-none">
            <span>
              <strong className="block font-display text-3xl font-extrabold tabular-nums">
                {score}
              </strong>
              <span className="text-[11px] font-semibold text-white/60">de 100</span>
            </span>
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-xl font-extrabold">{status}</p>
          <p className="mt-1 text-xs text-white/65">
            Média do quanto você já cumpriu das metas de hoje.
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-2">
        {rows.map((r, i) => {
          const m = meta[r.k];
          return (
            <li key={r.k}>
              <button
                type="button"
                onClick={() => onOpen(r.k)}
                className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition hover:bg-white/[.06]"
              >
                <span
                  className="grid size-7 place-items-center rounded-lg"
                  style={{
                    background: `color-mix(in srgb, ${m.color} 25%, transparent)`,
                    color: m.color,
                  }}
                >
                  <m.icon size={14} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline justify-between gap-2 whitespace-nowrap text-[11px] font-semibold">
                    <span className="truncate text-white/80">{m.label}</span>
                    <span className="shrink-0 tabular-nums text-white/60">
                      {r.pct === null
                        ? "sem doses"
                        : `${short(r.today, r.k)} / ${short(r.target, r.k)}`}
                    </span>
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/10">
                    <i
                      className="block h-full rounded-full transition-[width] duration-700 ease-out"
                      style={{
                        width: `${r.pct ?? 0}%`,
                        background: m.color,
                        transitionDelay: `${i * 90}ms`,
                      }}
                    />
                  </span>
                </span>
                <span className="w-10 shrink-0 whitespace-nowrap text-right text-xs font-bold tabular-nums text-white/85 transition-transform group-hover:translate-x-0.5">
                  {r.pct === null ? "—" : `${r.pct}%`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Painel da Visão geral: só aparecem as áreas que têm registros nos últimos 7 dias.
 * Quando o usuário registra algo numa área nova, o cartão surge e a grade se reorganiza
 * para ocupar toda a largura; áreas sem dados ficam num atalho discreto, sem ocupar espaço.
 */
export function OverviewInsights({
  patientId,
  ownerId,
  revision,
  waterGoal,
  scheduled,
  onOpen,
}: {
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
  const idle = list.filter((s) => !s.days.some((v) => v > 0));
  const starters = idle.length > 0 && (
    <div
      className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground"
      aria-label="Áreas ainda sem registros"
    >
      <span className="font-semibold">
        {active.length ? "Acompanhar também:" : "Comece registrando:"}
      </span>
      {idle.map((s) => {
        const m = meta[s.key];
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onOpen(s.key)}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 font-semibold text-foreground transition hover:bg-muted active:scale-95"
          >
            <m.icon size={12} style={{ color: m.color }} /> {m.label}
          </button>
        );
      })}
    </div>
  );
  if (!active.length)
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-4">
        {starters}
      </div>
    );
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <ScoreCard series={list} waterGoal={waterGoal} scheduled={scheduled} onOpen={onOpen} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] content-start gap-3">
          {active.map((s, i) => (
            <MetricCard
              key={s.key}
              k={s.key}
              days={s.days}
              keys={keys}
              index={i + 1}
              goal={s.key === "hidratacao" ? waterGoal : 0}
              scheduled={
                s.key === "atividade"
                  ? 1
                  : s.key === "alimentacao"
                    ? Math.max(3, scheduled.alimentacao ?? 0)
                    : (scheduled[s.key] ?? 0)
              }
              onOpen={() => onOpen(s.key)}
            />
          ))}
        </div>
      </div>
      {starters}
    </div>
  );
}
