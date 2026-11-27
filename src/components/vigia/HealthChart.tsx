import { useId, useMemo, useState } from "react";
import type { Bucket } from "@/lib/health-ranges";

export type ChartSeries = {
  id: string;
  label: string;
  color: string;
  unit: string;
  values: number[];
  type: "bar" | "line";
  /** Eixo esquerdo (a) ou direito (b), para unidades diferentes no mesmo gráfico. */
  axis?: "a" | "b";
  /** Como resumir o período: soma, média dos intervalos com dado ou último valor. */
  agg?: "sum" | "avg";
  /** Linha de limite no mesmo eixo. */
  limit?: { value: number; label: string };
  digits?: number;
};

const W = 360;
const H = 260;
const PAD = { l: 38, r: 38, t: 16, b: 28 };

const nice = (max: number) => {
  if (max <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
};
const fmt = (v: number, d = 0) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: 0 });

/** Curva suave (Catmull-Rom convertida em Bézier) por pontos. */
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Gráfico interativo: barras e linhas com dois eixos, cursor, resumo do período e séries ligáveis. */
export function HealthChart({
  buckets,
  series,
  title,
  hint,
}: {
  buckets: Bucket[];
  series: ChartSeries[];
  title?: string;
  hint?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const [off, setOff] = useState<Set<string>>(new Set());
  const [pick, setPick] = useState<number | null>(null);
  const n = buckets.length;
  const vis = series.filter((s) => !off.has(s.id));
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const slot = iw / Math.max(1, n);
  const cx = (i: number) => PAD.l + (i + 0.5) * slot;

  const scale = useMemo(() => {
    const max = (ax: "a" | "b") => {
      const list = vis.filter((s) => (s.axis ?? "a") === ax);
      const top = Math.max(0, ...list.flatMap((s) => [...s.values, s.limit?.value ?? 0]));
      return { has: list.length > 0, max: nice(top * 1.08) };
    };
    return { a: max("a"), b: max("b") };
  }, [vis]);
  const y = (v: number, ax: "a" | "b") => PAD.t + ih - (v / scale[ax].max) * ih;
  // Se só o eixo b estiver ligado, ele vira o esquerdo.
  const leftAxis: "a" | "b" = scale.a.has ? "a" : "b";
  const showRight = scale.a.has && scale.b.has;
  const step = Math.ceil(n / 8);

  function move(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    setPick(Math.min(n - 1, Math.max(0, Math.floor((x - PAD.l) / slot))));
  }
  function key(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") setPick((p) => Math.min(n - 1, (p ?? -1) + 1));
    else if (e.key === "ArrowLeft") setPick((p) => Math.max(0, (p ?? n) - 1));
    else if (e.key === "Escape") setPick(null);
  }

  const summary = (s: ChartSeries) => {
    const filled = s.values.filter((v) => v > 0);
    const sum = s.values.reduce((a, b) => a + b, 0);
    return s.agg === "avg" ? (filled.length ? sum / filled.length : 0) : sum;
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-3.5 shadow-sm sm:p-4">
      {(title || hint) && (
        <div className="mb-2">
          {title && <h3 className="text-sm font-bold">{title}</h3>}
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      )}
      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Séries do gráfico">
        {series.map((s) => {
          const on = !off.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setOff((o) => {
                  const next = new Set(o);
                  if (next.has(s.id)) next.delete(s.id);
                  else next.add(s.id);
                  return next;
                })
              }
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition active:scale-95 ${on ? "bg-muted/60" : "border-border text-muted-foreground opacity-60"}`}
              style={on ? { borderColor: s.color } : undefined}
            >
              <span className="size-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Leitura do ponto tocado, ou resumo do período */}
      <div className="mb-1 min-h-[3.25rem] rounded-2xl bg-muted/40 px-3 py-2" aria-live="polite">
        <p className="text-[11px] font-semibold text-muted-foreground">
          {pick !== null ? buckets[pick].long : "Resumo do período"}
        </p>
        <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
          {vis.map((s) => {
            const v = pick !== null ? s.values[pick] : summary(s);
            return (
              <span
                key={s.id}
                className="text-sm font-bold tabular-nums"
                style={{ color: s.color }}
              >
                {fmt(v, s.digits ?? (s.unit === "g" ? 1 : 0))}
                <span className="ml-0.5 text-[10px] font-semibold text-muted-foreground">
                  {s.unit} {pick === null && s.agg === "avg" ? "(média)" : ""}
                </span>
              </span>
            );
          })}
          {!vis.length && (
            <span className="text-xs text-muted-foreground">Ligue uma série acima.</span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y select-none outline-none"
        role="img"
        tabIndex={0}
        aria-label={`${title ?? "Gráfico"}. Use as setas para navegar pelos intervalos.`}
        onPointerMove={move}
        onPointerDown={move}
        onPointerLeave={(e) => e.pointerType === "mouse" && setPick(null)}
        onKeyDown={key}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.id} id={`${uid}-${s.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={s.type === "bar" ? 0.95 : 0.35} />
              <stop offset="100%" stopColor={s.color} stopOpacity={s.type === "bar" ? 0.55 : 0} />
            </linearGradient>
          ))}
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const ax = leftAxis;
          const yy = PAD.t + ih - f * ih;
          return (
            <g key={f}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={yy}
                y2={yy}
                stroke="currentColor"
                strokeOpacity={f === 0 ? 0.3 : 0.1}
              />
              <text
                x={PAD.l - 5}
                y={yy + 3}
                textAnchor="end"
                fontSize="10.5"
                fill="currentColor"
                opacity=".55"
              >
                {fmt(scale[ax].max * f, scale[ax].max < 10 ? 1 : 0)}
              </text>
              {showRight && (
                <text
                  x={W - PAD.r + 5}
                  y={yy + 3}
                  fontSize="10.5"
                  fill="currentColor"
                  opacity=".55"
                >
                  {fmt(scale.b.max * f, scale.b.max < 10 ? 1 : 0)}
                </text>
              )}
            </g>
          );
        })}
        {buckets.map((b, i) =>
          i % step === 0 || i === n - 1 ? (
            <text
              key={b.startMs}
              x={cx(i)}
              y={H - 9}
              textAnchor="middle"
              fontSize="10.5"
              fill="currentColor"
              opacity=".55"
            >
              {b.label}
            </text>
          ) : null,
        )}
        {pick !== null && (
          <rect
            x={PAD.l + pick * slot}
            y={PAD.t}
            width={slot}
            height={ih}
            fill="currentColor"
            opacity=".07"
            rx="3"
          />
        )}
        {vis
          .filter((s) => s.limit)
          .map((s) => {
            const ax = s.axis ?? "a";
            const yy = y(s.limit!.value, ax);
            return (
              <g key={`l-${s.id}`}>
                <line
                  x1={PAD.l}
                  x2={W - PAD.r}
                  y1={yy}
                  y2={yy}
                  stroke={s.color}
                  strokeDasharray="5 4"
                  strokeOpacity=".8"
                />
                <text
                  x={W - PAD.r - 2}
                  y={yy - 3}
                  textAnchor="end"
                  fontSize="10.5"
                  fontWeight="700"
                  fill={s.color}
                >
                  {s.limit!.label}
                </text>
              </g>
            );
          })}
        {vis
          .filter((s) => s.type === "bar")
          .map((s, si, arr) => {
            const ax = s.axis ?? "a";
            const bw = Math.min(28, (slot * 0.72) / arr.length);
            return s.values.map((v, i) => {
              if (v <= 0) return null;
              const x = cx(i) - (bw * arr.length) / 2 + si * bw;
              const hh = PAD.t + ih - y(v, ax);
              const over = s.limit && v > s.limit.value;
              return (
                <rect
                  key={`${s.id}-${i}`}
                  x={x + 0.5}
                  y={y(v, ax)}
                  width={Math.max(1.5, bw - 1)}
                  height={hh}
                  rx={Math.min(4, bw / 2)}
                  fill={over ? "#ef4444" : `url(#${uid}-${s.id})`}
                  opacity={pick === null || pick === i ? 1 : 0.5}
                />
              );
            });
          })}
        {vis
          .filter((s) => s.type === "line")
          .map((s) => {
            const ax = s.axis ?? "a";
            const pts: [number, number][] = s.values.map((v, i) => [cx(i), y(v, ax)]);
            const line = smooth(pts);
            return (
              <g key={s.id}>
                <path
                  d={`${line} L${cx(n - 1)},${PAD.t + ih} L${cx(0)},${PAD.t + ih} Z`}
                  fill={`url(#${uid}-${s.id})`}
                />
                <path
                  d={line}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {pick !== null && (
                  <circle
                    cx={cx(pick)}
                    cy={y(s.values[pick], ax)}
                    r="4.5"
                    fill="var(--card, #fff)"
                    stroke={s.color}
                    strokeWidth="2.5"
                  />
                )}
              </g>
            );
          })}
        {pick !== null && (
          <line
            x1={cx(pick)}
            x2={cx(pick)}
            y1={PAD.t}
            y2={PAD.t + ih}
            stroke="currentColor"
            strokeOpacity=".3"
            strokeDasharray="2 3"
          />
        )}
      </svg>
      {!vis.length ? null : (
        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          Toque ou arraste no gráfico para ver cada intervalo.
        </p>
      )}
    </div>
  );
}
