import { describe, expect, it } from "vitest";
import { money, orderTotal, products } from "./store";

describe("loja", () => {
  it("aplica 5% de desconto só no Pix", () => {
    expect(orderTotal(10000, "pix")).toBe(9500);
    expect(orderTotal(10000, "cartao")).toBe(10000);
    expect(orderTotal(10000, "boleto")).toBe(10000);
  });
  it("formata moeda em reais", () => { expect(money(14990).replace(/\s/g, " ")).toContain("149,90"); });
  it("catálogo tem ids únicos, preços positivos e as seis categorias", () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
    expect(products.every((p) => p.priceCents > 0)).toBe(true);
    expect(new Set(products.map((p) => p.category)).size).toBe(6);
  });
});
