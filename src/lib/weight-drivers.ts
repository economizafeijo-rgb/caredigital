import type { DayMetrics } from "./day-metrics";

/**
 * Compara as duas últimas quinzenas para sugerir o que pode ter mexido no peso.
 * São associações dos próprios registros, não causa comprovada.
 * Referências: ~7.700 kcal por kg de gordura; carboidrato e sódio retêm água (variação de curto prazo).
 */

export type Habit = {
  key: string;
  label: string;
  unit: string;
  before: number | null;
  after: number | null;
  /** +1: subir tende a aumentar o peso; -1: subir tende a reduzir. */
  weightEffect: 1 | -1;
  decimals?: number;
};

export type Driver = { tone: "up" | "down" | "info"; text: string };

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const re = {
  alcohol: /cerveja|vinho|cacha[cç]a|whisky|vodka|caipirinha|drink|chopp/i,
  sugary: /refrigerante|coca|guaran[aá]|fanta|suco artificial|energ[eé]tico|ch[aá] gelado/i,
  fastfood:
    /pizza|hamb[uú]rguer|batata frita|frit[oa]|salgado|coxinha|pastel|nugget|lanche|cachorro.quente/i,
  sweets: /bolo|chocolate|doce|sorvete|brigadeiro|biscoito recheado|pudim|torta/i,
};

function windowStats(days: DayMetrics[]) {
  const fed = days.filter((d) => d.foods.length > 0);
  const per = (rx: RegExp) =>
    fed.length
      ? fed.reduce((s, d) => s + d.foods.filter((f) => rx.test(f.label)).length, 0) / fed.length
      : null;
  const late = fed.length
    ? fed.filter((d) =>
        d.foods.some((f) => {
          const h = new Date(Date.parse(f.at) - 5 * 3_600_000).getUTCHours();
          return h >= 21 || h < 4;
        }),
      ).length / fed.length
    : null;
  const sleeps = days.map((d) => d.sleep?.hours).filter((h): h is number => !!h && h > 0);
  const water = days.filter((d) => d.waterMl > 0).map((d) => d.waterMl);
  return {
    loggedDays: fed.length,
    kcal: mean(fed.map((d) => d.kcal)),
    carbs: mean(fed.map((d) => d.carbs)),
    protein: mean(fed.map((d) => d.protein)),
    water: mean(water),
    sleep: mean(sleeps),
    activity: days.length
      ? days.reduce((s, d) => s + d.activityMinutes, 0) / (days.length / 7)
      : null,
    alcohol: per(re.alcohol),
    sugary: per(re.sugary),
    fastfood: per(re.fastfood),
    sweets: per(re.sweets),
    late: late === null ? null : late * 100,
  };
}

export type WeightDrivers = {
  change: number | null;
  fromKg: number | null;
  toKg: number | null;
  fromDay: string | null;
  toDay: string | null;
  loggedDays: number;
  habits: Habit[];
  drivers: Driver[];
  balance: { avgKcal: number; target: number; kgPerWeek: number } | null;
};

/** `days` em ordem cronológica, cobrindo ~28 dias; `weights` são as pesagens do período. */
export function analyzeWeight(
  days: DayMetrics[],
  weights: { day: string; kg: number }[],
  kcalTarget: number | null,
): WeightDrivers {
  const half = Math.floor(days.length / 2);
  const before = windowStats(days.slice(0, half));
  const after = windowStats(days.slice(half));
  const sorted = [...weights].sort((a, b) => a.day.localeCompare(b.day));
  const first = sorted[0] ?? null;
  const last = sorted.at(-1) ?? null;
  const change = first && last && first !== last ? last.kg - first.kg : null;

  const habits: Habit[] = [
    {
      key: "kcal",
      label: "Calorias por dia",
      unit: "kcal",
      before: before.kcal,
      after: after.kcal,
      weightEffect: 1,
    },
    {
      key: "carbs",
      label: "Carboidratos por dia",
      unit: "g",
      before: before.carbs,
      after: after.carbs,
      weightEffect: 1,
    },
    {
      key: "protein",
      label: "Proteína por dia",
      unit: "g",
      before: before.protein,
      after: after.protein,
      weightEffect: -1,
    },
    {
      key: "fastfood",
      label: "Frituras, pizza e lanches",
      unit: "por dia",
      before: before.fastfood,
      after: after.fastfood,
      weightEffect: 1,
      decimals: 1,
    },
    {
      key: "sweets",
      label: "Doces",
      unit: "por dia",
      before: before.sweets,
      after: after.sweets,
      weightEffect: 1,
      decimals: 1,
    },
    {
      key: "sugary",
      label: "Bebidas açucaradas",
      unit: "por dia",
      before: before.sugary,
      after: after.sugary,
      weightEffect: 1,
      decimals: 1,
    },
    {
      key: "alcohol",
      label: "Bebidas alcoólicas",
      unit: "por dia",
      before: before.alcohol,
      after: after.alcohol,
      weightEffect: 1,
      decimals: 1,
    },
    {
      key: "late",
      label: "Dias comendo após 21h",
      unit: "%",
      before: before.late,
      after: after.late,
      weightEffect: 1,
    },
    {
      key: "water",
      label: "Água por dia",
      unit: "ml",
      before: before.water,
      after: after.water,
      weightEffect: -1,
    },
    {
      key: "sleep",
      label: "Sono por noite",
      unit: "h",
      before: before.sleep,
      after: after.sleep,
      weightEffect: -1,
      decimals: 1,
    },
    {
      key: "activity",
      label: "Atividade por semana",
      unit: "min",
      before: before.activity,
      after: after.activity,
      weightEffect: -1,
    },
  ];

  const drivers: Driver[] = [];
  const rel = (h: Habit) =>
    h.before !== null && h.after !== null && h.before > 0 ? (h.after - h.before) / h.before : null;
  for (const h of habits) {
    const r = rel(h);
    const diff = h.before !== null && h.after !== null ? h.after - h.before : null;
    if (r === null || diff === null) continue;
    const big = h.unit === "por dia" ? Math.abs(diff) >= 0.3 : Math.abs(r) >= 0.15;
    if (!big) continue;
    const pushesUp = Math.sign(diff) === h.weightEffect;
    const dir = diff > 0 ? "subiu" : "caiu";
    const pct = h.unit === "por dia" ? "" : ` (${diff > 0 ? "+" : ""}${Math.round(r * 100)}%)`;
    drivers.push({
      tone: pushesUp ? "up" : "down",
      text: `${h.label} ${dir} na última quinzena${pct} — isso tende a ${pushesUp ? "favorecer ganho" : "ajudar a perder"} peso.`,
    });
  }
  if (after.sleep !== null && after.sleep < 6.5)
    drivers.push({
      tone: "up",
      text: "Sono abaixo de 6,5 h aumenta a fome e a vontade de doces no dia seguinte.",
    });
  if (after.carbs !== null && before.carbs !== null && after.carbs - before.carbs > 60)
    drivers.push({
      tone: "info",
      text: "Mais carboidrato e sal retêm água: parte da variação de 0,5 a 1,5 kg em poucos dias é líquido, não gordura.",
    });

  let balance: WeightDrivers["balance"] = null;
  if (kcalTarget && after.kcal !== null && after.loggedDays >= 5) {
    const diff = after.kcal - kcalTarget;
    balance = { avgKcal: after.kcal, target: kcalTarget, kgPerWeek: (diff * 7) / 7700 };
  }
  if (after.loggedDays < 7)
    drivers.push({
      tone: "info",
      text: `Só ${after.loggedDays} dias com refeições registradas na última quinzena: registre mais dias para uma leitura confiável.`,
    });

  return {
    change,
    fromKg: first?.kg ?? null,
    toKg: last?.kg ?? null,
    fromDay: first?.day ?? null,
    toDay: last?.day ?? null,
    loggedDays: after.loggedDays,
    habits,
    drivers: drivers.slice(0, 6),
    balance,
  };
}
