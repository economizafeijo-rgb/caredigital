import { describe, expect, it } from "vitest";
import { evaluateRisks, hazardsFor, levelOf } from "./nutrition-risk";
import { ingredientById } from "./nutrition-catalog";
import { parseFoodText } from "./food-parser";

const entry = (text: string) => ({ foods: parseFoodText(text) });
describe("limites de saúde", () => {
  it("classifica por proporção do limite", () => {
    expect(levelOf(0.5)).toBe("ok");
    expect(levelOf(0.8)).toBe("near");
    expect(levelOf(1)).toBe("over");
    expect(levelOf(1.3)).toBe("severe");
  });
  it("soma sódio e açúcar e aponta os maiores responsáveis", () => {
    const r = evaluateRisks([entry("2 colheres de sopa de leite condensado, 1 refrigerante")], {
      kcal: 2000,
      fat: 70,
    });
    const sugar = r.find((x) => x.key === "sugar")!;
    expect(sugar.limit).toBe(50);
    expect(sugar.value).toBeGreaterThan(20);
    expect(sugar.culprits[0].id).toBeTruthy();
    const sodium = r.find((x) => x.key === "sodium")!;
    expect(sodium.limit).toBe(2000);
  });
  it("detecta excesso de sódio com embutidos", () => {
    const r = evaluateRisks([entry("200 g de calabresa, 100 g de presunto")], {
      kcal: 2000,
      fat: 70,
    });
    expect(r.find((x) => x.key === "sodium")!.level).toBe("severe");
    expect(hazardsFor([entry("100 g de presunto")]).length).toBe(1);
  });
  it("todo alimento de risco existe no catálogo", async () => {
    const { sodiumPer100, sugarPer100, foodHazard } = await import("./nutrition-risk");
    const missing = [
      ...Object.keys(sodiumPer100),
      ...Object.keys(sugarPer100),
      ...Object.keys(foodHazard),
    ].filter((id) => !ingredientById.has(id));
    expect(missing).toEqual([]);
  });
});
