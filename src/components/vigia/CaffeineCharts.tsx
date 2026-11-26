import { useMemo, useState } from "react";
import { acreDateKey, acreTimeLabel } from "@/lib/acre-time";
import { HALF_LIFE_H } from "@/lib/caffeine";
import type { CaffeineRecord, IntakeOrigin } from "./useIntakeRecords";

const ORIGIN: Record<IntakeOrigin, string> = {
  bebida: "Bebida",
  refeicao: "Refeição",
  porcao: "Porção",
  manual: "Manual",
};
const W = 320;
const H = 150;
const PAD = { l: 30, r: 8, t: 10, b: 20 };
const CAF = "#d97706";
const URI = "#0ea5e9";

const bodyAt = (recs: CaffeineRecord[], ms: number) =>
  recs.reduce((s, r) => {
    const dt = (ms - Date.parse(r.at)) / 3_600_000;
    return dt >= 0 ? s + r.mg * Math.pow(0.5, dt / HALF_LIFE_H) : s;
  }, 0);

/** Gráficos interativos de cafeína (curva do dia e barras por dia) cruzados com as idas ao banheiro. */
export function CaffeineCharts({
  records,
  urination,
  limit,
}: {
  records: CaffeineRecord[];
  urination: { at: string }[];
  limit: number;
}) {
  const [range, setRange] = useState<1 | 7 | 30>(1);
  const [showCaf, setShowCaf] = useState(true);
  const [showUri, setShowUri] = useState(true);
  const [pick, setPick] = useState<number | null>(null);
  const today = acreDateKey();

  const days = useMemo(() => {
    const out: string[] = [];
    for (let i = range - 1; i >= 0; i--) out.push(acreDateKey(Date.now() - i * 86_400_000));
    return out;
  }, [range]);

  const inRange = useMemo(
    () => records.filter((r) => days.includes(acreDateKey(r.at))),
    [records, days],
  );
  const uriRange = useMemo(
    () => urination.filter((u) => days.includes(acreDateKey(u.at))),
    [urination, days],
  );
  const dayStart = Date.parse(`${today}T00:00:00-05:00`);

  // Curva do dia: cafeína no corpo a cada 15 min.
  const curve = useMemo(() => {
    const dayRecs = records.filter((r) => acreDateKey(r.at) === today);
    // doses de ontem ainda agem de madrugada
    const recent = records.filter((r) => Date.parse(r.at) > dayStart - 24 * 3_600_000);
    const pts = Array.from({ length: 97 }, (_, i) => {
      const ms = dayStart + i * 900_000;
      return { h: i / 4, mg: bodyAt(recent, ms) };
    });
    const max = Math.max(limit * 0.6, ...pts.map((p) => p.mg), ...dayRecs.map((r) => r.mg));
    return { pts, max: Math.ceil(max / 50) * 50, dayRecs };
  }, [records, today, dayStart, limit]);

  const perDay = useMemo(
    () =>
      days.map((d) => ({
        d,
        mg: inRange.filter((r) => acreDateKey(r.at) === d).reduce((s, r) => s + r.mg, 0),
        uri: uriRange.filter((u) => acreDateKey(u.at) === d).length,
      })),
    [days, inRange, uriRange],
  );
  const maxBar = Math.max(limit * 1.1, ...perDay.map((p) => p.mg), 100);
  const maxUri = Math.max(4, ...perDay.map((p) => p.uri));

  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (f: number) => PAD.l + f * iw;
  const yc = (mg: number, max: number) => PAD.t + ih - (mg / max) * ih;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, ((e.clientX - r.left) / r.width) * W - PAD.l) / iw);
    setPick(
      range === 1
        ? Math.round(f * 96)
        : Math.min(days.length - 1, Math.round(f * (days.length - 1))),
    );
  }

  const hours = pick !== null && range === 1 ? curve.pts[pick] : null;
  const dayPick = pick !== null && range > 1 ? perDay[pick] : null;
  const listDay = dayPick ? dayPick.d : null;
  const shown = (listDay ? inRange.filter((r) => acreDateKey(r.at) === listDay) : inRange).sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at),
  );
  const total = inRange.reduce((s, r) => s + r.mg, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">Cafeína ingerida</h3>
        <div className="flex gap-1" role="group" aria-label="Período da cafeína">
          {([1, 7, 30] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => {
                setRange(r);
                setPick(null);
              }}
              className={`h-8 rounded-lg px-3 text-xs ${range === r ? "bg-amber-600 font-bold text-white" : "border border-border"}`}
            >
              {r === 1 ? "Hoje" : `${r} dias`}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          aria-pressed={showCaf}
          onClick={() => setShowCaf((v) => !v)}
          className={`rounded-full border px-3 py-1 ${showCaf ? "border-amber-500 bg-amber-500/10 font-semibold" : "border-border text-muted-foreground"}`}
        >
          <span className="mr-1 inline-block size-2 rounded-full" style={{ background: CAF }} />
          {range === 1 ? "Cafeína no corpo" : "Cafeína por dia"}
        </button>
        <button
          type="button"
          aria-pressed={showUri}
          onClick={() => setShowUri((v) => !v)}
          className={`rounded-full border px-3 py-1 ${showUri ? "border-sky-500 bg-sky-500/10 font-semibold" : "border-border text-muted-foreground"}`}
        >
          <span className="mr-1 inline-block size-2 rounded-full" style={{ background: URI }} />
          Idas ao banheiro
        </button>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={range === 1 ? "Curva de cafeína no corpo hoje" : "Cafeína ingerida por dia"}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setPick(null)}
      >
        {[0, 0.5, 1].map((f) => {
          const max = range === 1 ? curve.max : maxBar;
          return (
            <g key={f}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={yc(max * f, max)}
                y2={yc(max * f, max)}
                stroke="currentColor"
                strokeOpacity=".12"
              />
              <text
                x={PAD.l - 4}
                y={yc(max * f, max) + 3}
                textAnchor="end"
                fontSize="8"
                fill="currentColor"
                opacity=".6"
              >
                {Math.round(max * f)}
              </text>
            </g>
          );
        })}
        {/* limite diário */}
        {range > 1 && (
          <g>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={yc(limit, maxBar)}
              y2={yc(limit, maxBar)}
              stroke="#ef4444"
              strokeDasharray="4 3"
            />
            <text
              x={W - PAD.r}
              y={yc(limit, maxBar) - 2}
              textAnchor="end"
              fontSize="8"
              fill="#ef4444"
            >
              limite {limit} mg
            </text>
          </g>
        )}
        {range === 1 ? (
          <>
            {showCaf && (
              <>
                <path
                  d={`M${x(0)},${yc(0, curve.max)} ${curve.pts.map((p) => `L${x(p.h / 24)},${yc(p.mg, curve.max)}`).join(" ")} L${x(1)},${yc(0, curve.max)} Z`}
                  fill={CAF}
                  fillOpacity=".18"
                  stroke={CAF}
                  strokeWidth="1.5"
                />
                {curve.dayRecs.map((r) => {
                  const h = (Date.parse(r.at) - dayStart) / 3_600_000;
                  return (
                    <circle
                      key={r.id}
                      cx={x(h / 24)}
                      cy={yc(bodyAt(records, Date.parse(r.at)), curve.max)}
                      r="3.5"
                      fill="#fff"
                      stroke={CAF}
                      strokeWidth="2"
                    />
                  );
                })}
              </>
            )}
            {showUri &&
              uriRange.map((u) => {
                const h = (Date.parse(u.at) - dayStart) / 3_600_000;
                return (
                  <line
                    key={u.at}
                    x1={x(h / 24)}
                    x2={x(h / 24)}
                    y1={H - PAD.b}
                    y2={H - PAD.b - 9}
                    stroke={URI}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                );
              })}
            {[0, 6, 12, 18, 24].map((h) => (
              <text
                key={h}
                x={x(h / 24)}
                y={H - 6}
                textAnchor="middle"
                fontSize="8"
                fill="currentColor"
                opacity=".6"
              >
                {h}h
              </text>
            ))}
          </>
        ) : (
          <>
            {perDay.map((p, i) => {
              const bw = Math.max(2, Math.min(18, iw / perDay.length - 2));
              const cx = x(perDay.length === 1 ? 0.5 : i / (perDay.length - 1));
              return (
                <g key={p.d}>
                  {showCaf && (
                    <rect
                      x={cx - bw / 2}
                      y={yc(p.mg, maxBar)}
                      width={bw}
                      height={Math.max(0, ih - (yc(p.mg, maxBar) - PAD.t))}
                      rx="2"
                      fill={p.mg > limit ? "#ef4444" : CAF}
                      opacity={pick === i ? 1 : 0.8}
                    />
                  )}
                  {showUri && (
                    <circle cx={cx} cy={PAD.t + ih - (p.uri / maxUri) * ih} r="2.6" fill={URI} />
                  )}
                </g>
              );
            })}
            {showUri && (
              <polyline
                fill="none"
                stroke={URI}
                strokeWidth="1.2"
                strokeOpacity=".7"
                points={perDay
                  .map(
                    (p, i) =>
                      `${x(perDay.length === 1 ? 0.5 : i / (perDay.length - 1))},${PAD.t + ih - (p.uri / maxUri) * ih}`,
                  )
                  .join(" ")}
              />
            )}
            {[0, perDay.length - 1].map((i) => (
              <text
                key={i}
                x={x(perDay.length === 1 ? 0.5 : i / (perDay.length - 1))}
                y={H - 6}
                textAnchor={i === 0 ? "start" : "end"}
                fontSize="8"
                fill="currentColor"
                opacity=".6"
              >
                {perDay[i].d.slice(8)}/{perDay[i].d.slice(5, 7)}
              </text>
            ))}
          </>
        )}
        {pick !== null && (
          <line
            x1={x(range === 1 ? pick / 96 : days.length === 1 ? 0.5 : pick / (days.length - 1))}
            x2={x(range === 1 ? pick / 96 : days.length === 1 ? 0.5 : pick / (days.length - 1))}
            y1={PAD.t}
            y2={H - PAD.b}
            stroke="currentColor"
            strokeOpacity=".35"
          />
        )}
      </svg>

      <p className="mt-1 min-h-5 text-xs text-muted-foreground" aria-live="polite">
        {hours
          ? `${String(Math.floor(hours.h)).padStart(2, "0")}:${String(Math.round((hours.h % 1) * 60)).padStart(2, "0")} · ~${Math.round(hours.mg)} mg no corpo`
          : dayPick
            ? `${dayPick.d.slice(8)}/${dayPick.d.slice(5, 7)} · ${dayPick.mg} mg de cafeína · ${dayPick.uri} idas ao banheiro`
            : range === 1
              ? "Toque ou passe o dedo no gráfico para ver a cafeína em cada horário. Círculos = doses."
              : `Total no período: ${total} mg · média ${Math.round(total / range)} mg/dia. Toque numa barra para ver o dia.`}
      </p>

      <h4 className="mb-1 mt-3 text-xs font-bold">
        Todos os registros
        {listDay
          ? ` de ${listDay.slice(8)}/${listDay.slice(5, 7)}`
          : range === 1
            ? " de hoje"
            : ` (${range} dias)`}
      </h4>
      {!shown.length ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma ingestão de cafeína neste período. Bebidas com café, chá, cola ou energético
          registradas em qualquer tela entram aqui sozinhas.
        </p>
      ) : (
        <ul className="max-h-64 divide-y divide-border overflow-y-auto">
          {shown.map((r) => (
            <li key={r.id} className="flex items-center gap-2 py-1.5 text-sm">
              <span className="w-[4.5rem] shrink-0 tabular-nums text-muted-foreground">
                {range > 1 && !listDay
                  ? `${acreDateKey(r.at).slice(8)}/${acreDateKey(r.at).slice(5, 7)} `
                  : ""}
                {acreTimeLabel(r.at)}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {r.label}
                {r.ml ? ` · ${r.ml} ml` : ""}
              </span>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {ORIGIN[r.origin]}
              </span>
              <span className="w-14 shrink-0 text-right font-semibold tabular-nums">{r.mg} mg</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
