import { estimateObjectiveNutrition } from "./objective-nutrition";

/**
 * Plano educativo de perda de peso: faixa de peso adequada pelo IMC (OMS), ritmo seguro
 * (0,5% a 1% do peso por semana), calorias com déficit moderado e metas de hábitos.
 * Não substitui avaliação médica ou de nutricionista.
 */
export type PlanInput = {
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  sex: string | null;
  activity: string | null;
  conditions?: string[] | null;
};

const ACTIVITY: Record<string, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  ativo: 1.725,
  muito_ativo: 1.9,
};

export type WeightPlan =
  | { ok: false; reason: string }
  | {
      ok: true;
      bmi: number;
      /** Faixa de peso com IMC entre 18,5 e 24,9. */
      range: [number, number];
      /** Peso de referência (IMC 22). */
      idealKg: number;
      /** Primeira meta realista: 5% a 10% a menos, sem passar do ideal. */
      firstGoalKg: number;
      toIdealKg: number;
      kgPerWeek: [number, number];
      weeksToFirst: [number, number];
      weeksToIdeal: [number, number];
      maintenanceKcal: number | null;
      kcal: number | null;
      deficitKcal: number | null;
      proteinG: number;
      waterMl: number;
      fiberG: number;
      sugarG: number | null;
      steps: number;
      careNote: string | null;
    };

export function buildWeightPlan(i: PlanInput): WeightPlan {
  const { weightKg: w, heightCm: h, age } = i;
  if (!w || !h) return { ok: false, reason: "Informe peso e altura no perfil para calcular." };
  if (age !== null && age < 18)
    return {
      ok: false,
      reason: "Para menores de 18 anos o acompanhamento deve ser feito com o pediatra.",
    };
  const m = h / 100;
  const bmi = w / (m * m);
  if (bmi < 18.5)
    return {
      ok: false,
      reason:
        "Seu IMC está abaixo de 18,5. Perder peso não é indicado; procure avaliação profissional.",
    };
  const range: [number, number] = [18.5 * m * m, 24.9 * m * m];
  const idealKg = 22 * m * m;
  const over = Math.max(0, w - idealKg);
  const firstGoalKg = bmi < 25 ? w : Math.max(idealKg, Math.round(w * 0.9 * 2) / 2);
  const kgPerWeek: [number, number] = [
    Math.max(0.25, Math.round(w * 0.005 * 100) / 100),
    Math.min(1, Math.round(w * 0.01 * 100) / 100),
  ];
  const wk = (kg: number): [number, number] => [
    Math.max(0, Math.ceil(kg / kgPerWeek[1])),
    Math.max(0, Math.ceil(kg / kgPerWeek[0])),
  ];
  const factor = ACTIVITY[i.activity ?? ""] ?? 1.375;
  const est = estimateObjectiveNutrition({
    weight: w,
    age,
    heightCm: h,
    sex: i.sex,
    objective: "equilibrio",
    activityFactor: Math.min(1.725, factor),
  });
  const maintenanceKcal = est.maintenance ?? null;
  const floor = i.sex?.toLowerCase().startsWith("f") ? 1200 : 1500;
  let kcal: number | null = null;
  let deficit: number | null = null;
  if (maintenanceKcal) {
    deficit = Math.min(500, Math.round(maintenanceKcal * 0.2));
    kcal = Math.max(floor, Math.round((maintenanceKcal - deficit) / 50) * 50);
    deficit = maintenanceKcal - kcal;
  }
  const refKg = Math.min(w, 25 * m * m);
  const text = (i.conditions ?? []).join(" ").toLowerCase();
  const careNote = /gest|lact|diabet|renal|rim|cardi|hipertens|tireoid/.test(text)
    ? "Você tem uma condição de saúde ou fase da vida que muda as metas. Faça o plano com seu médico ou nutricionista."
    : null;
  return {
    ok: true,
    bmi,
    range,
    idealKg,
    firstGoalKg,
    toIdealKg: over,
    kgPerWeek,
    weeksToFirst: wk(Math.max(0, w - firstGoalKg)),
    weeksToIdeal: wk(over),
    maintenanceKcal,
    kcal,
    deficitKcal: deficit,
    proteinG: Math.round(refKg * 1.6),
    waterMl: Math.round((w * 35) / 50) * 50,
    fiberG: i.sex?.toLowerCase().startsWith("f") ? 25 : 30,
    sugarG: kcal ? Math.round((kcal * 0.1) / 4) : null,
    steps: 8000,
    careNote,
  };
}

/** Distribui as calorias do dia nas refeições com exemplos práticos. */
export function sampleDay(kcal: number) {
  const r = (p: number) => Math.round((kcal * p) / 10) * 10;
  return [
    {
      t: "Café da manhã",
      kcal: r(0.25),
      ex: "2 ovos mexidos, 1 fatia de pão integral, 1 fruta e café sem açúcar.",
    },
    { t: "Lanche da manhã", kcal: r(0.08), ex: "1 iogurte natural com 1 colher de aveia." },
    {
      t: "Almoço",
      kcal: r(0.3),
      ex: "Metade do prato de salada e legumes, 1 palma de frango ou peixe grelhado, 3 colheres de arroz e 1 concha de feijão.",
    },
    { t: "Lanche da tarde", kcal: r(0.12), ex: "1 fruta com um punhado pequeno de castanhas." },
    {
      t: "Jantar",
      kcal: r(0.25),
      ex: "Omelete com legumes e salada, ou sopa de legumes com frango desfiado.",
    },
  ];
}

export const HABITS = [
  {
    t: "Prato 50/25/25",
    d: "Metade de legumes e verduras, um quarto de proteína, um quarto de carboidrato.",
  },
  { t: "Beba água antes das refeições", d: "Um copo antes de comer ajuda na saciedade." },
  {
    t: "Troque bebida doce por água ou chá sem açúcar",
    d: "Refrigerante e suco de caixinha somam açúcar sem saciar.",
  },
  { t: "Coma devagar, sem tela", d: "Leva cerca de 20 minutos para o corpo sentir a saciedade." },
  {
    t: "Planeje a semana",
    d: "Deixe lanches prontos (frutas, iogurte, castanhas) para evitar o improviso.",
  },
  { t: "Durma de 7 a 9 horas", d: "Dormir pouco aumenta a fome e a vontade de doces." },
];

export type PlanTargets = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

/** Metas diárias do plano de perda de peso, no mesmo formato das metas de referência. */
export function planMacroTargets(i: PlanInput): PlanTargets | null {
  const p = buildWeightPlan(i);
  if (!p.ok || !p.kcal) return null;
  const fat = Math.round((p.kcal * 0.27) / 9);
  const carbs = Math.max(0, Math.round((p.kcal - p.proteinG * 4 - fat * 9) / 4));
  return { kcal: p.kcal, protein: p.proteinG, carbs, fat, fiber: p.fiberG };
}
