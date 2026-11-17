import { describe, expect, it } from "vitest";
import { beverageNutrients } from "./beverage-nutrients";

describe("nutrientes por tipo de líquido", () => {
  it("água não tem calorias", () => { expect(beverageNutrients("agua", 500).kcal).toBe(0); });
  it("suco de 200 ml tem cerca de 90 kcal", () => { expect(beverageNutrients("suco", 200).kcal).toBe(90); });
  it("shake de 300 ml tem proteína", () => { expect(beverageNutrients("shake", 300).protein).toBeGreaterThan(20); });
});
