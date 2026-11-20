/**
 * Meta diária de líquidos e ritmo seguro de consumo.
 *
 * Fontes:
 * - EFSA (2010), Scientific Opinion on Dietary Reference Values for water: ingestão adequada de água
 *   total de 2,5 L (homens) e 2,0 L (mulheres) a partir de 14 anos; ~80% vem de bebidas (2,0 e 1,6 L).
 * - National Academies / IOM (2004), Dietary Reference Intakes for Water: 3,7 L e 2,7 L de água total,
 *   dos quais 3,0 L e 2,2 L de líquidos (19 a 30 anos). Vale para idosos também; quem treina ou vive no calor precisa de mais.
 * - ACSM (2007), Exercise and fluid replacement: perda de suor muito variável entre pessoas; repor para
 *   evitar perda de peso corporal acima de 2% e personalizar pelo peso antes e depois do treino.
 * - Capacidade de excreção renal: cerca de 0,8 a 1,0 L de água livre por hora (pico medido de ~780 mL/h em adultos saudáveis;
 *   Noakes et al., Bull World Health Organ 2001). Acima disso a água se acumula e pode causar hiponatremia.
 * É educativo; não vale para doença renal, insuficiência cardíaca, restrição de líquidos, diuréticos, gestação ou lactação.
 */
export type NeedSex = "male" | "female" | "unspecified";
export type SweatLevel = "low" | "normal" | "high";

const round50 = (value: number) => Math.round(value / 50) * 50;

/** Pico de excreção renal em adultos saudáveis: acima disso o corpo retém água. */
export const KIDNEY_MAX_ML_PER_HOUR = 800;
/** Ritmo contínuo confortável, com folga em relação ao limite renal. */
export const COMFORT_ML_PER_HOUR = 500;
/** Volume de uma ingestão única acima do qual vale fracionar. */
export const SINGLE_SIP_LIMIT_ML = 500;

/** Faixa de referência de LÍQUIDOS para beber (ml/dia): do mínimo da EFSA ao valor da IOM. */
export function fluidReferenceBand(sex: NeedSex): { min: number; max: number } {
  if (sex === "male") return { min: 2000, max: 3000 };
  if (sex === "female") return { min: 1600, max: 2200 };
  return { min: 1800, max: 2600 }; // sem sexo informado: média das duas faixas
}

/** Mililitros de suor repostos por hora de treino, por nível de transpiração (estimativa conservadora). */
export const SWEAT_ML_PER_HOUR: Record<SweatLevel, number> = { low: 350, normal: 500, high: 750 };
const ACTIVITY_CAP_ML = 1500;
const REVIEW_ABOVE_ML = 4000;

export type HydrationNeedInput = {
  sex: NeedSex;
  age: number;
  weightKg: number;
  activityMinutes: number;
  sweat: SweatLevel;
  fluidRestriction: boolean;
};
export type HydrationNeed = {
  /** 30 ml/kg limitado à faixa de referência por sexo. */
  base: number;
  weightBased: number;
  band: { min: number; max: number };
  activity: number;
  target: number;
  requiresReview: boolean;
  reviewReasons: string[];
  notes: string[];
};

export function hydrationNeed(input: HydrationNeedInput): HydrationNeed | null {
  const { sex, age, weightKg, activityMinutes, sweat, fluidRestriction } = input;
  if (![age, weightKg, activityMinutes].every(Number.isFinite)) return null;
  if (
    age < 18 ||
    age > 110 ||
    weightKg < 30 ||
    weightKg > 250 ||
    activityMinutes < 0 ||
    activityMinutes > 240
  )
    return null;
  const band = fluidReferenceBand(sex);
  const weightBased = weightKg * 30;
  const base = round50(Math.min(band.max, Math.max(band.min, weightBased)));
  const activity =
    activityMinutes === 0
      ? 0
      : round50(Math.min(ACTIVITY_CAP_ML, (activityMinutes / 60) * SWEAT_ML_PER_HOUR[sweat]));
  const target = base + activity;

  const reviewReasons: string[] = [];
  if (fluidRestriction) reviewReasons.push("restrição de líquidos ou orientação profissional");
  if (age >= 75) reviewReasons.push("idade a partir de 75 anos (rins e coração pedem avaliação)");
  if (target > REVIEW_ABOVE_ML) reviewReasons.push("meta acima de 4 litros por dia");

  const notes: string[] = [];
  if (weightBased < band.min)
    notes.push("Pelo peso o cálculo daria menos que o mínimo de referência; usamos o mínimo.");
  if (weightBased > band.max)
    notes.push(
      "Pelo peso o cálculo passaria da referência; limitamos ao valor da IOM. Mais que isso, só com orientação e suor intenso.",
    );
  if (age >= 65)
    notes.push(
      "Com a idade a sede diminui: beba em horários combinados, em pequenos volumes, sem esperar a sede.",
    );
  if (activity > 0)
    notes.push(
      "A reposição do treino é uma estimativa. Para saber a sua, pese-se antes e depois: cada 1 kg perdido pede cerca de 1,25 a 1,5 L (ACSM).",
    );
  return {
    base,
    weightBased: round50(weightBased),
    band,
    activity,
    target,
    requiresReview: reviewReasons.length > 0,
    reviewReasons,
    notes,
  };
}

/** Soma o que foi bebido na última hora (ml). `records` usa o instante em ms. */
export function lastHourIntakeMl(records: { at: number; ml: number }[], now: number): number {
  return records
    .filter((r) => r.at <= now && now - r.at < 3_600_000)
    .reduce((sum, r) => sum + (Number.isFinite(r.ml) ? r.ml : 0), 0);
}

export type IntakeCheck = { level: "ok" | "attention" | "excess"; message: string | null };

/**
 * Avalia um consumo em relação ao que os rins eliminam: acima de ~0,8 L na mesma hora o corpo começa a acumular água.
 * `lastHourMl` é o que já foi bebido na hora anterior; `amountMl` é o que se registra agora.
 */
export function checkIntake(amountMl: number, lastHourMl = 0): IntakeCheck {
  const total = Math.max(0, amountMl) + Math.max(0, lastHourMl);
  if (total > 1000)
    return {
      level: "excess",
      message: `São cerca de ${Math.round(total).toLocaleString("pt-BR")} ml em uma hora, acima do que os rins eliminam (0,8 a 1 L por hora). Espace os próximos goles; se houver enjoo, dor de cabeça forte ou confusão, procure atendimento.`,
    };
  if (total > KIDNEY_MAX_ML_PER_HOUR || amountMl > SINGLE_SIP_LIMIT_ML)
    return {
      level: "attention",
      message:
        "Volume alto de uma vez. Os rins eliminam cerca de 0,8 a 1 L por hora; prefira 200 a 300 ml por vez, com intervalo entre os copos.",
    };
  return { level: "ok", message: null };
}
