import { EvoChart, EvoLegend } from "./EvoChart";
import { useMemo, type ReactNode } from "react";
import { Beef, Droplet, Target, Wheat } from "lucide-react";
import { sumNutrients, type Nutrients } from "@/lib/food-parser";
import { objectiveLabel } from "@/lib/objective-nutrition";
import type { DailyNutrition } from "./DailyNutritionPanel";
import { NextUpClock } from "./NextUpClock";

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
  { key: "protein", label: "Proteína", icon: Beef, color: "#fb7185" },
  { key: "carbs", label: "Carboidrato", icon: Wheat, color: "#fbbf24" },
  { key: "fat", label: "Gordura", icon: Droplet, color: "#a78bfa" },
] as const;

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
    <header className="nv-dark relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-[#052e1f] via-[#0a4a33] to-[#2f6b1f] p-3.5 text-white shadow-card sm:p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-lime-300/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 left-1/3 -z-10 size-56 rounded-full bg-emerald-300/10 blur-3xl"
      />
      <div className="grid items-center gap-4 lg:grid-cols-[auto_minmax(0,1fr)_16rem]">
        <div
          className="relative mx-auto size-28 shrink-0 lg:mx-0"
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
              stroke="#fb923c"
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
          <div className="absolute inset-[26px] grid place-items-center rounded-full bg-white/[.06] text-center shadow-inner">
            <span className="leading-none">
              <strong className="block text-lg font-extrabold tabular-nums">{pct}%</strong>
              <span className="text-[10px] font-semibold text-white/70">da meta</span>
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-2xl font-extrabold tabular-nums sm:text-3xl">
              {loaded ? n0(total.kcal) : "…"}{" "}
              <span className="text-base font-semibold text-white/65">
                de {n0(target.kcal)} kcal
              </span>
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-lime-100">
              <Target size={12} /> {objectiveLabel(objective)}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-white/80">
            {!entries.length
              ? "Registre o que comer e o NextVita calcula os nutrientes."
              : left > 0
                ? `Faltam ${n0(left)} kcal para a referência de hoje.`
                : "Referência de calorias de hoje alcançada."}
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {macros.map((m, i) => {
              const v = total[m.key],
                t = target[m.key] || 1;
              const p = Math.min(100, Math.round((v / t) * 100));
              return (
                <li
                  key={m.key}
                  className="rounded-xl border border-white/12 bg-white/[.07] px-3 py-2 backdrop-blur transition-colors hover:bg-white/[.12]"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-white/75">
                    <span className="flex items-center gap-1.5">
                      <m.icon size={13} style={{ color: m.color }} /> {m.label}
                    </span>
                    <span className="tabular-nums text-white">
                      {n0(v)}
                      <span className="text-white/55">/{n0(t)} g</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
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
          {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
        </div>

        <NextUpClock
          alertKey="refeicao"
          title="Próxima refeição"
          color="#fdba74"
          target={plan?.at ?? null}
          from={plan?.from ?? null}
          detail={plan?.name}
          emptyText="Refeições do dia encerradas"
          actionLabel="Registrar refeição"
          onAction={onRegister}
        />
      </div>
    </header>
  );
}

/** Evolução do dia: calorias acumuladas a cada registro, com a referência diária. */
export function NutritionDayChart({ data }: { data: DailyNutrition }) {
  const { entries, target } = data;
  const H0 = 5,
    H1 = 24;
  const points = useMemo(
    () =>
      entries
        .map((e) => ({ h: hourOf(e.at), n: entryNutrients(e), text: e.text }))
        .filter((p) => p.n.kcal > 0)
        .sort((a, b) => a.h - b.h),
    [entries],
  );
  const nowH = hourOf(new Date().toISOString());
  let acc = 0;
  const line = [
    { x: Math.min(H0, points[0]?.h ?? H0), y: 0 },
    ...points.map((p) => ({ x: p.h, y: (acc += p.n.kcal) })),
  ];
  const total = acc;
  if (nowH > line[line.length - 1].x) line.push({ x: nowH, y: total });
  const pace =
    target.kcal > 0
      ? [
          { x: H0, y: 0 },
          { x: 7, y: 0 },
          { x: 21, y: target.kcal },
          { x: H1, y: target.kcal },
        ]
      : [];
  const hm = (h: number) =>
    `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60) % 60).padStart(2, "0")}`;
  return (
    <figure className="min-w-0 rounded-2xl border border-border bg-card p-3 sm:p-4">
      <figcaption className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <span>
          <strong className="block text-sm font-bold">Evolução das calorias</strong>
          <span className="text-xs text-muted-foreground">
            {points.length
              ? `${n0(total)} kcal em ${points.length} registro${points.length === 1 ? "" : "s"}`
              : "Os registros de hoje aparecem aqui"}
          </span>
        </span>
        <EvoLegend
          items={[
            { label: "Acumulado", color: "#10b981" },
            ...(pace.length
              ? [{ label: "Ritmo de referência", color: "#f97316", dashed: true }]
              : []),
          ]}
        />
      </figcaption>
      <EvoChart
        height={220}
        ariaLabel={`Calorias hoje: ${n0(total)} kcal`}
        xMin={H0}
        xMax={H1}
        xTicks={[6, 9, 12, 15, 18, 21, 24].map((h) => ({
          x: h,
          label: `${String(h % 24).padStart(2, "0")}h`,
        }))}
        formatX={hm}
        formatY={(v) => n0(v)}
        goal={
          target.kcal > 0
            ? { y: target.kcal, label: `Referência ${n0(target.kcal)} kcal`, color: "#f97316" }
            : undefined
        }
        nowX={nowH}
        series={[
          {
            id: "kcal",
            label: "Acumulado (kcal)",
            color: "#10b981",
            points: line.map((p, i) =>
              i > 0 && i <= points.length ? { ...p, color: "#f97316" } : p,
            ),
            area: true,
            dots: true,
            live: true,
          },
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
          const hit = points.filter((p) => Math.abs(p.h - h) < 1 / 120);
          return hit.length ? (
            <div className="mt-1.5 grid gap-1 border-t border-border pt-1.5">
              {hit.map((p, i) => (
                <div key={i}>
                  <p className="flex gap-2">
                    <span className="truncate font-semibold">{p.text || "Registro"}</span>
                    <strong className="ml-auto shrink-0 tabular-nums text-orange-500">
                      +{n0(p.n.kcal)} kcal
                    </strong>
                  </p>
                  <p className="text-muted-foreground">
                    P {n0(p.n.protein)} g · C {n0(p.n.carbs)} g · G {n0(p.n.fat)} g
                  </p>
                </div>
              ))}
            </div>
          ) : null;
        }}
      />
    </figure>
  );
}
