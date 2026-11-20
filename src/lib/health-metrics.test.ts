import { describe, expect, it } from "vitest";
import { calculateBodyMetrics } from "./health-metrics";

describe("calculateBodyMetrics", () => {
  it("calculates adult BMI and uses the EFSA fluid reference for the water number", () => {
    const result = calculateBodyMetrics({
      ageYears: 34,
      heightCm: 170,
      weightKg: 72,
      sex: "female",
    });
    expect(result.bmi).toBe(24.9);
    expect(result.bmiLabel).toBe("Faixa de referência");
    expect(result.waterReferenceMl).toBe(1600); // EFSA: 2,0 L de água total para mulheres × 80% de líquidos
    expect(result.waterNote).toContain("EFSA");
  });

  it("does not apply adult BMI categories to a minor, but gives the age-based fluid reference", () => {
    const teen = calculateBodyMetrics({ ageYears: 16, heightCm: 170, weightKg: 60, sex: "male" });
    expect(teen.bmi).toBe(20.8);
    expect(teen.bmiLabel).toBeNull();
    expect(teen.waterReferenceMl).toBe(2000);
    const child = calculateBodyMetrics({ ageYears: 6, heightCm: 115, weightKg: 20, sex: "female" });
    expect(child.bmiLabel).toBeNull();
    expect(child.waterReferenceMl).toBe(1300);
  });

  it("does not infer a demographic hydration reference without a selected category", () => {
    const result = calculateBodyMetrics({
      ageYears: 35,
      heightCm: 165,
      weightKg: 58,
      sex: "unspecified",
    });
    expect(result.bmi).toBe(21.3);
    expect(result.waterReferenceMl).toBeNull();
  });
});
