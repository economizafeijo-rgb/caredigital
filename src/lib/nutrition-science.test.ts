import { describe, expect, it } from "vitest";
import {
  fluidTargetMl,
  lastRecommendedDrinkHour,
  proteinTarget,
  totalWaterReferenceMl,
  weightGuidance,
  WATER_LAST_RECOMMENDED_HOUR,
} from "./nutrition-science";

describe("água (EFSA 2010)", () => {
  it("usa a ingestão adequada de água total por sexo e idade", () => {
    expect(totalWaterReferenceMl("male", 30)).toBe(2500);
    expect(totalWaterReferenceMl("female", 30)).toBe(2000);
    expect(totalWaterReferenceMl("male", 11)).toBe(2100);
    expect(totalWaterReferenceMl("female", 11)).toBe(1900);
    expect(totalWaterReferenceMl("female", 6)).toBe(1600);
    expect(totalWaterReferenceMl("male", 3)).toBe(1300);
    expect(totalWaterReferenceMl("female", 30, "pregnant")).toBe(2300);
    expect(totalWaterReferenceMl("female", 30, "lactating")).toBe(2700);
  });
  it("a meta para beber é 80% da água total, pois ~20% vem dos alimentos", () => {
    expect(fluidTargetMl("male", 30)).toBe(2000);
    expect(fluidTargetMl("female", 30)).toBe(1600);
    expect(fluidTargetMl("female", 11)).toBe(1500);
    expect(fluidTargetMl("female", 6)).toBe(1300);
  });
  it("não inventa meta sem os dados necessários", () => {
    expect(fluidTargetMl(null, 30)).toBeNull();
    expect(fluidTargetMl("unspecified", 30)).toBeNull();
    expect(fluidTargetMl("male", null)).toBeNull();
    expect(fluidTargetMl("male", 0.5)).toBeNull();
    expect(fluidTargetMl("unspecified", 6)).toBe(1300); // até 8 anos a referência é a mesma para os dois sexos
  });
  it("recomenda parar líquidos em volume 3 h antes de dormir (padrão 20h)", () => {
    expect(WATER_LAST_RECOMMENDED_HOUR).toBe(20);
    expect(lastRecommendedDrinkHour()).toBe(20);
    expect(lastRecommendedDrinkHour(22)).toBe(19);
    expect(lastRecommendedDrinkHour(1)).toBe(22); // dorme à 1h: até 22h
    expect(lastRecommendedDrinkHour(5)).toBe(23); // limite de 23h
  });
});

describe("proteína por peso, idade e objetivo", () => {
  const base = { ageYears: 30, sex: "female" as const, weightKg: 70, heightCm: 165 };
  it("segue o objetivo com faixas da literatura", () => {
    expect(proteinTarget({ ...base, objective: "equilibrio" })).toMatchObject({
      perKg: 1.0,
      grams: 70,
      minPerKg: 0.8,
    });
    expect(proteinTarget({ ...base, objective: "emagrecimento" })).toMatchObject({
      perKg: 1.4,
      grams: 98,
    });
    expect(proteinTarget({ ...base, objective: "hipertrofia" })).toMatchObject({
      perKg: 1.6,
      grams: 112,
      maxPerKg: 2.0,
    });
  });
  it("idosos pedem mais proteína por kg", () => {
    expect(proteinTarget({ ...base, ageYears: 70, objective: "equilibrio" })!.perKg).toBe(1.2);
  });
  it("crianças usam a DRI por idade, sem objetivo de ganho", () => {
    const child = proteinTarget({
      ageYears: 6,
      sex: "male",
      weightKg: 20,
      heightCm: 115,
      objective: "hipertrofia",
    })!;
    expect(child.perKg).toBe(0.95);
    expect(child.grams).toBe(19);
    expect(
      proteinTarget({ ageYears: 16, sex: "male", weightKg: 60, heightCm: 172, objective: null })!
        .perKg,
    ).toBe(0.85);
  });
  it("com IMC ≥ 30 usa o peso ajustado e nunca passa de 2,2 g/kg", () => {
    const obese = proteinTarget({
      ageYears: 40,
      sex: "male",
      weightKg: 130,
      heightCm: 175,
      objective: "hipertrofia",
    })!;
    expect(obese.adjusted).toBe(true);
    expect(obese.basisKg).toBeLessThan(130);
    expect(obese.grams).toBeLessThan(Math.round(1.6 * 130));
  });
  it("não calcula sem peso válido", () => {
    expect(proteinTarget({ ...base, weightKg: null, objective: null })).toBeNull();
    expect(proteinTarget({ ...base, weightKg: 5, objective: null })).toBeNull();
  });
});

describe("orientação de peso", () => {
  it("adultos recebem a faixa de peso do IMC 18,5 a 24,9", () => {
    const result = weightGuidance({ ageYears: 35, heightCm: 170, weightKg: 80 });
    expect(result.bmi).toBe(27.7);
    expect(result.healthyRangeKg).toEqual([53.5, 72]);
    expect(result.adultBmi).toBe(true);
  });
  it("crianças e adolescentes não são classificados pelo IMC adulto", () => {
    const result = weightGuidance({ ageYears: 12, heightCm: 150, weightKg: 45 });
    expect(result.adultBmi).toBe(false);
    expect(result.healthyRangeKg).toBeNull();
    expect(result.message).toContain("percentil");
  });
  it("alerta ritmo de perda acima de 1% do peso por semana", () => {
    expect(
      weightGuidance({ ageYears: 35, heightCm: 170, weightKg: 80, trendKgPerWeek: -1.2 }).pace,
    ).toBe("fast_loss");
    expect(
      weightGuidance({ ageYears: 35, heightCm: 170, weightKg: 80, trendKgPerWeek: -0.5 }).pace,
    ).toBe("ok");
    expect(
      weightGuidance({ ageYears: 35, heightCm: 170, weightKg: 80, trendKgPerWeek: 0.6 }).pace,
    ).toBe("fast_gain");
  });
});
