/** Medidas do corpo: pontos de medida, faixas válidas e indicadores derivados. */
export type MeasureKey = "neck" | "shoulders" | "chest" | "waist" | "abdomen" | "hip" | "arm_r" | "arm_l" | "forearm" | "thigh_r" | "thigh_l" | "calf";

export const MEASURES: { key: MeasureKey; label: string; group: "Tronco" | "Braços" | "Pernas"; min: number; max: number; how: string; lowerIsBetter: boolean }[] = [
  { key: "neck", label: "Pescoço", group: "Tronco", min: 20, max: 80, how: "Fita logo abaixo do pomo de Adão, sem apertar.", lowerIsBetter: false },
  { key: "shoulders", label: "Ombros", group: "Tronco", min: 60, max: 200, how: "Volta completa na parte mais larga dos ombros, braços relaxados.", lowerIsBetter: false },
  { key: "chest", label: "Peitoral", group: "Tronco", min: 50, max: 200, how: "Na linha dos mamilos, ao fim de uma expiração normal.", lowerIsBetter: false },
  { key: "waist", label: "Cintura", group: "Tronco", min: 40, max: 200, how: "Na parte mais fina do tronco, entre a última costela e o umbigo.", lowerIsBetter: true },
  { key: "abdomen", label: "Abdômen", group: "Tronco", min: 40, max: 220, how: "Na altura do umbigo, abdômen relaxado.", lowerIsBetter: true },
  { key: "hip", label: "Quadril", group: "Tronco", min: 50, max: 220, how: "Na parte mais saliente dos glúteos, pés juntos.", lowerIsBetter: true },
  { key: "arm_r", label: "Braço direito", group: "Braços", min: 15, max: 70, how: "No meio do braço, entre ombro e cotovelo, relaxado.", lowerIsBetter: false },
  { key: "arm_l", label: "Braço esquerdo", group: "Braços", min: 15, max: 70, how: "No meio do braço, entre ombro e cotovelo, relaxado.", lowerIsBetter: false },
  { key: "forearm", label: "Antebraço", group: "Braços", min: 15, max: 50, how: "Na parte mais larga, logo abaixo do cotovelo.", lowerIsBetter: false },
  { key: "thigh_r", label: "Coxa direita", group: "Pernas", min: 30, max: 110, how: "No meio da coxa, entre virilha e joelho, em pé.", lowerIsBetter: false },
  { key: "thigh_l", label: "Coxa esquerda", group: "Pernas", min: 30, max: 110, how: "No meio da coxa, entre virilha e joelho, em pé.", lowerIsBetter: false },
  { key: "calf", label: "Panturrilha", group: "Pernas", min: 20, max: 70, how: "Na parte mais larga da panturrilha, em pé.", lowerIsBetter: false },
];

/** Relação cintura-quadril (OMS: risco acima de 0,90 em homens e 0,85 em mulheres). */
export function waistHip(waist?: number | null, hip?: number | null, sex?: string | null) {
  if (!waist || !hip) return null;
  const v = waist / hip;
  const limit = sex === "female" ? 0.85 : 0.9;
  return { value: Math.round(v * 100) / 100, limit, risk: v > limit };
}

/** Relação cintura-altura (risco acima de 0,5). */
export function waistHeight(waist?: number | null, heightCm?: number | null) {
  if (!waist || !heightCm) return null;
  const v = waist / heightCm;
  return { value: Math.round(v * 100) / 100, risk: v > 0.5 };
}

/** Gordura corporal estimada pelo método da Marinha dos EUA (medidas em cm). */
export function navyBodyFat(sex?: string | null, heightCm?: number | null, neck?: number | null, waist?: number | null, hip?: number | null) {
  if (!heightCm || !neck || !waist) return null;
  let v: number;
  if (sex === "female") {
    if (!hip || waist + hip - neck <= 0) return null;
    v = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(heightCm)) - 450;
  } else {
    if (waist - neck <= 0) return null;
    v = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(heightCm)) - 450;
  }
  if (!Number.isFinite(v) || v < 2 || v > 70) return null;
  return Math.round(v * 10) / 10;
}
