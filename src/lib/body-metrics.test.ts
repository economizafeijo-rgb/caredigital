import { describe, expect, it } from "vitest";
import { navyBodyFat, waistHeight, waistHip } from "./body-metrics";

describe("medidas do corpo", () => {
  it("relação cintura-quadril com limite por sexo", () => {
    expect(waistHip(90, 100, "male")).toEqual({ value: 0.9, limit: 0.9, risk: false });
    expect(waistHip(90, 100, "female")?.risk).toBe(true);
    expect(waistHip(null, 100)).toBeNull();
  });
  it("relação cintura-altura", () => {
    expect(waistHeight(88, 175)).toEqual({ value: 0.5, risk: true });
    expect(waistHeight(80, 175)?.risk).toBe(false);
  });
  it("gordura corporal pela Marinha", () => {
    const m = navyBodyFat("male", 175, 38, 90);
    expect(m).toBeGreaterThan(15);
    expect(m).toBeLessThan(25);
    expect(navyBodyFat("female", 165, 33, 75, 100)).toBeGreaterThan(20);
    expect(navyBodyFat("female", 165, 33, 75, null)).toBeNull();
  });
});
