import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import { acreAddDays, acreDateKey } from "@/lib/acre-time";
import { buildDays } from "@/lib/day-metrics";
import { loadPeriodRaw, resolveTargets, type PeriodData } from "@/lib/period-data";
import { analyzeWeight } from "@/lib/weight-drivers";
import { useWeightGoalVersion } from "@/lib/weight-goal";
import { Retractable } from "./Retractable";

const nf = (n: number, d = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const br = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

/** Painel discreto: compara as duas últimas quinzenas de hábitos com a variação do peso. */
export function WeightDriversPanel({
  patientId,
  ownerId,
  revision = 0,
}: {
  patientId: string;
  ownerId: string;
  revision?: number;
}) {
  const [data, setData] = useState<PeriodData | null>(null);
  const goalVersion = useWeightGoalVersion();
  const today = acreDateKey();
  const from = acreAddDays(today, -27);

  useEffect(() => {
    let active = true;
    loadPeriodRaw(patientId, ownerId, from, today).then(
      (d) => active && setData(d),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [patientId, ownerId, from, today, revision, goalVersion]);

  const result = useMemo(() => {
    if (!data) return null;
    const targets = resolveTargets(data.prefs, null);
    const days = buildDays(data.raw, from, today, { targets, nowMs: Date.now() });
    return analyzeWeight(days, data.raw.weights, targets.kcal);
  }, [data, from, today]);

  const summary =
    result?.change != null
      ? `${result.change > 0 ? "+" : ""}${nf(result.change, 1)} kg em 4 semanas`
      : "Análise dos seus hábitos";

  return (
    <Retractable
      id="peso-motivos"
      eyebrow="Entenda a variação"
      title="O que pode ter mexido no seu peso"
      accent="#a78bfa"
      summary={summary}
      defaultOpen={false}
    >
      {!result ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="grid content-start gap-2">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {result.change != null ? (
                <>
                  <p
                    className={`font-display text-2xl font-extrabold tabular-nums ${result.change > 0 ? "text-amber-400" : "text-emerald-400"}`}
                  >
                    {result.change > 0 ? "+" : ""}
                    {nf(result.change, 1)} kg
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nf(result.fromKg ?? 0, 1)} kg em {br(result.fromDay!)} →{" "}
                    {nf(result.toKg ?? 0, 1)} kg em {br(result.toDay!)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Registre ao menos duas pesagens nas últimas 4 semanas para ver a variação.
                </p>
              )}
            </div>
            {result.balance && (
              <p className="rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-xs">
                Média de <b>{nf(result.balance.avgKcal)} kcal</b> por dia registrada, contra a meta
                de {nf(result.balance.target)} kcal. Se mantido, isso equivale a cerca de{" "}
                <b>
                  {result.balance.kgPerWeek > 0 ? "+" : ""}
                  {nf(result.balance.kgPerWeek, 2)} kg por semana
                </b>{" "}
                (1 kg de gordura ≈ 7.700 kcal).
              </p>
            )}
            {result.drivers.length > 0 ? (
              <ul className="grid gap-1.5">
                {result.drivers.map((d) => (
                  <li
                    key={d.text}
                    className={`flex gap-2 rounded-lg border-l-2 px-2.5 py-1.5 text-xs leading-snug ${d.tone === "up" ? "border-amber-400 bg-amber-400/5" : d.tone === "down" ? "border-emerald-400 bg-emerald-400/5" : "border-sky-400 bg-sky-400/5"}`}
                  >
                    {d.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Seus hábitos ficaram parecidos nas duas quinzenas.
              </p>
            )}
          </div>

          <div className="min-w-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-muted-foreground">
                  <th className="pb-1 text-left font-semibold">Hábito</th>
                  <th className="pb-1 text-right font-semibold">Quinzena anterior</th>
                  <th className="pb-1 text-right font-semibold">Última quinzena</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.habits.map((h) => {
                  const diff = h.before !== null && h.after !== null ? h.after - h.before : null;
                  const meaningful =
                    diff !== null &&
                    (h.unit === "por dia"
                      ? Math.abs(diff) >= 0.3
                      : Math.abs(diff) >= Math.abs(h.before ?? 0) * 0.15);
                  const up = diff !== null && Math.sign(diff) === h.weightEffect;
                  const fmt = (v: number | null) =>
                    v === null ? "—" : `${nf(v, h.decimals ?? 0)} ${h.unit}`;
                  return (
                    <tr key={h.key}>
                      <td className="py-1 pr-2">{h.label}</td>
                      <td className="py-1 text-right tabular-nums text-muted-foreground">
                        {fmt(h.before)}
                      </td>
                      <td className="py-1 text-right font-semibold tabular-nums">{fmt(h.after)}</td>
                      <td className="py-1 text-right">
                        {meaningful &&
                          (up ? (
                            <ArrowUpRight
                              size={13}
                              className="ml-auto text-amber-400"
                              aria-label="tende a subir o peso"
                            />
                          ) : (
                            <ArrowDownRight
                              size={13}
                              className="ml-auto text-emerald-400"
                              aria-label="tende a baixar o peso"
                            />
                          ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 flex gap-1.5 text-[10px] leading-snug text-muted-foreground">
              <Info size={12} className="mt-px shrink-0" />
              Comparação dos seus próprios registros: indica associações, não causa comprovada. Dias
              sem registro ficam de fora. Variações de poucos dias costumam ser água, intestino ou
              ciclo hormonal.
            </p>
          </div>
        </div>
      )}
    </Retractable>
  );
}
