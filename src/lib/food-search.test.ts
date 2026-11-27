import { describe, expect, it } from "vitest";
import { foodsForKind, normalize, searchFoods } from "./food-search";
import { parseFoodText } from "./food-parser";

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
    for (const esperado of [
      "banana prata",
      "banana maca",
      "melao",
      "maracuja",
      "abacate",
      "morango",
      "tangerina",
      "buriti",
      "acerola",
      "biriba",
      "castanha de caju",
    ])
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

import { isRegionalFood } from "./food-search";
describe("selo regional", () => {
  it("marca frutas regionais e não marca comuns", () => {
    expect(isRegionalFood("1 porção de buriti")).toBe(true);
    expect(isRegionalFood("100 g de graviola")).toBe(true);
    expect(isRegionalFood("1 banana prata")).toBe(false);
  });
});

describe("bolo de trigo", () => {
  it("bolo de trigo sem confeite não vira confeitado", () => {
    expect(parseFoodText("1 fatia de bolo de trigo").map((f) => f.id)).toEqual(["bolo_trigo"]);
    expect(parseFoodText("bolo de trigo confeitado").map((f) => f.id)).toEqual([
      "bolo_trigo_confeitado",
    ]);
    expect(labels("bolo de trigo")).toContain("bolo de trigo");
  });
});

describe("assado de panela", () => {
  it("acha e reconhece assado de panela", () => {
    expect(labels("assado de panela")).toContain("assado de panela");
    expect(parseFoodText("120 g de assado de panela").map((f) => f.id)).toEqual(["carne_assada"]);
  });
});

describe("carnes assadas", () => {
  it("acha carne assada e mixto de carnes assadas", () => {
    expect(labels("carne assada")).toContain("carne assada");
    expect(labels("mixto de carnes")).toContain("mixto de carnes assadas");
    const ids = parseFoodText("mixto de carnes assadas").map((f) => f.id);
    expect(ids).toEqual(["carne_assada", "linguica", "frango_assado"]);
  });
});
