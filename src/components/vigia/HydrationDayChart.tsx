import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, X } from "lucide-react";

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
 * Consumo por hora: colunas empilhadas (água + outras bebidas) com a média ideal por hora.
 * Passar o cursor abre um cartão; clicar (ou tocar) abre uma janela com os registros daquela hora.
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
  const [hover, setHover] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
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
  const idealAt = (h: number) =>
    goal > 0 ? goal * Math.min(1, Math.max(0, (h - 7) / (lastHour - 7))) : 0;
  const diff = total - idealAt(nowH);
  const nameOf = (e: (typeof sorted)[number]) =>
    e.source === "beverage" ? e.name || "Bebida" : "Água";

  const hours = Array.from({ length: H1 - H0 }, (_, i) => H0 + i);
  const perHour = useMemo(() => {
    const m = new Map<number, { w: number; d: number; items: number[] }>();
    sorted.forEach((e, i) => {
      const k = Math.floor(e.h);
      const c = m.get(k) ?? { w: 0, d: 0, items: [] };
      if (e.source === "beverage") c.d += e.ml;
      else c.w += e.ml;
      c.items.push(i);
      m.set(k, c);
    });
    return m;
  }, [sorted]);
  const ideal = goal > 0 ? goal / Math.max(1, lastHour - 7) : 0;
  const yMax = Math.max(300, ideal * 1.3, ...[...perHour.values()].map((v) => (v.w + v.d) * 1.1));

  const padL = 40,
    padR = 8,
    padT = 8,
    plotH = 150,
    axisH = 22;
  const H = padT + plotH + axisH;
  const pw = W - padL - padR;
  const slot = pw / hours.length;
  const bw = Math.min(30, slot * 0.7);
  const cx = (h: number) => padL + (h - H0) * slot + slot / 2;
  const y = (v: number) => padT + plotH - (Math.min(v, yMax) / yMax) * plotH;
  const yTicks = [0, yMax / 2, yMax].map((v) => Math.round(v / 50) * 50);

  const hv = hover !== null ? perHour.get(hover) : undefined;
  const cumTo = (h: number) => sorted.filter((e) => e.h < h + 1).reduce((s, e) => s + e.ml, 0);
  const tipLeft = hover === null ? 0 : Math.min(W - 176, Math.max(2, cx(hover) - 84));

  useEffect(() => {
    if (open === null) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  const openData = open !== null ? perHour.get(open) : undefined;

  return (
    <figure className="min-w-0 rounded-xl border border-border bg-card p-3">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <strong className="text-sm font-bold">Consumo por hora</strong>
        <dl className="flex flex-wrap gap-2 text-[11px]">
          <div className="rounded-lg bg-muted/50 px-2.5 py-1">
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
            <div className="rounded-lg bg-muted/50 px-2.5 py-1">
              <dt className="text-muted-foreground">Frente ao ritmo</dt>
              <dd
                className={`text-base font-extrabold tabular-nums leading-tight ${diff >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}
              >
                {diff >= 0 ? "+" : "−"}
                {fmt(Math.abs(diff))}
              </dd>
            </div>
          )}
        </dl>
      </figcaption>

      <div ref={boxRef} className="relative min-w-0">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Consumo por hora, total ${fmt(total)}`}
          className="block select-none text-muted-foreground"
        >
          <defs>
            <linearGradient id="hdc-bar-w" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#38bdf8" />
              <stop offset="1" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="hdc-bar-d" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#a78bfa" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          {yTicks.map((v, i) => (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(v)}
                y2={y(v)}
                stroke="currentColor"
                strokeOpacity={v === 0 ? 0.3 : 0.1}
              />
              <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="currentColor">
                {v === 0 ? "0" : fmt(v)}
              </text>
            </g>
          ))}
          {ideal > 0 && (
            <g pointerEvents="none">
              <line
                x1={cx(7) - slot / 2}
                x2={cx(lastHour - 1) + slot / 2}
                y1={y(ideal)}
                y2={y(ideal)}
                stroke={IDEAL}
                strokeDasharray="5 4"
                strokeWidth="1.3"
              />
              <text
                x={cx(lastHour - 1) + slot / 2}
                y={y(ideal) - 4}
                textAnchor="end"
                fontSize="10"
                fontWeight="700"
                fill={IDEAL}
              >
                ideal {fmt(Math.round(ideal))}/h
              </text>
            </g>
          )}
          {hours.map((h) => {
            const v = perHour.get(h);
            const w = v?.w ?? 0;
            const d = v?.d ?? 0;
            const on = hover === h;
            const empty = w + d === 0;
            return (
              <g
                key={h}
                style={{ cursor: empty ? "default" : "pointer" }}
                onPointerEnter={() => setHover(h)}
                onPointerLeave={() => setHover(null)}
                onClick={() => !empty && setOpen(h)}
              >
                <rect
                  x={cx(h) - slot / 2}
                  y={padT}
                  width={slot}
                  height={plotH + axisH}
                  fill={on ? WATER : "transparent"}
                  fillOpacity=".08"
                />
                <rect
                  x={cx(h) - bw / 2}
                  y={padT}
                  width={bw}
                  height={plotH}
                  rx="3"
                  fill="currentColor"
                  fillOpacity=".05"
                />
                {w > 0 && (
                  <rect
                    x={cx(h) - bw / 2}
                    y={y(w)}
                    width={bw}
                    height={padT + plotH - y(w)}
                    rx="3"
                    fill="url(#hdc-bar-w)"
                    className="nv-bar-in"
                  />
                )}
                {d > 0 && (
                  <rect
                    x={cx(h) - bw / 2}
                    y={y(w + d)}
                    width={bw}
                    height={y(w) - y(w + d) - (w > 0 ? 1.5 : 0)}
                    rx="3"
                    fill="url(#hdc-bar-d)"
                    className="nv-bar-in"
                  />
                )}
                {(h - H0) % 3 === 0 && (
                  <text x={cx(h)} y={H - 6} textAnchor="middle" fontSize="10" fill="currentColor">
                    {String(h).padStart(2, "0")}h
                  </text>
                )}
              </g>
            );
          })}
          {nowH >= H0 && nowH < H1 && (
            <line
              pointerEvents="none"
              x1={cx(Math.floor(nowH)) - slot / 2 + (nowH % 1) * slot}
              x2={cx(Math.floor(nowH)) - slot / 2 + (nowH % 1) * slot}
              y1={padT}
              y2={padT + plotH}
              stroke="currentColor"
              strokeOpacity=".45"
              strokeDasharray="2 3"
            />
          )}
        </svg>
        {hover !== null && hv && (
          <div
            className="pointer-events-none absolute z-10 w-44 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-lg"
            style={{ left: tipLeft, top: Math.max(0, y(hv.w + hv.d) - 70) }}
          >
            <p className="flex justify-between font-bold">
              <span>
                {String(hover).padStart(2, "0")}h–{String(hover + 1).padStart(2, "0")}h
              </span>
              <span className="tabular-nums">{fmt(hv.w + hv.d)}</span>
            </p>
            <p className="text-muted-foreground">
              Água {fmt(hv.w)}
              {hv.d > 0 && ` · Outras ${fmt(hv.d)}`}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Clique para ver os registros</p>
          </div>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2 rounded-[2px]" style={{ background: WATER }} /> Água
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2 rounded-[2px]" style={{ background: DRINK }} /> Outras bebidas
          </span>
          {ideal > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <i className="h-0 w-3.5 border-t-2 border-dashed" style={{ borderColor: IDEAL }} />{" "}
              Ritmo ideal por hora
            </span>
          )}
        </div>
      </div>

      {note && (
        <p
          role="status"
          className={`mt-2 flex items-start gap-1.5 rounded-md border-l-2 px-2.5 py-1.5 text-[11px] leading-snug ${note.kind === "met" ? "border-emerald-500 bg-emerald-500/[.06]" : note.kind === "missed" ? "border-amber-500 bg-amber-500/[.05]" : "border-border bg-muted/30"}`}
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

      {open !== null &&
        openData &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[11600] grid !max-h-none place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setOpen(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Registros da hora"
              style={{ maxWidth: 380 }}
              className="!max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Registros entre</p>
                  <h3 className="text-lg font-extrabold">
                    {String(open).padStart(2, "0")}h e {String(open + 1).padStart(2, "0")}h
                  </h3>
                </div>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setOpen(null)}
                  aria-label="Fechar"
                  style={{ cursor: "pointer" }}
                  className="grid size-8 place-items-center rounded-full bg-muted hover:bg-muted/70"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <b style={{ color: WATER }}>{fmt(openData.w)}</b> água
                {openData.d > 0 && (
                  <>
                    {" · "}
                    <b style={{ color: DRINK }}>{fmt(openData.d)}</b> outras bebidas
                  </>
                )}
                {goal > 0 &&
                  ` · acumulado ${fmt(cumTo(open))} (${Math.round((cumTo(open) / goal) * 100)}% da meta)`}
              </p>
              <ul className="mt-3 grid gap-1.5">
                {openData.items.map((i) => {
                  const e = sorted[i];
                  return (
                    <li
                      key={i}
                      className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-2.5 py-2 text-sm"
                    >
                      <i
                        className="h-7 w-1 shrink-0 rounded-full"
                        style={{ background: e.source === "beverage" ? DRINK : WATER }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{nameOf(e)}</span>
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {hm(e.h)} · acumulado {fmt(cum[i])}
                        </span>
                      </span>
                      <strong className="shrink-0 tabular-nums">+{fmt(e.ml)}</strong>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </figure>
  );
}
