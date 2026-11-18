import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";

type Entry = { amount_ml: number; recorded_at: string };
const tz = "America/Rio_Branco";
const hourOf = (iso: string | number) => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  return Number(p.find((x) => x.type === "hour")?.value ?? 0) + Number(p.find((x) => x.type === "minute")?.value ?? 0) / 60;
};
const fmt = (ml: number) => (ml >= 1000 ? `${(ml / 1000).toFixed(1).replace(".", ",")} L` : `${Math.round(ml)} ml`);

/**
 * Gráfico do dia: barras de água por hora, linha do acumulado e a linha do ritmo ideal
 * (meta distribuída das 7h às 20h). Passar o ponteiro mostra a hora, o que foi bebido e o
 * acumulado comparado ao ideal naquele horário.
 */
export function HydrationDayChart({ entries, goal, nowMs, lastHour = 20 }: { entries: readonly Entry[]; goal: number; nowMs: number; lastHour?: number }) {
  const H0 = 6, H1 = 23, W = 640, H = 170, L = 38, R = 10, T = 12, B = 22;
  const hours = Array.from({ length: H1 - H0 }, (_, i) => H0 + i);
  const byHour = useMemo(() => {
    const m = new Map<number, number>();
    for (const e of entries) {
      const h = Math.floor(hourOf(e.recorded_at));
      if (h >= H0 && h < H1) m.set(h, (m.get(h) ?? 0) + Number(e.amount_ml || 0));
    }
    return m;
  }, [entries]);
  const cumulative = useMemo(() => {
    let acc = 0;
    return hours.map((h) => (acc += byHour.get(h) ?? 0));
  }, [byHour]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = cumulative[cumulative.length - 1] ?? 0;
  const maxY = Math.max(goal || 0, total, 500) * 1.08;
  const barMax = Math.max(...hours.map((h) => byHour.get(h) ?? 0), 250);
  const x = (h: number) => L + ((h - H0) / (H1 - H0)) * (W - L - R);
  const y = (ml: number) => T + (1 - ml / maxY) * (H - T - B);
  const ideal = (h: number) => (goal ? goal * Math.min(1, Math.max(0, (h - 7) / (lastHour - 7))) : 0);
  const nowH = hourOf(nowMs);
  const [hover, setHover] = useState<number | null>(null);

  const cumPath = hours.map((h, i) => `${i ? "L" : "M"}${x(h + 1).toFixed(1)} ${y(cumulative[i]).toFixed(1)}`).join(" ");
  const areaPath = `M${x(H0)} ${y(0)} ${cumPath.replace(/^M/, "L")} L${x(H1)} ${y(0)}Z`;
  const idealPath = goal ? `M${x(7)} ${y(0)} L${x(lastHour)} ${y(goal)} L${x(H1)} ${y(goal)}` : "";

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const h = Math.floor(H0 + ((px - L) / (W - L - R)) * (H1 - H0));
    setHover(h >= H0 && h < H1 ? h : null);
  };
  const hi = hover === null ? null : hover - H0;
  const tipX = hover === null ? 0 : Math.min(Math.max(x(hover + 0.5) - 78, L), W - R - 156);

  return (
    <figure className="relative rounded-2xl border border-border bg-card p-3 sm:p-4">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong className="block text-sm font-bold">Seu dia em água</strong>
          <span className="text-xs text-muted-foreground">Passe o dedo ou o mouse sobre o gráfico</span>
        </span>
        <span className="flex flex-wrap gap-3 text-[11px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-sky-400/60" /> Por hora</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-sky-500" /> Acumulado</span>
          {goal > 0 && <span className="inline-flex items-center gap-1.5"><i className="h-0 w-4 border-t-2 border-dashed border-emerald-500" /> Ritmo ideal</span>}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full touch-none select-none" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}
        role="img" aria-label={`Água hoje: ${fmt(total)}${goal ? ` de ${fmt(goal)}` : ""}`}>
        <defs>
          <linearGradient id="nv-water-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0ea5e9" stopOpacity=".28" /><stop offset="1" stopColor="#0ea5e9" stopOpacity="0" /></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(maxY * f / 1.08)} y2={y(maxY * f / 1.08)} stroke="currentColor" className="text-border" strokeDasharray="2 5" />
            <text x={L - 6} y={y(maxY * f / 1.08) + 3} textAnchor="end" fontSize="9" fill="currentColor" className="text-muted-foreground">{fmt(maxY * f / 1.08)}</text>
          </g>
        ))}
        {goal > 0 && <text x={W - R} y={y(goal) - 5} textAnchor="end" fontSize="10" fontWeight="700" fill="#10b981">Meta {fmt(goal)}</text>}
        <rect x={L} y={T} width={Math.max(0, x(Math.min(Math.max(nowH, H0), H1)) - L)} height={H - T - B} fill="#0ea5e9" fillOpacity=".04" />
        {hours.map((h, i) => {
          const v = byHour.get(h) ?? 0;
          const bh = (v / barMax) * (H - T - B) * 0.55;
          return v > 0 ? (
            <rect key={h} x={x(h) + 3} y={y(0) - bh} width={x(h + 1) - x(h) - 6} height={bh} rx="3"
              fill="#38bdf8" fillOpacity={hi === i ? 0.95 : 0.55} className="nv-bar" style={{ animationDelay: `${i * 30}ms`, transition: "fill-opacity .2s" }} />
          ) : null;
        })}
        <path d={areaPath} fill="url(#nv-water-area)" />
        {idealPath && <path d={idealPath} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="5 5" opacity=".8" />}
        <path d={cumPath} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="nv-evo-line nv-draw-now" />
        {nowH >= H0 && nowH <= H1 && (
          <g>
            <line x1={x(nowH)} x2={x(nowH)} y1={T} y2={H - B} stroke="#0ea5e9" strokeOpacity=".5" />
            <circle cx={x(nowH)} cy={T} r="3.5" fill="#0ea5e9" className="nv-live" />
          </g>
        )}
        {hours.filter((h) => h % 3 === 0).map((h) => (
          <text key={h} x={x(h)} y={H - 6} textAnchor="middle" fontSize="10" fill="currentColor" className="text-muted-foreground">{String(h).padStart(2, "0")}h</text>
        ))}
        {hover !== null && hi !== null && (
          <g pointerEvents="none">
            <rect x={x(hover)} y={T} width={x(hover + 1) - x(hover)} height={H - T - B} fill="#0ea5e9" fillOpacity=".08" />
            <circle cx={x(hover + 1)} cy={y(cumulative[hi])} r="5" fill="#fff" stroke="#0ea5e9" strokeWidth="2.5" />
            <g transform={`translate(${tipX} ${T + 2})`}>
              <rect width="156" height="52" rx="9" fill="#0f172a" />
              <text x="10" y="16" fontSize="10" fill="#94a3b8">{String(hover).padStart(2, "0")}h–{String(hover + 1).padStart(2, "0")}h</text>
              <text x="10" y="31" fontSize="12" fontWeight="700" fill="#fff">+{fmt(byHour.get(hover) ?? 0)} nesta hora</text>
              <text x="10" y="45" fontSize="10" fill={goal && cumulative[hi] >= ideal(hover + 1) ? "#6ee7b7" : "#fcd34d"}>
                {fmt(cumulative[hi])}{goal ? ` · ideal ${fmt(ideal(hover + 1))}` : " no total"}
              </text>
            </g>
          </g>
        )}
      </svg>
    </figure>
  );
}
