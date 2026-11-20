import { useState } from "react";
import { Check } from "lucide-react";
import { useBoxWidth } from "./HydrationDayChart";

type Row = { day: string; a: number; b: number; t?: number };
const DRINK = "#8b5cf6",
  WATER = "#0ea5e9",
  IDEAL = "#10b981",
  TREND = "#f59e0b";
const fmt = (ml: number) =>
  ml >= 1000
    ? `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 2).replace(".", ",")} L`
    : `${Math.round(ml)} ml`;
const wk = (key: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
    .format(new Date(key + "T12:00:00Z"))
    .replace(".", "");
const dm = (key: string) => key.slice(8, 10) + "/" + key.slice(5, 7);

/** Colunas em forma de recipiente: cada dia enche até a parte da meta atingida. */
export function HydrationDaysChart({
  rows,
  goal,
  showWater,
  showDrinks,
  showTrend,
  selected,
  onPick,
}: {
  rows: Row[];
  goal: number | null;
  showWater: boolean;
  showDrinks: boolean;
  showTrend: boolean;
  selected: string | null;
  onPick: (day: string) => void;
}) {
  const [ref, W] = useBoxWidth();
  const [hover, setHover] = useState<string | null>(null);
  const padL = 38,
    padR = 8,
    padT = 22,
    plotH = 130,
    padB = 32;
  const H = padT + plotH + padB;
  const pw = W - padL - padR;
  const n = rows.length;
  const slot = pw / n;
  const bw = Math.min(34, slot * 0.66);
  const yMax = Math.max((goal ?? 0) * 1.2, ...rows.map((r) => r.a), 500);
  const y = (v: number) => padT + plotH - (Math.min(v, yMax) / yMax) * plotH;
  const cx = (i: number) => padL + slot * i + slot / 2;
  const every = n <= 8 ? 1 : n <= 16 ? 2 : 5;
  const today = rows[n - 1]?.day;
  const hv = rows.find((r) => r.day === hover);
  const hi = hv ? rows.indexOf(hv) : -1;
  const trend = rows.map((r, i) => `${i ? "L" : "M"}${cx(i)},${y(r.t ?? 0)}`).join(" ");
  const tipLeft = hi < 0 ? 0 : Math.min(W - 164, Math.max(4, cx(hi) - 78));

  return (
    <div ref={ref} className="relative">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Água por dia"
        className="block select-none text-muted-foreground"
      >
        <defs>
          <linearGradient id="hdy-w" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#0369a1" />
          </linearGradient>
        </defs>
        {(goal ? [0, goal / 2, goal] : [0, yMax / 2]).map((v) => (
          <g key={v}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(v)}
              y2={y(v)}
              stroke="currentColor"
              strokeOpacity={v === 0 ? 0.35 : 0.1}
            />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="currentColor">
              {v === 0 ? "0" : fmt(v)}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const water = showWater ? Math.max(0, r.a - r.b) : 0;
          const drinks = showDrinks && showWater ? r.b : 0;
          const hit = goal ? r.a >= goal : false;
          const isSel = selected === r.day;
          const x0 = cx(i) - bw / 2;
          return (
            <g
              key={r.day}
              tabIndex={0}
              role="button"
              aria-label={`${wk(r.day)}, ${dm(r.day)}: ${fmt(r.a)}`}
              className="cursor-pointer outline-none"
              onClick={() => onPick(r.day)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPick(r.day)}
              onPointerEnter={() => setHover(r.day)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(r.day)}
              onBlur={() => setHover(null)}
            >
              <rect
                x={cx(i) - slot / 2}
                y={padT - 18}
                width={slot}
                height={plotH + padB + 18}
                fill={isSel || hover === r.day ? "currentColor" : "transparent"}
                fillOpacity={isSel ? 0.1 : 0.05}
              />
              <rect
                x={x0}
                y={padT}
                width={bw}
                height={plotH}
                fill="currentColor"
                fillOpacity=".07"
                stroke="currentColor"
                strokeOpacity=".16"
              />
              {water > 0 && (
                <rect
                  x={x0}
                  y={y(water)}
                  width={bw}
                  height={padT + plotH - y(water)}
                  fill="url(#hdy-w)"
                  className="nv-bar-in"
                />
              )}
              {drinks > 0 && (
                <rect
                  x={x0}
                  y={y(water + drinks)}
                  width={bw}
                  height={y(water) - y(water + drinks)}
                  fill={DRINK}
                  className="nv-bar-in"
                />
              )}
              {water > 0 && (
                <rect x={x0} y={y(water + drinks)} width={bw} height="1.5" fill="#fff" fillOpacity=".55" />
              )}
              {hit && (
                <g transform={`translate(${cx(i)} ${padT - 10})`}>
                  <circle r="6.5" fill={IDEAL} />
                  <path
                    d="M-3 0.2 -0.8 2.4 3.2 -2"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}
              {isSel && (
                <rect
                  x={x0 - 2}
                  y={padT - 2}
                  width={bw + 4}
                  height={plotH + 4}
                  fill="none"
                  stroke={WATER}
                  strokeWidth="1.5"
                />
              )}
              {(rows.length - 1 - i) % every === 0 && (
                <>
                  <text
                    x={cx(i)}
                    y={H - 16}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight={r.day === today ? 800 : 500}
                    fill="currentColor"
                  >
                    {n > 16 ? dm(r.day) : wk(r.day)}
                  </text>
                  {n <= 16 && (
                    <text
                      x={cx(i)}
                      y={H - 4}
                      textAnchor="middle"
                      fontSize="9"
                      fill="currentColor"
                      opacity=".7"
                    >
                      {dm(r.day)}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
        {goal ? (
          <g pointerEvents="none">
            <line
              x1={padL}
              x2={W - padR}
              y1={y(goal)}
              y2={y(goal)}
              stroke={IDEAL}
              strokeDasharray="5 4"
              strokeWidth="1.3"
            />
            <text
              x={W - padR - 2}
              y={y(goal) - 4}
              textAnchor="end"
              fontSize="10"
              fontWeight="700"
              fill={IDEAL}
            >
              Meta {fmt(goal)}
            </text>
          </g>
        ) : null}
        {showTrend && n > 1 && (
          <g pointerEvents="none">
            <path
              d={trend}
              fill="none"
              stroke={TREND}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="nv-draw-line"
            />
            {n <= 16 &&
              rows.map((r, i) => (
                <circle
                  key={r.day}
                  cx={cx(i)}
                  cy={y(r.t ?? 0)}
                  r="2.6"
                  fill={TREND}
                  className="stroke-card"
                  strokeWidth="1.5"
                />
              ))}
          </g>
        )}
      </svg>
      {hv && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-40 border border-border bg-popover px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-lg"
          style={{ left: tipLeft }}
        >
          <p className="font-bold capitalize">
            {wk(hv.day)}, {dm(hv.day)}
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Água</span>
            <strong className="tabular-nums">{fmt(Math.max(0, hv.a - hv.b))}</strong>
          </p>
          {hv.b > 0 && (
            <p className="flex justify-between">
              <span className="text-muted-foreground">Bebidas</span>
              <strong className="tabular-nums">{fmt(hv.b)}</strong>
            </p>
          )}
          {goal ? (
            <p
              className={`mt-1 flex items-center gap-1 border-t border-border pt-1 font-semibold ${hv.a >= goal ? "text-emerald-500" : "text-muted-foreground"}`}
            >
              {hv.a >= goal && <Check size={11} />} {Math.round((hv.a / goal) * 100)}% da meta
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
