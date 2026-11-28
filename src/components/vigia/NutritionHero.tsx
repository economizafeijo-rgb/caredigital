import { EvoChart, EvoLegend } from "./EvoChart";
import { useMemo, useState, type ReactNode } from "react";
import { Beef, Droplet, Leaf, Target, Wheat } from "lucide-react";
import {
  measureUnit,
  microTargets,
  sumNutrients,
  type Micros,
  type Nutrients,
} from "@/lib/food-parser";
import { objectiveLabel } from "@/lib/objective-nutrition";
import { evaluateRisks } from "@/lib/nutrition-risk";
import { detectCaffeine, detectLactose, LACTOSE_THRESHOLDS } from "@/lib/intake-detect";
import { DEFAULT_LIMIT_MG } from "@/lib/caffeine";
import type { DailyNutrition } from "./DailyNutritionPanel";
import { NextUpClock } from "./NextUpClock";
import { NutrientArt, NUTRIENT_INK } from "./NutrientArt";
import { MACRO_COLORS, MacroBreakdown } from "./MacroBreakdown";

const tz = "America/Rio_Branco";
const hourOf = (iso: string) => {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  return (
    Number(p.find((x) => x.type === "hour")?.value ?? 0) +
    Number(p.find((x) => x.type === "minute")?.value ?? 0) / 60
  );
};
const n0 = (v: number) => Math.round(v).toLocaleString("pt-BR");
const entryNutrients = (e: DailyNutrition["entries"][number]): Nutrients =>
  e.direct ?? sumNutrients(e.foods.map((f) => f.nutrients));

const macros = [
  { key: "protein", label: "Proteína", short: "Proteína", icon: Beef, color: MACRO_COLORS.protein },
  { key: "carbs", label: "Carboidrato", short: "Carbos", icon: Wheat, color: MACRO_COLORS.carbs },
  { key: "fat", label: "Gordura", short: "Gordura", icon: Droplet, color: MACRO_COLORS.fat },
] as const;

const fiberMacro = {
  key: "fiber",
  label: "Fibras",
  short: "Fibras",
  icon: Leaf,
  color: "#14b8a6",
} as const;
const macroList = [...macros, fiberMacro] as const;

const mealSlots: [number, string][] = [
  [7, "Café da manhã"],
  [10, "Lanche da manhã"],
  [12.5, "Almoço"],
  [15.5, "Lanche da tarde"],
  [19, "Jantar"],
  [21, "Ceia"],
];
const acreDayStart = () =>
  Date.parse(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date()) + "T00:00:00-05:00",
  );

/** Próxima refeição: cerca de 3 h após a última refeição registrada, alinhada aos horários usuais do dia. */
export function nextMealPlan(entries: DailyNutrition["entries"], now = Date.now()) {
  const day = acreDayStart();
  const meals = entries
    .filter((e) => e.entryType !== "beverage")
    .map((e) => Date.parse(e.at))
    .sort((a, b) => a - b);
  const last = meals.at(-1) ?? null;
  const slotAt = (h: number) => day + h * 3_600_000;
  const at = last
    ? last + 3 * 3_600_000
    : (mealSlots.map(([h]) => slotAt(h)).find((t) => t > now - 45 * 60_000) ?? null);
  if (at === null || at > slotAt(21.5)) return null;
  const hour = (at - day) / 3_600_000;
  const name = mealSlots.reduce((best, cur) =>
    Math.abs(cur[0] - hour) < Math.abs(best[0] - hour) ? cur : best,
  )[1];
  return { at, from: last, name };
}

/** Cartão principal da Alimentação: prato com anel de calorias e os três macronutrientes do dia. */
export function NutritionHero({
  data,
  actions,
  onRegister,
}: {
  data: DailyNutrition;
  actions?: ReactNode;
  onRegister?: () => void;
}) {
  const plan = nextMealPlan(data.entries);
  const { total, target, objective, loaded, entries } = data;
  const pct = target.kcal ? Math.min(100, Math.round((total.kcal / target.kcal) * 100)) : 0;
  const left = Math.max(0, target.kcal - total.kcal);
  const mTotal = total.protein * 4 + total.carbs * 4 + total.fat * 9 || 1;
  let acc = 0;
  return (
    <header className="nv-dark nv-scan relative isolate overflow-hidden border border-emerald-400/25 bg-gradient-to-br from-[#052e1f] via-[#0a4a33] to-[#1f5a2a] p-3 text-white shadow-card">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-lime-300/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 left-1/3 -z-10 size-56 rounded-full bg-emerald-300/10 blur-3xl"
      />
      {/* Celular: anel + números lado a lado, botão de registro em largura total, macros em 3 colunas.
          Computador: anel | números e macros | próxima refeição. */}
      <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_minmax(15rem,19rem)_minmax(12rem,15rem)] lg:items-center lg:gap-x-5 lg:gap-y-1.5">
        <div className="flex items-center gap-3.5 lg:contents">
          <div
            className="relative size-24 shrink-0 lg:row-span-2 lg:size-20"
            role="img"
            aria-label={`${n0(total.kcal)} de ${n0(target.kcal)} kcal hoje`}
          >
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#ffffff1c" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#f97316"
                strokeWidth="8"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${pct} 100`}
                className="nv-ring-draw"
              />
              {macros.map((m) => {
                const v = ((total[m.key] * (m.key === "fat" ? 9 : 4)) / mTotal) * 100;
                const el = (
                  <circle
                    key={m.key}
                    cx="60"
                    cy="60"
                    r="42"
                    fill="none"
                    stroke={m.color}
                    strokeWidth="6"
                    pathLength={100}
                    strokeDasharray={`${Math.max(0, v - 1.5)} 100`}
                    strokeDashoffset={-acc}
                    style={{ transition: "stroke-dasharray .8s, stroke-dashoffset .8s" }}
                  />
                );
                acc += v;
                return el;
              })}
            </svg>
            <div className="absolute inset-[19%] grid place-items-center rounded-full bg-black/25 text-center shadow-inner">
              <span className="leading-none">
                <strong className="block text-lg font-extrabold tabular-nums">{pct}%</strong>
                <span className="text-[10px] font-semibold text-white/70">da meta</span>
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 lg:col-start-2 lg:row-start-1 lg:self-end">
            <p className="text-[1.75rem] font-extrabold leading-none tabular-nums sm:text-3xl">
              {loaded ? n0(total.kcal) : "…"}
              <span className="ml-1.5 text-sm font-semibold text-white/65 sm:text-base">
                de {n0(target.kcal)} kcal
              </span>
            </p>
            <p className="mt-1 text-[0.8125rem] leading-snug text-white/80">
              {!entries.length
                ? "Registre o que comer e o NextVita calcula os nutrientes."
                : left > 0
                  ? `Faltam ${n0(left)} kcal para a referência de hoje.`
                  : "Referência de calorias de hoje alcançada."}
            </p>
            <span className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-lime-100">
              <Target size={12} className="shrink-0" />
              <span className="truncate">{objectiveLabel(objective)}</span>
            </span>
          </div>
        </div>

        <div className="grid min-w-0 gap-2.5 lg:contents">
          {actions && (
            <div className="flex lg:col-start-2 lg:row-start-2 lg:self-start [&>*]:w-full [&_button]:w-full [&_button]:justify-center sm:[&>*]:w-auto sm:[&_button]:w-auto">
              {actions}
            </div>
          )}
          <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:grid-cols-1 lg:gap-1">
            {macroList.map((m, i) => {
              const v = total[m.key],
                t = target[m.key] || 1;
              const p = Math.min(100, Math.round((v / t) * 100));
              return (
                <li
                  key={m.key}
                  className="relative min-w-0 overflow-hidden rounded-lg border px-2 py-1.5 pr-9 transition-[filter] hover:brightness-110 sm:px-2.5 sm:pr-12 lg:grid lg:grid-cols-[6.5rem_minmax(0,1fr)_auto] lg:items-center lg:gap-2 lg:py-1 lg:pr-2.5"
                  style={{
                    borderColor: `color-mix(in srgb, ${m.color} 60%, transparent)`,
                    background: `linear-gradient(135deg, color-mix(in srgb, ${m.color} 30%, #10141c), color-mix(in srgb, ${m.color} 8%, #10141c))`,
                    boxShadow: `inset 0 2px 0 ${m.color}`,
                  }}
                >
                  {m.key !== "fiber" && (
                    <NutrientArt
                      kind={m.key}
                      className="pointer-events-none absolute -bottom-1 -right-0.5 size-9 sm:size-11 lg:hidden"
                    />
                  )}
                  <span
                    className="flex items-center gap-1 text-[11px] font-bold"
                    style={{ color: m.key === "fiber" ? "#5eead4" : NUTRIENT_INK[m.key] }}
                  >
                    <m.icon size={12} className="shrink-0" />
                    <span className="truncate sm:hidden">{m.short}</span>
                    <span className="hidden truncate sm:inline">{m.label}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-bold tabular-nums text-white lg:order-3 lg:mt-0 lg:text-xs">
                    {n0(v)}
                    <span className="text-[11px] font-medium text-white/55">/{n0(t)} g</span>
                  </span>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15 lg:order-2 lg:mt-0">
                    <i
                      className="block h-full rounded-full transition-[width] duration-700 ease-out"
                      style={{
                        width: `${p}%`,
                        background: m.color,
                        transitionDelay: `${i * 120}ms`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <NextUpClock
          alertKey="refeicao"
          title="Próxima refeição"
          color="#fdba74"
          target={plan?.at ?? null}
          from={plan?.from ?? null}
          detail={plan?.name}
          emptyText="Refeições do dia encerradas"
          compact
          actionLabel={actions ? undefined : "Registrar refeição"}
          onAction={actions ? undefined : onRegister}
          className="lg:col-start-4 lg:row-span-2 lg:row-start-1"
        />
      </div>
    </header>
  );
}

const LIMIT_KEYS = new Set(["sugar", "sodium", "caffeine", "lactose"]);
const OVER_KEYS = new Set(["kcal", "carbs", "fat"]);

type DayEntry = DailyNutrition["entries"][number];

/** Açúcar, sódio, cafeína e lactose de um registro (estimativas pelos nomes e quantidades). */
function extrasOf(e: DayEntry, target: DailyNutrition["target"]) {
  const risks = evaluateRisks([e], { kcal: target.kcal, fat: target.fat });
  const val = (k: string) => risks.find((r) => r.key === k)?.value ?? 0;
  let caffeine = 0;
  let lactose = 0;
  const hit = (text: string, amount: number, kind?: string | null) => {
    caffeine += detectCaffeine(text, amount, kind)?.mg ?? 0;
    lactose += detectLactose(text, amount)?.g ?? 0;
  };
  if (e.entryType === "beverage") hit(e.text, e.amountMl ?? 0);
  else if (e.foodId && e.grams) hit(e.foodName ?? e.foodId.replace(/_/g, " "), e.grams);
  else for (const f of e.foods) hit(f.name, f.grams);
  return { sodium: val("sodium"), sugar: val("sugar"), caffeine, lactose };
}

type DayItem = { name: string; qty: string; v: Record<DayMetric["key"], number> };

/** De onde vem cada nutriente: um item por alimento (ou bebida, ou porção) do registro. */
function itemsOf(e: DayEntry, target: DailyNutrition["target"]): DayItem[] {
  const limits = { kcal: target.kcal, fat: target.fat };
  if (!e.direct && e.foods.length) {
    return e.foods.map((f) => {
      const risks = evaluateRisks([{ foods: [f], direct: null }], limits);
      const val = (k: string) => risks.find((r) => r.key === k)?.value ?? 0;
      return {
        name: f.name.split(",")[0].split("(")[0].trim(),
        qty: `${Math.round(f.grams)} ${measureUnit(f.id)}`,
        v: {
          ...f.nutrients,
          sodium: val("sodium"),
          sugar: val("sugar"),
          caffeine: detectCaffeine(f.name, f.grams)?.mg ?? 0,
          lactose: detectLactose(f.name, f.grams)?.g ?? 0,
        } as Record<DayMetric["key"], number>,
      };
    });
  }
  const n = entryNutrients(e);
  return [
    {
      name: (e.foodName ?? e.text ?? e.source).split(",")[0],
      qty: e.grams
        ? `${Math.round(e.grams)} ${measureUnit(e.foodId ?? "")}`
        : e.amountMl
          ? `${e.amountMl} ml`
          : "",
      v: { ...n, ...extrasOf(e, target) } as Record<DayMetric["key"], number>,
    },
  ];
}

type DayMetric = {
  key:
    | "kcal"
    | "protein"
    | "carbs"
    | "fat"
    | "fiber"
    | "sugar"
    | "sodium"
    | "caffeine"
    | "lactose"
    | keyof Micros;
  label: string;
  unit: string;
  color: string;
  target: number;
};

/** Evolução do dia: o acumulado de cada nutriente escolhido, com a meta de cada um. */
export function NutritionDayChart({ data }: { data: DailyNutrition }) {
  const { entries, target } = data;
  const H0 = 5,
    H1 = 24;
  const [sel, setSel] = useState<string>("kcal");
  const metrics = useMemo<DayMetric[]>(
    () => [
      { key: "kcal", label: "Calorias", unit: "kcal", color: "#10b981", target: target.kcal },
      {
        key: "protein",
        label: "Proteína",
        unit: "g",
        color: MACRO_COLORS.protein,
        target: target.protein,
      },
      {
        key: "carbs",
        label: "Carboidrato",
        unit: "g",
        color: MACRO_COLORS.carbs,
        target: target.carbs,
      },
      { key: "fat", label: "Gordura", unit: "g", color: MACRO_COLORS.fat, target: target.fat },
      { key: "fiber", label: "Fibras", unit: "g", color: "#a3e635", target: target.fiber },
      {
        key: "sugar",
        label: "Açúcar",
        unit: "g",
        color: "#f472b6",
        target: Math.max(25, Math.round((target.kcal * 0.1) / 4)),
      },
      { key: "sodium", label: "Sódio", unit: "mg", color: "#94a3b8", target: 2000 },
      { key: "caffeine", label: "Cafeína", unit: "mg", color: "#a16207", target: DEFAULT_LIMIT_MG },
      {
        key: "lactose",
        label: "Lactose",
        unit: "g",
        color: "#e2e8f0",
        target: LACTOSE_THRESHOLDS.dayOk,
      },
      {
        key: "vitC",
        label: "Vit. C",
        unit: "mg",
        color: "#f59e0b",
        target: microTargets.vitC.target,
      },
      {
        key: "vitA",
        label: "Vit. A",
        unit: "mcg",
        color: "#fb7185",
        target: microTargets.vitA.target,
      },
      {
        key: "calcium",
        label: "Cálcio",
        unit: "mg",
        color: "#38bdf8",
        target: microTargets.calcium.target,
      },
      {
        key: "iron",
        label: "Ferro",
        unit: "mg",
        color: "#ef4444",
        target: microTargets.iron.target,
      },
      {
        key: "potassium",
        label: "Potássio",
        unit: "mg",
        color: "#c084fc",
        target: microTargets.potassium.target,
      },
    ],
    [target],
  );
  const points = useMemo(
    () =>
      entries
        .map((e) => {
          const items = itemsOf(e, target);
          const v = {} as Record<DayMetric["key"], number>;
          for (const it of items)
            for (const k of Object.keys(it.v) as DayMetric["key"][]) v[k] = (v[k] ?? 0) + it.v[k];
          return { h: hourOf(e.at), items, v, text: e.text };
        })
        .filter((p) => Object.values(p.v).some((x) => x > 0))
        .sort((a, b) => a.h - b.h),
    [entries, target],
  );
  const nowH = hourOf(new Date().toISOString());
  const active = metrics.filter((m) => m.key === sel);
  const single = active.length === 1;
  const totals = Object.fromEntries(
    metrics.map((m) => [m.key, points.reduce((a, p) => a + (p.v[m.key] ?? 0), 0)]),
  ) as Record<DayMetric["key"], number>;
  // Uma escala só: valor real quando há um nutriente; % da meta quando há vários.
  const k = (m: DayMetric) => (single || m.target <= 0 ? 1 : 100 / m.target);
  const fmtV = (v: number, m: DayMetric) =>
    `${v.toLocaleString("pt-BR", { maximumFractionDigits: v < 10 ? 1 : 0 })} ${m.unit}`;
  const lineOf = (m: DayMetric) => {
    const mine = points.filter((p) => (p.v[m.key] ?? 0) > 0);
    let acc = 0;
    const out = [
      { x: Math.min(H0, mine[0]?.h ?? H0), y: 0 },
      ...mine.map((p) => ({ x: p.h, y: (acc += p.v[m.key]) * k(m) })),
    ];
    if (nowH > out[out.length - 1].x) out.push({ x: nowH, y: acc * k(m) });
    return out;
  };
  const first = active[0] ?? metrics[0];
  const pace =
    single && first.key === "kcal" && target.kcal > 0
      ? [
          { x: H0, y: 0 },
          { x: 7, y: 0 },
          { x: 21, y: target.kcal },
          { x: H1, y: target.kcal },
        ]
      : [];
  const hm = (h: number) =>
    `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60) % 60).padStart(2, "0")}`;
  const goalY = single ? first.target : 100;
  return (
    <figure className="nv-scan min-w-0 border border-border bg-card p-3">
      <figcaption className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <span>
          <strong className="block text-sm font-bold">Evolução do dia</strong>
          <span className="text-xs text-muted-foreground">
            {points.length
              ? single
                ? `${fmtV(totals[first.key], first)} em ${points.length} registro${points.length === 1 ? "" : "s"}`
                : "Toque em um nutriente abaixo para ver quando ele entrou"
              : "Os registros de hoje aparecem aqui"}
          </span>
        </span>
        {pace.length > 0 && (
          <EvoLegend items={[{ label: "Ritmo de referência", color: "#f97316", dashed: true }]} />
        )}
      </figcaption>
      <ul aria-label="Níveis do dia" className="mb-3 grid gap-x-3 gap-y-0.5 sm:grid-cols-2">
        {metrics.map((m) => {
          const v = totals[m.key];
          const pct = m.target > 0 ? (v / m.target) * 100 : 0;
          const on = sel === m.key;
          const tone = LIMIT_KEYS.has(m.key)
            ? pct > 100
              ? "#ef4444"
              : pct >= 80
                ? "#f59e0b"
                : "#10b981"
            : OVER_KEYS.has(m.key)
              ? pct > 115
                ? "#f59e0b"
                : pct >= 90
                  ? "#10b981"
                  : undefined
              : pct >= 90
                ? "#10b981"
                : undefined;
          return (
            <li key={m.key}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setSel(m.key)}
                title={`${m.label}: ${fmtV(v, m)} de ${fmtV(m.target, m)}`}
                className="grid w-full grid-cols-[6.6rem_minmax(0,1fr)_auto] items-center gap-2 border px-1.5 py-1 text-left transition-colors hover:bg-muted/50"
                style={{
                  borderColor: on ? m.color : "transparent",
                  background: on ? `${m.color}1f` : undefined,
                }}
              >
                <span className="flex items-center gap-1.5 text-[11px] font-bold">
                  <i className="size-2 shrink-0 rounded-full" style={{ background: m.color }} />
                  {m.label}
                </span>
                <span className="relative h-2 bg-muted">
                  <i
                    className="absolute inset-y-0 left-0 transition-[width] duration-500"
                    style={{ width: `${Math.min(pct, 150) / 1.5}%`, background: m.color }}
                  />
                  <i className="absolute -inset-y-0.5 left-2/3 w-px bg-foreground/70" />
                </span>
                <span className="min-w-[6.2rem] text-right text-[11px] tabular-nums">
                  <b style={{ color: tone }}>{Math.round(pct)}%</b>{" "}
                  <span className="text-muted-foreground">{fmtV(v, m)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mb-2 text-[11px] text-muted-foreground">
        A marca vertical é a meta do dia (100%). Em vermelho, o que passou do limite. Toque em um
        nutriente para ver a evolução dele ao longo do dia.
      </p>
      <EvoChart
        height={220}
        ariaLabel={`Evolução do dia: ${active.map((m) => `${m.label} ${fmtV(totals[m.key], m)}`).join(", ")}`}
        xMin={H0}
        xMax={H1}
        xTicks={[6, 9, 12, 15, 18, 21, 24].map((h) => ({
          x: h,
          label: `${String(h % 24).padStart(2, "0")}h`,
        }))}
        formatX={hm}
        formatY={(v) => (single ? n0(v) : `${n0(v)}%`)}
        goal={
          goalY > 0
            ? {
                y: goalY,
                label: single ? `Meta ${fmtV(first.target, first)}` : "Meta do dia (100%)",
                color: "#f97316",
              }
            : undefined
        }
        yFloor={goalY}
        nowX={nowH}
        persistTip
        series={[
          ...active.map((m) => ({
            id: m.key,
            label: single ? `Acumulado (${m.unit})` : `${m.label} (% da meta)`,
            color: m.color,
            points: lineOf(m),
            area: single,
            dots: true,
            live: true,
          })),
          ...(pace.length
            ? [
                {
                  id: "pace",
                  label: "Referência",
                  color: "#f97316",
                  points: pace,
                  dashed: true,
                  linear: true,
                },
              ]
            : []),
        ]}
        tip={(h) => {
          const upTo = points.filter((p) => p.h <= h + 1 / 120);
          const hit = points.filter((p) => Math.abs(p.h - h) < 1 / 120);
          return (
            <div className="mt-1.5 grid gap-1 border-t border-border pt-1.5">
              <ul className="grid gap-0.5">
                {active.map((m) => {
                  const v = upTo.reduce((a, p) => a + (p.v[m.key] ?? 0), 0);
                  const pct = m.target > 0 ? Math.round((v / m.target) * 100) : 0;
                  return (
                    <li key={m.key} className="flex items-center gap-2">
                      <i className="size-2 shrink-0 rounded-full" style={{ background: m.color }} />
                      <span className="truncate">{m.label}</span>
                      <strong className="ml-auto shrink-0 tabular-nums text-foreground">
                        {fmtV(v, m)} · {pct}%
                      </strong>
                    </li>
                  );
                })}
              </ul>
              {hit.map((p, i) => {
                const m = active[0];
                const parts = p.items
                  .filter((it) => (it.v[m.key] ?? 0) > 0)
                  .sort((x, y) => y.v[m.key] - x.v[m.key]);
                const sum = parts.reduce((acc, it) => acc + it.v[m.key], 0);
                return (
                  <div key={i} className="border-t border-border/60 pt-1">
                    <p className="mb-0.5 text-[11px] text-muted-foreground">
                      De onde vem o(a) {m.label.toLowerCase()} deste registro
                    </p>
                    {parts.length ? (
                      <ul className="grid gap-0.5">
                        {parts.map((it, j) => (
                          <li key={j} className="flex items-baseline gap-2">
                            <span className="min-w-0 truncate font-semibold">
                              {it.name}
                              {it.qty && (
                                <span className="font-normal text-muted-foreground">
                                  {" "}
                                  · {it.qty}
                                </span>
                              )}
                            </span>
                            <strong className="ml-auto shrink-0 tabular-nums text-foreground">
                              {fmtV(it.v[m.key], m)}
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                · {Math.round((it.v[m.key] / (sum || 1)) * 100)}%
                              </span>
                            </strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">Nada de {m.label.toLowerCase()} aqui.</p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }}
      />
    </figure>
  );
}

const MACRO = MACRO_COLORS;

/** Calorias de cada registro do dia, divididas por macronutriente. Clique para ver o detalhe. */
export function MealMacroBars({ data }: { data: DailyNutrition }) {
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      data.entries
        .map((e, i) => ({
          id: e.entryId ?? String(i),
          at: e.at,
          text: e.text || e.source,
          bev: e.entryType === "beverage",
          n: entryNutrients(e),
        }))
        .filter((r) => r.n.kcal > 0)
        .sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
    [data.entries],
  );
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.n.kcal));
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  return (
    <figure className="nv-scan min-w-0 border border-border bg-card p-3">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong className="block text-sm font-bold">Calorias por registro</strong>
          <span className="text-xs text-muted-foreground">
            O que cada refeição ou bebida somou, dividido por macronutriente
          </span>
        </span>
        <EvoLegend
          items={[
            { label: "Proteínas", color: MACRO.protein },
            { label: "Carboidratos", color: MACRO.carbs },
            { label: "Gorduras", color: MACRO.fat },
          ]}
        />
      </figcaption>
      <ul className="grid gap-1">
        {rows.map((r) => {
          const parts = [
            { k: "protein", v: r.n.protein * 4 },
            { k: "carbs", v: r.n.carbs * 4 },
            { k: "fat", v: r.n.fat * 9 },
          ] as const;
          const sum = parts.reduce((a, b) => a + b.v, 0) || 1;
          const isOpen = open === r.id;
          return (
            <li key={r.id} className={isOpen ? "bg-muted/50" : ""}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : r.id)}
                className="grid w-full grid-cols-[2.6rem_minmax(0,1fr)_4.2rem] items-center gap-x-2 px-1.5 py-1 text-left transition-colors hover:bg-muted/50"
              >
                <span className="font-mono text-[11px] font-bold tabular-nums text-muted-foreground">
                  {time(r.at)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{r.text}</span>
                  <span
                    className="mt-0.5 flex h-2 gap-px"
                    style={{ width: `${Math.max(8, (r.n.kcal / max) * 100)}%` }}
                  >
                    {parts.map((p) => (
                      <i
                        key={p.k}
                        className="block h-full transition-[flex-grow] duration-500"
                        style={{
                          flexGrow: Math.max(p.v / sum, 0.02),
                          flexBasis: 0,
                          background: MACRO[p.k],
                        }}
                      />
                    ))}
                  </span>
                </span>
                <span className="text-right text-xs font-bold tabular-nums">
                  {n0(r.n.kcal)} <span className="font-medium text-muted-foreground">kcal</span>
                </span>
              </button>
              {isOpen && (
                <div className="px-2 pb-2 pt-1">
                  <MacroBreakdown
                    protein={r.n.protein}
                    carbs={r.n.carbs}
                    fat={r.n.fat}
                    decimals={1}
                  />
                  <ul className="mt-2 grid grid-cols-3 gap-1 text-[11px] sm:grid-cols-6">
                    {(
                      [
                        ["Fibras", r.n.fiber, "g", 25, "#a3e635"],
                        ["Vit. C", r.n.vitC, "mg", microTargets.vitC.target, "#f59e0b"],
                        ["Vit. A", r.n.vitA, "mcg", microTargets.vitA.target, "#fb7185"],
                        ["Cálcio", r.n.calcium, "mg", microTargets.calcium.target, "#38bdf8"],
                        ["Ferro", r.n.iron, "mg", microTargets.iron.target, "#ef4444"],
                        ["Potássio", r.n.potassium, "mg", microTargets.potassium.target, "#c084fc"],
                      ] as const
                    ).map(([label, v, unit, ref, color]) => (
                      <li key={label} className="border border-border/60 px-1.5 py-1">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <i className="size-1.5 rounded-full" style={{ background: color }} />
                          {label}
                        </span>
                        <b className="tabular-nums">
                          {v.toLocaleString("pt-BR", { maximumFractionDigits: v < 10 ? 1 : 0 })}{" "}
                          {unit}
                        </b>
                        <span className="ml-1 tabular-nums text-muted-foreground">
                          {Math.round((v / ref) * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
