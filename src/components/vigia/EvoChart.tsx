import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

/**
 * Gráfico de evolução da plataforma: linha suave com área em degradê, grade discreta,
 * cursor em cruz com o valor no eixo, ponto ao vivo pulsando e dica flutuante.
 * Desenhado em pixels reais (mede a largura do contêiner), então o texto nunca escala
 * junto com o gráfico. Um único eixo Y — séries de escalas diferentes vão na dica.
 */
export type EvoPoint = { x: number; y: number; color?: string };
export type EvoSeries = {
  id: string;
  label: string;
  color: string;
  points: EvoPoint[];
  /** Linha tracejada (referência, tendência, ritmo ideal). */
  dashed?: boolean;
  /** Área em degradê sob a linha. */
  area?: boolean;
  /** Pontos visíveis em cada registro. */
  dots?: boolean;
  /** Reta entre os pontos em vez de curva suave. */
  linear?: boolean;
  /** Pulso ao vivo no último ponto. */
  live?: boolean;
};

/** Barra (pode ter segmentos empilhados). `w` é a largura em unidades de x. */
export type EvoBar = {
  x: number;
  w: number;
  label?: string;
  parts: { y: number; color: string; label: string }[];
};

type Props = {
  series: EvoSeries[];
  bars?: EvoBar[];
  xMin: number;
  xMax: number;
  xTicks: { x: number; label: string }[];
  formatX: (x: number) => string;
  formatY: (y: number) => string;
  /** Valor mínimo do topo do eixo (ex.: a meta). */
  yFloor?: number;
  /** Eixo ajustado aos dados (não começa no zero) — para peso, IMC etc. */
  yAuto?: boolean;
  /** Faixa de referência sombreada (ex.: peso adequado). */
  band?: { from: number; to: number; label: string; color?: string };
  goal?: { y: number; label: string; color?: string };
  /** Linha vertical "agora". */
  nowX?: number;
  height?: number;
  selectedX?: number | null;
  onPick?: (x: number) => void;
  /** Linhas extras na dica para o ponto sob o cursor. */
  tip?: (x: number) => ReactNode;
  /** Botão extra no painel fixado (ex.: abrir os registros do dia). */
  detailAction?: (x: number) => { label: string; onClick: () => void } | null;
  ariaLabel: string;
  className?: string;
};

const PAD = { l: 46, r: 14, t: 14, b: 26 };

function niceStep(max: number, count = 4) {
  const raw = Math.max(max, 1e-6) / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

/** Curva monotônica (Fritsch–Carlson): suave, sem ultrapassar os valores reais. */
export function monotonePath(pts: [number, number][]): string {
  const n = pts.length;
  if (!n) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    m.push(dx ? (pts[i + 1][1] - pts[i][1]) / dx : 0);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i],
      b = t[i + 1] / m[i],
      s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i],
      [x1, y1] = pts[i + 1],
      h = (x1 - x0) / 3;
    d += `C${(x0 + h).toFixed(1)},${(y0 + t[i] * h).toFixed(1)} ${(x1 - h).toFixed(1)},${(y1 - t[i + 1] * h).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

/** Valor da série em x (interpolação linear entre os vizinhos). */
export function valueAt(points: EvoPoint[], x: number): number | null {
  if (!points.length || x < points[0].x || x > points[points.length - 1].x) return null;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i],
      b = points[i + 1];
    if (x >= a.x && x <= b.x)
      return b.x === a.x ? b.y : a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
  }
  return points[points.length - 1].y;
}

export function EvoChart({
  series,
  bars = [],
  xMin,
  xMax,
  xTicks,
  formatX,
  formatY,
  yFloor = 0,
  yAuto = false,
  band,
  goal,
  nowX,
  height = 220,
  selectedX = null,
  onPick,
  tip,
  detailAction,
  ariaLabel,
  className = "",
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [pin, setPin] = useState<{ x: number; part?: string } | null>(null);
  const uid = useId().replace(/:/g, "");
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const set = () => setW(Math.round(el.getBoundingClientRect().width));
    set();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const all = [
    ...series.flatMap((s) => s.points.map((p) => p.y)),
    ...bars.map((b) => b.parts.reduce((a, p) => a + p.y, 0)),
  ];
  const yMaxRaw = Math.max(yFloor, goal?.y ?? 0, ...all, yAuto ? -Infinity : 1);
  let yBase = 0,
    step: number,
    yTop: number;
  if (yAuto) {
    const lo = Math.min(...all, goal?.y ?? Infinity);
    const span = Math.max(1, yMaxRaw - lo);
    step = niceStep(span * 1.3);
    yBase = Math.floor((lo - span * 0.15) / step) * step;
    yTop = Math.ceil((yMaxRaw + span * 0.15) / step) * step;
  } else {
    step = niceStep(yMaxRaw * 1.06);
    yTop = Math.ceil((yMaxRaw * 1.06) / step) * step;
  }
  const ticks = Array.from(
    { length: Math.round((yTop - yBase) / step) + 1 },
    (_, i) => yBase + i * step,
  );
  const iw = Math.max(1, w - PAD.l - PAD.r),
    ih = height - PAD.t - PAD.b;
  const sx = (x: number) => PAD.l + ((x - xMin) / Math.max(1e-9, xMax - xMin)) * iw;
  const sy = (y: number) => PAD.t + (1 - (y - yBase) / (yTop - yBase)) * ih;
  const primary = series[0];
  const snaps = useMemo(
    () =>
      [
        ...new Set([
          ...series.filter((s) => !s.dashed).flatMap((s) => s.points.map((p) => p.x)),
          ...bars.map((b) => b.x),
        ]),
      ].sort((a, b) => a - b),
    [series, bars],
  );

  const nearest = (x: number) =>
    snaps.reduce<number | null>(
      (best, v) => (best === null || Math.abs(v - x) < Math.abs(best - x) ? v : best),
      null,
    );
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = xMin + ((e.clientX - r.left - PAD.l) / iw) * (xMax - xMin);
    setHoverX(nearest(Math.min(xMax, Math.max(xMin, x))));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!snaps.length) return;
    const cur = hoverX ?? selectedX ?? snaps[snaps.length - 1];
    const i = snaps.indexOf(cur);
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setHoverX(
        snaps[
          Math.min(
            snaps.length - 1,
            Math.max(0, (i < 0 ? snaps.length - 1 : i) + (e.key === "ArrowRight" ? 1 : -1)),
          )
        ],
      );
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setPin((c) => (c && c.x === cur ? null : { x: cur }));
      onPick?.(cur);
    } else if (e.key === "Escape") setPin(null);
  };
  const partAt = (x: number, py: number) => {
    const bar = bars.find((b) => b.x === x);
    if (!bar) return undefined;
    const value = yBase + (1 - (py - PAD.t) / ih) * (yTop - yBase);
    let acc = 0;
    for (const p of bar.parts) {
      if (p.y <= 0) continue;
      if (value >= acc && value <= acc + p.y) return p.label;
      acc += p.y;
    }
    return undefined;
  };
  const onClickChart = (e: ReactMouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x =
      hoverX ??
      nearest(
        Math.min(xMax, Math.max(xMin, xMin + ((e.clientX - r.left - PAD.l) / iw) * (xMax - xMin))),
      );
    if (x === null) return;
    const part = partAt(x, e.clientY - r.top);
    setPin((cur) => (cur && cur.x === x && cur.part === part ? null : { x, part }));
    onPick?.(x);
  };
  const activeX = hoverX ?? pin?.x ?? selectedX;
  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="w-full">
      <div ref={box} className={`relative w-full select-none ${className}`} style={{ height }}>
        {w > 0 && (
          <svg
            width={w}
            height={height}
            className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHoverX(null)}
            onBlur={() => setHoverX(null)}
            onKeyDown={onKey}
            onClick={onClickChart}
            style={{ cursor: "pointer" }}
          >
            <defs>
              {series
                .filter((s) => s.area)
                .map((s) => (
                  <linearGradient key={s.id} id={`${uid}-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={s.color} stopOpacity=".42" />
                    <stop offset=".6" stopColor={s.color} stopOpacity=".1" />
                    <stop offset="1" stopColor={s.color} stopOpacity="0" />
                  </linearGradient>
                ))}
              <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity=".28" />
                <stop offset=".55" stopColor="#fff" stopOpacity="0" />
                <stop offset="1" stopColor="#000" stopOpacity=".12" />
              </linearGradient>
              <linearGradient id={`${uid}-col`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity=".0" />
                <stop offset=".5" stopColor="currentColor" stopOpacity=".07" />
                <stop offset="1" stopColor="currentColor" stopOpacity=".0" />
              </linearGradient>
              <clipPath id={`${uid}-clip`}>
                <rect x={PAD.l} y={0} width={iw} height={height} />
              </clipPath>
            </defs>

            {ticks.map((v) => (
              <g key={v}>
                <line
                  x1={PAD.l}
                  x2={PAD.l + iw}
                  y1={sy(v)}
                  y2={sy(v)}
                  stroke="currentColor"
                  className={v === yBase ? "text-border" : "text-border/40"}
                  strokeDasharray={v === yBase ? undefined : "3 5"}
                />
                <text
                  x={PAD.l - 8}
                  y={sy(v) + 3.5}
                  textAnchor="end"
                  fontSize="11"
                  fill="currentColor"
                  className="text-muted-foreground tabular-nums"
                >
                  {formatY(v)}
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <text
                key={t.x}
                x={sx(t.x)}
                y={height - 7}
                textAnchor="middle"
                fontSize="11"
                fill="currentColor"
                className="text-muted-foreground"
              >
                {t.label}
              </text>
            ))}

            {nowX !== undefined && nowX >= xMin && nowX <= xMax && (
              <rect
                x={PAD.l}
                y={PAD.t}
                width={sx(nowX) - PAD.l}
                height={ih}
                fill={primary?.color ?? "#0ea5e9"}
                fillOpacity=".035"
              />
            )}
            {band && band.to > yBase && band.from < yTop && (
              <g>
                <rect
                  x={PAD.l}
                  width={iw}
                  y={sy(Math.min(yTop, band.to))}
                  height={Math.max(0, sy(Math.max(yBase, band.from)) - sy(Math.min(yTop, band.to)))}
                  fill={band.color ?? "#10b981"}
                  fillOpacity=".08"
                />
                <text
                  x={PAD.l + 6}
                  y={sy(Math.min(yTop, band.to)) + 13}
                  fontSize="10"
                  fontWeight="600"
                  fill={band.color ?? "#10b981"}
                  opacity=".8"
                >
                  {band.label}
                </text>
              </g>
            )}
            {goal && (
              <g>
                <line
                  x1={PAD.l}
                  x2={PAD.l + iw}
                  y1={sy(goal.y)}
                  y2={sy(goal.y)}
                  stroke={goal.color ?? "#10b981"}
                  strokeWidth="1.5"
                  strokeDasharray="6 5"
                />
                <rect
                  x={PAD.l + iw - 8 - goal.label.length * 6.4}
                  y={sy(goal.y) - 19}
                  width={goal.label.length * 6.4 + 8}
                  height="16"
                  rx="8"
                  fill={goal.color ?? "#10b981"}
                  fillOpacity=".14"
                />
                <text
                  x={PAD.l + iw - 4}
                  y={sy(goal.y) - 7.5}
                  textAnchor="end"
                  fontSize="10.5"
                  fontWeight="700"
                  fill={goal.color ?? "#10b981"}
                >
                  {goal.label}
                </text>
              </g>
            )}

            {activeX !== null && (
              <rect
                x={-14}
                y={PAD.t}
                width={28}
                height={ih}
                fill={`url(#${uid}-col)`}
                className="text-foreground"
                pointerEvents="none"
                style={{
                  transform: `translateX(${sx(activeX)}px)`,
                  transition: reduced ? undefined : "transform .14s cubic-bezier(.2,.8,.2,1)",
                }}
              />
            )}
            <g>
              {bars.map((b) => {
                const bw = Math.max(3, Math.min(34, (b.w / Math.max(1e-9, xMax - xMin)) * iw - 3));
                const x0 = sx(b.x) - bw / 2;
                let acc = 0;
                const on = activeX === b.x;
                const total = b.parts.reduce((a, p) => a + p.y, 0);
                return (
                  <g
                    key={b.x}
                    opacity={activeX === null || on ? 1 : 0.45}
                    style={{ transition: "opacity .2s" }}
                  >
                    {b.parts
                      .filter((p) => p.y > 0)
                      .map((p, i, arr) => {
                        const y0 = sy(acc),
                          y1 = sy(acc + p.y);
                        acc += p.y;
                        const top = i === arr.length - 1;
                        const h = Math.max(0, y0 - y1 - (top ? 0 : 1.5));
                        const r = top ? Math.min(4, bw / 2, h) : 0;
                        const dBar = `M${x0},${y0}V${y0 - h + r}${r ? `Q${x0},${y0 - h} ${x0 + r},${y0 - h}H${x0 + bw - r}Q${x0 + bw},${y0 - h} ${x0 + bw},${y0 - h + r}` : `H${x0 + bw}`}V${y0}Z`;
                        return (
                          <g key={i}>
                            <path
                              className={reduced ? "" : "nv-bar"}
                              style={{
                                transformOrigin: `0 ${sy(0)}px`,
                                transformBox: "view-box" as never,
                              }}
                              d={`M${x0},${y0}V${y0 - h + r}${r ? `Q${x0},${y0 - h} ${x0 + r},${y0 - h}H${x0 + bw - r}Q${x0 + bw},${y0 - h} ${x0 + bw},${y0 - h + r}` : `H${x0 + bw}`}V${y0}Z`}
                              fill={p.color}
                              fillOpacity={
                                pin && pin.x === b.x && pin.part
                                  ? pin.part === p.label
                                    ? 1
                                    : 0.3
                                  : on
                                    ? 1
                                    : 0.82
                              }
                            />
                            <path
                              d={dBar}
                              fill={`url(#${uid}-sheen)`}
                              pointerEvents="none"
                              className={reduced ? "" : "nv-bar"}
                              style={{
                                transformOrigin: `0 ${sy(0)}px`,
                                transformBox: "view-box" as never,
                              }}
                            />
                          </g>
                        );
                      })}
                    {on && total > 0 && (
                      <rect
                        x={x0 - 3}
                        y={sy(total) - 3}
                        width={bw + 6}
                        height={sy(0) - sy(total) + 3}
                        rx="6"
                        fill="none"
                        stroke="currentColor"
                        className="text-foreground/30"
                      />
                    )}
                  </g>
                );
              })}
            </g>
            <g clipPath={`url(#${uid}-clip)`}>
              {series.map((s) => {
                if (!s.points.length) return null;
                const px = s.points.map((p) => [sx(p.x), sy(p.y)] as [number, number]);
                const d = s.linear
                  ? px
                      .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
                      .join("")
                  : monotonePath(px);
                return (
                  <g key={s.id}>
                    {s.area && px.length > 1 && (
                      <path
                        d={`${d}L${px[px.length - 1][0].toFixed(1)},${sy(yBase)}L${px[0][0].toFixed(1)},${sy(yBase)}Z`}
                        fill={`url(#${uid}-${s.id})`}
                        className={reduced ? "" : "nv-evo-fade"}
                      />
                    )}
                    <path
                      d={d}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={s.dashed ? 1.75 : 2.75}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={s.dashed ? "5 5" : undefined}
                      pathLength={s.dashed ? undefined : 1}
                      className={s.dashed || reduced ? "" : "nv-draw-now"}
                      opacity={s.dashed ? 0.85 : 1}
                      style={
                        s.dashed ? undefined : { filter: `drop-shadow(0 6px 10px ${s.color}66)` }
                      }
                    />
                  </g>
                );
              })}
            </g>
            {series
              .filter((s) => s.dots && !s.dashed)
              .flatMap((s) =>
                s.points.map((p) => (
                  <circle
                    key={`${s.id}-${p.x}`}
                    cx={sx(p.x)}
                    cy={sy(p.y)}
                    r={activeX === p.x ? 0 : 3.25}
                    fill="var(--color-card, #fff)"
                    stroke={p.color ?? s.color}
                    strokeWidth="2"
                  />
                )),
              )}
            {primary &&
              !primary.dashed &&
              primary.points.length >= 3 &&
              (() => {
                const hi = primary.points.reduce((m, p) => (p.y > m.y ? p : m), primary.points[0]);
                const lo = primary.points.reduce((m, p) => (p.y < m.y ? p : m), primary.points[0]);
                if (hi.y === lo.y) return null;
                const tag = (p: EvoPoint, up: boolean) => {
                  const text = formatY(p.y);
                  const wTag = text.length * 6.2 + 14;
                  const cx = Math.min(PAD.l + iw - wTag / 2, Math.max(PAD.l + wTag / 2, sx(p.x)));
                  const cy = sy(p.y) + (up ? -17 : 17);
                  return (
                    <g
                      key={up ? "hi" : "lo"}
                      pointerEvents="none"
                      opacity={activeX === null ? 1 : 0.55}
                    >
                      <circle cx={sx(p.x)} cy={sy(p.y)} r="3.5" fill={primary.color} />
                      <circle
                        cx={sx(p.x)}
                        cy={sy(p.y)}
                        r="7"
                        fill="none"
                        stroke={primary.color}
                        strokeOpacity=".35"
                      />
                      <rect
                        x={cx - wTag / 2}
                        y={cy - 8}
                        width={wTag}
                        height="16"
                        rx="8"
                        fill="var(--color-card, #fff)"
                        stroke={primary.color}
                        strokeOpacity=".6"
                      />
                      <text
                        x={cx}
                        y={cy + 3.5}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill={primary.color}
                        className="tabular-nums"
                      >
                        {up ? "▲ " : "▼ "}
                        {text}
                      </text>
                    </g>
                  );
                };
                return (
                  <g>
                    {tag(hi, true)}
                    {tag(lo, false)}
                  </g>
                );
              })()}
            {series
              .filter((s) => s.live && s.points.length)
              .map((s) => {
                const p = s.points[s.points.length - 1];
                return (
                  <g key={`live-${s.id}`} pointerEvents="none">
                    <circle
                      cx={sx(p.x)}
                      cy={sy(p.y)}
                      r="5"
                      fill={s.color}
                      className={reduced ? "" : "nv-evo-ping"}
                      style={{ transformOrigin: `${sx(p.x)}px ${sy(p.y)}px` }}
                    />
                    <circle
                      cx={sx(p.x)}
                      cy={sy(p.y)}
                      r="4.5"
                      fill={s.color}
                      stroke="var(--color-card, #fff)"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            {nowX !== undefined && nowX >= xMin && nowX <= xMax && (
              <g pointerEvents="none">
                <line
                  x1={sx(nowX)}
                  x2={sx(nowX)}
                  y1={PAD.t}
                  y2={PAD.t + ih}
                  stroke="currentColor"
                  className="text-muted-foreground/50"
                  strokeDasharray="2 3"
                />
                <text
                  x={sx(nowX)}
                  y={PAD.t - 3}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="currentColor"
                  className="text-muted-foreground"
                >
                  agora
                </text>
              </g>
            )}

            {activeX !== null && (
              <g pointerEvents="none">
                <line
                  x1={sx(activeX)}
                  x2={sx(activeX)}
                  y1={PAD.t}
                  y2={PAD.t + ih}
                  stroke="currentColor"
                  className="text-foreground/40"
                />
                {primary &&
                  valueAt(primary.points, activeX) !== null &&
                  (() => {
                    const y = sy(valueAt(primary.points, activeX)!);
                    const label = formatY(valueAt(primary.points, activeX)!);
                    return (
                      <g>
                        <line
                          x1={PAD.l}
                          x2={PAD.l + iw}
                          y1={y}
                          y2={y}
                          stroke="currentColor"
                          className="text-foreground/25"
                          strokeDasharray="3 3"
                        />
                        <rect
                          x={2}
                          y={y - 9}
                          width={PAD.l - 4}
                          height="18"
                          rx="5"
                          fill={primary.color}
                        />
                        <text
                          x={PAD.l / 2}
                          y={y + 3.5}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="700"
                          fill="#fff"
                          className="tabular-nums"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })()}
                {series
                  .filter((s) => !s.dashed)
                  .map((s) => {
                    const v = valueAt(s.points, activeX);
                    return v === null ? null : (
                      <g key={s.id}>
                        <circle
                          cx={sx(activeX)}
                          cy={sy(v)}
                          r="11"
                          fill={s.color}
                          fillOpacity=".16"
                        />
                        <circle
                          cx={sx(activeX)}
                          cy={sy(v)}
                          r="5.5"
                          fill={s.color}
                          stroke="var(--color-card, #fff)"
                          strokeWidth="2.5"
                        />
                      </g>
                    );
                  })}
                <rect
                  x={sx(activeX) - 30}
                  y={PAD.t + ih + 4}
                  width="60"
                  height="17"
                  rx="5"
                  fill="currentColor"
                  className="text-foreground"
                />
                <text
                  x={sx(activeX)}
                  y={PAD.t + ih + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="currentColor"
                  className="text-background"
                >
                  {formatX(activeX).split(" · ")[0]}
                </text>
              </g>
            )}
          </svg>
        )}
        {hoverX !== null && w > 0 && (
          <div
            role="status"
            className="nv-pop pointer-events-none absolute z-10 w-max min-w-48 max-w-[18rem] rounded-xl border border-border border-l-[3px] bg-popover/90 px-3.5 py-2.5 text-xs text-popover-foreground shadow-2xl backdrop-blur-xl"
            style={{
              top: PAD.t,
              borderLeftColor: primary?.color,
              ...(sx(hoverX) > w * 0.6
                ? { right: w - sx(hoverX) + 12 }
                : { left: sx(hoverX) + 12 }),
            }}
          >
            <p className="mb-1.5 whitespace-nowrap border-b border-border pb-1.5 text-[13px] font-extrabold capitalize tracking-tight">
              {formatX(hoverX)}
            </p>
            {series.map((s) => {
              const v = valueAt(s.points, hoverX);
              return v === null ? null : (
                <p
                  key={s.id}
                  className="mt-1 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
                >
                  <i
                    className={`inline-block w-3 ${s.dashed ? "border-t-2 border-dashed" : "h-[3px] rounded-full"}`}
                    style={s.dashed ? { borderColor: s.color } : { background: s.color }}
                  />
                  <span className="truncate text-muted-foreground" title={s.label}>
                    {s.label}
                  </span>
                  <strong className="whitespace-nowrap text-right tabular-nums">
                    {formatY(v)}
                  </strong>
                </p>
              );
            })}
            {bars
              .filter((b) => b.x === hoverX)
              .flatMap((b) => b.parts.filter((p) => p.y > 0))
              .map((p) => (
                <p
                  key={p.label}
                  className="mt-1 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
                >
                  <i
                    className="inline-block size-2.5 rounded-[3px]"
                    style={{ background: p.color }}
                  />
                  <span className="truncate text-muted-foreground" title={p.label}>
                    {p.label}
                  </span>
                  <strong className="whitespace-nowrap text-right tabular-nums">
                    {formatY(p.y)}
                  </strong>
                </p>
              ))}
            {tip?.(hoverX)}
          </div>
        )}
      </div>
      {pin &&
        (() => {
          const bar = bars.find((b) => b.x === pin.x);
          const total = bar ? bar.parts.reduce((a, p) => a + p.y, 0) : 0;
          const action = detailAction?.(pin.x);
          const lines = series
            .map((s) => ({ s, v: valueAt(s.points, pin.x) }))
            .filter((l) => l.v !== null);
          return (
            <div
              role="region"
              aria-label="Detalhes do ponto selecionado"
              className="nv-pop mt-2 rounded-xl border border-border bg-muted/25 p-3 text-xs"
            >
              <div className="flex items-center gap-2">
                <p className="font-bold capitalize">{formatX(pin.x)}</p>
                {total > 0 && (
                  <strong className="tabular-nums text-muted-foreground">· {formatY(total)}</strong>
                )}
                <button
                  type="button"
                  aria-label="Fechar detalhes"
                  onClick={() => setPin(null)}
                  className="ml-auto grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
              {bar && (
                <ul className="mt-2 grid gap-1">
                  {bar.parts
                    .filter((p) => p.y > 0)
                    .map((p) => (
                      <li key={p.label}>
                        <button
                          type="button"
                          aria-pressed={pin.part === p.label}
                          onClick={() =>
                            setPin({ x: pin.x, part: pin.part === p.label ? undefined : p.label })
                          }
                          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-muted ${pin.part === p.label ? "bg-muted ring-1 ring-border" : ""}`}
                        >
                          <i
                            className="size-2.5 shrink-0 rounded-[3px]"
                            style={{ background: p.color }}
                          />
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">
                            {p.label}
                          </span>
                          <strong className="tabular-nums">{formatY(p.y)}</strong>
                          {total > 0 && (
                            <span className="w-9 text-right tabular-nums text-muted-foreground">
                              {Math.round((p.y / total) * 100)}%
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
              {lines.length > 0 && (
                <ul className="mt-2 grid gap-1 border-t border-border/60 pt-2">
                  {lines.map(({ s, v }) => (
                    <li key={s.id} className="flex items-center gap-2 px-2">
                      <i
                        className={`inline-block w-3 ${s.dashed ? "border-t-2 border-dashed" : "h-[3px] rounded-full"}`}
                        style={s.dashed ? { borderColor: s.color } : { background: s.color }}
                      />
                      <span className="text-muted-foreground">{s.label}</span>
                      <strong className="ml-auto tabular-nums">{formatY(v as number)}</strong>
                    </li>
                  ))}
                </ul>
              )}
              {tip?.(pin.x)}
              {action && (
                <button
                  type="button"
                  onClick={action.onClick}
                  className="mt-2.5 inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-xs font-semibold transition hover:bg-muted active:scale-95"
                >
                  {action.label}
                </button>
              )}
            </div>
          );
        })()}
    </div>
  );
}

/** Legenda compacta usada acima dos gráficos. */
export function EvoLegend({
  items,
}: {
  items: { label: string; color: string; dashed?: boolean; bar?: boolean }[];
}) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <i
            className={`inline-block ${i.bar ? "size-2.5 rounded-[3px]" : i.dashed ? "w-3.5 border-t-2 border-dashed" : "h-[3px] w-3.5 rounded-full"}`}
            style={i.dashed ? { borderColor: i.color } : { background: i.color }}
          />
          {i.label}
        </span>
      ))}
    </span>
  );
}
