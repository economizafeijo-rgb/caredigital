import { describe, expect, it } from "vitest";
import {
  formatBrazilPhone,
  formatCpf,
  isValidBirthDate,
  isValidBrazilPhone,
  isValidCpf,
  normalizeBrazilPhone,
} from "./public-signup-validation";

describe("public signup validation", () => {
  it("validates CPF digits and ignores formatting", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224726")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
  });

  it("normalizes and validates Brazilian phone numbers", () => {
    expect(normalizeBrazilPhone("+55 (68) 99999-1234")).toBe("68999991234");
    expect(isValidBrazilPhone("+55 (68) 99999-1234")).toBe(true);
    expect(isValidBrazilPhone("(68) 3333-1234")).toBe(true);
    expect(isValidBrazilPhone("68 8888-1234")).toBe(false);
    expect(formatBrazilPhone("68999991234")).toBe("(68) 99999-1234");
  });

  it("accepts real dates up to today and rejects invalid or future dates", () => {
    expect(isValidBirthDate("1990-02-28")).toBe(true);
    expect(isValidBirthDate("1990-02-30")).toBe(false);
    expect(isValidBirthDate("2990-01-01")).toBe(false);
  });
});

import { ageFromBirthDate, isValidCnpj, isValidEmail, parseDecimal } from "./public-signup-validation";
import { describe as d2, expect as e2, it as i2 } from "vitest";
d2("verificadores adicionais", () => {
  i2("valida e-mail", () => {
    e2(isValidEmail("nome@dominio.com.br")).toBe(true);
    e2(isValidEmail("nome@dominio")).toBe(false);
    e2(isValidEmail("nome..x@dominio.com")).toBe(false);
  });
  i2("valida CNPJ pelos dígitos", () => {
    e2(isValidCnpj("11.222.333/0001-81")).toBe(true);
    e2(isValidCnpj("11.222.333/0001-82")).toBe(false);
  });
  i2("lê números com vírgula ou ponto", () => {
    e2(parseDecimal("84,40")).toBe(84.4);
    e2(parseDecimal("86.25")).toBe(86.25);
    e2(parseDecimal("1.234,5")).toBe(1234.5);
    e2(parseDecimal("abc")).toBeNull();
  });
  i2("calcula idade", () => {
    e2(ageFromBirthDate("2999-01-01")).toBeNull();
    e2((ageFromBirthDate("1983-01-01") ?? 0) >= 43).toBe(true);
  });
});
