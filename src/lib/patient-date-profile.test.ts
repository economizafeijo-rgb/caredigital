import { describe, expect, it } from "vitest";
import { zodiacDetails, zodiacSign } from "./patient-date-profile";

describe("signo solar pela posição do Sol", () => {
  it("identifica o signo no meio de cada período", () => {
    expect(zodiacSign("2000-01-25")).toBe("AQUÁRIO");
    expect(zodiacSign("1990-03-10")).toBe("PEIXES");
    expect(zodiacSign("1983-04-10")).toBe("ÁRIES");
    expect(zodiacSign("1995-07-01")).toBe("CÂNCER");
    expect(zodiacSign("1995-12-25")).toBe("CAPRICÓRNIO");
  });
  it("usa o horário do Acre e marca a cúspide (equinócio de 20/03/2024 03:06 UTC = 19/03 22:06 no Acre)", () => {
    expect(zodiacDetails("2024-03-19")).toEqual({ sign: "PEIXES", cusp: true, other: "ÁRIES" });
    expect(zodiacDetails("2024-03-20").sign).toBe("ÁRIES");
    expect(zodiacDetails("2024-03-19", "23:00")).toEqual({ sign: "ÁRIES", cusp: false, other: null });
  });
});
