import { describe, expect, it } from "vitest";
import { estimateNextHydration } from "./hydration-goal";
import { mealKindOf, nextMealSuggestion, nextWaterPlan, waterCutoff } from "./day-plan";

const day = "2026-11-20";
const at = (hhmm: string) => Date.parse(`${day}T${hhmm}:00-05:00`);

describe("próximo copo único para todas as telas", () => {
  const drinks = [
    { t: at("10:29"), ml: 700 },
    { t: at("12:12"), ml: 420 },
    { t: at("13:52"), ml: 200 },
    { t: at("15:53"), ml: 450 },
  ];
  it("usa o mesmo cálculo da Hidratação (todos os líquidos, ritmo da última hora e mesmo horário-limite)", () => {
    const now = at("16:47");
    const shared = nextWaterPlan({ targetMl: 2550, drinks, now, day });
    const hydrationTab = estimateNextHydration({
      remainingMl: 2550 - 1770,
      lastIntakeAt: at("15:53"),
      lastAmountMl: 450,
      now,
      cutoff: waterCutoff(day),
      recent: drinks.map((d) => ({ at: d.t, ml: d.ml })),
    });
    expect(shared).toEqual(hydrationTab);
    expect(shared!.at).toBeGreaterThan(now);
  });
  it("sem meta não sugere copo", () => {
    expect(nextWaterPlan({ targetMl: 0, drinks, now: at("16:00"), day })).toBeNull();
  });
});

describe("refeições previstas × registradas", () => {
  it("café registrado às 9h40 resolve o café da manhã, não o lanche", () => {
    const { next, last } = nextMealSuggestion(
      [{ t: at("09:40"), kind: mealKindOf("Café da manhã") }],
      day,
      at("09:50"),
    );
    expect(next?.label).toBe("Lanche da manhã");
    expect(last?.t).toBe(at("09:40"));
  });
  it("sem registro, a próxima é o horário típico mais próximo", () => {
    expect(nextMealSuggestion([], day, at("11:00")).next?.label).toBe("Almoço");
  });
  it("lanche adiantado (15:25) cobre o lanche da tarde, não o da manhã", () => {
    const meals = [
      { t: at("10:50"), kind: "cafe_manha" },
      { t: at("12:50"), kind: "almoco" },
      { t: at("15:25"), kind: "lanche" },
    ];
    const { next, slots } = nextMealSuggestion(meals, day, at("15:41"));
    expect(slots.find((s) => s.label === "Lanche da tarde")?.doneAt).toBe(at("15:25"));
    expect(slots.find((s) => s.label === "Lanche da manhã")?.doneAt).toBeNull();
    expect(next?.label).toBe("Jantar");
  });
  it("jantar registrado antes das 19h resolve o jantar", () => {
    const { next } = nextMealSuggestion(
      [{ t: at("17:40"), kind: "jantar" }],
      day,
      at("18:30"),
    );
    expect(next).toBeNull();
  });
  it("dois lanches, um de manhã e outro à tarde, ocupam cada um o seu horário", () => {
    const { slots } = nextMealSuggestion(
      [
        { t: at("10:20"), kind: "lanche" },
        { t: at("15:10"), kind: "lanche" },
      ],
      day,
      at("15:20"),
    );
    expect(slots.find((s) => s.label === "Lanche da manhã")?.doneAt).toBe(at("10:20"));
    expect(slots.find((s) => s.label === "Lanche da tarde")?.doneAt).toBe(at("15:10"));
  });
  it("um lanche de manhã cedo não cobre o lanche da tarde", () => {
    const { slots } = nextMealSuggestion([{ t: at("08:00"), kind: "lanche" }], day, at("15:41"));
    expect(slots.find((s) => s.label === "Lanche da tarde")?.doneAt).toBeNull();
  });
});
