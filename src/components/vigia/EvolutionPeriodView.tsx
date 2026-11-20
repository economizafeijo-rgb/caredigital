import { useState } from "react";
import {
  Activity,
  CalendarCheck,
  ClipboardList,
  Droplets,
  Flame,
  Moon,
  Pill,
  Scale,
  Sparkles,
  Target,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  acreDayHour,
  GOAL_INFO,
  GOAL_METRICS,
  goalObservation,
  longDay,
  monthGrid,
  monthlySummaries,
  MONTH_NAMES,
  summarize,
  summaryTone,
  type DayMetrics,
  type GoalMetric,
  type Targets,
} from "@/lib/day-metrics";
import {
  ChartTip,
  hm,
  Kpi,
  METRIC_STYLE,
  nf,
  Panel,
  STATUS_STYLE,
  SUMMARY_HEX,
} from "./evolution-ui";

type Tab = "metas" | "hidratacao" | "alimentacao" | "suplementos" | "medicacao" | "sono" | "peso";
const TABS: { key: Tab; label: string }[] = [
  { key: "metas", label: "Metas" },
  { key: "hidratacao", label: "Hidratação" },
  { key: "alimentacao", label: "Alimentação" },
  { key: "suplementos", label: "Suplementos" },
  { key: "medicacao", label: "Medicação" },
  { key: "sono", label: "Sono" },
  { key: "peso", label: "Peso" },
];
const SHORT_MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];
const axis = { fontSize: 11, fill: "currentColor" } as const;

type Row = {
  day: string;
  label: string;
  full: string;
  value: number | null;
  value2?: number | null;
  target?: number | null;
  color: string;
};
type Series = {
  name: string;
  unit: string;
  digits: number;
  color: string;
  line?: boolean;
  secondary?: { name: string; unit: string; color: string };
};
const SERIES: Record<Tab, Series> = {
  metas: { name: "Metas atingidas", unit: "%", digits: 0, color: "#10b981" },
  hidratacao: { name: "Água", unit: "ml", digits: 0, color: "#0ea5e9" },
  alimentacao: {
    name: "Calorias",
    unit: "kcal",
    digits: 0,
    color: "#f97316",
    secondary: { name: "Proteínas", unit: "g", color: "#f43f5e" },
  },
  suplementos: { name: "Doses tomadas", unit: "doses", digits: 0, color: "#8b5cf6" },
  medicacao: { name: "Doses confirmadas", unit: "doses", digits: 0, color: "#ec4899" },
  sono: { name: "Horas de sono", unit: "h", digits: 1, color: "#6366f1" },
  peso: { name: "Peso", unit: "kg", digits: 1, color: "#c026d3", line: true },
};
const TAB_METRIC: Partial<Record<Tab, GoalMetric>> = {
  hidratacao: "hidratacao",
  alimentacao: "calorias",
  suplementos: "suplementos",
  medicacao: "medicacao",
  sono: "sono",
};

function dayRows(days: DayMetrics[], tab: Tab, targets: Targets): Row[] {
  return days.map((d) => {
    const metric = TAB_METRIC[tab];
    const goal = metric ? d.goals.find((g) => g.metric === metric) : undefined;
    const color =
      tab === "metas"
        ? SUMMARY_HEX[d.summary]
        : goal && (goal.status === "atingida" || goal.status === "nao_atingida")
          ? STATUS_STYLE[goal.status].hex
          : SERIES[tab].color;
    const base = { day: d.day, label: d.day.slice(8), full: longDay(d.day), color };
    switch (tab) {
      case "metas":
        return { ...base, value: d.score, target: 100 };
      case "hidratacao":
        return {
          ...base,
          value: d.waterAllMl > 0 ? d.waterMl : null,
          target: goal?.target ?? null,
        };
      case "alimentacao":
        return {
          ...base,
          value: d.kcal > 0 ? d.kcal : null,
          value2: d.protein > 0 ? d.protein : null,
          target: targets.kcal,
        };
      case "suplementos":
        return {
          ...base,
          value: d.supplements.planned > 0 ? d.supplements.taken : null,
          target: d.supplements.planned || null,
        };
      case "medicacao":
        return {
          ...base,
          value: d.medication.planned > 0 ? d.medication.taken : null,
          target: d.medication.planned || null,
        };
      case "sono":
        return { ...base, value: d.sleep ? Number(d.sleep.hours.toFixed(2)) : null, target: 8 };
      case "peso":
        return { ...base, value: d.weightKg, target: targets.targetWeightKg };
    }
  });
}

function monthRows(days: DayMetrics[], tab: Tab, targets: Targets, year: number): Row[] {
  return monthlySummaries(days).map(({ month, summary: s }) => {
    const base = {
      day: `${year}-${String(month).padStart(2, "0")}-01`,
      label: SHORT_MONTHS[month - 1],
      full: `${MONTH_NAMES[month - 1]} de ${year}`,
      color: SERIES[tab].color,
    };
    switch (tab) {
      case "metas":
        return {
          ...base,
          value: s.goalsEvaluated ? Math.round((s.goalsMet / s.goalsEvaluated) * 100) : null,
          target: 100,
        };
      case "hidratacao":
        return { ...base, value: s.avgWaterMl, target: targets.waterMl };
      case "alimentacao":
        return { ...base, value: s.avgKcal, value2: s.avgProtein, target: targets.kcal };
      case "suplementos":
        return { ...base, value: s.supplementAdherence, target: 100 };
      case "medicacao":
        return { ...base, value: s.medicationAdherence, target: 100 };
      case "sono":
        return { ...base, value: s.avgSleepHours, target: 8 };
      case "peso":
        return { ...base, value: s.weightLast, target: targets.targetWeightKg };
    }
  });
}

function PeriodChart({
  rows,
  tab,
  yearly,
  onPick,
}: {
  rows: Row[];
  tab: Tab;
  yearly: boolean;
  onPick: (day: string) => void;
}) {
  const series = SERIES[tab];
  const unit =
    yearly && (tab === "suplementos" || tab === "medicacao")
      ? "%"
      : yearly && tab === "hidratacao"
        ? "ml/dia"
        : yearly && tab === "alimentacao"
          ? "kcal/dia"
          : series.unit;
  const hasData = rows.some((row) => row.value !== null);
  if (!hasData)
    return (
      <p className="grid h-56 place-items-center rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
        Sem registros neste período para esta categoria.
      </p>
    );
  const hasTarget = rows.some((row) => row.target);
  return (
    <div className="h-64 w-full cursor-pointer">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: 8, right: series.secondary ? 4 : 8, left: -12, bottom: 0 }}
          onClick={(state: any) => {
            const day = state?.activePayload?.[0]?.payload?.day;
            if (day) onPick(day);
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-border"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={axis}
            className="text-muted-foreground"
            tickLine={false}
            axisLine={false}
            interval={yearly ? 0 : "preserveStartEnd"}
            minTickGap={8}
          />
          <YAxis
            yAxisId="left"
            tick={axis}
            className="text-muted-foreground"
            tickLine={false}
            axisLine={false}
            width={46}
            domain={tab === "peso" ? ["dataMin - 2", "dataMax + 2"] : [0, "auto"]}
          />
          {series.secondary && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={axis}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              width={40}
            />
          )}
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.15)" }}
            content={
              <ChartTip
                title={(r) => r.full}
                rows={(r) => [
                  [
                    series.name,
                    r.value === null ? "sem registro" : `${nf(r.value, series.digits)} ${unit}`,
                    r.color,
                  ],
                  ...(series.secondary
                    ? [
                        [
                          series.secondary.name,
                          r.value2 == null
                            ? "sem registro"
                            : `${nf(r.value2)} ${series.secondary.unit}`,
                          series.secondary.color,
                        ] as [string, string, string],
                      ]
                    : []),
                  ...(r.target
                    ? [
                        ["Meta", `${nf(r.target, series.digits)} ${unit}`, "#10b981"] as [
                          string,
                          string,
                          string,
                        ],
                      ]
                    : []),
                  ["Clique para abrir", yearly ? "o mês" : "o dia"],
                ]}
              />
            }
          />
          {hasTarget && (
            <Line
              yAxisId="left"
              dataKey="target"
              type="stepAfter"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
              connectNulls
            />
          )}
          {series.line ? (
            <Line
              yAxisId="left"
              dataKey="value"
              type="monotone"
              stroke={series.color}
              strokeWidth={3}
              dot={{ r: 3.5, fill: "#fff", stroke: series.color, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              connectNulls
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            />
          ) : (
            <Bar yAxisId="left" dataKey="value" radius={[0, 0, 0, 0]} maxBarSize={yearly ? 40 : 22}>
              {rows.map((row) => (
                <Cell key={row.day} fill={row.color} />
              ))}
            </Bar>
          )}
          {series.secondary && (
            <Line
              yAxisId="right"
              dataKey="value2"
              type="monotone"
              stroke={series.secondary.color}
              strokeWidth={2.5}
              dot={{ r: 2.5 }}
              connectNulls
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Categoria do gráfico"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
    >
      {TABS.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={tab === item.key}
          onClick={() => onChange(item.key)}
          className={`h-7 shrink-0 px-2.5 text-xs font-bold transition ${tab === item.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function Kpis({ days }: { days: DayMetrics[] }) {
  const s = summarize(days);
  const delta =
    s.weightFirst !== null && s.weightLast !== null && s.weightFirst !== s.weightLast
      ? s.weightLast - s.weightFirst
      : null;
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8">
      <Kpi
        icon={Target}
        label="Metas atingidas"
        tone="bg-emerald-500/15 text-emerald-600"
        value={s.goalsEvaluated ? `${Math.round((s.goalsMet / s.goalsEvaluated) * 100)}%` : "—"}
        note={`${s.goalsMet} de ${s.goalsEvaluated} metas avaliadas`}
      />
      <Kpi
        icon={CalendarCheck}
        label="Dias completos"
        tone="bg-sky-500/15 text-sky-600"
        value={`${s.daysAllMet}`}
        note={`de ${s.daysEvaluated} dias avaliados · ${s.daysWithData} com registros`}
      />
      <Kpi
        icon={Droplets}
        label="Água por dia"
        tone="bg-sky-500/15 text-sky-600"
        value={s.avgWaterMl ? `${nf(s.avgWaterMl)} ml` : "—"}
        note="média dos dias com registro"
      />
      <Kpi
        icon={Flame}
        label="Calorias por dia"
        tone="bg-orange-500/15 text-orange-600"
        value={s.avgKcal ? `${nf(s.avgKcal)} kcal` : "—"}
        note={
          s.avgProtein
            ? `${nf(s.avgProtein)} g de proteína em média`
            : "média dos dias com registro"
        }
      />
      <Kpi
        icon={Sparkles}
        label="Suplementos"
        tone="bg-violet-500/15 text-violet-600"
        value={s.supplementAdherence !== null ? `${s.supplementAdherence}%` : "—"}
        note="doses programadas tomadas"
      />
      <Kpi
        icon={Pill}
        label="Medicação"
        tone="bg-pink-500/15 text-pink-600"
        value={s.medicationAdherence !== null ? `${s.medicationAdherence}%` : "—"}
        note="doses programadas confirmadas"
      />
      <Kpi
        icon={Moon}
        label="Sono médio"
        tone="bg-indigo-500/15 text-indigo-600"
        value={s.avgSleepHours ? hm(s.avgSleepHours) : "—"}
        note="das noites registradas"
      />
      <Kpi
        icon={delta !== null ? Scale : Activity}
        label={delta !== null ? "Peso no período" : "Atividade física"}
        tone={
          delta !== null
            ? "bg-fuchsia-500/15 text-fuchsia-600"
            : "bg-emerald-500/15 text-emerald-600"
        }
        value={
          delta !== null
            ? `${delta > 0 ? "+" : ""}${nf(delta, 1)} kg`
            : s.activityMinutes
              ? `${nf(s.activityMinutes)} min`
              : "—"
        }
        note={
          delta !== null
            ? `${nf(s.weightFirst, 1)} → ${nf(s.weightLast, 1)} kg`
            : "treinos registrados"
        }
      />
    </div>
  );
}

function MetricStats({ days }: { days: DayMetrics[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {GOAL_METRICS.map((metric) => {
        const goals = days
          .flatMap((d) => d.goals)
          .filter(
            (g) => g.metric === metric && (g.status === "atingida" || g.status === "nao_atingida"),
          );
        const met = goals.filter((g) => g.status === "atingida").length;
        const pct = goals.length ? Math.round((met / goals.length) * 100) : 0;
        const style = METRIC_STYLE[metric];
        const Icon = style.icon;
        return (
          <div key={metric} className="border border-border bg-muted/40 px-2.5 py-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="inline-flex items-center gap-1.5">
                <Icon size={14} className={style.text} />
                {GOAL_INFO[metric].label}
              </span>
              <span className="tabular-nums">{goals.length ? `${met}/${goals.length}` : "—"}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden bg-muted">
              <i
                className="block h-full transition-all duration-700"
                style={{ width: `${pct}%`, background: style.hex }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EvolutionMonthView({
  year,
  month,
  days,
  targets,
  onOpenDay,
}: {
  year: number;
  month: number;
  days: DayMetrics[];
  targets: Targets;
  onOpenDay: (day: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("metas");
  const byDay = new Map(days.map((d) => [d.day, d]));
  const todayKey = acreDayHour(Date.now()).day;
  const misses = days
    .flatMap((d) =>
      d.goals
        .filter((g) => g.status === "nao_atingida")
        .map((goal) => ({
          day: d.day,
          goal,
          saved: d.reviews.some((r) => r.metric === goal.metric),
        })),
    )
    .reverse();
  return (
    <div className="grid gap-3">
      <Kpis days={days} />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel
          title="Calendário do mês"
          note="Cada dia mostra o resultado das metas. Toque para abrir as 24 horas."
        >
          <div className="grid grid-cols-7 gap-1 text-center">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <span key={i} className="pb-1 text-[11px] font-bold text-muted-foreground">
                {d}
              </span>
            ))}
            {monthGrid(year, month)
              .flat()
              .map((day, i) => {
                if (!day) return <span key={i} />;
                const m = byDay.get(day);
                const tone = summaryTone[m?.summary ?? "empty"];
                const evaluated =
                  m?.goals.filter((g) => g.status === "atingida" || g.status === "nao_atingida") ??
                  [];
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={m?.future}
                    onClick={() => onOpenDay(day)}
                    title={`${longDay(day)} · ${tone.label}${evaluated.length ? ` · ${evaluated.filter((g) => g.status === "atingida").length}/${evaluated.length} metas` : ""}`}
                    aria-label={`${longDay(day)}: ${tone.label}`}
                    className={`flex min-h-[2.7rem] flex-col items-center justify-between p-1 text-xs font-bold ring-1 transition hover:brightness-125 disabled:cursor-default disabled:hover:translate-y-0 ${tone.cell} ${day === todayKey ? "outline outline-2 outline-offset-1 outline-primary" : ""}`}
                  >
                    <span className="tabular-nums">{Number(day.slice(8))}</span>
                    <span className="flex min-h-2 flex-wrap justify-center gap-0.5">
                      {m?.goals
                        .filter((g) => g.status !== "sem_registro" && g.status !== "sem_meta")
                        .map((g) => (
                          <i
                            key={g.metric}
                            className="size-1.5 rounded-full"
                            style={{ background: STATUS_STYLE[g.status].hex }}
                          />
                        ))}
                    </span>
                  </button>
                );
              })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {(["ok", "partial", "miss", "open", "empty"] as const).map((key) => (
              <span key={key} className="inline-flex items-center gap-1.5">
                <i className={`size-2.5 rounded-full ${summaryTone[key].dot}`} />
                {summaryTone[key].label}
              </span>
            ))}
          </div>
        </Panel>
        <Panel
          title="Evolução no mês"
          note="Passe o mouse ou toque nas barras; clique para abrir o dia."
        >
          <TabBar tab={tab} onChange={setTab} />
          <div className="mt-2">
            <PeriodChart
              rows={dayRows(days, tab, targets)}
              tab={tab}
              yearly={false}
              onPick={onOpenDay}
            />
          </div>
        </Panel>
      </div>
      <Panel title="Metas por categoria" note="Quantas vezes cada meta foi atingida neste mês">
        <MetricStats days={days} />
      </Panel>
      <details className="group border border-border border-t-2 border-t-primary/50 bg-card p-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold [&::-webkit-details-marker]:hidden">
          <ClipboardList size={14} className="text-amber-500" />
          Observações do mês
          <span className="bg-muted px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {misses.length}
          </span>
          <span className="ml-auto text-[11px] font-medium text-muted-foreground group-open:hidden">
            Mostrar
          </span>
          <span className="ml-auto hidden text-[11px] font-medium text-muted-foreground group-open:inline">
            Ocultar
          </span>
        </summary>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Registradas pelo sistema quando uma meta não foi atingida
        </p>
        <div className="mt-2">
          {misses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Nenhuma meta deixou de ser atingida neste mês.
            </p>
          ) : (
            <ul className="grid max-h-60 gap-1 overflow-y-auto pr-1">
              {Object.entries(
                misses.slice(0, 60).reduce<Record<string, typeof misses>>((acc, m) => {
                  (acc[m.day] ??= []).push(m);
                  return acc;
                }, {}),
              ).map(([day, list]) => (
                <li key={day}>
                  <div className="grid gap-0.5 border-l-2 border-l-amber-500/60 bg-muted/30 px-2.5 py-1.5 text-xs transition hover:bg-muted/60">
                    <button
                      type="button"
                      onClick={() => onOpenDay(day)}
                      className="group flex w-full items-center gap-2 text-left"
                    >
                      <ClipboardList size={15} className="shrink-0 text-amber-500" />
                      <strong className="text-[13px] first-letter:uppercase">{longDay(day)}</strong>
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        {list.length}{" "}
                        {list.length === 1 ? "meta não atingida" : "metas não atingidas"}
                      </span>
                      <span className="ml-auto text-[11px] font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
                        Abrir o dia
                      </span>
                    </button>
                    <ul className="grid gap-0.5 pl-5 text-[11px] text-muted-foreground">
                      {list.map(({ goal, saved }) => (
                        <li key={goal.metric} className="leading-snug">
                          <span className="text-foreground">{goalObservation(goal, day)}</span>
                          {!saved && (
                            <span className="text-[11px]"> · será registrada no histórico</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}

export function EvolutionYearView({
  year,
  days,
  targets,
  onOpenMonth,
}: {
  year: number;
  days: DayMetrics[];
  targets: Targets;
  onOpenMonth: (month: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("metas");
  const months = monthlySummaries(days);
  return (
    <div className="grid gap-3">
      <Kpis days={days} />
      <Panel
        title={`Evolução em ${year}`}
        note="Média por mês. Clique em uma barra para abrir o mês."
      >
        <TabBar tab={tab} onChange={setTab} />
        <div className="mt-2">
          <PeriodChart
            rows={monthRows(days, tab, targets, year)}
            tab={tab}
            yearly
            onPick={(day) => onOpenMonth(Number(day.slice(5, 7)))}
          />
        </div>
      </Panel>
      <Panel title="Meses do ano" note="Cada quadrado é um dia, colorido pelo resultado das metas">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {months.map(({ month, summary: s, days: list }) => (
            <button
              key={month}
              type="button"
              onClick={() => onOpenMonth(month)}
              className="rounded-2xl border border-border bg-surface/60 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-bold capitalize">{MONTH_NAMES[month - 1]}</p>
                <p className="text-xs font-extrabold tabular-nums">
                  {s.goalsEvaluated ? `${Math.round((s.goalsMet / s.goalsEvaluated) * 100)}%` : "—"}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-[3px]" aria-hidden="true">
                {list.map((d) => (
                  <i
                    key={d.day}
                    className="size-2.5 rounded-[3px]"
                    style={{ background: SUMMARY_HEX[d.summary] }}
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {s.daysWithData} dia(s) com registros · {s.daysAllMet} completo(s)
              </p>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
