export type SexForReference = "female" | "male" | "intersex" | "unspecified";

export type BodyMetrics = {
  bmi: number | null;
  bmiLabel: string | null;
  waterReferenceMl: number | null;
  waterNote: string;
};

export function calculateBodyMetrics(input: {
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
  sex: SexForReference;
}): BodyMetrics {
  const { ageYears, heightCm, weightKg, sex } = input;
  const validAdult = ageYears !== null && ageYears >= 20;
  const validMeasure = heightCm !== null && heightCm >= 80 && heightCm <= 250 && weightKg !== null && weightKg >= 20 && weightKg <= 400;
  const bmi = validMeasure ? Number((weightKg / ((heightCm / 100) ** 2)).toFixed(1)) : null;
  const bmiLabel = bmi === null || !validAdult ? null
    : bmi < 18.5 ? "Abaixo da faixa de referência"
      : bmi < 25 ? "Faixa de referência"
        : bmi < 30 ? "Acima da faixa de referência"
          : "Faixa elevada — avaliar com profissional";

  const waterReferenceMl = validAdult && sex === "female" ? 2700
    : validAdult && sex === "male" ? 3700
      : null;

  return {
    bmi,
    bmiLabel,
    waterReferenceMl,
    waterNote: waterReferenceMl === null
      ? "Defina a meta de hidratação individualmente com um profissional."
      : "Referência populacional de água total (alimentos e bebidas), não uma prescrição de água pura. Ajuste com o profissional; objetivo físico, peso e IMC não determinam sozinhos a necessidade.",
  };
}

export const clientGoals = [
  { value: "maintenance", label: "Condicionamento e manutenção" },
  { value: "hypertrophy", label: "Hipertrofia / ganho de massa" },
  { value: "weight_loss", label: "Emagrecimento" },
  { value: "weight_gain", label: "Aumento de peso" },
  { value: "digestive_support", label: "Acompanhamento digestivo" },
] as const;

export const clientTypes = [
  { value: "patient", label: "Paciente / cuidado clínico" },
  { value: "fitness", label: "Cliente de academia / treino" },
] as const;

