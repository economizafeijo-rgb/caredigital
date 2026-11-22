import { describe, expect, it } from "vitest";
import { goalTargets, parseFoodText, sumNutrients } from "./food-parser";

describe("parseFoodText", () => {
  it("reconhece alimentos, gramas e unidades", () => {
    const foods = parseFoodText("150 g de arroz, feijão e 2 ovos");
    expect(foods.map((f) => [f.id, f.grams])).toEqual([
      ["arroz", 150],
      ["feijao", 100],
      ["ovo", 100],
    ]);
    const total = sumNutrients(foods.map((f) => f.nutrients));
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
    expect(goalTargets("hipertrofia", 80).protein).toBeGreaterThan(
      goalTargets("equilibrio", 80).protein,
    );
  });

  it("bebida com açúcar mantém o volume no líquido e soma o açúcar", () => {
    const list = parseFoodText("limonada com açúcar", 700);
    expect(list.map((f) => f.id)).toEqual(["limonada", "acucar"]);
    expect(list[0].grams).toBe(700);
    expect(list[1].grams).toBe(35);
  });
  it("colheres de sopa e de chá de açúcar são reconhecidas", () => {
    expect(parseFoodText("2 colheres de sopa de açúcar")[0]).toMatchObject({
      id: "acucar",
      grams: 24,
    });
    expect(parseFoodText("café coado, 2 colheres de chá de açúcar", 100).map((f) => [f.id, f.grams])).toEqual([
      ["cafe", 100],
      ["acucar", 10],
    ]);
  });
  it("limonada sem informação presume açúcar (estimativa); 'sem açúcar' não soma", () => {
    const plain = parseFoodText("Limonada", 700);
    expect(plain.map((f) => f.id)).toEqual(["limonada", "acucar"]);
    expect(plain[1]).toMatchObject({ grams: 35, estimatedPortion: true });
    expect(parseFoodText("limonada sem açúcar", 700).map((f) => f.id)).toEqual(["limonada"]);
    expect(parseFoodText("limonada com 2 colheres de sopa de açúcar", 700).map((f) => f.grams)).toEqual([
      700, 24,
    ]);
    expect(parseFoodText("água com limão", 300).map((f) => f.id)).toEqual(["limao"]);
  });
});
