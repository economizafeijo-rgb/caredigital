import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Flame,
  Minus,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EvoChart } from "./EvoChart";
import { signed, weightVariation } from "@/lib/weight-variation";

const nf = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const longDate = (iso: string) => iso.split("-").reverse().join("/");
const shortDate = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const DOWN = "#10b981";
const UP = "#f97316";
const reduced = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Número que sobe (ou desce) até o valor final, para dar vida aos resumos. */
export function AnimatedNumber({
  value,
  digits = 1,
  sign = false,
  suffix = "",
}: {
  value: number;
  digits?: number;
  sign?: boolean;
  suffix?: string;
}) {
  const [shown, setShown] = useState(reduced() ? value : 0);
  useEffect(() => {
    if (reduced()) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 900);
      setShown(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <>
      {sign ? signed(shown, digits) : nf(shown, digits)}
      {suffix}
    </>
  );
}

function ToggleChip({
  on,
  color,
  label,
  onClick,
  dashed = false,
}: {
  on: boolean;
  color: string;
  label: string;
  onClick: () => void;
  dashed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${on ? "border-transparent bg-muted text-foreground" : "border-border text-muted-foreground line-through opacity-60"}`}
    >
      <i
        className={`block w-4 ${dashed ? "border-t-2 border-dashed" : "h-1 rounded-full"}`}
        style={dashed ? { borderColor: color } : { background: color }}
      />
      {label}
    </button>
  );
}

export type EvolutionRow = {
  date: string;
  label: string;
  weight: number;
  average: number;
  bmi: number;
  delta: number | null;
};

/* ---------------------------- gráfico de evolução --------------------------- */

export function WeightEvolutionChart({
  rows,
  target,
  healthy,
  onPick,
}: {
  rows: EvolutionRow[];
  target: number | null;
  healthy: [number, number] | null;
  onPick: (date: string) => void;
}) {
  const [show, setShow] = useState({ weight: true, average: true, band: true, goal: true });
  const X = (d: string) => Date.parse(d + "T12:00:00Z");
  const last = rows[rows.length - 1];
  const pad = Math.max(86_400_000 * 0.6, (X(last.date) - X(rows[0].date)) * 0.03);
  const byX = new Map(rows.map((r) => [X(r.date), r]));
  const many = rows.length > 24;

  return (
    <div>
      <EvoChart
        height={320}
        yAuto
        persistTip
        ariaLabel={`Evolução do peso em ${rows.length} medidas`}
        xMin={X(rows[0].date) - pad}
        xMax={X(last.date) + pad}
        xTicks={(rows.length <= 8
          ? rows
          : rows.filter((_, i) => i % Math.ceil(rows.length / 7) === 0 || i === rows.length - 1)
        ).map((r) => ({ x: X(r.date), label: r.label }))}
        formatX={(x) => longDate(new Date(x).toISOString().slice(0, 10))}
        formatY={(v) => `${nf(v, Number.isInteger(v) ? 0 : 1)} kg`}
        goal={
          target && show.goal
            ? { y: target, label: `Meta ${nf(target)} kg`, color: "#8b5cf6" }
            : undefined
        }
        band={
          healthy && show.band
            ? { from: healthy[0], to: healthy[1], label: "Faixa de peso adequado" }
            : undefined
        }
        onPick={(x) => onPick(new Date(x).toISOString().slice(0, 10))}
        series={[
          ...(show.weight
            ? [
                {
                  id: "w",
                  label: "Peso",
                  color: "#d946ef",
                  area: true,
                  dots: !many,
                  live: true,
                  points: rows.map((r) => ({ x: X(r.date), y: r.weight })),
                },
              ]
            : []),
          ...(show.average
            ? [
                {
                  id: "a",
                  label: "Média móvel",
                  color: "#6366f1",
                  dashed: true,
                  points: rows.map((r) => ({ x: X(r.date), y: r.average })),
                },
              ]
            : []),
        ]}
        tip={(x) => {
          const row = byX.get(x);
          if (!row) return null;
          return (
            <div className="mt-1.5 grid gap-0.5 border-t border-border pt-1.5">
              {row.delta !== null && (
                <p
                  className="flex items-center gap-1.5 font-semibold"
                  style={{ color: row.delta <= 0 ? DOWN : UP }}
                >
                  {row.delta <= 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}{" "}
                  {signed(row.delta)} kg desde a anterior
                </p>
              )}
              <p className="text-muted-foreground">
                {signed(row.weight - rows[0].weight)} kg desde o início · IMC {nf(row.bmi)}
              </p>
            </div>
          );
        }}
      />
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Séries do gráfico">
        <ToggleChip
          on={show.weight}
          color="#d946ef"
          label="Peso"
          onClick={() => setShow((v) => ({ ...v, weight: !v.weight }))}
        />
        <ToggleChip
          on={show.average}
          color="#6366f1"
          label="Média móvel"
          dashed
          onClick={() => setShow((v) => ({ ...v, average: !v.average }))}
        />
        {healthy && (
          <ToggleChip
            on={show.band}
            color="#10b981"
            label="Faixa de peso adequado"
            onClick={() => setShow((v) => ({ ...v, band: !v.band }))}
          />
        )}
        {target && (
          <ToggleChip
            on={show.goal}
            color="#8b5cf6"
            label="Meta"
            dashed
            onClick={() => setShow((v) => ({ ...v, goal: !v.goal }))}
          />
        )}
        <span className="ml-auto self-center text-[11px] text-muted-foreground">
          Toque num ponto para abrir os detalhes do dia.
        </span>
      </div>
    </div>
  );
}

/* ------------------------- variação entre as medidas ------------------------ */

export function WeightVariationPanel({
  points,
  onPick,
}: {
  points: { date: string; kg: number }[];
  onPick: (date: string) => void;
}) {
  const [show, setShow] = useState({ delta: true, cumulative: true });
  const { rows, summary } = useMemo(() => weightVariation(points), [points]);
  const chartRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        label: shortDate(row.date),
        delta: row.delta ?? 0,
        first: row.delta === null,
      })),
    [rows],
  );
  const many = chartRows.length > 16;

  if (summary.count < 2) {
    return (
      <section
        className="rounded-2xl border border-border bg-card p-4 shadow-card"
        aria-label="Variação entre medidas"
      >
        <h3 className="font-display text-sm font-bold">Variação entre medidas</h3>
        <p className="mt-6 grid place-items-center rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
          Registre pelo menos duas medidas para ver quanto o peso variou entre elas.
        </p>
      </section>
    );
  }

  const trendText =
    summary.trend === "down" ? "Em queda" : summary.trend === "up" ? "Em alta" : "Estável";
  const TrendIcon =
    summary.trend === "down" ? TrendingDown : summary.trend === "up" ? TrendingUp : Minus;
  const trendColor = summary.trend === "down" ? DOWN : summary.trend === "up" ? UP : "#94a3b8";
  const stats = [
    {
      icon: TrendIcon,
      label: "Variação total",
      value: summary.total!,
      digits: 1,
      suffix: " kg",
      sign: true,
      note: `${summary.totalPct !== null ? signed(summary.totalPct) + "% · " : ""}${summary.spanDays} dia${summary.spanDays === 1 ? "" : "s"}`,
      color: trendColor,
    },
    {
      icon: Zap,
      label: "Ritmo médio",
      value: summary.perWeek,
      digits: 2,
      suffix: " kg/sem",
      sign: true,
      note:
        summary.perWeek === null
          ? "precisa de 7 dias ou mais"
          : `${trendText.toLowerCase()} no período`,
      color: "#a855f7",
    },
    {
      icon: ArrowDownRight,
      label: "Maior queda",
      value: summary.biggestDrop?.delta ?? null,
      digits: 1,
      suffix: " kg",
      sign: true,
      note: summary.biggestDrop ? `em ${longDate(summary.biggestDrop.date)}` : "nenhuma queda",
      color: DOWN,
    },
    {
      icon: ArrowUpRight,
      label: "Maior alta",
      value: summary.biggestRise?.delta ?? null,
      digits: 1,
      suffix: " kg",
      sign: true,
      note: summary.biggestRise ? `em ${longDate(summary.biggestRise.date)}` : "nenhuma alta",
      color: UP,
    },
  ];

  return (
    <section
      className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card"
      aria-label="Variação entre medidas"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-bold">Variação entre medidas</h3>
          <p className="text-xs text-muted-foreground">
            Quanto o peso mudou de uma medida para a outra e o acumulado desde a primeira
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
          style={{ background: `${trendColor}22`, color: trendColor }}
        >
          <TrendIcon size={14} /> {trendText}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, digits, suffix, sign, note, color }) => (
          <div key={label} className="nv-rise rounded-2xl bg-muted/50 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Icon size={14} style={{ color }} />
              {label}
            </p>
            <p className="mt-1 text-xl font-extrabold tabular-nums leading-tight">
              {value === null ? (
                "—"
              ) : (
                <AnimatedNumber value={value} digits={digits} sign={sign} suffix={suffix} />
              )}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{note}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartRows}
            margin={{ top: 18, right: 14, left: -10, bottom: 0 }}
            style={{ cursor: "pointer" }}
            onClick={(state: any) => {
              const row = state?.activePayload?.[0]?.payload;
              if (row?.date) onPick(row.date);
            }}
          >
            <CartesianGrid
              strokeDasharray="3 5"
              stroke="currentColor"
              className="text-border"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              minTickGap={14}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              width={58}
              unit=" kg"
              domain={["auto", "auto"]}
            />
            <ReferenceLine
              y={0}
              stroke="currentColor"
              className="text-muted-foreground"
              strokeOpacity={0.5}
            />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.14)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as (typeof chartRows)[number];
                return (
                  <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-pop">
                    <p className="font-bold">
                      {longDate(row.date)} · {nf(row.kg)} kg
                    </p>
                    {row.first ? (
                      <p className="mt-1 text-muted-foreground">Primeira medida do período</p>
                    ) : (
                      <>
                        <p
                          className="mt-1.5 flex items-center gap-1.5 font-semibold"
                          style={{ color: row.delta <= 0 ? DOWN : UP }}
                        >
                          {row.delta <= 0 ? (
                            <ArrowDownRight size={13} />
                          ) : (
                            <ArrowUpRight size={13} />
                          )}{" "}
                          {signed(row.delta)} kg{row.pct !== null ? ` (${signed(row.pct)}%)` : ""}{" "}
                          em relação à anterior
                        </p>
                        <p className="flex items-center gap-1.5 text-muted-foreground">
                          <CalendarClock size={12} /> {row.days} dia{row.days === 1 ? "" : "s"}{" "}
                          depois
                          {row.perWeek !== null ? ` · ${signed(row.perWeek, 2)} kg/semana` : ""}
                        </p>
                      </>
                    )}
                    <p className="mt-1 text-muted-foreground">
                      Acumulado:{" "}
                      <strong className="text-foreground">{signed(row.cumulative)} kg</strong>
                    </p>
                  </div>
                );
              }}
            />
            {show.delta && (
              <Bar
                dataKey="delta"
                name="Variação por medida"
                radius={[7, 7, 7, 7]}
                maxBarSize={34}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              >
                {chartRows.map((row) => (
                  <Cell
                    key={row.date}
                    fill={row.first ? "#94a3b8" : row.delta <= 0 ? DOWN : UP}
                    fillOpacity={row.first ? 0.35 : 0.95}
                  />
                ))}
                {!many && (
                  <LabelList
                    dataKey="delta"
                    position="top"
                    content={(p: any) => {
                      const row = chartRows[p.index];
                      if (!row || row.first) return null;
                      const down = row.delta <= 0;
                      // A altura da barra pode vir negativa para valores negativos: usa o topo e a base reais.
                      const top = Math.min(p.y, p.y + p.height);
                      const bottom = Math.max(p.y, p.y + p.height);
                      return (
                        <text
                          x={p.x + p.width / 2}
                          y={down ? bottom + 14 : top - 6}
                          textAnchor="middle"
                          fontSize={10}
                          fontWeight={800}
                          fill={down ? DOWN : UP}
                        >
                          {signed(row.delta)}
                        </text>
                      );
                    }}
                  />
                )}
              </Bar>
            )}
            {show.cumulative && (
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Acumulado"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: "#fff", stroke: "#8b5cf6", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                isAnimationActive
                animationBegin={500}
                animationDuration={1100}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div
        className="mt-2 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Séries do gráfico de variação"
      >
        <ToggleChip
          on={show.delta}
          color={DOWN}
          label="Variação por medida"
          onClick={() => setShow((v) => ({ ...v, delta: !v.delta }))}
        />
        <ToggleChip
          on={show.cumulative}
          color="#8b5cf6"
          label="Acumulado desde a 1ª medida"
          onClick={() => setShow((v) => ({ ...v, cumulative: !v.cumulative }))}
        />
        <span className="ml-auto inline-flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <i className="size-2.5 rounded-sm" style={{ background: DOWN }} /> queda
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="size-2.5 rounded-sm" style={{ background: UP }} /> alta
          </span>
        </span>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Flame size={12} /> {summary.count} medidas
        </span>
        {summary.avgGapDays !== null && (
          <span>
            intervalo médio de {nf(summary.avgGapDays)} dia{summary.avgGapDays === 1 ? "" : "s"}
          </span>
        )}
        {summary.streak && summary.streak.count >= 2 && (
          <span style={{ color: summary.streak.direction === "down" ? DOWN : UP }}>
            {summary.streak.count} medidas seguidas em{" "}
            {summary.streak.direction === "down" ? "queda" : "alta"}
          </span>
        )}
      </p>
    </section>
  );
}
