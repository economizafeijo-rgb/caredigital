import { useId, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

export type Series = { key: string; name: string; color: string };
type Row = Record<string, number | string | undefined>;

const fmt = (v: number, d = 0) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });

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
    <div className="border border-white/15 bg-[#0b1220]/95 px-2.5 py-2 text-xs text-white shadow-xl backdrop-blur">
      <p className="mb-1 font-semibold text-white/70">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 tabular-nums">
          <i className="size-2" style={{ background: p.stroke ?? p.fill ?? p.color }} />
          <span className="text-white/70">{p.name}</span>
          <b className="ml-auto pl-3">
            {fmt(Number(p.value), decimals)} {unit}
          </b>
        </p>
      ))}
    </div>
  );
}

/** Painel de indicador: título, três números-chave e gráfico limpo com tooltip próprio. */
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
  stacked = false,
  empty,
  domain,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  color: string;
  data: Row[];
  series: Series[];
  kind: "area" | "bar";
  unit: string;
  decimals?: number;
  stacked?: boolean;
  empty: string;
  domain?: [string | number, string | number];
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
  const DeltaIcon = Math.abs(delta) < 0.05 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const stat = (label: string, value: string, extra?: ReactNode) => (
    <div className="min-w-0 bg-white/[.03] px-2.5 py-1.5">
      <p className="truncate text-[10px] font-semibold text-white/50">{label}</p>
      <p className="flex items-baseline gap-1 text-base font-extrabold tabular-nums leading-tight">
        {extra}
        {value}
        <span className="text-[10px] font-semibold text-white/50">{unit}</span>
      </p>
    </div>
  );

  return (
    <article className="nv-dark min-w-0 border border-white/10 bg-[#0d1626] p-3 text-white">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-white/50">{eyebrow}</p>
          <h3 className="truncate text-base font-bold leading-tight">{title}</h3>
        </div>
        <span
          className="grid size-8 shrink-0 place-items-center"
          style={{ background: `${color}22`, color }}
        >
          <Icon size={16} />
        </span>
      </header>

      {has ? (
        <>
          <div className="mt-2.5 grid grid-cols-3 gap-px bg-white/10">
            {stat("Último", fmt(last, decimals))}
            {stat("Média", fmt(avg, decimals))}
            {stat(
              stacked ? "Maior dia" : "Variação",
              stacked ? fmt(max, decimals) : `${delta > 0 ? "+" : ""}${fmt(delta, decimals)}`,
              !stacked ? <DeltaIcon size={13} style={{ color }} className="self-center" /> : null,
            )}
          </div>
          <div className="mt-2 h-44 w-full" role="img" aria-label={`${title}: gráfico`}>
            <ResponsiveContainer>
              {kind === "area" ? (
                <AreaChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={main.color} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={main.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,.07)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,.5)" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={domain}
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,.5)" }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(255,255,255,.25)", strokeDasharray: "3 3" }}
                    content={<Tip unit={unit} decimals={decimals} />}
                  />
                  <ReferenceLine y={avg} stroke="rgba(255,255,255,.35)" strokeDasharray="4 4" />
                  <Area
                    type="monotone"
                    dataKey={main.key}
                    name={main.name}
                    stroke={main.color}
                    strokeWidth={2.5}
                    fill={`url(#g${uid})`}
                    dot={data.length <= 12 ? { r: 3, strokeWidth: 0, fill: main.color } : false}
                    activeDot={{ r: 5, stroke: "#0d1626", strokeWidth: 2, fill: main.color }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,.07)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,.5)" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,.5)" }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,.06)" }}
                    content={<Tip unit={unit} decimals={decimals} />}
                  />
                  {!stacked && (
                    <ReferenceLine y={avg} stroke="rgba(255,255,255,.35)" strokeDasharray="4 4" />
                  )}
                  {series.map((s) => (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      name={s.name}
                      fill={s.color}
                      stackId={stacked ? "a" : undefined}
                      maxBarSize={28}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          {series.length > 1 && (
            <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/70">
              {series.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5">
                  <i className="size-2" style={{ background: s.color }} /> {s.name}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-[10px] text-white/40">Linha tracejada: média do período.</p>
        </>
      ) : (
        <div className="mt-3 grid h-44 place-items-center border border-dashed border-white/15 px-5 text-center text-sm text-white/55">
          {empty}
        </div>
      )}
      {children}
    </article>
  );
}
