import { useMemo } from "react";
import { EvoChart, EvoLegend } from "./EvoChart";

type Entry = { amount_ml: number; recorded_at: string; name?: string; source?: "water" | "beverage" };
const tz = "America/Rio_Branco";
const hourOf = (iso: string | number) => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  return Number(p.find((x) => x.type === "hour")?.value ?? 0) + Number(p.find((x) => x.type === "minute")?.value ?? 0) / 60;
};
const fmt = (ml: number) => (ml >= 1000 ? `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1).replace(".", ",")} L` : `${Math.round(ml)} ml`);
const hm = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60) % 60).padStart(2, "0")}`;
const WATER = "#0ea5e9", DRINK = "#8b5cf6", IDEAL = "#10b981";

/**
 * Evolução do dia: o acumulado sobe a cada registro (ponto azul = água, roxo = outra
 * bebida), comparado ao ritmo ideal até o fim da janela recomendada e à meta.
 */
export function HydrationDayChart({ entries, goal, nowMs, lastHour = 20, height = 230 }: { entries: readonly Entry[]; goal: number; nowMs: number; lastHour?: number; height?: number }) {
  const H0 = 6, H1 = 23;
  const nowH = hourOf(nowMs);
  const sorted = useMemo(() => [...entries].sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at)), [entries]);
  const { points, total } = useMemo(() => {
    let acc = 0;
    const pts = [{ x: Math.min(H0, sorted[0] ? hourOf(sorted[0].recorded_at) : H0), y: 0 }];
    for (const e of sorted) {
      const h = hourOf(e.recorded_at);
      acc += Number(e.amount_ml || 0);
      const last = pts[pts.length - 1];
      if (Math.abs(last.x - h) < 1e-6) { last.y = acc; (last as any).color = e.source === "beverage" ? DRINK : WATER; }
      else pts.push({ x: h, y: acc, color: e.source === "beverage" ? DRINK : WATER } as any);
    }
    return { points: pts, total: acc };
  }, [sorted]);
  const live = nowH > (points[points.length - 1]?.x ?? 0) && nowH <= H1 ? [...points, { x: nowH, y: total }] : points;
  const ideal = goal > 0 ? [{ x: H0, y: 0 }, { x: 7, y: 0 }, { x: lastHour, y: goal }, { x: H1, y: goal }] : [];
  const idealAtNow = goal > 0 ? goal * Math.min(1, Math.max(0, (nowH - 7) / (lastHour - 7))) : 0;
  const diff = total - idealAtNow;
  // Previsão: mantendo o ritmo desde o primeiro registro, onde você chega no fim da janela recomendada.
  const firstH = sorted[0] ? hourOf(sorted[0].recorded_at) : null;
  const rate = firstH !== null && nowH - firstH > 0.5 ? total / (nowH - firstH) : 0;
  const reachH = rate > 0 && goal > total ? nowH + (goal - total) / rate : null;
  const forecast = rate > 0 && nowH < lastHour && total < (goal || Infinity)
    ? reachH !== null && reachH <= lastHour ? [{ x: nowH, y: total }, { x: reachH, y: goal }] : [{ x: nowH, y: total }, { x: lastHour, y: Math.round(total + rate * (lastHour - nowH)) }]
    : [];

  return (
    <figure className="min-w-0 rounded-2xl border border-border bg-card p-3 sm:p-4">
      <figcaption className="mb-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <span>
          <strong className="block text-sm font-bold">Evolução do dia</strong>
          <span className="text-xs text-muted-foreground">
            {goal > 0 && nowH >= 7
              ? diff >= 0 ? `${fmt(diff)} à frente do ritmo ideal` : `${fmt(-diff)} abaixo do ritmo ideal agora`
              : "Passe o mouse ou o dedo sobre a linha"}
            {forecast.length > 0 && (reachH !== null && reachH <= lastHour ? ` · no ritmo atual, meta por volta das ${hm(reachH)}` : ` · no ritmo atual, ~${fmt(forecast[1].y)} até as ${lastHour}h`)}
          </span>
        </span>
        <EvoLegend items={[{ label: "Água", color: WATER }, { label: "Outras bebidas", color: DRINK }, ...(forecast.length ? [{ label: "Previsão", color: "#7dd3fc", dashed: true }] : []), ...(goal > 0 ? [{ label: "Ritmo ideal", color: IDEAL, dashed: true }] : [])]} />
      </figcaption>
      <EvoChart
        height={height}
        ariaLabel={`Água hoje: ${fmt(total)}${goal ? ` de ${fmt(goal)}` : ""}`}
        xMin={H0}
        xMax={H1}
        xTicks={[6, 9, 12, 15, 18, 21].map((h) => ({ x: h, label: `${String(h).padStart(2, "0")}h` }))}
        formatX={(h) => hm(h)}
        formatY={fmt}
        goal={goal > 0 ? { y: goal, label: `Meta ${fmt(goal)}`, color: IDEAL } : undefined}
        nowX={nowH}
        series={[
          { id: "acc", label: "Acumulado", color: WATER, points: live, area: true, dots: true, live: true },
          ...(forecast.length ? [{ id: "fc", label: "Previsão no ritmo atual", color: "#7dd3fc", points: forecast, dashed: true, linear: true }] : []),
          ...(ideal.length ? [{ id: "ideal", label: "Ritmo ideal", color: IDEAL, points: ideal, dashed: true, linear: true }] : []),
        ]}
        tip={(h) => {
          const hit = sorted.filter((e) => Math.abs(hourOf(e.recorded_at) - h) < 1 / 120);
          if (!hit.length) return Math.abs(h - nowH) < 1 / 60 ? <p className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">Agora</p> : null;
          return (
            <div className="mt-1.5 grid gap-0.5 border-t border-border pt-1.5">
              {hit.map((e, i) => (
                <p key={i} className="flex items-center gap-1.5">
                  <i className="size-2 rounded-full" style={{ background: e.source === "beverage" ? DRINK : WATER }} />
                  <span className="truncate">{e.source === "beverage" ? e.name || "Bebida" : "Água"}</span>
                  <strong className="ml-auto tabular-nums">+{fmt(Number(e.amount_ml))}</strong>
                </p>
              ))}
            </div>
          );
        }}
      />
    </figure>
  );
}
