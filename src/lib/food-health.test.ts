import { describe, expect, it } from "vitest";
import { foodHealth, healthierSwaps } from "./food-health";
import { ingredientById, ingredients } from "./nutrition-catalog";

const get = (id: string) => ingredientById.get(id)!;

describe("indicador de saúde dos alimentos", () => {
  it("classifica frutas, legumes e proteínas magras como frequentes", () => {
    for (const id of ["banana_prata", "camu_camu", "quiabo", "frango_grelhado", "feijao", "batata_doce_assada"]) expect(foodHealth(get(id)).level).toBe("frequente");
  });
  it("deixa fritos, embutidos, açúcar e fast food para de vez em quando", () => {
    for (const id of ["batata_frita", "calabresa", "salsicha", "refrigerante", "acucar", "x_tudo", "cachorro_quente", "pizza"]) expect(foodHealth(get(id)).level).toBe("ocasional");
  });
  it("sugere trocas mais saudáveis que existem no catálogo e não são piores", () => {
    expect(healthierSwaps(get("batata_frita")).map((x) => x.id)).toContain("batata_doce_assada");
    for (const food of ingredients) for (const alt of healthierSwaps(food)) expect(foodHealth(alt).level).not.toBe("ocasional");
  });
  it("não sugere troca para alimentos que já podem ser frequentes", () => {
    expect(healthierSwaps(get("mamão"))).toEqual([]);
  });
});
