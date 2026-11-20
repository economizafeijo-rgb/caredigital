import { describe, expect, it } from "vitest";
import {
  cookFoods,
  formatClock,
  formatDuration,
  presetOf,
  qtyNutrition,
  cookFoodById,
} from "./cooking-times";
import { ingredientById } from "./nutrition-catalog";
import {
  addMs,
  makeTimer,
  parseTimers,
  pauseTimer,
  progressOf,
  remainingOf,
  resumeTimer,
  settle,
} from "./cook-timers";

describe("cooking-times", () => {
  it("tem ids únicos e presets válidos", () => {
    expect(new Set(cookFoods.map((f) => f.id)).size).toBe(cookFoods.length);
    for (const f of cookFoods) {
      expect(
        f.presets.some((p) => p.key === f.defaultPreset),
        f.id,
      ).toBe(true);
      expect(new Set(f.presets.map((p) => p.key)).size, f.id).toBe(f.presets.length);
      for (const p of f.presets) expect(p.minutes, `${f.id}/${p.key}`).toBeGreaterThan(0);
      expect(f.steps.length, f.id).toBeGreaterThanOrEqual(3);
      if (f.qty) {
        expect(f.qty.def).toBeGreaterThanOrEqual(f.qty.min);
        expect(f.qty.def).toBeLessThanOrEqual(f.qty.max);
        if (f.qty.catalogId) expect(ingredientById.has(f.qty.catalogId), f.id).toBe(true);
      }
    }
  });
  it("ovo cozido: mole < cremoso < duro e mesmo tempo para qualquer quantidade", () => {
    const egg = cookFoodById.get("ovo_cozido")!;
    const m = (k: string) => presetOf(egg, k).minutes;
    expect(m("mole")).toBeLessThan(m("cremoso"));
    expect(m("cremoso")).toBeLessThan(m("duro"));
  });
  it("calcula calorias pela quantidade", () => {
    const egg = cookFoodById.get("ovo_cozido")!;
    const one = qtyNutrition(egg, 1)!,
      six = qtyNutrition(egg, 6)!;
    expect(six.kcal).toBeGreaterThan(one.kcal * 5);
    expect(qtyNutrition(cookFoodById.get("carne_panela")!, 2)).toBeNull();
  });
  it("formata tempos", () => {
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatDuration(8)).toBe("8 min");
    expect(formatDuration(2.5)).toBe("2 min 30 s");
    expect(formatDuration(75)).toBe("1 h 15 min");
  });
});

describe("cook-timers", () => {
  const base = { id: "a", foodId: "ovo_cozido", presetKey: "duro", qty: 2, minutes: 10 };
  it("conta, pausa e retoma sem perder tempo", () => {
    const t = makeTimer(base, 0);
    expect(remainingOf(t, 60_000)).toBe(9 * 60_000);
    const p = pauseTimer(t, 120_000);
    expect(remainingOf(p, 999_999)).toBe(8 * 60_000);
    const r = resumeTimer(p, 500_000);
    expect(remainingOf(r, 560_000)).toBe(7 * 60_000);
    expect(progressOf(r, 500_000)).toBeCloseTo(0.2);
  });
  it("conclui no fim e +1 min reativa", () => {
    const t = makeTimer(base, 0);
    expect(settle(t, 599_999).status).toBe("running");
    const d = settle(t, 600_001);
    expect(d.status).toBe("done");
    expect(progressOf(d, 0)).toBe(1);
    const again = addMs(d, 60_000, 700_000);
    expect(again.status).toBe("running");
    expect(remainingOf(again, 700_000)).toBe(60_000);
  });
  it("lê dados salvos descartando inválidos", () => {
    const good = makeTimer(base, 1000);
    expect(parseTimers(JSON.stringify([good, { id: 1 }, null, { ...good, totalMs: -1 }]))).toEqual([
      good,
    ]);
    expect(parseTimers("{lixo")).toEqual([]);
    expect(parseTimers(null)).toEqual([]);
  });
});
