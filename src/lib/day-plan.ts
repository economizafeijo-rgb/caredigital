import { estimateNextHydration } from "./hydration-goal";
import { WATER_LAST_RECOMMENDED_HOUR } from "./nutrition-science";

/** Regras do dia usadas por TODAS as telas (Meu dia, Visão geral, Hidratação, Modo ao vivo), para os horários nunca divergirem. */

const at = (day: string, hhmm: string) => Date.parse(`${day}T${hhmm}:00-05:00`);

/** Horário ideal para concluir a água (3 h antes de dormir), o mesmo da área de Hidratação. */
export const waterCutoff = (day: string) =>
  at(day, `${String(WATER_LAST_RECOMMENDED_HOUR).padStart(2, "0")}:00`);

export type Drink = { t: number; ml: number };

/** Próximo copo: usa todos os líquidos do dia (água e bebidas), o último registro e o ritmo da última hora. */
export function nextWaterPlan(input: {
  targetMl: number;
  drinks: Drink[];
  now: number;
  day: string;
}) {
  const { targetMl, now, day } = input;
  if (!(targetMl > 0)) return null;
  const drinks = [...input.drinks].sort((a, b) => a.t - b.t);
  const drank = drinks.reduce((sum, d) => sum + d.ml, 0);
  const last = drinks.at(-1) ?? null;
  return estimateNextHydration({
    remainingMl: Math.max(0, targetMl - drank),
    lastIntakeAt: last?.t ?? null,
    lastAmountMl: last?.ml ?? 0,
    now,
    cutoff: waterCutoff(day),
    recent: drinks.map((d) => ({ at: d.t, ml: d.ml })),
  });
}

/** Horários típicos das refeições (sugestões: só viram obrigação se o usuário programar). */
export const MEAL_SLOTS: { time: string; label: string; kinds: string[] }[] = [
  { time: "07:00", label: "Café da manhã", kinds: ["cafe_manha"] },
  { time: "10:00", label: "Lanche da manhã", kinds: ["lanche"] },
  { time: "12:30", label: "Almoço", kinds: ["almoco"] },
  { time: "15:30", label: "Lanche da tarde", kinds: ["lanche"] },
  { time: "19:00", label: "Jantar", kinds: ["jantar"] },
];

/** Descobre o tipo da refeição pelo que foi gravado: o campo "tipo" e, se faltar, o título ou a descrição. */
export const mealKindOf = (...parts: unknown[]): string => {
  const n = parts
    .map((x) => String(x ?? ""))
    .join(" ")
    .toLowerCase();
  return /caf[eé]\s*(da)?\s*manh|desjejum/.test(n)
    ? "cafe_manha"
    : /almo/.test(n)
      ? "almoco"
      : /jant/.test(n)
        ? "jantar"
        : /lanch|colaç|colac|ceia/.test(n)
          ? "lanche"
          : "";
};

export type LoggedMeal = { t: number; kind: string };

/**
 * Quais horários típicos já foram cobertos por refeições realmente registradas
 * (pelo tipo escolhido ou, sem tipo, por até 2h30 de distância).
 */
export function mealSlotStatus(meals: LoggedMeal[], day: string) {
  const used = new Set<number>();
  const byKind = new Map<string, number>();
  for (const slot of MEAL_SLOTS) {
    const ms = at(day, slot.time);
    const hit = meals
      .map((m, i) => ({ m, i }))
      .filter(({ m, i }) => !used.has(i) && slot.kinds.includes(m.kind))
      .sort((a, b) => Math.abs(a.m.t - ms) - Math.abs(b.m.t - ms))[0];
    if (hit) {
      used.add(hit.i);
      byKind.set(slot.time, hit.m.t);
    }
  }
  return MEAL_SLOTS.map((slot) => {
    const ms = at(day, slot.time);
    let doneAt = byKind.get(slot.time) ?? null;
    if (doneAt === null) {
      const near = meals
        .map((m, i) => ({ m, i }))
        .filter(
          ({ m, i }) =>
            !used.has(i) && (!m.kind || m.kind === "lanche") && Math.abs(m.t - ms) <= 150 * 60_000,
        )
        .sort((a, b) => Math.abs(a.m.t - ms) - Math.abs(b.m.t - ms))[0];
      if (near) {
        used.add(near.i);
        doneAt = near.m.t;
      }
    }
    return { ...slot, at: ms, doneAt };
  });
}

/** Próxima refeição sugerida (a que ainda não foi registrada) e a última refeição de fato registrada. */
export function nextMealSuggestion(meals: LoggedMeal[], day: string, now: number) {
  const slots = mealSlotStatus(meals, day);
  const next = slots.find((s) => s.doneAt === null && s.at > now - 45 * 60_000) ?? null;
  const last = [...meals].sort((a, b) => a.t - b.t).at(-1) ?? null;
  return { next, last, slots };
}
