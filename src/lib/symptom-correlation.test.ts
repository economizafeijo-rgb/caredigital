import { describe, expect, it } from "vitest";
import { explainEvent, findClues, type Exposure, type SymptomEvent } from "./symptom-correlation";
import { tagsFor } from "./exposure-tags";
import { classifyBp, redFlag } from "./symptoms";

const H = 3_600_000;
const T0 = Date.UTC(2026, 10, 1, 12);
const exp = (
  id: string,
  hours: number,
  label: string,
  kind: Exposure["kind"] = "alimento",
): Exposure => ({
  id,
  at: T0 + hours * H,
  label,
  kind,
  tags: tagsFor(label, kind),
});
const ev = (id: string, hours: number, symptoms: string[]): SymptomEvent => ({
  id,
  at: T0 + hours * H,
  symptoms,
  severity: 3,
});

describe("pistas de sintomas", () => {
  it("aponta laticínio quando a dor de barriga vem horas depois, vezes seguidas", () => {
    const exposures = [
      exp("a", 0, "Leite integral 200 ml", "bebida"),
      exp("b", 24, "Iogurte natural"),
      exp("c", 48, "Queijo mussarela"),
      exp("d", 3, "Arroz e feijão"),
      exp("e", 27, "Frango grelhado"),
      exp("f", 51, "Arroz com ovo"),
      exp("g", 72, "Arroz e feijão"),
      exp("h", 96, "Frango grelhado"),
      exp("i", 120, "Peixe assado"),
      exp("j", 144, "Macarrão"),
    ];
    const events = [
      ev("1", 2, ["dor_barriga"]),
      ev("2", 26, ["dor_barriga"]),
      ev("3", 50, ["dor_barriga"]),
    ];
    const clues = findClues(events, exposures);
    const top = clues[0];
    expect(top.symptom).toBe("dor_barriga");
    expect(["g:laticinio", "g:lactose"]).toContain(top.tag);
    expect(top.events).toBe(3);
    expect(top.confidence).not.toBe("baixa");
  });

  it("um único caso vira pista de confiança baixa", () => {
    const clues = findClues([ev("1", 3, ["coceira"])], [exp("a", 1, "Camarão frito")]);
    expect(clues.length).toBeGreaterThan(0);
    expect(clues.every((c) => c.confidence === "baixa")).toBe(true);
  });

  it("ignora o que foi ingerido depois do sintoma", () => {
    expect(findClues([ev("1", 0, ["nausea"])], [exp("a", 2, "Leite")])).toEqual([]);
  });

  it("sem sintomas ou sem registros não há pistas", () => {
    expect(findClues([], [exp("a", 0, "Leite")])).toEqual([]);
    expect(findClues([ev("1", 1, ["nausea"])], [])).toEqual([]);
  });

  it("lista o que veio antes do evento e marca novidade", () => {
    const e = ev("1", 4, ["vomito"]);
    const items = explainEvent(
      e,
      [exp("a", 1, "Camarão"), exp("b", 3, "Suco de laranja", "bebida")],
      [],
    );
    expect(items.map((i) => i.exposure.id)).toEqual(["b", "a"]);
    expect(items[1].novel).toBe(true);
    expect(items[0].novel).toBe(false);
  });

  it("classifica pressão e sinais de alerta", () => {
    expect(classifyBp(120, 80)?.tone).toBe("ok");
    expect(classifyBp(190, 110)?.tone).toBe("bad");
    expect(redFlag(["dor_peito"], 2)).toMatch(/192/);
    expect(redFlag(["dor_cabeca"], 2, 120, 80)).toBeNull();
  });

  it("sem lactose não marca lactose; remédio ganha grupo", () => {
    expect(tagsFor("Leite sem lactose", "bebida")).not.toContain("g:lactose");
    expect(tagsFor("Ibuprofeno 400 mg", "remedio")).toContain("r:ains");
  });
});
