import { describe, expect, it } from "vitest";
import { daysLeft, formatLicenseCode, licenseState } from "@/components/vigia/LicenseGate";
import { generateLicenseCode } from "@/components/vigia/AdminClientManager";

describe("licenças", () => {
  it("gera código no formato aceito pelo banco", () => {
    expect(generateLicenseCode()).toMatch(/^CARE-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });
  it("formata o código digitado", () => {
    expect(formatLicenseCode("care ab12cd34ef56")).toBe("CARE-AB12-CD34-EF56");
  });
  it("licença ativa vencida conta como expirada", () => {
    expect(licenseState({ plan: "premium", status: "ativa", expires: "2026-11-10" }, "2026-11-12")).toBe("expirada");
    expect(licenseState({ plan: "premium", status: "ativa", expires: "2026-11-12" }, "2026-11-12")).toBe("ativa");
    expect(licenseState(null)).toBe("ativa");
  });
  it("calcula dias restantes", () => {
    expect(daysLeft("2026-11-20", "2026-11-12")).toBe(8);
  });
});
