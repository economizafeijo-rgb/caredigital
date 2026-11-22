import { describe, expect, it } from "vitest";
import { ACRE_CITIES, formatCpf, isValidCpf } from "./checkout";

describe("checkout", () => {
  it("valida CPF pelos dígitos verificadores", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });
  it("formata CPF enquanto digita", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
    expect(formatCpf("5299")).toBe("529.9");
  });
  it("lista os 22 municípios do Acre", () => {
    expect(ACRE_CITIES).toHaveLength(22);
    expect(ACRE_CITIES).toContain("Feijó");
  });
});
