import { useMemo, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Beef, Droplet, Flame, Target, Wheat } from "lucide-react";
import { sumNutrients, type Nutrients } from "@/lib/food-parser";
import { objectiveLabel } from "@/lib/objective-nutrition";
import type { DailyNutrition } from "./DailyNutritionPanel";

const tz = "America/Rio_Branco";
const hourOf = (iso: string) => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  return Number(p.find((x) => x.type === "hour")?.value ?? 0) + Number(p.find((x) => x.type === "minute")?.value ?? 0) / 60;
};
const n0 = (v: number) => Math.round(v).toLocaleString("pt-BR");
const entryNutrients = (e: DailyNutrition["entries"][number]): Nutrients => e.direct ?? sumNutrients(e.foods.map((f) => f.nutrients));

const macros = [
  { key: "protein", label: "Proteína", icon: Beef, color: "#fb7185" },
  { key: "carbs", label: "Carboidrato", icon: Wheat, color: "#fbbf24" },
  { key: "fat", label: "Gordura", icon: Droplet, color: "#a78bfa" },
] as const;

/** Cartão principal da Alimentação: prato com anel de calorias e os três macronutrientes do dia. */
export function NutritionHero({ data, actions }: { data: DailyNutrition; actions?: ReactNode }) {
  const { total, target, objective, loaded, entries } = data;
  const pct = target.kcal ? Math.min(100, Math.round((total.kcal / target.kcal) * 100)) : 0;
  const left = Math.max(0, target.kcal - total.kcal);
  const mTotal = total.protein * 4 + total.carbs * 4 + total.fat * 9 || 1;
  let acc = 0;
  return (
    <header className="nv-dark relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-[#052e1f] via-[#0a4a33] to-[#2f6b1f] p-4 text-white shadow-card sm:p-5">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-lime-300/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 left-1/3 -z-10 size-56 rounded-full bg-emerald-300/10 blur-3xl" />
      <div className="grid items-center gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
        <div className="relative mx-auto size-32 shrink-0 sm:size-36 lg:mx-0" role="img" aria-label={`${n0(total.kcal)} de ${n0(target.kcal)} kcal hoje`}>
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#ffffff1c" strokeWidth="8" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="#fb923c" strokeWidth="8" strokeLinecap="round" pathLength={100} strokeDasharray={`${pct} 100`} className="nv-ring-draw" />
            {macros.map((m) => {
              const v = (total[m.key] * (m.key === "fat" ? 9 : 4)) / mTotal * 100;
              const el = <circle key={m.key} cx="60" cy="60" r="42" fill="none" stroke={m.color} strokeWidth="6" pathLength={100} strokeDasharray={`${Math.max(0, v - 1.5)} 100`} strokeDashoffset={-acc} style={{ transition: "stroke-dasharray .8s, stroke-dashoffset .8s" }} />;
              acc += v;
              return el;
            })}
          </svg>
          <div className="absolute inset-[30px] grid place-items-center rounded-full bg-white/[.06] text-center shadow-inner">
            <span className="leading-none">
              <Flame size={16} className="mx-auto mb-1 text-orange-300" />
              <strong className="block text-xl font-extrabold tabular-nums">{loaded ? n0(total.kcal) : "…"}</strong>
              <span className="text-[10px] font-semibold text-white/75">kcal</span>
            </span>
          </div>
        </div>

        <div className="min-w-0 text-center lg:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-lime-100"><Target size={12} /> {objectiveLabel(objective)}</span>
          <p className="mt-2 text-3xl font-extrabold tabular-nums">
            {n0(total.kcal)} <span className="text-lg font-semibold text-white/65">de {n0(target.kcal)} kcal</span>
          </p>
          <p className="mt-1 text-sm text-white/80">
            {!entries.length ? "Registre o que comer e o NextVita calcula os nutrientes." : left > 0 ? `Faltam ${n0(left)} kcal para a referência de hoje.` : "Referência de calorias de hoje alcançada."}
          </p>
          {actions && <div className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start">{actions}</div>}
        </div>

        <ul className="grid gap-2 sm:grid-cols-3 lg:w-60 lg:grid-cols-1">
          {macros.map((m, i) => {
            const v = total[m.key], t = target[m.key] || 1;
            const p = Math.min(100, Math.round((v / t) * 100));
            return (
              <li key={m.key} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur">
                <div className="flex items-center justify-between text-[11px] font-semibold text-white/75">
                  <span className="flex items-center gap-1.5"><m.icon size={13} style={{ color: m.color }} /> {m.label}</span>
                  <span className="tabular-nums text-white">{n0(v)}<span className="text-white/60"> / {n0(t)} g</span></span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <i className="block h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${p}%`, background: m.color, transitionDelay: `${i * 120}ms` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}

/** Gráfico do dia: calorias de cada registro por horário, acumulado e ritmo de referência. */
export function NutritionDayChart({ data }: { data: DailyNutrition }) {
  const { entries, target } = data;
  const W = 640, H = 170, L = 40, R = 10, T = 12, B = 22, H0 = 5, H1 = 24;
  const points = useMemo(() => entries.map((e) => ({ h: hourOf(e.at), n: entryNutrients(e), text: e.text })).filter((p) => p.n.kcal > 0).sort((a, b) => a.h - b.h), [entries]);
  const total = points.reduce((a, p) => a + p.n.kcal, 0);
  const maxY = Math.max(target.kcal || 0, total, 600) * 1.08;
  const x = (h: number) => L + ((Math.min(Math.max(h, H0), H1) - H0) / (H1 - H0)) * (W - L - R);
  const y = (v: number) => T + (1 - v / maxY) * (H - T - B);
  const [hover, setHover] = useState<number | null>(null);
  let accum = 0;
  const cum = points.map((p) => (accum += p.n.kcal));
  const steps = [`M${x(H0)} ${y(0)}`, ...points.flatMap((p, i) => [`L${x(p.h)} ${y(i ? cum[i - 1] : 0)}`, `L${x(p.h)} ${y(cum[i])}`]), `L${x(Math.max(H0, Math.min(H1, hourOf(new Date().toISOString()))))} ${y(cum[cum.length - 1] ?? 0)}`].join(" ");
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!points.length) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    points.forEach((p, i) => { if (Math.abs(x(p.h) - px) < Math.abs(x(points[best].h) - px)) best = i; });
    setHover(Math.abs(x(points[best].h) - px) < 40 ? best : null);
  };
  const hp = hover === null ? null : points[hover];
  const tipX = hp ? Math.min(Math.max(x(hp.h) - 90, L), W - R - 180) : 0;
  return (
    <figure className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong className="block text-sm font-bold">Calorias ao longo do dia</strong>
          <span className="text-xs text-muted-foreground">{points.length ? "Passe o mouse sobre cada registro" : "Os registros de hoje aparecem aqui"}</span>
        </span>
        <span className="flex gap-3 text-[11px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-orange-400" /> Registro</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-emerald-500" /> Acumulado</span>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full touch-none select-none" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`Calorias hoje: ${n0(total)} kcal`}>
        <defs><linearGradient id="nv-kcal-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10b981" stopOpacity=".25" /><stop offset="1" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y((maxY * f) / 1.08)} y2={y((maxY * f) / 1.08)} stroke="currentColor" className="text-border" strokeDasharray="2 5" />
            <text x={L - 6} y={y((maxY * f) / 1.08) + 3} textAnchor="end" fontSize="9" fill="currentColor" className="text-muted-foreground">{n0((maxY * f) / 1.08)}</text>
          </g>
        ))}
        {target.kcal > 0 && (
          <g>
            <line x1={L} x2={W - R} y1={y(target.kcal)} y2={y(target.kcal)} stroke="#f97316" strokeDasharray="5 5" opacity=".7" />
            <text x={W - R} y={y(target.kcal) - 5} textAnchor="end" fontSize="10" fontWeight="700" fill="#f97316">Referência {n0(target.kcal)} kcal</text>
          </g>
        )}
        {points.length > 0 && <path d={`${steps} L${x(Math.max(H0, Math.min(H1, hourOf(new Date().toISOString()))))} ${y(0)}Z`} fill="url(#nv-kcal-area)" />}
        {points.length > 0 && <path d={steps} fill="none" stroke="#10b981" strokeWidth="3" strokeLinejoin="round" pathLength={1} className="nv-evo-line nv-draw-now" />}
        {points.map((p, i) => (
          <circle key={i} cx={x(p.h)} cy={y(cum[i])} r={hover === i ? 8 : Math.max(4, Math.min(9, p.n.kcal / 90))} fill="#fb923c" stroke="var(--card)" strokeWidth="2" className="nv-dot-in" style={{ animationDelay: `${300 + i * 80}ms`, transition: "r .2s" }} />
        ))}
        {[6, 9, 12, 15, 18, 21, 24].map((h) => <text key={h} x={x(h)} y={H - 6} textAnchor="middle" fontSize="10" fill="currentColor" className="text-muted-foreground">{String(h % 24).padStart(2, "0")}h</text>)}
        {hp && (
          <g pointerEvents="none" transform={`translate(${tipX} ${T + 2})`}>
            <rect width="180" height="54" rx="9" fill="#0f172a" />
            <text x="10" y="16" fontSize="10" fill="#94a3b8">{String(Math.floor(hp.h)).padStart(2, "0")}:{String(Math.round((hp.h % 1) * 60)).padStart(2, "0")} · {n0(hp.n.kcal)} kcal</text>
            <text x="10" y="31" fontSize="11" fontWeight="700" fill="#fff">{hp.text.length > 28 ? `${hp.text.slice(0, 27)}…` : hp.text || "Registro"}</text>
            <text x="10" y="46" fontSize="10" fill="#cbd5e1">P {n0(hp.n.protein)} g · C {n0(hp.n.carbs)} g · G {n0(hp.n.fat)} g</text>
          </g>
        )}
      </svg>
    </figure>
  );
}
