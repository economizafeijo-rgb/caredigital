import { describe, expect, it } from "vitest";
import {
  gramsForMacro,
  ingredients,
  menuForDay,
  portionNutrition,
  proteinRange,
  recipeFits,
  recipes,
  recipeTotals,
} from "./nutrition-catalog";

describe("NextVita nutrition safety and planning", () => {
  it("keeps common regional foods and branded products distinct", () => {
    expect(ingredients.some((item) => item.id === "banana_prata")).toBe(true);
    expect(ingredients.some((item) => item.id === "macaxeira")).toBe(true);
    expect(ingredients.find((item) => item.id === "neston")?.protein).toBeNull();
    expect(ingredients.find((item) => item.id === "mucilon")?.protein).toBeNull();
  });
  it("does not suggest acidic or high-fat recipes in the opt-in sensitive mode", () => {
    const acidic = recipes.find((r) => r.id === "suco_ovo_cuscuz")!;
    const acai = recipes.find((r) => r.id === "acai_banana")!;
    const mild = recipes.find((r) => r.id === "sopa_frango")!;
    expect(recipeFits(acidic, "equilibrio", true, [])).toBe(false);
    expect(recipeFits(acai, "equilibrio", true, [])).toBe(false);
    expect(recipeFits(mild, "equilibrio", true, [])).toBe(true);
  });
  it("respects manually excluded ingredients for all goals", () => {
    const recipe = recipes.find((r) => r.id === "frango_macaxeira")!;
    expect(recipeFits(recipe, "hipertrofia", false, ["frango"])).toBe(false);
  });
  it("calculates adult exercise protein reference range and rejects impossible values", () => {
    expect(proteinRange(70, "hipertrofia")).toEqual({ low: 98, high: 140, perKg: [1.4, 2] });
    expect(proteinRange(-1, "hipertrofia")).toBeNull();
  });
  it("creates four real meal suggestions without mandating supper", () => {
    const p = menuForDay(0, recipes, 0, "equilibrio");
    expect(p.map((item) => item.slot.id)).toEqual(["cafe", "almoco", "jantar", "lanche"]);
    expect(p.every((item) => item.recipe !== null)).toBe(true);
    for (const item of p) {
      expect(recipeTotals(item.recipe!).protein).toBeGreaterThanOrEqual(0);
    }
  });
  it("offers all four macros plus fiber for regional foods with sources", () => {
    const chicken = ingredients.find((x) => x.id === "frango")!;
    expect(chicken.protein).toBe(31.5);
    expect(chicken.carbs).toBe(0);
    expect(chicken.fat).toBe(3.2);
    expect(chicken.kcal).toBe(163);
    expect(chicken.provenance).toBe("TACO");
    expect(ingredients).toHaveLength(285);
    expect(
      ingredients.filter((x) => x.protein !== null && x.carbs !== null && x.fat !== null).length,
    ).toBe(282);
  });
  it("converts 100g and calculated portions without pretending labels are verified", () => {
    const chicken = ingredients.find((x) => x.id === "frango")!;
    expect(gramsForMacro(chicken, "protein", 31.5)).toBe(100);
    expect(portionNutrition(chicken, 200)).toMatchObject({
      protein: 63,
      carbs: 0,
      fat: 6.4,
      kcal: 326,
    });
    const banana = ingredients.find((x) => x.id === "banana_prata")!;
    expect(gramsForMacro(banana, "carbs", 26)).toBe(100);
    const neston = ingredients.find((x) => x.id === "neston")!;
    expect(gramsForMacro(neston, "protein", 20)).toBeNull();
    expect(portionNutrition(neston, 100).protein).toBeNull();
  });
  it("does not calculate an unfeasible target when food nutrient is zero", () => {
    const waterLike = ingredients.find((x) => x.id === "cha_camomila")!;
    expect(gramsForMacro(waterLike, "protein", 15)).toBeNull();
    expect(gramsForMacro(waterLike, "fat", 15)).toBeNull();
    expect(gramsForMacro(waterLike, "carbs", -1)).toBeNull();
  });
});

import { parseFoodText } from "./food-parser";
import { nutrientsInFood } from "./food-vitamins";
describe("Alimentos regionais adicionados e vitaminas", () => {
  it("reconhece os novos alimentos no texto livre", () => {
    const ids = (t: string) => parseFoodText(t).map((f) => f.id);
    expect(ids("baião de dois")).toEqual(["baiao_dois"]);
    expect(ids("café com leite em pó")).toEqual(["cafe_leite_po"]);
    expect(ids("2 colheres de leite em pó integral")).toEqual(["leite_po_integral"]);
    expect(ids("cereal com leite")).toEqual(["cereal_com_leite"]);
    expect(ids("pão massa fina e queijo mussarela")).toEqual([
      "pao_massa_fina",
      "queijo_mussarela",
    ]);
    expect(ids("nescafé")).toEqual(["cafe_soluvel"]);
    expect(ids("quibe de macaxeira")).toEqual(["quibe_macaxeira"]);
    expect(ids("sopa de legumes")).toEqual(["sopa_legumes"]);
    expect(ids("suco de acerola")).toEqual(["suco_acerola"]);
    expect(ids("pasta de amendoim")).toEqual(["pasta_amendoim"]);
    expect(ids("hot dog")).toEqual(["cachorro_quente"]);
  });
  it("mostra vitaminas com tipo e benefício", () => {
    const acerola = nutrientsInFood("acerola").map((n) => n.key);
    expect(acerola).toContain("C");
    expect(nutrientsInFood("castanha_para").map((n) => n.key)).toContain("selenio");
    expect(nutrientsInFood("leite_integral").every((n) => n.benefit && n.kind)).toBe(true);
  });
});

import { drinkPresets } from "./drink-presets";
import { mealCombos, typicalDrinks, typicalFoods } from "./care-intake-categories";
describe("Bebidas e sugestões por refeição", () => {
  it("todas as bebidas do menu suspenso são calculadas", () => {
    for (const p of drinkPresets) expect(parseFoodText(p.text, p.ml), p.label).toHaveLength(1);
  });
  it("café com leite em pó, desnatado, Nescafé e Nescau têm valores distintos", () => {
    const id = (t: string) => parseFoodText(t, 200)[0].id;
    expect(id("café com leite em pó")).toBe("cafe_leite_po");
    expect(id("café com leite desnatado")).toBe("cafe_leite_desnatado");
    expect(id("nescafé")).toBe("cafe_soluvel");
    expect(id("nescau")).toBe("achocolatado");
    expect(id("leite em pó")).toBe("leite_po_dissolvido");
  });
  it("sugestões e refeições prontas são reconhecidas pelo calculador", () => {
    for (const list of [
      ...Object.values(mealCombos),
      ...Object.values(typicalFoods),
      ...Object.values(typicalDrinks),
    ])
      for (const item of list ?? [])
        if (item.label !== "Suco")
          expect(parseFoodText(item.text).length, item.label).toBeGreaterThan(0);
  });
});

describe("pimenta da terra e cebola de palha", () => {
  it("reconhece os dois e não confunde a cebola de palha com cebola crua", async () => {
    const { parseFoodText } = await import("./food-parser");
    const ids = (t: string) => parseFoodText(t).map((f) => f.id);
    expect(
      ids("peito de frango, tomates, cenoura, batata, chicória, cebola de palha, pimenta da terra"),
    ).toEqual([
      "frango_grelhado",
      "tomate",
      "cenoura",
      "batata",
      "chicoria",
      "cebola_palha",
      "pimenta_terra",
    ]);
    expect(ids("cebola")).toEqual(["cebola"]);
    expect(ids("pimentão verde")).toEqual(["pimentao"]);
  });
});
