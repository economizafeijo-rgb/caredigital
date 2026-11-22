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
  const usedMeal = new Set<number>();
  const doneBy = new Map<number, number>(); // índice do horário -> hora da refeição registrada
  const slotMs = MEAL_SLOTS.map((slot) => at(day, slot.time));

  // Casa as refeições com os horários pela MENOR distância, e não pela ordem do dia. Assim um lanche
  // registrado perto das 15:30 cobre o "Lanche da tarde" e não é consumido pelo "Lanche da manhã".
  const pairs = (accepts: (m: LoggedMeal, slotIdx: number, dist: number) => boolean) => {
    const list: { si: number; mi: number; dist: number }[] = [];
    MEAL_SLOTS.forEach((_, si) =>
      meals.forEach((m, mi) => {
        if (usedMeal.has(mi) || doneBy.has(si)) return;
        const dist = Math.abs(m.t - slotMs[si]);
        if (accepts(m, si, dist)) list.push({ si, mi, dist });
      }),
    );
    list.sort((x, y) => x.dist - y.dist);
    for (const { si, mi } of list) {
      if (usedMeal.has(mi) || doneBy.has(si)) continue;
      usedMeal.add(mi);
      doneBy.set(si, meals[mi].t);
    }
  };
  // 1) Refeição do mesmo tipo (até 4 h do horário, inclusive adiantada ou atrasada).
  pairs((m, si, dist) => MEAL_SLOTS[si].kinds.includes(m.kind) && dist <= 240 * 60_000);
  // 2) Sem tipo definido (ou lanche): por até 2h30 de distância.
  pairs((m, _si, dist) => (!m.kind || m.kind === "lanche") && dist <= 150 * 60_000);

  return MEAL_SLOTS.map((slot, si) => ({
    ...slot,
    at: slotMs[si],
    doneAt: doneBy.get(si) ?? null,
  }));
}

/** Próxima refeição sugerida (a que ainda não foi registrada) e a última refeição de fato registrada. */
export function nextMealSuggestion(meals: LoggedMeal[], day: string, now: number) {
  const slots = mealSlotStatus(meals, day);
  const next = slots.find((s) => s.doneAt === null && s.at > now - 45 * 60_000) ?? null;
  const last = [...meals].sort((a, b) => a.t - b.t).at(-1) ?? null;
  return { next, last, slots };
}
