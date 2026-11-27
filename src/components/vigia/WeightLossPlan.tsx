/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Droplets, Dumbbell, Footprints, Flame, Moon, Target, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ageFromBirth } from "@/lib/health-limits";
import { HABITS, buildWeightPlan, sampleDay } from "@/lib/weight-plan";
import { Collapsible } from "./HealthBits";

const nf = (n: number, d = 1) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: 0 });
const weeksText = ([a, b]: [number, number]) => (a === b ? `${a} semanas` : `${a} a ${b} semanas`);

type Profile = {
  birth_date: string | null;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
  care_goal: string | null;
  health_conditions: string[] | null;
};

/** Plano de perda de peso: aparece quando o objetivo do perfil é emagrecer. */
export function WeightLossPlan({
  patientId,
  currentWeight,
}: {
  patientId: string;
  currentWeight?: number | null;
}) {
  const [p, setP] = useState<Profile | null>(null);
  useEffect(() => {
    let active = true;
    const load = () =>
      void (supabase as any)
        .from("care_patients")
        .select("birth_date,sex,height_cm,weight_kg,activity_level,care_goal,health_conditions")
        .eq("id", patientId)
        .maybeSingle()
        .then(({ data }: any) => active && setP(data ?? null));
    load();
    window.addEventListener("nv-profile-changed", load);
    return () => {
      active = false;
      window.removeEventListener("nv-profile-changed", load);
    };
  }, [patientId]);

  const plan = useMemo(
    () =>
      p
        ? buildWeightPlan({
            weightKg: currentWeight || (p.weight_kg ? Number(p.weight_kg) : null),
            heightCm: p.height_cm ? Number(p.height_cm) : null,
            age: ageFromBirth(p.birth_date),
            sex: p.sex,
            activity: p.activity_level,
            conditions: p.health_conditions,
          })
        : null,
    [p, currentWeight],
  );

  if (!p || p.care_goal !== "emagrecimento" || !plan) return null;
  if (!plan.ok)
    return (
      <section className="rounded-3xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        <h3 className="font-bold">Plano de perda de peso</h3>
        <p className="mt-1">{plan.reason}</p>
      </section>
    );

  const w = currentWeight || Number(p.weight_kg);
  const atGoal = plan.toIdealKg <= 0.5;
  const pctRange = Math.min(100, Math.max(4, ((plan.bmi - 18.5) / (35 - 18.5)) * 100));
  const meals = plan.kcal ? sampleDay(plan.kcal) : [];

  return (
    <section className="grid gap-3" aria-label="Plano de perda de peso">
      <div className="overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 via-card to-card p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
          <Target size={14} /> Seu plano de perda de peso
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-muted/50 p-2.5">
            <p className="text-[11px] text-muted-foreground">Hoje</p>
            <p className="text-xl font-black tabular-nums">{nf(w)}</p>
            <p className="text-[10px] text-muted-foreground">kg</p>
          </div>
          <div className="rounded-2xl bg-emerald-500/20 p-2.5 ring-1 ring-emerald-400/30">
            <p className="text-[11px] text-emerald-500">1ª meta</p>
            <p className="text-xl font-black tabular-nums">{nf(plan.firstGoalKg)}</p>
            <p className="text-[10px] text-muted-foreground">kg</p>
          </div>
          <div className="rounded-2xl bg-muted/50 p-2.5">
            <p className="text-[11px] text-muted-foreground">Ideal</p>
            <p className="text-xl font-black tabular-nums">{nf(plan.idealKg)}</p>
            <p className="text-[10px] text-muted-foreground">kg</p>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-snug">
          Faixa de peso adequada para a sua altura:{" "}
          <b>
            {nf(plan.range[0])} a {nf(plan.range[1])} kg
          </b>{" "}
          (IMC 18,5 a 24,9).{" "}
          {atGoal
            ? "Você já está nessa faixa: o foco é manter e ganhar saúde."
            : `Faltam cerca de ${nf(plan.toIdealKg)} kg até o peso ideal.`}
        </p>
        {!atGoal && (
          <>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gradient-to-r from-sky-400 via-emerald-500 to-red-500">
              <i
                className="block h-full border-r-4 border-white bg-black/25"
                style={{ width: `${pctRange}%` }}
              />
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground">
              Ritmo seguro: {nf(plan.kgPerWeek[0], 2)} a {nf(plan.kgPerWeek[1], 2)} kg por semana. A
              1ª meta (5 a 10% a menos) leva cerca de {weeksText(plan.weeksToFirst)}; o peso ideal,
              cerca de {weeksText(plan.weeksToIdeal)}.
            </p>
          </>
        )}
        {plan.careNote && (
          <p className="mt-3 rounded-2xl bg-amber-500/15 p-3 text-[12.5px]">{plan.careNote}</p>
        )}
      </div>

      <Collapsible
        title="Suas metas diárias"
        summary={
          plan.kcal ? `${plan.kcal} kcal · ${plan.proteinG} g de proteína` : "Complete o perfil"
        }
        icon={<Flame size={16} className="text-orange-500" />}
        defaultOpen
      >
        <ul className="grid gap-2 text-sm">
          {plan.kcal && plan.maintenanceKcal && (
            <li className="rounded-2xl bg-muted/50 p-3">
              <b>{plan.kcal} kcal por dia.</b> Seu gasto é de cerca de {plan.maintenanceKcal} kcal;
              o déficit de {plan.deficitKcal} kcal é moderado e protege a massa muscular.
            </li>
          )}
          <li className="rounded-2xl bg-muted/50 p-3">
            <b>{plan.proteinG} g de proteína</b> distribuídos nas refeições, para manter a saciedade
            e os músculos.
          </li>
          <li className="flex items-center gap-2 rounded-2xl bg-muted/50 p-3">
            <Droplets size={15} className="shrink-0 text-sky-500" />
            <span>
              <b>{nf(plan.waterMl / 1000, 1)} L de líquidos</b> por dia.
            </span>
          </li>
          <li className="rounded-2xl bg-muted/50 p-3">
            <b>{plan.fiberG} g de fibras</b>
            {plan.sugarG ? (
              <>
                {" "}
                e no máximo <b>{plan.sugarG} g de açúcar adicionado</b>
              </>
            ) : null}
            .
          </li>
        </ul>
      </Collapsible>

      {meals.length > 0 && (
        <Collapsible
          title="Exemplo de um dia de refeições"
          summary="5 refeições com as calorias de cada uma"
          icon={<Utensils size={16} className="text-amber-500" />}
        >
          <ul className="divide-y divide-border">
            {meals.map((m) => (
              <li key={m.t} className="py-2.5">
                <p className="flex items-baseline justify-between gap-2 text-sm font-bold">
                  {m.t}
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    ~{m.kcal} kcal
                  </span>
                </p>
                <p className="text-[13px] leading-snug text-muted-foreground">{m.ex}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Exemplos para inspirar. Troque por alimentos que você gosta e registre as refeições: o
            app calcula calorias, proteína, açúcar e cafeína sozinho.
          </p>
        </Collapsible>
      )}

      <Collapsible
        title="Metas da semana"
        summary="Movimento, sono e rotina"
        icon={<Footprints size={16} className="text-teal-500" />}
      >
        <ul className="grid gap-2 text-sm">
          <li className="flex gap-2 rounded-2xl bg-muted/50 p-3">
            <Footprints size={15} className="mt-0.5 shrink-0 text-teal-500" />
            <span>
              <b>{plan.steps.toLocaleString("pt-BR")} passos por dia</b> ou 30 min de caminhada
              rápida, 5 dias na semana (150 min no total).
            </span>
          </li>
          <li className="flex gap-2 rounded-2xl bg-muted/50 p-3">
            <Dumbbell size={15} className="mt-0.5 shrink-0 text-violet-500" />
            <span>
              <b>2 treinos de força</b> por semana, para perder gordura e não músculo.
            </span>
          </li>
          <li className="flex gap-2 rounded-2xl bg-muted/50 p-3">
            <Moon size={15} className="mt-0.5 shrink-0 text-indigo-400" />
            <span>
              <b>7 a 9 horas de sono</b> e última cafeína até o horário indicado na tela Cafeína.
            </span>
          </li>
          <li className="rounded-2xl bg-muted/50 p-3">
            <b>Pese-se 1 vez por semana</b>, no mesmo dia e horário. O que importa é a tendência de
            3 a 4 semanas.
          </li>
        </ul>
      </Collapsible>

      <Collapsible
        title="Hábitos que fazem diferença"
        summary={`${HABITS.length} hábitos para começar`}
        icon={<Target size={16} className="text-emerald-500" />}
      >
        <ul className="grid gap-2">
          {HABITS.map((h) => (
            <li key={h.t} className="rounded-2xl bg-muted/50 p-3">
              <p className="text-sm font-bold">{h.t}</p>
              <p className="text-[13px] leading-snug text-muted-foreground">{h.d}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Informação educativa (OMS, diretrizes de IMC e de atividade física). Não substitui médico
          ou nutricionista. Perder mais de 1 kg por semana ou sentir tontura, fraqueza ou falta de
          energia pede avaliação profissional.
        </p>
      </Collapsible>
    </section>
  );
}
