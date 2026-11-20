/**
 * Regras de hidratação, proteína e peso baseadas em referências científicas.
 * Valores de referência para população saudável; não substituem avaliação profissional
 * (gestantes, doenças renais ou cardíacas, restrição de líquidos e atletas de alto rendimento têm necessidades próprias).
 */

export type SexRef = "male" | "female" | "intersex" | "unspecified" | null | undefined;
const sexKey = (sex: SexRef) => (sex === "male" || sex === "female" ? sex : null);
const round = (value: number, step: number) => Math.round(value / step) * step;

/* ------------------------------- HIDRATAÇÃO ------------------------------- */

/**
 * Ingestão adequada (AI) de água TOTAL, em bebidas + alimentos, ml/dia.
 * Fonte: EFSA Scientific Opinion on Dietary Reference Values for water (2010):
 * homens adultos 2,5 L; mulheres adultas 2,0 L; meninos de 9 a 13 anos 2,1 L; meninas 1,9 L;
 * 4 a 8 anos 1,6 L; 2 a 3 anos 1,3 L; 1 ano 1,1 a 1,2 L. Gestação +300 ml; lactação +700 ml.
 */
export function totalWaterReferenceMl(
  sex: SexRef,
  ageYears: number | null,
  situation?: "pregnant" | "lactating" | null,
): number | null {
  if (ageYears === null || !Number.isFinite(ageYears) || ageYears < 1) return null; // lactentes: orientação pediátrica
  const s = sexKey(sex);
  let base: number | null;
  if (ageYears < 2) base = 1150;
  else if (ageYears < 4) base = 1300;
  else if (ageYears < 9) base = 1600;
  else if (!s) base = null;
  else if (ageYears < 14) base = s === "male" ? 2100 : 1900;
  else base = s === "male" ? 2500 : 2000;
  if (base === null) return null;
  return base + (situation === "pregnant" ? 300 : situation === "lactating" ? 700 : 0);
}

/** Cerca de 20% da água total vem dos alimentos; o restante deve vir de líquidos, de preferência água (EFSA 2010). */
export const WATER_FROM_FLUIDS_SHARE = 0.8;

/** Meta de LÍQUIDOS para beber no dia (ml), arredondada a 50 ml. */
export function fluidTargetMl(
  sex: SexRef,
  ageYears: number | null,
  situation?: "pregnant" | "lactating" | null,
): number | null {
  const total = totalWaterReferenceMl(sex, ageYears, situation);
  return total === null ? null : round(total * WATER_FROM_FLUIDS_SHARE, 50);
}

/**
 * Horário-limite RECOMENDADO para a última ingestão grande de líquidos.
 * Não existe um horário de relógio universal: a evidência é beber ao longo do dia e reduzir líquidos
 * de 2 a 4 horas antes de dormir (Urology Care Foundation; RACGP: 3 h; StatPearls/NIH: 2 h) para evitar noctúria.
 * Usa o ponto médio (3 h antes de deitar). Sem horário de dormir conhecido, assume 23h, ou seja, 20h.
 */
export const WATER_DEFAULT_BEDTIME_HOUR = 23;
export const WATER_HOURS_BEFORE_BED = 3;
export const WATER_LAST_RECOMMENDED_HOUR = WATER_DEFAULT_BEDTIME_HOUR - WATER_HOURS_BEFORE_BED;
export function lastRecommendedDrinkHour(bedtimeHour: number | null = null): number {
  const bed =
    bedtimeHour === null || !Number.isFinite(bedtimeHour)
      ? WATER_DEFAULT_BEDTIME_HOUR
      : bedtimeHour;
  const adjusted = bed < 6 ? bed + 24 : bed; // deitar de madrugada conta como o fim da noite
  return Math.min(23, Math.max(12, Math.round(adjusted - WATER_HOURS_BEFORE_BED)));
}

/* -------------------------------- PROTEÍNA -------------------------------- */

export type ProteinTarget = {
  grams: number;
  perKg: number;
  minPerKg: number;
  maxPerKg: number;
  /** Peso usado no cálculo: o real, ou o ajustado quando o IMC é ≥ 30. */
  basisKg: number;
  adjusted: boolean;
  note: string;
};

/** Peso ideal de Devine (kg): 50 (H) ou 45,5 (M) + 0,91 kg por cm acima de 152,4 cm. */
export function idealWeightKg(sex: SexRef, heightCm: number): number | null {
  const s = sexKey(sex);
  if (!s || heightCm < 100 || heightCm > 230) return null;
  return (s === "male" ? 50 : 45.5) + 0.9065 * Math.max(0, heightCm - 152.4);
}

/**
 * Meta de proteína por dia.
 *  - Adultos: RDA 0,8 g/kg (IOM); quem treina 1,4 a 2,0 g/kg e em déficit calórico 1,2 a 2,4 g/kg para preservar massa magra (ISSN 2017).
 *  - Idosos (65+): 1,0 a 1,2 g/kg ou mais (consenso PROT-AGE; NIA/ACL).
 *  - Crianças e adolescentes: DRI por idade (IOM 2005): 1-3 anos 1,05 g/kg; 4-13 anos 0,95 g/kg; 14-18 anos 0,85 g/kg.
 *  - IMC ≥ 30: usa peso ajustado (ideal + 25% do excesso), prática clínica comum, para não superestimar.
 */
export function proteinTarget(input: {
  ageYears: number | null;
  sex: SexRef;
  weightKg: number | null;
  heightCm: number | null;
  objective: string | null;
}): ProteinTarget | null {
  const { ageYears, sex, weightKg, heightCm, objective } = input;
  if (weightKg === null || !Number.isFinite(weightKg) || weightKg < 8 || weightKg > 300)
    return null;
  const age = ageYears !== null && Number.isFinite(ageYears) ? ageYears : 30;
  let perKg: number;
  let min: number;
  let max: number;
  let note: string;
  if (age < 1) return null;
  if (age < 18) {
    perKg = age < 4 ? 1.05 : age < 14 ? 0.95 : 0.85;
    min = perKg;
    max = Math.round(perKg * 1.3 * 100) / 100;
    note =
      "Crianças e adolescentes: referência por idade (DRI). Objetivos de peso devem ser acompanhados por pediatra.";
  } else if (age >= 65) {
    perKg = objective === "hipertrofia" ? 1.5 : objective === "ganho_peso" ? 1.3 : 1.2;
    min = 1.0;
    max = 1.5;
    note =
      "Acima de 65 anos o consenso recomenda 1,0 a 1,2 g/kg ou mais para preservar a massa muscular.";
  } else if (objective === "hipertrofia") {
    perKg = 1.6;
    min = 1.4;
    max = 2.0;
    note = "Ganho de massa com treino de força: 1,4 a 2,0 g/kg (ISSN).";
  } else if (objective === "emagrecimento") {
    perKg = 1.4;
    min = 1.2;
    max = 1.6;
    note =
      "Em déficit calórico, mais proteína ajuda a preservar a massa magra (1,2 a 1,6 g/kg; até 2,4 g/kg com treino intenso, ISSN).";
  } else if (objective === "ganho_peso") {
    perKg = 1.4;
    min = 1.2;
    max = 1.6;
    note = "Para ganhar peso com qualidade: 1,2 a 1,6 g/kg, com treino de força.";
  } else {
    perKg = 1.0;
    min = 0.8;
    max = 1.2;
    note = "Manutenção: o mínimo (RDA) é 0,8 g/kg; 1,0 g/kg cobre quem é ativo.";
  }

  const bmi = heightCm && heightCm >= 100 ? weightKg / (heightCm / 100) ** 2 : null;
  const ideal = heightCm ? idealWeightKg(sex, heightCm) : null;
  const adjusted = age >= 18 && bmi !== null && bmi >= 30 && ideal !== null;
  const basisKg = adjusted ? ideal! + 0.25 * (weightKg - ideal!) : weightKg;
  const grams = Math.min(Math.round(perKg * basisKg), Math.round(2.2 * weightKg));
  return {
    grams,
    perKg,
    minPerKg: min,
    maxPerKg: max,
    basisKg: Math.round(basisKg * 10) / 10,
    adjusted,
    note: adjusted ? `${note} Calculado sobre o peso ajustado (IMC ≥ 30).` : note,
  };
}

/* ---------------------------------- PESO ---------------------------------- */

export type WeightGuidance = {
  bmi: number | null;
  /** Falso para menores de 18 anos: o IMC adulto não se aplica. */
  adultBmi: boolean;
  healthyRangeKg: [number, number] | null;
  pace: "ok" | "fast_loss" | "fast_gain" | null;
  message: string;
};

/**
 * IMC adulto (OMS: 18,5 a 24,9 = faixa adequada) só vale a partir de 18 anos; em crianças e adolescentes usa-se
 * percentil de IMC por idade e sexo. Ritmo usual de perda: cerca de 0,5 a 1 kg por semana (até ~1% do peso); acima disso
 * aumenta a perda de massa magra. Ganho de massa: até ~0,5% do peso por semana.
 */
export function weightGuidance(input: {
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
  trendKgPerWeek?: number | null;
}): WeightGuidance {
  const { ageYears, heightCm, weightKg, trendKgPerWeek } = input;
  const valid =
    heightCm !== null &&
    heightCm >= 100 &&
    heightCm <= 230 &&
    weightKg !== null &&
    weightKg >= 8 &&
    weightKg <= 400;
  const bmi = valid ? Number((weightKg! / (heightCm! / 100) ** 2).toFixed(1)) : null;
  const adultBmi = ageYears === null || ageYears >= 18;
  const healthyRangeKg: [number, number] | null =
    valid && adultBmi
      ? [
          Math.round(18.5 * (heightCm! / 100) ** 2 * 10) / 10,
          Math.round(24.9 * (heightCm! / 100) ** 2 * 10) / 10,
        ]
      : null;
  let pace: WeightGuidance["pace"] = null;
  if (
    valid &&
    trendKgPerWeek !== null &&
    trendKgPerWeek !== undefined &&
    Number.isFinite(trendKgPerWeek)
  ) {
    const pct = (trendKgPerWeek / weightKg!) * 100;
    pace = pct < -1 ? "fast_loss" : pct > 0.5 ? "fast_gain" : "ok";
  }
  const message = !adultBmi
    ? "Em crianças e adolescentes o IMC é avaliado por percentil de idade e sexo (curvas da OMS); converse com o pediatra."
    : pace === "fast_loss"
      ? "Perda acima de ~1% do peso por semana: ritmos maiores aumentam a perda de massa magra. O usual é 0,5 a 1 kg por semana."
      : pace === "fast_gain"
        ? "Ganho acima de ~0,5% do peso por semana tende a acumular mais gordura do que massa muscular."
        : ageYears !== null && ageYears >= 65
          ? "Acima de 65 anos faixas de IMC um pouco mais altas costumam ser aceitas; avalie com um profissional."
          : "Referência da OMS para adultos: IMC de 18,5 a 24,9.";
  return { bmi, adultBmi, healthyRangeKg, pace, message };
}
