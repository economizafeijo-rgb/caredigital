import { describe, expect, it } from "vitest";
import { checkIntake, hydrationNeed, lastHourIntakeMl } from "./hydration-need";

const base = {
  sex: "male" as const,
  age: 30,
  weightKg: 70,
  activityMinutes: 0,
  sweat: "normal" as const,
  fluidRestriction: false,
};
describe("hydrationNeed", () => {
  it("homem de 70 kg: 30 ml/kg cai no mínimo da faixa (2.000 ml)", () => {
    const n = hydrationNeed(base)!;
    expect(n.weightBased).toBe(2100);
    expect(n.target).toBe(2100);
  });
  it("mulher leve não fica abaixo do mínimo da EFSA e mulher pesada não passa da IOM", () => {
    expect(hydrationNeed({ ...base, sex: "female", weightKg: 40 })!.target).toBe(1600);
    expect(hydrationNeed({ ...base, sex: "female", weightKg: 110 })!.target).toBe(2200);
  });
  it("soma o suor do treino, com teto de 1,5 L", () => {
    expect(hydrationNeed({ ...base, activityMinutes: 60 })!.activity).toBe(500);
    expect(hydrationNeed({ ...base, activityMinutes: 240, sweat: "high" })!.activity).toBe(1500);
  });
  it("pede avaliação profissional em restrição, 75+ ou meta acima de 4 L", () => {
    expect(hydrationNeed({ ...base, fluidRestriction: true })!.requiresReview).toBe(true);
    expect(hydrationNeed({ ...base, age: 78 })!.requiresReview).toBe(true);
    expect(
      hydrationNeed({ ...base, weightKg: 140, activityMinutes: 240, sweat: "high" })!
        .requiresReview,
    ).toBe(true);
    expect(hydrationNeed(base)!.requiresReview).toBe(false);
  });
  it("recusa dados fora da faixa", () => {
    expect(hydrationNeed({ ...base, age: 15 })).toBeNull();
    expect(hydrationNeed({ ...base, weightKg: 20 })).toBeNull();
  });
});
describe("checkIntake", () => {
  it("avisa quando passa do que os rins eliminam por hora", () => {
    expect(checkIntake(250).level).toBe("ok");
    expect(checkIntake(600).level).toBe("attention");
    expect(checkIntake(400, 500).level).toBe("attention");
    expect(checkIntake(700, 500).level).toBe("excess");
  });
  it("soma só a última hora", () => {
    const now = 10 * 3_600_000;
    expect(
      lastHourIntakeMl(
        [
          { at: now - 30 * 60_000, ml: 300 },
          { at: now - 90 * 60_000, ml: 500 },
        ],
        now,
      ),
    ).toBe(300);
  });
});
