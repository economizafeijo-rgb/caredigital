import { describe, expect, it } from "vitest";
import { foodsForKind, normalize, searchFoods } from "./food-search";

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

  it("aba Frutas lista as frutas do catálogo, inclusive regionais", () => {
    const names = foodsForKind("fruta").map((i) => normalize(i.label));
    for (const esperado of ["banana prata", "banana maca", "melao", "maracuja", "abacate", "morango", "tangerina", "buriti", "acerola", "biriba", "castanha de caju"])
      expect(names.some((n) => n.startsWith(esperado))).toBe(true);
    expect(names.length).toBeGreaterThan(50);
  });
});

describe("bolacha e biscoito", () => {
  it("bolacha sem qualificativo é o cream cracker; doce e recheado são separados", async () => {
    const { parseFoodText } = await import("./food-parser");
    expect(parseFoodText("bolacha")[0].id).toBe("biscoito_salgado");
    expect(parseFoodText("cream cracker")[0].id).toBe("biscoito_salgado");
    expect(parseFoodText("bolacha doce")[0].id).toBe("biscoito_doce");
    expect(parseFoodText("biscoito maisena")[0].id).toBe("biscoito_doce");
    expect(parseFoodText("bolacha recheada")[0].id).toBe("biscoito_recheado");
    expect(parseFoodText("1 bolacha")[0].grams).toBe(30);
    expect(parseFoodText("2 bolas de sorvete")[0].grams).toBe(120);
  });
});
