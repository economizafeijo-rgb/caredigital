import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info } from "lucide-react";

type Entry = {
  amount_ml: number;
  recorded_at: string;
  name?: string;
  source?: "water" | "beverage";
};
const tz = "America/Rio_Branco";
const hourOf = (iso: string | number) => {
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
const fmt = (ml: number) =>
  ml >= 1000
    ? `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1).replace(".", ",")} L`
    : `${Math.round(ml)} ml`;
const hm = (h: number) =>
  `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60) % 60).padStart(2, "0")}`;
const WATER = "#0ea5e9",
  DRINK = "#8b5cf6",
  IDEAL = "#10b981",
  H0 = 6,
  H1 = 23;

export function useBoxWidth(min = 280) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(Math.max(min, Math.round(el.clientWidth || 640)));
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(min, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return [ref, w] as const;
}

/**
 * Linha do tempo do dia: acumulado em degraus (cada registro é um salto), corredor do ritmo ideal,
 * meta, previsão no ritmo atual e, embaixo, o volume bebido em cada hora.
 */
export function HydrationDayChart({
  entries,
  goal,
  nowMs,
  lastHour = 20,
  note,
}: {
  entries: readonly Entry[];
  goal: number;
  nowMs: number;
  lastHour?: number;
  height?: number;
  note?: { kind: string; title: string; message: string } | null;
}) {
  const [boxRef, W] = useBoxWidth();
  const [hover, setHover] = useState<number | null>(null);
  const nowH = hourOf(nowMs);
  const sorted = useMemo(
    () =>
      entries
        .map((e) => ({ ...e, h: hourOf(e.recorded_at), ml: Number(e.amount_ml || 0) }))
        .sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at)),
    [entries],
  );
  const total = sorted.reduce((s, e) => s + e.ml, 0);
  const idealAt = (h: number) =>
    goal > 0 ? goal * Math.min(1, Math.max(0, (h - 7) / (lastHour - 7))) : 0;
  const diff = total - idealAt(nowH);
  const firstH = sorted[0]?.h ?? null;
  const rate = firstH !== null && nowH - firstH > 0.5 ? total / (nowH - firstH) : 0;
  const reachH = rate > 0 && goal > total ? nowH + (goal - total) / rate : null;
  const showForecast = rate > 0 && nowH < lastHour && total < (goal || Infinity);

  const padL = 44,
    padR = 12,
    padT = 14,
    plotH = 132,
    gap = 12,
    stripH = 34,
    axisH = 18;
  const H = padT + plotH + gap + stripH + axisH;
  const pw = W - padL - padR;
  const x = (h: number) => padL + ((Math.min(H1, Math.max(H0, h)) - H0) / (H1 - H0)) * pw;
  const yMax = Math.max(goal * 1.1, total * 1.08, 500);
  const y = (v: number) => padT + plotH - (Math.min(v, yMax) / yMax) * plotH;

  const step = useMemo(() => {
    let acc = 0;
    let d = `M${x(H0)},${y(0)}`;
    for (const e of sorted) {
      d += ` L${x(e.h)},${y(acc)}`;
      acc += e.ml;
      d += ` L${x(e.h)},${y(acc)}`;
    }
    const end = Math.min(Math.max(nowH, sorted.at(-1)?.h ?? H0), H1);
    d += ` L${x(end)},${y(acc)}`;
    return { line: d, area: `${d} L${x(end)},${y(0)} L${x(H0)},${y(0)}Z` };
  }, [sorted, nowH, W, yMax]); // eslint-disable-line react-hooks/exhaustive-deps
  const corridor = useMemo(() => {
    if (goal <= 0) return "";
    const hs = Array.from({ length: 19 }, (_, i) => 7 + ((lastHour - 7) * i) / 18);
    const up = hs.map((h) => `${x(h)},${y(Math.min(goal, idealAt(h) + goal * 0.1))}`);
    const lo = hs.map((h) => `${x(h)},${y(Math.max(0, idealAt(h) - goal * 0.1))}`).reverse();
    return `M${up.join(" L")} L${lo.join(" L")}Z`;
  }, [goal, lastHour, W, yMax]); // eslint-disable-line react-hooks/exhaustive-deps
  const perHour = useMemo(() => {
    const m = new Map<number, { w: number; d: number }>();
    for (const e of sorted) {
      const k = Math.floor(e.h);
      const c = m.get(k) ?? { w: 0, d: 0 };
      if (e.source === "beverage") c.d += e.ml;
      else c.w += e.ml;
      m.set(k, c);
    }
    return m;
  }, [sorted]);
  const hMax = Math.max(300, ...[...perHour.values()].map((v) => v.w + v.d));
  const slot = pw / (H1 - H0);

  const accAt = (h: number) => sorted.filter((e) => e.h <= h + 1e-6).reduce((s, e) => s + e.ml, 0);
  const hoverHits =
    hover === null
      ? []
      : sorted.filter(
          (e) =>
            Math.abs(e.h - hover) < 0.3 ||
            (Math.floor(e.h) === Math.floor(hover) && Math.abs(e.h - hover) < 0.5),
        );
  const hoverAcc = hover === null ? 0 : accAt(hover);
  const ticks = [6, 9, 12, 15, 18, 21];
  const yTicks = goal > 0 ? [0, goal / 2, goal] : [0, yMax / 2];
  const tipLeft = hover === null ? 0 : Math.min(W - 190, Math.max(4, x(hover) + 10));

  return (
    <figure className="min-w-0 border border-border bg-card p-3">
      <figcaption className="mb-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <strong className="text-sm font-bold">Linha do tempo do dia</strong>
        <dl className="flex flex-wrap items-end gap-x-5 gap-y-1 text-[11px]">
          <div>
            <dt className="text-muted-foreground">Acumulado</dt>
            <dd
              className="text-base font-extrabold tabular-nums leading-tight"
              style={{ color: WATER }}
            >
              {fmt(total)}
              {goal > 0 && (
                <span className="ml-1 text-[11px] font-semibold text-muted-foreground">
                  {Math.round((total / goal) * 100)}%
                </span>
              )}
            </dd>
          </div>
          {goal > 0 && nowH >= 7 && (
            <div>
              <dt className="text-muted-foreground">Frente ao ritmo ideal</dt>
              <dd
                className={`text-base font-extrabold tabular-nums leading-tight ${diff >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}
              >
                {diff >= 0 ? "+" : "−"}
                {fmt(Math.abs(diff))}
              </dd>
            </div>
          )}
          {showForecast && (
            <div>
              <dt className="text-muted-foreground">No ritmo atual</dt>
              <dd className="text-base font-extrabold tabular-nums leading-tight">
                {reachH !== null && reachH <= lastHour
                  ? `meta às ${hm(reachH)}`
                  : `~${fmt(Math.round(total + rate * (lastHour - nowH)))} às ${lastHour}h`}
              </dd>
            </div>
          )}
        </dl>
      </figcaption>

      <div ref={boxRef} className="relative">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Água hoje: ${fmt(total)}${goal ? ` de ${fmt(goal)}` : ""}`}
          className="block touch-pan-y select-none text-muted-foreground"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const h = H0 + ((e.clientX - r.left - padL) / pw) * (H1 - H0);
            setHover(h >= H0 && h <= H1 ? h : null);
          }}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="hdc-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={WATER} stopOpacity=".42" />
              <stop offset="1" stopColor={WATER} stopOpacity=".02" />
            </linearGradient>
            <pattern
              id="hdc-hatch"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke="currentColor"
                strokeOpacity=".18"
                strokeWidth="1.2"
              />
            </pattern>
            <clipPath id="hdc-plot">
              <rect x={padL} y={padT - 2} width={pw} height={plotH + 4} />
            </clipPath>
          </defs>

          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(v)}
                y2={y(v)}
                stroke="currentColor"
                strokeOpacity={v === 0 ? 0.35 : 0.12}
              />
              <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="currentColor">
                {v === 0 ? "0" : fmt(v)}
              </text>
            </g>
          ))}
          {ticks.map((h) => (
            <g key={h}>
              <line
                x1={x(h)}
                x2={x(h)}
                y1={padT}
                y2={padT + plotH}
                stroke="currentColor"
                strokeOpacity=".07"
              />
              <text x={x(h)} y={H - 4} textAnchor="middle" fontSize="10" fill="currentColor">
                {String(h).padStart(2, "0")}h
              </text>
            </g>
          ))}

          <rect
            x={x(lastHour)}
            y={padT}
            width={Math.max(0, x(H1) - x(lastHour))}
            height={plotH + gap + stripH}
            fill="url(#hdc-hatch)"
            className="text-muted-foreground"
          />
          {x(H1) - x(lastHour) > 60 && (
            <text
              x={(x(lastHour) + x(H1)) / 2}
              y={padT + 11}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              opacity=".6"
            >
              fora da janela
            </text>
          )}
          {corridor && <path d={corridor} fill={IDEAL} fillOpacity=".12" />}
          {goal > 0 && (
            <>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(goal)}
                y2={y(goal)}
                stroke={IDEAL}
                strokeDasharray="5 4"
                strokeWidth="1.2"
              />
              <text x={padL + 4} y={y(goal) - 4} fontSize="10" fontWeight="700" fill={IDEAL}>
                Meta {fmt(goal)}
              </text>
            </>
          )}

          <g clipPath="url(#hdc-plot)">
            <path d={step.area} fill="url(#hdc-fill)" />
            <path
              d={step.line}
              fill="none"
              stroke={WATER}
              strokeWidth="2.2"
              strokeLinejoin="round"
              className="nv-draw-line"
            />
            {showForecast && (
              <line
                x1={x(nowH)}
                y1={y(total)}
                x2={x(reachH !== null && reachH <= lastHour ? reachH : lastHour)}
                y2={y(
                  reachH !== null && reachH <= lastHour ? goal : total + rate * (lastHour - nowH),
                )}
                stroke="#7dd3fc"
                strokeDasharray="4 4"
                strokeWidth="1.6"
              />
            )}
          </g>
          {(() => {
            let acc = 0;
            return sorted.map((e, i) => {
              acc += e.ml;
              return (
                <circle
                  key={i}
                  cx={x(e.h)}
                  cy={y(acc)}
                  r={3 + Math.min(3, e.ml / 250)}
                  fill={e.source === "beverage" ? DRINK : WATER}
                  className="stroke-card"
                  strokeWidth="2"
                />
              );
            });
          })()}

          {nowH >= H0 && nowH <= H1 && (
            <g>
              <line
                x1={x(nowH)}
                x2={x(nowH)}
                y1={padT}
                y2={padT + plotH + gap + stripH}
                stroke="currentColor"
                strokeOpacity=".5"
                strokeDasharray="2 3"
              />
              <rect
                x={x(nowH) - 15}
                y={padT - 12}
                width="30"
                height="12"
                fill="currentColor"
                fillOpacity=".85"
              />
              <text
                x={x(nowH)}
                y={padT - 3}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                className="fill-card"
              >
                agora
              </text>
            </g>
          )}

          {Array.from({ length: H1 - H0 }, (_, i) => H0 + i).map((h) => {
            const v = perHour.get(h);
            const bw = Math.max(4, slot - 3);
            const base = padT + plotH + gap + stripH;
            const wh = v ? (v.w / hMax) * stripH : 0;
            const dh = v ? (v.d / hMax) * stripH : 0;
            return (
              <g key={h}>
                <rect
                  x={x(h) + 1.5}
                  y={base - stripH}
                  width={bw}
                  height={stripH}
                  fill="currentColor"
                  fillOpacity=".05"
                />
                {wh > 0 && (
                  <rect
                    x={x(h) + 1.5}
                    y={base - wh}
                    width={bw}
                    height={wh}
                    fill={WATER}
                    className="nv-bar-in"
                  />
                )}
                {dh > 0 && (
                  <rect
                    x={x(h) + 1.5}
                    y={base - wh - dh}
                    width={bw}
                    height={dh}
                    fill={DRINK}
                    className="nv-bar-in"
                  />
                )}
              </g>
            );
          })}

          {hover !== null && (
            <g pointerEvents="none">
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={padT}
                y2={padT + plotH + gap + stripH}
                stroke="currentColor"
                strokeOpacity=".5"
              />
              <circle
                cx={x(hover)}
                cy={y(hoverAcc)}
                r="4.5"
                fill={WATER}
                className="stroke-card"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 w-44 border border-border bg-popover px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-lg"
            style={{ left: tipLeft }}
          >
            <p className="flex justify-between font-bold">
              <span className="tabular-nums">{hm(hover)}</span>
              <span className="tabular-nums" style={{ color: WATER }}>
                {fmt(hoverAcc)}
              </span>
            </p>
            {goal > 0 && (
              <p className="text-muted-foreground">
                {Math.round((hoverAcc / goal) * 100)}% da meta · ideal {fmt(idealAt(hover))}
              </p>
            )}
            {hoverHits.map((e, i) => (
              <p key={i} className="mt-0.5 flex items-center gap-1.5 border-t border-border pt-0.5">
                <i
                  className="size-2"
                  style={{ background: e.source === "beverage" ? DRINK : WATER }}
                />
                <span className="truncate">
                  {e.source === "beverage" ? e.name || "Bebida" : "Água"}
                </span>
                <strong className="ml-auto tabular-nums">+{fmt(e.ml)}</strong>
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <i className="h-0.5 w-3" style={{ background: WATER }} /> Acumulado
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="size-2" style={{ background: WATER }} /> Água por hora
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="size-2" style={{ background: DRINK }} /> Outras bebidas
        </span>
        {goal > 0 && (
          <span className="inline-flex items-center gap-1">
            <i className="h-2 w-3" style={{ background: IDEAL, opacity: 0.3 }} /> Faixa do ritmo
            ideal
          </span>
        )}
      </div>
      {note && (
        <p
          role="status"
          className={`mt-2 flex items-start gap-1.5 border-l-2 px-2 py-1.5 text-[11px] leading-snug ${note.kind === "met" ? "border-emerald-500 bg-emerald-500/[.06]" : note.kind === "missed" ? "border-amber-500 bg-amber-500/[.05]" : "border-border bg-muted/30"}`}
        >
          {note.kind === "met" ? (
            <CheckCircle2
              size={13}
              className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400"
            />
          ) : (
            <Info size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
          )}
          <span>
            <strong>{note.title}</strong>{" "}
            <span className="text-muted-foreground">{note.message}</span>
          </span>
        </p>
      )}
    </figure>
  );
}
