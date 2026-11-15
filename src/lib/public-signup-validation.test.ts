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
