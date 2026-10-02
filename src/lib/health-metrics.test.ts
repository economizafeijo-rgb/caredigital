import { describe, expect, it } from "vitest";
import { calculateBodyMetrics } from "./health-metrics";

describe("calculateBodyMetrics", () => {
  it("calculates adult BMI and keeps the water number as a population reference", () => {
    const result = calculateBodyMetrics({ ageYears: 34, heightCm: 170, weightKg: 72, sex: "female" });
    expect(result.bmi).toBe(24.9);
    expect(result.bmiLabel).toBe("Faixa de referência");
    expect(result.waterReferenceMl).toBe(2700);
    expect(result.waterNote).toContain("não uma prescrição");
  });

  it("does not apply adult BMI categories or hydration references to a minor", () => {
    const result = calculateBodyMetrics({ ageYears: 16, heightCm: 170, weightKg: 60, sex: "male" });
    expect(result.bmi).toBe(20.8);
    expect(result.bmiLabel).toBeNull();
    expect(result.waterReferenceMl).toBeNull();
  });

  it("does not infer a demographic hydration reference without a selected category", () => {
    const result = calculateBodyMetrics({ ageYears: 35, heightCm: 165, weightKg: 58, sex: "unspecified" });
    expect(result.bmi).toBe(21.3);
    expect(result.waterReferenceMl).toBeNull();
  });
});
