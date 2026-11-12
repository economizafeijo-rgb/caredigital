import { describe, expect, it } from "vitest";
import { medicationLibrary, validateMedication } from "@/components/vigia/ClientMedicationManager";

describe("medicamentos do cliente", () => {
  it("valida e normaliza o cadastro", () => {
    expect(validateMedication({ name: "A", dose: "1", times: ["08:00"] })).toHaveProperty("error");
    expect(validateMedication({ name: "Losartana", dose: "", times: ["08:00"] })).toHaveProperty("error");
    expect(validateMedication({ name: "Losartana", dose: "50 mg", times: [] })).toHaveProperty("error");
    const ok = validateMedication({ name: " Losartana ", dose: "50 mg", times: ["20:00", "08:00", "08:00"] });
    expect("value" in ok && ok.value.times).toEqual(["08:00", "20:00"]);
    expect("value" in ok && ok.value.name).toBe("Losartana");
  });
  it("biblioteca tem categorias com medicamentos e horários válidos", () => {
    expect(medicationLibrary.length).toBeGreaterThanOrEqual(6);
    for (const c of medicationLibrary) for (const m of c.meds) expect("value" in validateMedication(m)).toBe(true);
  });
});
