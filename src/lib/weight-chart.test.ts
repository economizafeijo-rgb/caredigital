import { describe, expect, it } from "vitest";
import { bmiCategory, movingAverage } from "@/components/vigia/ClientWeightPage";

describe("weight helpers", () => {
  it("classifica o IMC pelas faixas da OMS", () => {
    expect(bmiCategory(17).label).toBe("Abaixo do peso");
    expect(bmiCategory(22).label).toBe("Peso adequado");
    expect(bmiCategory(27).label).toBe("Sobrepeso");
    expect(bmiCategory(42).label).toBe("Obesidade grau III");
  });
  it("calcula média móvel", () => {
    expect(movingAverage([80, 82, 84], 2)).toEqual([80, 81, 83]);
  });
});
