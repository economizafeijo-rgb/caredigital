import { describe, expect, it } from "vitest";
import { goalTargets, parseFoodText, sumNutrients } from "./food-parser";

describe("parseFoodText", () => {
  it("reconhece alimentos, gramas e unidades", () => {
    const foods = parseFoodText("150 g de arroz, feijão e 2 ovos");
    expect(foods.map(f => [f.id, f.grams])).toEqual([["arroz", 150], ["feijao", 100], ["ovo", 100]]);
    const total = sumNutrients(foods.map(f => f.nutrients));
    expect(total.kcal).toBeGreaterThan(300);
    expect(total.protein).toBeGreaterThan(15);
  });
  it("usa o volume informado em bebidas", () => {
    expect(parseFoodText("Leite", 300)[0].grams).toBe(300);
  });
  it("ignora texto sem alimento conhecido", () => {
    expect(parseFoodText("xyz")).toEqual([]);
  });
  it("ajusta metas ao objetivo", () => {
    expect(goalTargets("hipertrofia", 80).protein).toBeGreaterThan(goalTargets("equilibrio", 80).protein);
  });
});
