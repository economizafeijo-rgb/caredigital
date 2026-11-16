import { describe, expect, it } from "vitest";
import { trialEndDate } from "./public-signup-bootstrap";

describe("fim do teste grátis", () => {
  it("soma 7 dias no horário do Acre", () => {
    expect(trialEndDate(new Date("2026-11-16T15:00:00Z"))).toBe("2026-11-23");
  });
  it("não adianta o dia quando já é noite no Acre", () => {
    // 02:00 UTC de 17/11 ainda é 21:00 de 16/11 no Acre
    expect(trialEndDate(new Date("2026-11-17T02:00:00Z"))).toBe("2026-11-23");
  });
});
