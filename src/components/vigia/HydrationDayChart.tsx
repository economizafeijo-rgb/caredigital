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
 * Linha do tempo do dia: acumulado em degraus, corredor do ritmo ideal, meta e previsão.
 * O cursor "gruda" no registro mais próximo; a lista ao lado e o gráfico se destacam mutuamente,
 * e um clique fixa o registro.
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
  const [boxRef, W] = useBoxWidth(260);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pinIdx, setPinIdx] = useState<number | null>(null);
  const nowH = hourOf(nowMs);
  const sorted = useMemo(
    () =>
      entries
        .map((e) => ({ ...e, h: hourOf(e.recorded_at), ml: Number(e.amount_ml || 0) }))
        .sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at)),
    [entries],
  );
  const cum = useMemo(() => {
    let acc = 0;
    return sorted.map((e) => (acc += e.ml));
  }, [sorted]);
  const total = cum.at(-1) ?? 0;
  const waterTotal = sorted.filter((e) => e.source !== "beverage").reduce((s, e) => s + e.ml, 0);
  const drinkTotal = total - waterTotal;
  const idealAt = (h: number) =>
    goal > 0 ? goal * Math.min(1, Math.max(0, (h - 7) / (lastHour - 7))) : 0;
  const diff = total - idealAt(nowH);
  const firstH = sorted[0]?.h ?? null;
  const rate = firstH !== null && nowH - firstH > 0.5 ? total / (nowH - firstH) : 0;
  const reachH = rate > 0 && goal > total ? nowH + (goal - total) / rate : null;
  const showForecast = rate > 0 && nowH < lastHour && total < (goal || Infinity);

  const padL = 44,
    padR = 12,
    padT = 22,
    plotH = 150,
    gap = 14,
    stripH = 40,
    axisH = 20;
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

  const active = hoverIdx ?? pinIdx;
  const act = active !== null ? sorted[active] : null;
  const ticks = [6, 9, 12, 15, 18, 21];
  const yTicks = goal > 0 ? [0, goal / 2, goal] : [0, yMax / 2];
  const pick = (idx: number | null) => setPinIdx((p) => (idx === null || p === idx ? null : idx));
  const nameOf = (e: (typeof sorted)[number]) =>
    e.source === "beverage" ? e.name || "Bebida" : "Água";

  // Chip de anotação do registro ativo, preso dentro da área do gráfico.
  const chipW = 118;
  const chipX = act ? Math.min(W - padR - chipW, Math.max(padL, x(act.h) - chipW / 2)) : 0;
  const chipY = act ? Math.max(padT - 6, y(cum[active!]) - 38) : 0;

  return (
    <figure className="min-w-0 rounded-xl border border-border bg-card p-4">
      <figcaption className="mb-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <strong className="text-sm font-bold">Linha do tempo do dia</strong>
          <p className="text-[11px] text-muted-foreground">
            Passe o cursor para destacar um registro · clique para fixar
          </p>
        </div>
        <dl className="flex flex-wrap items-stretch gap-2 text-[11px]">
          <div className="rounded-lg bg-muted/50 px-3 py-1.5">
            <dt className="text-muted-foreground">Acumulado</dt>
            <dd
              className="text-lg font-extrabold tabular-nums leading-tight"
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
            <div className="rounded-lg bg-muted/50 px-3 py-1.5">
              <dt className="text-muted-foreground">Frente ao ritmo ideal</dt>
              <dd
                className={`text-lg font-extrabold tabular-nums leading-tight ${diff >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}
              >
                {diff >= 0 ? "+" : "−"}
                {fmt(Math.abs(diff))}
              </dd>
            </div>
          )}
          {showForecast && (
            <div className="rounded-lg bg-muted/50 px-3 py-1.5">
              <dt className="text-muted-foreground">No ritmo atual</dt>
              <dd className="text-lg font-extrabold tabular-nums leading-tight">
                {reachH !== null && reachH <= lastHour
                  ? `meta às ${hm(reachH)}`
                  : `~${fmt(Math.round(total + rate * (lastHour - nowH)))}`}
              </dd>
            </div>
          )}
        </dl>
      </figcaption>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div ref={boxRef} className="relative min-w-0">
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Água hoje: ${fmt(total)}${goal ? ` de ${fmt(goal)}` : ""}`}
            className="block touch-pan-y select-none text-muted-foreground"
            style={{ cursor: sorted.length && hoverIdx !== null ? "pointer" : "default" }}
            onClick={() => hoverIdx !== null && pick(hoverIdx)}
            onPointerMove={(e) => {
              if (!sorted.length) return;
              const r = e.currentTarget.getBoundingClientRect();
              const px = e.clientX - r.left;
              let best = 0;
              let bd = Infinity;
              sorted.forEach((s, i) => {
                const d = Math.abs(x(s.h) - px);
                if (d < bd) {
                  bd = d;
                  best = i;
                }
              });
              setHoverIdx(bd <= 40 ? best : null);
            }}
            onPointerLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="hdc-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={WATER} stopOpacity=".38" />
                <stop offset="1" stopColor={WATER} stopOpacity="0" />
              </linearGradient>
              <linearGradient id="hdc-bar-w" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#38bdf8" />
                <stop offset="1" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="hdc-bar-d" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#a78bfa" />
                <stop offset="1" stopColor="#7c3aed" />
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
                  strokeOpacity=".14"
                  strokeWidth="1"
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
                  strokeOpacity={v === 0 ? 0.3 : 0.1}
                />
                <text x={padL - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fill="currentColor">
                  {v === 0 ? "0" : fmt(v)}
                </text>
              </g>
            ))}
            {ticks.map((h) => (
              <text
                key={h}
                x={x(h)}
                y={H - 4}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
              >
                {String(h).padStart(2, "0")}h
              </text>
            ))}

            <rect
              x={x(lastHour)}
              y={padT}
              width={Math.max(0, x(H1) - x(lastHour))}
              height={plotH + gap + stripH}
              fill="url(#hdc-hatch)"
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
            {corridor && <path d={corridor} fill={IDEAL} fillOpacity=".1" />}
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
                <text x={padL + 4} y={y(goal) - 5} fontSize="10" fontWeight="700" fill={IDEAL}>
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

            {nowH >= H0 && nowH <= H1 && (
              <g pointerEvents="none">
                <line
                  x1={x(nowH)}
                  x2={x(nowH)}
                  y1={padT}
                  y2={padT + plotH + gap + stripH}
                  stroke="currentColor"
                  strokeOpacity=".4"
                  strokeDasharray="2 3"
                />
                <rect
                  x={x(nowH) - 17}
                  y={padT - 15}
                  width="34"
                  height="13"
                  rx="3"
                  fill="currentColor"
                  fillOpacity=".85"
                />
                <text
                  x={x(nowH)}
                  y={padT - 5.5}
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
              const bw = Math.max(4, slot - 4);
              const base = padT + plotH + gap + stripH;
              const wh = v ? (v.w / hMax) * stripH : 0;
              const dh = v ? (v.d / hMax) * stripH : 0;
              const isActive = act !== null && Math.floor(act.h) === h;
              return (
                <g key={h}>
                  {isActive && (
                    <rect
                      x={x(h)}
                      y={padT}
                      width={slot}
                      height={plotH + gap + stripH}
                      fill={WATER}
                      fillOpacity=".09"
                    />
                  )}
                  <rect
                    x={x(h) + 2}
                    y={base - stripH}
                    width={bw}
                    height={stripH}
                    rx="2"
                    fill="currentColor"
                    fillOpacity=".05"
                  />
                  {wh > 0 && (
                    <rect
                      x={x(h) + 2}
                      y={base - wh}
                      width={bw}
                      height={wh}
                      rx="2"
                      fill="url(#hdc-bar-w)"
                      className="nv-bar-in"
                    />
                  )}
                  {dh > 0 && (
                    <rect
                      x={x(h) + 2}
                      y={base - wh - dh - (wh > 0 ? 1.5 : 0)}
                      width={bw}
                      height={dh}
                      rx="2"
                      fill="url(#hdc-bar-d)"
                      className="nv-bar-in"
                    />
                  )}
                </g>
              );
            })}

            {act && (
              <g pointerEvents="none">
                <line
                  x1={x(act.h)}
                  x2={x(act.h)}
                  y1={y(cum[active!])}
                  y2={padT + plotH + gap + stripH}
                  stroke={act.source === "beverage" ? DRINK : WATER}
                  strokeOpacity=".7"
                  strokeDasharray="3 3"
                />
              </g>
            )}
            {sorted.map((e, i) => {
              const on = active === i;
              const c = e.source === "beverage" ? DRINK : WATER;
              return (
                <g key={i} pointerEvents="none">
                  {on && <circle cx={x(e.h)} cy={y(cum[i])} r="11" fill={c} fillOpacity=".18" />}
                  <circle
                    cx={x(e.h)}
                    cy={y(cum[i])}
                    r={on ? 6 : 4}
                    fill={c}
                    className="stroke-card"
                    strokeWidth="2.2"
                  />
                </g>
              );
            })}
            {act && (
              <g pointerEvents="none">
                <rect
                  x={chipX}
                  y={chipY}
                  width={chipW}
                  height="30"
                  rx="6"
                  className="fill-popover stroke-border"
                />
                <text x={chipX + 9} y={chipY + 13} fontSize="10" className="fill-muted-foreground">
                  {hm(act.h)} · {nameOf(act).slice(0, 14)}
                </text>
                <text
                  x={chipX + 9}
                  y={chipY + 25}
                  fontSize="11"
                  fontWeight="800"
                  className="fill-popover-foreground"
                >
                  +{fmt(act.ml)} · {fmt(cum[active!])}
                </text>
              </g>
            )}
          </svg>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <i className="h-0.5 w-3.5 rounded-full" style={{ background: WATER }} /> Acumulado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2 rounded-[2px]" style={{ background: WATER }} /> Água
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2 rounded-[2px]" style={{ background: DRINK }} /> Outras bebidas
            </span>
            {goal > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <i
                  className="h-2 w-3.5 rounded-[2px]"
                  style={{ background: IDEAL, opacity: 0.3 }}
                />{" "}
                Faixa do ritmo ideal
              </span>
            )}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col rounded-lg border border-border bg-muted/20">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-[11px]">
            <strong className="text-xs">Registros ({sorted.length})</strong>
            <span className="tabular-nums text-muted-foreground">
              <b style={{ color: WATER }}>{fmt(waterTotal)}</b> água
              {drinkTotal > 0 && (
                <>
                  {" · "}
                  <b style={{ color: DRINK }}>{fmt(drinkTotal)}</b>
                </>
              )}
            </span>
          </div>
          {sorted.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-muted-foreground">Nada registrado hoje.</p>
          ) : (
            <ul className="max-h-[17rem] min-h-[8rem] flex-1 overflow-y-auto p-1.5 lg:h-[17rem]">
              {sorted.map((e, i) => {
                const c = e.source === "beverage" ? DRINK : WATER;
                const on = active === i;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseEnter={() => setHoverIdx(i)}
                      onMouseLeave={() => setHoverIdx(null)}
                      onFocus={() => setHoverIdx(i)}
                      onBlur={() => setHoverIdx(null)}
                      onClick={() => pick(i)}
                      aria-pressed={pinIdx === i}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${on ? "bg-card shadow-sm ring-1 ring-border" : "hover:bg-muted/60"}`}
                    >
                      <i className="h-6 w-1 shrink-0 rounded-full" style={{ background: c }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{nameOf(e)}</span>
                        <span className="block font-mono text-[10px] text-muted-foreground">
                          {hm(e.h)} · acumulado {fmt(cum[i])}
                        </span>
                      </span>
                      <strong className="shrink-0 tabular-nums">+{fmt(e.ml)}</strong>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
      {note && (
        <p
          role="status"
          className={`mt-3 flex items-start gap-1.5 rounded-md border-l-2 px-2.5 py-2 text-[11px] leading-snug ${note.kind === "met" ? "border-emerald-500 bg-emerald-500/[.06]" : note.kind === "missed" ? "border-amber-500 bg-amber-500/[.05]" : "border-border bg-muted/30"}`}
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
