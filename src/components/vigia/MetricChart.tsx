import { useId, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

export type Series = { key: string; name: string; color: string };
type Row = Record<string, number | string | undefined>;

/**
 * Estilos de gráfico:
 *  - area     curva suave com brilho e preenchimento em degradê
 *  - line     linha fina com pontos grandes e destaque do menor e do maior valor
 *  - bars     colunas arredondadas em degradê; o último dia fica em destaque
 *  - stacked  colunas empilhadas arredondadas (macronutrientes)
 *  - lollipop hastes finas com bolinha no topo (atividade)
 *  - ring     anel do último valor contra a meta + colunas das últimas noites (sono)
 */
export type MetricKind = "area" | "line" | "bars" | "stacked" | "lollipop" | "ring";

const fmt = (v: number, d = 0) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });
const AXIS = { fontSize: 10, fill: "rgba(226,232,240,.55)" } as const;

function Tip({
  active,
  payload,
  label,
  unit,
  decimals,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; stroke?: string; fill?: string }[];
  label?: string;
  unit: string;
  decimals: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/15 bg-[#0f1218]/95 px-3 py-2 text-xs text-white shadow-2xl backdrop-blur">
      <p className="mb-1 font-semibold text-white/65">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 tabular-nums">
          <i
            className="size-2 rounded-full"
            style={{ background: p.stroke ?? p.fill ?? p.color }}
          />
          <span className="text-white/70">{p.name}</span>
          <b className="ml-auto pl-3">
            {fmt(Number(p.value), decimals)} {unit}
          </b>
        </p>
      ))}
    </div>
  );
}

/** Anel de progresso do último valor contra a meta. */
function Ring({
  value,
  goal,
  color,
  center,
  caption,
}: {
  value: number;
  goal: number;
  color: string;
  center: string;
  caption: string;
}) {
  const uid = useId().replace(/:/g, "");
  const pct = Math.max(0, Math.min(1, goal ? value / goal : 0));
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative size-32 shrink-0" role="img" aria-label={`${center} de ${caption}`}>
      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
        <defs>
          <linearGradient id={`r${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity=".85" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="11" />
        <circle
          cx="64"
          cy="64"
          r={R}
          fill="none"
          stroke={`url(#r${uid})`}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${pct * C} ${C}`}
          style={{ filter: `drop-shadow(0 0 8px ${color}99)`, transition: "stroke-dasharray .8s" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <span className="leading-tight">
          <strong className="block text-2xl font-extrabold tabular-nums">{center}</strong>
          <span className="text-[10px] font-semibold text-white/55">{caption}</span>
        </span>
      </div>
    </div>
  );
}

/** Painel de indicador: número em destaque, variação, gráfico no estilo do indicador e resumo. */
export function MetricPanel({
  title,
  eyebrow,
  icon: Icon,
  color,
  data,
  series,
  kind,
  unit,
  decimals = 0,
  empty,
  domain,
  goal,
  goalLabel,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  color: string;
  data: Row[];
  series: Series[];
  kind: MetricKind;
  unit: string;
  decimals?: number;
  /** Compatibilidade: o mesmo que kind="stacked". */
  stacked?: boolean;
  empty: string;
  domain?: [string | number, string | number];
  /** Meta diária (linha de referência e anel). */
  goal?: number;
  goalLabel?: string;
  children?: ReactNode;
}) {
  const uid = useId().replace(/:/g, "");
  const main = series[0];
  const values = data.map((d) => Number(d[main.key] ?? 0));
  const has = values.length > 0;
  const last = has ? values[values.length - 1] : 0;
  const avg = has ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const delta = has ? last - values[0] : 0;
  const max = has ? Math.max(...values) : 0;
  const min = has ? Math.min(...values) : 0;
  const maxIdx = values.indexOf(max);
  const minIdx = values.indexOf(min);
  const isStack = kind === "stacked";
  const DeltaIcon = Math.abs(delta) < 0.05 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const margin = { top: 14, right: 10, left: -12, bottom: 0 };
  const xAxis = (
    <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} minTickGap={26} />
  );
  const yAxis = (
    <YAxis domain={domain} tick={AXIS} axisLine={false} tickLine={false} width={44} tickCount={4} />
  );
  const grid = <CartesianGrid vertical={false} stroke="rgba(255,255,255,.06)" />;
  const tip = (cursor?: object) => (
    <Tooltip cursor={cursor} content={<Tip unit={unit} decimals={decimals} />} />
  );
  const ref = (
    <ReferenceLine
      y={goal ?? avg}
      stroke={goal ? color : "rgba(255,255,255,.35)"}
      strokeDasharray="5 5"
      strokeOpacity={goal ? 0.8 : 1}
    />
  );
  const recent = data.slice(-14);

  const chip = (label: string, value: string) => (
    <span className="rounded-full bg-white/[.06] px-2.5 py-1 text-[11px] text-white/65 ring-1 ring-white/10">
      {label} <b className="tabular-nums text-white">{value}</b>
    </span>
  );

  return (
    <article className="nv-round relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#181c25] to-[#10131a] p-4 text-white shadow-card">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-25 blur-3xl"
        style={{ background: color }}
      />
      <header className="relative flex items-start gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-white/10"
          style={{ background: `linear-gradient(135deg, ${color}44, ${color}12)`, color }}
        >
          <Icon size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold text-white/55">{eyebrow}</p>
          <h3 className="truncate text-[15px] font-bold leading-tight">{title}</h3>
        </div>
        {has && (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums"
            style={{ background: `${color}22`, color }}
          >
            <DeltaIcon size={13} />
            {delta > 0 ? "+" : ""}
            {fmt(delta, decimals)} {unit}
          </span>
        )}
      </header>

      {has ? (
        <>
          <p className="relative mt-3 flex items-baseline gap-1.5">
            <strong className="text-[2rem] font-extrabold leading-none tabular-nums">
              {fmt(isStack ? max : last, decimals)}
            </strong>
            <span className="text-sm font-semibold text-white/55">{unit}</span>
            <span className="ml-1 text-xs text-white/50">
              {isStack ? "maior dia" : "último registro"}
            </span>
          </p>

          <div
            className={kind === "ring" ? "relative mt-3 flex items-center gap-4" : "relative mt-2"}
          >
            {kind === "ring" && (
              <Ring
                value={last}
                goal={goal ?? 8}
                color={color}
                center={`${fmt(last, decimals)} ${unit}`}
                caption={`meta ${fmt(goal ?? 8, 0)} ${unit}`}
              />
            )}
            <div
              className={`${kind === "ring" ? "min-w-0 flex-1" : "w-full"} h-44`}
              role="img"
              aria-label={`${title}: gráfico`}
            >
              <ResponsiveContainer>
                {kind === "area" ? (
                  <AreaChart data={data} margin={margin}>
                    <defs>
                      <linearGradient id={`a${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={main.color} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={main.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    {grid}
                    {xAxis}
                    {yAxis}
                    {tip({ stroke: "rgba(255,255,255,.3)", strokeDasharray: "3 3" })}
                    {ref}
                    <Area
                      type="monotone"
                      dataKey={main.key}
                      name={main.name}
                      stroke={main.color}
                      strokeWidth={3}
                      fill={`url(#a${uid})`}
                      style={{ filter: `drop-shadow(0 6px 10px ${main.color}77)` }}
                      dot={false}
                      activeDot={{ r: 6, stroke: "#10131a", strokeWidth: 3, fill: main.color }}
                    />
                    <ReferenceDot
                      x={String(data[data.length - 1].day)}
                      y={last}
                      r={6}
                      fill={main.color}
                      stroke="#10131a"
                      strokeWidth={3}
                      ifOverflow="extendDomain"
                    />
                  </AreaChart>
                ) : kind === "line" ? (
                  <LineChart data={data} margin={margin}>
                    {grid}
                    {xAxis}
                    {yAxis}
                    {tip({ stroke: "rgba(255,255,255,.3)", strokeDasharray: "3 3" })}
                    {ref}
                    <Line
                      type="monotone"
                      dataKey={main.key}
                      name={main.name}
                      stroke={main.color}
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 2, stroke: "#10131a", fill: main.color }}
                      activeDot={{ r: 7, stroke: "#10131a", strokeWidth: 3, fill: main.color }}
                      style={{ filter: `drop-shadow(0 0 8px ${main.color}88)` }}
                    />
                    {data.length > 2 && (
                      <ReferenceDot
                        x={String(data[maxIdx].day)}
                        y={max}
                        r={8}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth={2}
                        ifOverflow="extendDomain"
                      />
                    )}
                    {data.length > 2 && (
                      <ReferenceDot
                        x={String(data[minIdx].day)}
                        y={min}
                        r={8}
                        fill="none"
                        stroke="#34d399"
                        strokeWidth={2}
                        ifOverflow="extendDomain"
                      />
                    )}
                  </LineChart>
                ) : kind === "lollipop" ? (
                  <BarChart data={data} margin={margin} barCategoryGap="30%">
                    {grid}
                    {xAxis}
                    {yAxis}
                    {tip({ fill: "rgba(255,255,255,.05)" })}
                    {ref}
                    <Bar
                      dataKey={main.key}
                      name={main.name}
                      maxBarSize={4}
                      radius={4}
                      shape={(raw: unknown) => {
                        const p = raw as {
                          x: number;
                          y: number;
                          width: number;
                          height: number;
                          index: number;
                        };
                        const cx = p.x + p.width / 2;
                        const hot = p.index === data.length - 1;
                        return (
                          <g>
                            <line
                              x1={cx}
                              x2={cx}
                              y1={p.y}
                              y2={p.y + p.height}
                              stroke={main.color}
                              strokeOpacity={hot ? 1 : 0.55}
                              strokeWidth={3}
                              strokeLinecap="round"
                            />
                            <circle
                              cx={cx}
                              cy={p.y}
                              r={hot ? 7 : 5}
                              fill={main.color}
                              stroke="#10131a"
                              strokeWidth={2.5}
                              style={
                                hot ? { filter: `drop-shadow(0 0 8px ${main.color})` } : undefined
                              }
                            />
                          </g>
                        );
                      }}
                    />
                  </BarChart>
                ) : kind === "ring" ? (
                  <BarChart data={recent} margin={{ ...margin, left: -22 }}>
                    <defs>
                      <linearGradient id={`b${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={main.color} />
                        <stop offset="100%" stopColor={main.color} stopOpacity={0.35} />
                      </linearGradient>
                    </defs>
                    {grid}
                    {xAxis}
                    {yAxis}
                    {tip({ fill: "rgba(255,255,255,.05)" })}
                    <ReferenceLine y={goal ?? 8} stroke={color} strokeDasharray="5 5" />
                    <Bar dataKey={main.key} name={main.name} radius={[8, 8, 3, 3]} maxBarSize={22}>
                      {recent.map((_, i) => (
                        <Cell
                          key={i}
                          fill={`url(#b${uid})`}
                          fillOpacity={i === recent.length - 1 ? 1 : 0.6}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <BarChart data={data} margin={margin} barGap={2}>
                    <defs>
                      {series.map((s) => (
                        <linearGradient
                          key={s.key}
                          id={`b${uid}${s.key}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={s.color} />
                          <stop offset="100%" stopColor={s.color} stopOpacity={0.4} />
                        </linearGradient>
                      ))}
                    </defs>
                    {grid}
                    {xAxis}
                    {yAxis}
                    {tip({ fill: "rgba(255,255,255,.05)" })}
                    {!isStack && ref}
                    {series.map((s, si) => (
                      <Bar
                        key={s.key}
                        dataKey={s.key}
                        name={s.name}
                        stackId={isStack ? "a" : undefined}
                        maxBarSize={isStack ? 30 : 26}
                        radius={
                          isStack ? (si === series.length - 1 ? [8, 8, 0, 0] : 0) : [8, 8, 3, 3]
                        }
                        stroke={isStack ? "#10131a" : undefined}
                        strokeWidth={isStack ? 2 : 0}
                      >
                        {data.map((_, i) => (
                          <Cell
                            key={i}
                            fill={`url(#b${uid}${s.key})`}
                            fillOpacity={isStack || i === data.length - 1 ? 1 : 0.62}
                          />
                        ))}
                      </Bar>
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {series.length > 1 && (
            <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/70">
              {series.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5">
                  <i className="size-2 rounded-full" style={{ background: s.color }} /> {s.name}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {chip("Média", `${fmt(avg, decimals)} ${unit}`)}
            {!isStack && chip("Maior", `${fmt(max, decimals)} ${unit}`)}
            {!isStack && chip("Menor", `${fmt(min, decimals)} ${unit}`)}
            {goal ? chip(goalLabel ?? "Meta", `${fmt(goal, decimals)} ${unit}`) : null}
          </div>
        </>
      ) : (
        <div className="relative mt-3 grid h-44 place-items-center rounded-xl border border-dashed border-white/15 px-5 text-center text-sm text-white/60">
          {empty}
        </div>
      )}
      {children}
    </article>
  );
}
