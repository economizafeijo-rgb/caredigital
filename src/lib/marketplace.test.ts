import { describe, expect, it } from "vitest";
import { bestPlanFor, centsToInput, parseMoney, platformRevenue, slugify } from "./marketplace";

describe("marketplace", () => {
  it("calcula a receita da plataforma por plano", () => {
    expect(platformRevenue(100000, "basico")).toMatchObject({ fee: 0, commission: 10000, total: 10000 });
    expect(platformRevenue(100000, "vitrine")).toMatchObject({ fee: 4900, commission: 7000, total: 11900 });
    expect(platformRevenue(100000, "destaque")).toMatchObject({ commission: 5000, total: 14900 });
  });
  it("sugere o plano mais barato para o lojista conforme o volume", () => {
    expect(bestPlanFor(100000)).toBe("basico");
    expect(bestPlanFor(200000)).toBe("vitrine");
    expect(bestPlanFor(1000000)).toBe("destaque");
  });
  it("converte valores em reais", () => {
    expect(parseMoney("49,90")).toBe(4990);
    expect(parseMoney("1.299,00")).toBe(129900);
    expect(parseMoney("abc")).toBeNull();
    expect(centsToInput(4990)).toBe("49,90");
  });
  it("gera endereço (slug) da loja", () => { expect(slugify("Farmácia São João & Cia")).toBe("farmacia-sao-joao-cia"); });
});
