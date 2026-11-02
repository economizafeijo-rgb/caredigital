import { describe, expect, it } from "vitest";
import {
  foodKinds,beverageKinds,isFoodKind,isBeverageKind,
  foodCategory,beverageCategory,intakeCategory,
} from "./care-intake-categories";

describe("CareDigital: categorias para consumo de alimentos e líquidos",()=>{
  it("mantém 10 tipos de alimentos sem confundi-los com bebidas",()=>{
    expect(foodKinds).toHaveLength(10);
    for(const option of foodKinds){
      expect(isFoodKind(option.value)).toBe(true);
      expect(isBeverageKind(option.value)).toBe(false);
      expect(foodCategory(option.value)?.label).toBe(option.label);
      expect(option.example).toMatch(/^Ex\.:/);
    }
    expect(foodCategory("fruta")?.label).toBe("Frutas");
    expect(foodCategory("almoco")?.label).toBe("Almoço");
    expect(foodCategory("ceia")?.label).toBe("Ceia");
  });
  it("mantém 13 tipos de líquidos com ícones próprios na interface",()=>{
    expect(beverageKinds).toHaveLength(13);
    for(const option of beverageKinds){
      expect(isBeverageKind(option.value)).toBe(true);
      expect(isFoodKind(option.value)).toBe(false);
      expect(beverageCategory(option.value)?.label).toBe(option.label);
      expect(option.amount).toBeGreaterThanOrEqual(100);
    }
    expect(beverageCategory("energetico")?.label).toBe("Energético");
    expect(beverageCategory("suplemento")?.label).toBe("Suplemento líquido");
    expect(beverageCategory("shake")?.label).toBe("Shake");
  });
  it("cada identificador é único e pertence a exatamente um grupo",()=>{
    const values=[...foodKinds,...beverageKinds].map(item=>item.value);
    expect(new Set(values).size).toBe(values.length);
    expect(isFoodKind("shake")).toBe(false);
    expect(isBeverageKind("fruta")).toBe(false);
    expect(intakeCategory("desconhecido")).toBeUndefined();
  });
});
