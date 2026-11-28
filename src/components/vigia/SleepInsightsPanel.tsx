/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { AlarmClock, BedDouble, Coffee, Lightbulb, Scale, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useExposures } from "./useExposures";
import {
  compareHabits,
  recommendedRange,
  sleepMetrics,
  sleepTips,
  type ActivityMark,
  type SleepNight,
} from "@/lib/sleep-insights";

const nf = (n: number, d = 1) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const hm = (h: number) => `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

/** Métricas, horários ideais, comparação com o dia e dicas baseadas em evidências. */
export function SleepInsightsPanel({
  logs,
  patientId,
  ownerId,
}: {
  logs: SleepNight[];
  patientId: string;
  ownerId: string;
}) {
  const [age, setAge] = useState<number | null>(null);
  const [activities, setActivities] = useState<ActivityMark[]>([]);
  const { items: exposures } = useExposures(patientId, ownerId, 45);

  useEffect(() => {
    let active = true;
    const db = supabase as any;
    const since = new Date(Date.now() - 45 * 86_400_000).toISOString();
    void Promise.all([
      db.from("care_patients").select("birth_date").eq("id", patientId).maybeSingle(),
      db
        .from("care_activity_log")
        .select("happened_at,details")
        .eq("patient_id", patientId)
        .gte("happened_at", since),
    ]).then(
      ([p, a]: any[]) => {
        if (!active) return;
        const b = p?.data?.birth_date;
        if (b) setAge(Math.floor((Date.now() - Date.parse(b)) / (365.25 * 86_400_000)));
        setActivities(
          (a?.data ?? []).map((r: any) => ({
            at: Date.parse(r.happened_at),
            minutes: Number(r.details?.duration_minutes ?? 0),
          })),
        );
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [patientId]);

  const m = useMemo(() => sleepMetrics(logs, age), [logs, age]);
  const cmp = useMemo(
    () => compareHabits(logs, exposures, activities),
    [logs, exposures, activities],
  );
  const range = recommendedRange(age);

  if (!m)
    return (
      <section
        className="border border-border bg-card p-3.5 shadow-card"
        aria-label="Análise do sono"
      >
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Lightbulb size={16} className="text-amber-400" /> Análise do sono
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Registre a hora em que foi dormir e a hora em que acordou. Com 3 noites o app calcula suas
          métricas, horário ideal de deitar e compara com cafeína, refeições e atividade do dia.
          Recomendado para {range.label}: {range.min} a {range.max} h por noite.
        </p>
      </section>
    );

  const tips = sleepTips(m, cmp, age);
  const tiles: [typeof BedDouble, string, string, string, string?][] = [
    [
      BedDouble,
      "Média por noite",
      hm(m.avgHours),
      `meta ${range.min}–${range.max} h (${range.label})`,
      m.avgHours < range.min ? "#f59e0b" : "#34d399",
    ],
    [
      Scale,
      "Dívida de sono (7 noites)",
      `${nf(m.debtHours)} h`,
      "abaixo do mínimo recomendado",
      m.debtHours >= 3 ? "#f87171" : "#34d399",
    ],
    [
      AlarmClock,
      "Regularidade",
      `±${Math.max(m.bedSdMin, m.wakeSdMin)} min`,
      `deita ~${m.bedtime} · acorda ~${m.wakeTime}`,
      Math.max(m.bedSdMin, m.wakeSdMin) > 60 ? "#f59e0b" : "#34d399",
    ],
    [
      BedDouble,
      "Noites na faixa",
      `${m.inRangePct}%`,
      `${m.nights} noites analisadas`,
      m.inRangePct < 50 ? "#f59e0b" : "#34d399",
    ],
  ];

  return (
    <section
      className="border border-border bg-card p-3.5 shadow-card"
      aria-label="Análise do sono"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Lightbulb size={16} className="text-amber-400" /> Análise do sono
        </h3>
        <span className="text-[11px] text-muted-foreground">
          Últimos {m.nights} registros · horário do Acre
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {tiles.map(([Icon, label, value, sub, color]) => (
          <div key={label} className="border border-border bg-background/40 p-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Icon size={13} style={{ color }} /> {label}
            </p>
            <p className="mt-1 font-display text-lg font-extrabold tabular-nums" style={{ color }}>
              {value}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold">Seus horários ideais</p>
          <ul className="mt-1.5 grid gap-1 text-xs">
            {[
              [
                BedDouble,
                "Deitar",
                m.idealBedtime,
                `para acordar ~${m.wakeTime} com ${nf(m.target)} h`,
              ],
              [Coffee, "Última cafeína", m.caffeineCutoff, "6 h antes de deitar"],
              [UtensilsCrossed, "Última refeição", m.lastMealCutoff, "3 h antes de deitar"],
            ].map(([Icon, label, time, note]) => {
              const I = Icon as typeof BedDouble;
              return (
                <li
                  key={label as string}
                  className="flex items-center gap-2 border border-border px-2 py-1.5"
                >
                  <I size={14} className="shrink-0 text-indigo-300" />
                  <span className="font-semibold">{label as string}</span>
                  <span className="ml-auto font-display font-extrabold tabular-nums">
                    {time as string}
                  </span>
                  <span className="hidden w-40 truncate text-right text-[10px] text-muted-foreground sm:inline">
                    {note as string}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-xs font-bold">Comparação com o seu dia</p>
          {cmp.length ? (
            <ul className="mt-1.5 grid gap-1 text-xs">
              {cmp.map((c) => {
                const diff = Math.round((c.withH - c.withoutH) * 60);
                return (
                  <li key={c.key} className="border border-border px-2 py-1.5">
                    <p className="font-semibold">{c.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Com: {hm(c.withH)} · nota {nf(c.withQ)} &nbsp;|&nbsp; Sem: {hm(c.withoutH)} ·
                      nota {nf(c.withoutQ)}{" "}
                      <b className={diff < 0 ? "text-amber-400" : "text-emerald-400"}>
                        ({diff > 0 ? "+" : ""}
                        {diff} min)
                      </b>
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Precisa de pelo menos 2 noites com e 2 sem cada hábito (cafeína tardia, jantar tarde,
              treino) para comparar.
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-bold">Dicas para você</p>
          <ul className="mt-1.5 grid gap-1.5 text-xs">
            {tips.map((t) => (
              <li
                key={t}
                className="flex gap-2 border-l-2 border-amber-400/70 bg-amber-400/5 px-2 py-1.5"
              >
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Fontes: National Sleep Foundation (faixas por idade, 2015/2025); Drake et al., J Clin
            Sleep Med 2013 (cafeína até 6 h antes); UK Biobank 2024 (regularidade). Não substitui
            avaliação médica — ronco forte, pausas na respiração ou sonolência diurna intensa
            merecem consulta.
          </p>
        </div>
      </div>
    </section>
  );
}
