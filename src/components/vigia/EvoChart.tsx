import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

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

type Props = {
  series: EvoSeries[];
  xMin: number;
  xMax: number;
  xTicks: { x: number; label: string }[];
  formatX: (x: number) => string;
  formatY: (y: number) => string;
  /** Valor mínimo do topo do eixo (ex.: a meta). */
  yFloor?: number;
  goal?: { y: number; label: string; color?: string };
  /** Linha vertical "agora". */
  nowX?: number;
  height?: number;
  selectedX?: number | null;
  onPick?: (x: number) => void;
  /** Linhas extras na dica para o ponto sob o cursor. */
  tip?: (x: number) => ReactNode;
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
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], h = (x1 - x0) / 3;
    d += `C${(x0 + h).toFixed(1)},${(y0 + t[i] * h).toFixed(1)} ${(x1 - h).toFixed(1)},${(y1 - t[i + 1] * h).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

/** Valor da série em x (interpolação linear entre os vizinhos). */
export function valueAt(points: EvoPoint[], x: number): number | null {
  if (!points.length || x < points[0].x || x > points[points.length - 1].x) return null;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (x >= a.x && x <= b.x) return b.x === a.x ? b.y : a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
  }
  return points[points.length - 1].y;
}

export function EvoChart({ series, xMin, xMax, xTicks, formatX, formatY, yFloor = 0, goal, nowX, height = 220, selectedX = null, onPick, tip, ariaLabel, className = "" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hoverX, setHoverX] = useState<number | null>(null);
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

  const yMaxRaw = Math.max(yFloor, goal?.y ?? 0, ...series.flatMap((s) => s.points.map((p) => p.y)), 1);
  const step = niceStep(yMaxRaw * 1.06);
  const yTop = Math.ceil((yMaxRaw * 1.06) / step) * step;
  const ticks = Array.from({ length: Math.round(yTop / step) + 1 }, (_, i) => i * step);
  const iw = Math.max(1, w - PAD.l - PAD.r), ih = height - PAD.t - PAD.b;
  const sx = (x: number) => PAD.l + ((x - xMin) / Math.max(1e-9, xMax - xMin)) * iw;
  const sy = (y: number) => PAD.t + (1 - y / yTop) * ih;
  const primary = series[0];
  const snaps = useMemo(() => [...new Set(series.filter((s) => !s.dashed).flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b), [series]);

  const nearest = (x: number) => snaps.reduce<number | null>((best, v) => (best === null || Math.abs(v - x) < Math.abs(best - x) ? v : best), null);
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
      setHoverX(snaps[Math.min(snaps.length - 1, Math.max(0, (i < 0 ? snaps.length - 1 : i) + (e.key === "ArrowRight" ? 1 : -1)))]);
    } else if ((e.key === "Enter" || e.key === " ") && onPick) { e.preventDefault(); onPick(cur); }
  };
  const activeX = hoverX ?? selectedX;
  const reduced = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div ref={box} className={`relative w-full select-none ${className}`} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl" role="img" aria-label={ariaLabel} tabIndex={0}
          onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHoverX(null)} onBlur={() => setHoverX(null)} onKeyDown={onKey}
          onClick={() => { if (onPick && hoverX !== null) onPick(hoverX); }} style={{ cursor: onPick ? "pointer" : "crosshair" }}>
          <defs>
            {series.filter((s) => s.area).map((s) => (
              <linearGradient key={s.id} id={`${uid}-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity=".42" />
                <stop offset=".6" stopColor={s.color} stopOpacity=".1" />
                <stop offset="1" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
            <clipPath id={`${uid}-clip`}><rect x={PAD.l} y={0} width={iw} height={height} /></clipPath>
          </defs>

          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={PAD.l + iw} y1={sy(v)} y2={sy(v)} stroke="currentColor" className={v === 0 ? "text-border" : "text-border/60"} strokeDasharray={v === 0 ? undefined : "3 5"} />
              <text x={PAD.l - 8} y={sy(v) + 3.5} textAnchor="end" fontSize="11" fill="currentColor" className="text-muted-foreground tabular-nums">{formatY(v)}</text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t.x} x={sx(t.x)} y={height - 7} textAnchor="middle" fontSize="11" fill="currentColor" className="text-muted-foreground">{t.label}</text>
          ))}

          {nowX !== undefined && nowX >= xMin && nowX <= xMax && (
            <rect x={PAD.l} y={PAD.t} width={sx(nowX) - PAD.l} height={ih} fill={primary?.color ?? "#0ea5e9"} fillOpacity=".035" />
          )}
          {goal && (
            <g>
              <line x1={PAD.l} x2={PAD.l + iw} y1={sy(goal.y)} y2={sy(goal.y)} stroke={goal.color ?? "#10b981"} strokeWidth="1.5" strokeDasharray="6 5" />
              <rect x={PAD.l + iw - 8 - goal.label.length * 6.4} y={sy(goal.y) - 19} width={goal.label.length * 6.4 + 8} height="16" rx="8" fill={goal.color ?? "#10b981"} fillOpacity=".14" />
              <text x={PAD.l + iw - 4} y={sy(goal.y) - 7.5} textAnchor="end" fontSize="10.5" fontWeight="700" fill={goal.color ?? "#10b981"}>{goal.label}</text>
            </g>
          )}

          <g clipPath={`url(#${uid}-clip)`}>
            {series.map((s) => {
              if (!s.points.length) return null;
              const px = s.points.map((p) => [sx(p.x), sy(p.y)] as [number, number]);
              const d = s.linear ? px.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("") : monotonePath(px);
              return (
                <g key={s.id}>
                  {s.area && px.length > 1 && <path d={`${d}L${px[px.length - 1][0].toFixed(1)},${sy(0)}L${px[0][0].toFixed(1)},${sy(0)}Z`} fill={`url(#${uid}-${s.id})`} className={reduced ? "" : "nv-evo-fade"} />}
                  <path d={d} fill="none" stroke={s.color} strokeWidth={s.dashed ? 1.75 : 2.75} strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray={s.dashed ? "5 5" : undefined} pathLength={s.dashed ? undefined : 1} className={s.dashed || reduced ? "" : "nv-draw-now"} opacity={s.dashed ? 0.85 : 1}
                    style={s.dashed ? undefined : { filter: `drop-shadow(0 6px 10px ${s.color}66)` }} />
                </g>
              );
            })}
          </g>
          {series.filter((s) => s.dots && !s.dashed).flatMap((s) => s.points.map((p) => (
            <circle key={`${s.id}-${p.x}`} cx={sx(p.x)} cy={sy(p.y)} r={activeX === p.x ? 0 : 3.25} fill="var(--color-card, #fff)" stroke={p.color ?? s.color} strokeWidth="2" />
          )))}
          {series.filter((s) => s.live && s.points.length).map((s) => {
            const p = s.points[s.points.length - 1];
            return (
              <g key={`live-${s.id}`} pointerEvents="none">
                <circle cx={sx(p.x)} cy={sy(p.y)} r="5" fill={s.color} className={reduced ? "" : "nv-evo-ping"} style={{ transformOrigin: `${sx(p.x)}px ${sy(p.y)}px` }} />
                <circle cx={sx(p.x)} cy={sy(p.y)} r="4.5" fill={s.color} stroke="var(--color-card, #fff)" strokeWidth="2" />
              </g>
            );
          })}
          {nowX !== undefined && nowX >= xMin && nowX <= xMax && (
            <g pointerEvents="none">
              <line x1={sx(nowX)} x2={sx(nowX)} y1={PAD.t} y2={PAD.t + ih} stroke="currentColor" className="text-muted-foreground/50" strokeDasharray="2 3" />
              <text x={sx(nowX)} y={PAD.t - 3} textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" className="text-muted-foreground">agora</text>
            </g>
          )}

          {activeX !== null && (
            <g pointerEvents="none">
              <line x1={sx(activeX)} x2={sx(activeX)} y1={PAD.t} y2={PAD.t + ih} stroke="currentColor" className="text-foreground/40" />
              {primary && valueAt(primary.points, activeX) !== null && (() => {
                const y = sy(valueAt(primary.points, activeX)!);
                const label = formatY(valueAt(primary.points, activeX)!);
                return (
                  <g>
                    <line x1={PAD.l} x2={PAD.l + iw} y1={y} y2={y} stroke="currentColor" className="text-foreground/25" strokeDasharray="3 3" />
                    <rect x={2} y={y - 9} width={PAD.l - 4} height="18" rx="5" fill={primary.color} />
                    <text x={PAD.l / 2} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" className="tabular-nums">{label}</text>
                  </g>
                );
              })()}
              {series.filter((s) => !s.dashed).map((s) => {
                const v = valueAt(s.points, activeX);
                return v === null ? null : <circle key={s.id} cx={sx(activeX)} cy={sy(v)} r="5.5" fill={s.color} stroke="var(--color-card, #fff)" strokeWidth="2.5" />;
              })}
              <rect x={sx(activeX) - 30} y={PAD.t + ih + 4} width="60" height="17" rx="5" fill="currentColor" className="text-foreground" />
              <text x={sx(activeX)} y={PAD.t + ih + 16} textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" className="text-background">{formatX(activeX).split(" · ")[0]}</text>
            </g>
          )}
        </svg>
      )}
      {hoverX !== null && w > 0 && (
        <div role="status" className="pointer-events-none absolute z-10 min-w-40 max-w-60 rounded-xl border border-border bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-lg backdrop-blur"
          style={{ top: PAD.t, ...(sx(hoverX) > w * 0.6 ? { right: w - sx(hoverX) + 12 } : { left: sx(hoverX) + 12 }) }}>
          <p className="font-bold capitalize">{formatX(hoverX)}</p>
          {series.map((s) => {
            const v = valueAt(s.points, hoverX);
            return v === null ? null : (
              <p key={s.id} className="mt-1 flex items-center gap-2">
                <i className={`inline-block w-3 ${s.dashed ? "border-t-2 border-dashed" : "h-[3px] rounded-full"}`} style={s.dashed ? { borderColor: s.color } : { background: s.color }} />
                <span className="text-muted-foreground">{s.label}</span>
                <strong className="ml-auto tabular-nums">{formatY(v)}</strong>
              </p>
            );
          })}
          {tip?.(hoverX)}
        </div>
      )}
    </div>
  );
}

/** Legenda compacta usada acima dos gráficos. */
export function EvoLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <i className={`inline-block w-3.5 ${i.dashed ? "border-t-2 border-dashed" : "h-[3px] rounded-full"}`} style={i.dashed ? { borderColor: i.color } : { background: i.color }} />
          {i.label}
        </span>
      ))}
    </span>
  );
}
