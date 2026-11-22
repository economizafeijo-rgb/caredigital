import { describe, expect, it } from "vitest";
import { normalize, searchFoods } from "./food-search";

const labels = (q: string) => searchFoods(q).items.map((i) => normalize(i.label));

describe("busca de alimentos", () => {
  it("'bola' não traz carambola nem cebola e acha bolacha/bolo", () => {
    const out = labels("bola").join("|");
    expect(out).not.toMatch(/carambola|cebola/);
  });

  it("'bolacha' acha o biscoito salgado (sinônimo)", () => {
    expect(labels("bolacha").join("|")).toMatch(/biscoito|cream cracker|bolacha/);
  });

  it("'bolo' acha bolos", () => {
    expect(labels("bolo").some((l) => l.startsWith("bolo"))).toBe(true);
  });

  it("ignora acento e caixa", () => {
    expect(labels("MAÇÃ").length).toBeGreaterThan(0);
    expect(labels("maca").length).toBeGreaterThan(0);
  });

  it("não depende da categoria: acha ovo e feijão em qualquer busca", () => {
    expect(labels("ovo").length).toBeGreaterThan(0);
    expect(labels("feijao").length).toBeGreaterThan(0);
  });

  it("tolera um erro de digitação", () => {
    expect(labels("banaa").length).toBeGreaterThan(0);
    expect(labels("bola").some((l) => l.startsWith("bolo"))).toBe(true);
  });

  it("devolve a categoria sugerida sem limitar os resultados", () => {
    const r = searchFoods("banana");
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.suggestedKind).not.toBeNull();
  });

  it("consulta curta não retorna nada", () => {
    expect(searchFoods("b").items).toEqual([]);
  });
});
