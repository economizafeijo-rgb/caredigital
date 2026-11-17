import type { BeverageKind } from "./care-intake-categories";

/** Valores aproximados por 100 ml, usados quando o nome digitado não tem um alimento conhecido. São estimativas por tipo. */
export const beverageNutrientsPer100ml: Record<BeverageKind, { kcal: number; protein: number; carbs: number; fat: number }> = {
  agua: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  cha: { kcal: 1, protein: 0, carbs: 0.2, fat: 0 },
  suco: { kcal: 45, protein: 0.5, carbs: 11, fat: 0.1 },
  cafe: { kcal: 1, protein: 0.1, carbs: 0, fat: 0 },
  energetico: { kcal: 45, protein: 0, carbs: 11, fat: 0 },
  suplemento: { kcal: 80, protein: 6, carbs: 8, fat: 2 },
  shake: { kcal: 90, protein: 8, carbs: 10, fat: 2.5 },
  isotonico: { kcal: 25, protein: 0, carbs: 6, fat: 0 },
  vitamina: { kcal: 70, protein: 2, carbs: 14, fat: 1.5 },
  leite: { kcal: 60, protein: 3.2, carbs: 4.8, fat: 3.3 },
  agua_coco: { kcal: 19, protein: 0.7, carbs: 3.7, fat: 0.2 },
  refrigerante: { kcal: 40, protein: 0, carbs: 10.5, fat: 0 },
  outra: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
};

export function beverageNutrients(kind: BeverageKind, ml: number) {
  const per = beverageNutrientsPer100ml[kind] ?? beverageNutrientsPer100ml.outra;
  const f = ml / 100;
  return { kcal: Math.round(per.kcal * f), protein: Math.round(per.protein * f * 10) / 10, carbs: Math.round(per.carbs * f * 10) / 10, fat: Math.round(per.fat * f * 10) / 10 };
}
