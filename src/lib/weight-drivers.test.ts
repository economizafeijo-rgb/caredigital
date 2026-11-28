import { expect, test } from "vitest";
import { analyzeWeight } from "./weight-drivers";
const day = (i: number, kcal: number, label = "Arroz") =>
  ({ day: `2026-11-${String(i + 1).padStart(2, "0")}`, foods: [{ at: `2026-11-${String(i + 1).padStart(2, "0")}T16:00:00Z`, label, kcal, carbs: 100, protein: 60, fat: 50, source: "" }], kcal, carbs: 100, protein: 60, waterMl: 2000, sleep: null, activityMinutes: 0 }) as any;
test("detecta aumento de calorias e lanches", () => {
  const days = [...Array(14)].map((_, i) => day(i, 1800)).concat([...Array(14)].map((_, i) => day(i + 14, 2600, "Pizza de calabresa")));
  const r = analyzeWeight(days, [{ day: "2026-11-01", kg: 80 }, { day: "2026-11-28", kg: 81.2 }], 2000);
  expect(r.change).toBeCloseTo(1.2);
  expect(r.drivers.some((d) => d.tone === "up" && d.text.startsWith("Calorias"))).toBe(true);
  expect(r.balance!.kgPerWeek).toBeCloseTo((600 * 7) / 7700);
});
