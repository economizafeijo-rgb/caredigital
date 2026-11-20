import { useState } from "react";
import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";

const KCAL_PER_KG = 7700;
const num = (n: number, d = 0) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });

/**
 * Planejador de ganho: o usuário informa quanto quer ganhar e em quanto tempo, e o sistema
 * calcula o ritmo semanal, o excedente diário de calorias e o que comer por refeição.
 * Base: diretrizes citam excedente de ~300–500 kcal/dia (~0,45 kg/semana) com treino de força;
 * 1 kg de tecido corporal ≈ 7.700 kcal (aproximação usada em calculadoras de ganho de peso).
 */
export function GainPlanner({
  weightKg,
  maintenanceKcal,
  proteinKg,
  fatPct,
  mode,
}: {
  weightKg: number;
  maintenanceKcal: number;
  proteinKg: [number, number];
  fatPct: number;
  mode: "massa" | "peso";
}) {
  const [gain, setGain] = useState(3);
  const [weeks, setWeeks] = useState(12);
  const pace = gain / weeks;
  const surplus = (gain * KCAL_PER_KG) / (weeks * 7);
  const minWeeks = Math.ceil((gain * KCAL_PER_KG) / (500 * 7));
  const status = surplus > 500 ? "alto" : surplus < 250 ? "lento" : "ok";
  const hasW = weightKg > 0;
  const protein = hasW ? (weightKg * (proteinKg[0] + proteinKg[1])) / 2 : 0;
  const target = maintenanceKcal > 0 ? maintenanceKcal + surplus : 0;
  const fat = target ? (target * fatPct) / 100 / 9 : 0;
  const carbs = target ? (target - protein * 4 - fat * 9) / 4 : 0;
  const perMeal = hasW ? weightKg * 0.25 : 0;

  const W = 300,
    H = 110,
    px = 28,
    py = 14;
  const start = hasW ? weightKg : 0;
  const end = start + gain;
  const lo = hasW ? start - 1 : 0;
  const hi = hasW ? end + 1 : 1;
  const x = (w: number) => px + (w / weeks) * (W - px * 2);
  const y = (v: number) => H - py - ((v - lo) / (hi - lo)) * (H - py * 2);
  const ticks = Array.from({ length: Math.min(6, weeks) + 1 }, (_, i) =>
    Math.round((i * weeks) / Math.min(6, weeks)),
  );
  const verdict = {
    ok: {
      icon: CheckCircle2,
      text: "Ritmo dentro do que as diretrizes citam (cerca de 300 a 500 kcal a mais por dia).",
    },
    lento: {
      icon: CheckCircle2,
      text: "Ritmo conservador: tende a acumular menos gordura, mas pode levar mais tempo.",
    },
    alto: {
      icon: AlertTriangle,
      text: `Ritmo acima do recomendado: o excedente passa de 500 kcal/dia e boa parte pode virar gordura. Para ganhar ${num(gain, 1)} kg com mais segurança, planeje pelo menos ${minWeeks} semanas.`,
    },
  }[status];
  const Icon = verdict.icon;

  return (
    <section className="border border-border bg-card p-3" aria-label="Planejador de ganho">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <TrendingUp size={15} /> Quanto você quer ganhar de{" "}
        {mode === "massa" ? "massa muscular" : "peso"}?
      </h3>
      <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_minmax(0,17rem)]">
        <div className="grid content-start gap-3 text-xs">
          <label className="block font-semibold">
            <span className="flex justify-between">
              Meta de ganho <b className="tabular-nums">{num(gain, 1)} kg</b>
            </span>
            <input
              type="range"
              min={0.5}
              max={15}
              step={0.5}
              value={gain}
              onChange={(e) => setGain(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <label className="block font-semibold">
            <span className="flex justify-between">
              Prazo <b className="tabular-nums">{weeks} semanas</b>
            </span>
            <input
              type="range"
              min={4}
              max={52}
              step={1}
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <p
            className={
              "flex gap-1.5 border-l-2 bg-muted/40 p-2 " +
              (status === "alto" ? "border-amber-500" : "border-emerald-500")
            }
          >
            <Icon size={14} className="mt-px shrink-0" />
            <span>{verdict.text}</span>
          </p>
        </div>

        <figure className="min-w-0">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label="Projeção do peso ao longo das semanas"
          >
            <line
              x1={px}
              x2={W - px}
              y1={H - py}
              y2={H - py}
              stroke="currentColor"
              strokeOpacity=".2"
            />
            <polyline
              fill="none"
              stroke="#0d9488"
              strokeWidth="2.5"
              points={`${x(0)},${y(hasW ? start : 0)} ${x(weeks)},${y(hasW ? end : gain)}`}
            />
            <circle cx={x(0)} cy={y(hasW ? start : 0)} r="3.5" fill="#0d9488" />
            <circle cx={x(weeks)} cy={y(hasW ? end : gain)} r="3.5" fill="#0d9488" />
            {ticks.map((t) => (
              <text
                key={t}
                x={x(t)}
                y={H - 2}
                textAnchor="middle"
                className="fill-muted-foreground text-[8px]"
              >
                {t}s
              </text>
            ))}
            {hasW && (
              <>
                <text
                  x={x(0) + 6}
                  y={y(start) - 6}
                  className="fill-foreground text-[9px] font-bold"
                >
                  {num(start, 1)} kg
                </text>
                <text
                  x={x(weeks) - 6}
                  y={y(end) - 7}
                  textAnchor="end"
                  className="fill-foreground text-[9px] font-bold"
                >
                  {num(end, 1)} kg
                </text>
              </>
            )}
          </svg>
          <figcaption className="text-center text-[11px] text-muted-foreground">
            Ritmo médio: {num(pace, 2)} kg por semana
            {hasW ? "" : " · informe seu peso para ver a projeção"}
          </figcaption>
        </figure>

        <dl className="grid content-start gap-px bg-border text-xs">
          <div className="flex items-baseline justify-between bg-card px-2.5 py-1.5">
            <dt className="text-muted-foreground">Excedente diário</dt>
            <dd className="font-bold tabular-nums">+{num(surplus)} kcal</dd>
          </div>
          {target > 0 && (
            <div className="flex items-baseline justify-between bg-card px-2.5 py-1.5">
              <dt className="text-muted-foreground">Meta de calorias</dt>
              <dd className="font-bold tabular-nums">{num(target)} kcal/dia</dd>
            </div>
          )}
          {hasW && (
            <div className="flex items-baseline justify-between bg-card px-2.5 py-1.5">
              <dt className="text-muted-foreground">Proteína</dt>
              <dd className="font-bold tabular-nums">
                ≈ {num(protein)} g/dia · {num(perMeal)} g por refeição
              </dd>
            </div>
          )}
          {target > 0 && hasW && (
            <>
              <div className="flex items-baseline justify-between bg-card px-2.5 py-1.5">
                <dt className="text-muted-foreground">Carboidratos</dt>
                <dd className="font-bold tabular-nums">≈ {num(Math.max(0, carbs))} g/dia</dd>
              </div>
              <div className="flex items-baseline justify-between bg-card px-2.5 py-1.5">
                <dt className="text-muted-foreground">Gorduras</dt>
                <dd className="font-bold tabular-nums">≈ {num(fat)} g/dia</dd>
              </div>
            </>
          )}
          {!target && (
            <p className="bg-card px-2.5 py-1.5 text-[11px] text-muted-foreground">
              Informe suas calorias de manutenção (campo “Calorias/dia”) para ver a meta diária.
            </p>
          )}
        </dl>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {mode === "massa"
          ? "Para o ganho ser de músculo, o excedente precisa vir junto com treino de força regular; sem ele, a maior parte tende a ser gordura. "
          : ""}
        Cálculo aproximado (1 kg ≈ 7.700 kcal). O corpo responde de forma diferente em cada pessoa:
        reavalie a cada 2 a 4 semanas.
      </p>
    </section>
  );
}
