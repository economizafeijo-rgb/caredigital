import { estimateNextHydration } from "./hydration-goal";
import { describe, expect, it } from "vitest";
import {
  acreCalendarDay,
  acreHour,
  hydrationGoalNotice,
  type HydrationGoalSnapshot,
} from "./hydration-goal";

const day = "2026-11-02";
const pending: HydrationGoalSnapshot = {
  goal_date: day,
  status: "em_andamento",
  target_ml: 2550,
  consumed_ml: 590,
  remaining_ml: 1960,
  closed_at: null,
  cutoff_local: "23:00",
};
describe("Fechamento diário da hidratação à meia-noite no Acre (janela de 24 h)", () => {
  it("respeita a data do Acre, sem usar a data UTC", () => {
    expect(acreCalendarDay("2026-11-03T03:59:59Z")).toBe("2026-11-02");
    expect(acreHour("2026-11-03T02:59:59Z")).toBe(21);
    expect(acreHour("2026-11-03T03:00:00Z")).toBe(22);
    expect(acreCalendarDay("2026-11-03T03:00:00Z")).toBe("2026-11-02");
    expect(acreHour("2026-11-03T04:00:00Z")).toBe(23);
    expect(acreCalendarDay("2026-11-03T05:00:00Z")).toBe("2026-11-03");
  });
  it("não declara falha durante o dia", () => {
    const note = hydrationGoalNotice(pending, Date.parse("2026-11-03T02:59:59Z"));
    expect(note.kind).toBe("pending");
    expect(note.message).toContain("1.960");
  });
  it("às 22h o dia continua aberto: registros em qualquer horário contam na meta", () => {
    const note = hydrationGoalNotice(pending, Date.parse("2026-11-03T03:00:01Z"));
    expect(note.kind).toBe("pending");
    expect(note.title).toBe("Meta aberta");
    expect(note.message).toContain("a qualquer hora");
    expect(note.message).toContain("20h");
  });
  it("indica fechamento em processamento depois da meia-noite até confirmação do servidor", () => {
    const note = hydrationGoalNotice(pending, Date.parse("2026-11-03T05:00:01Z"));
    expect(note.kind).toBe("pending");
    expect(note.title).toContain("Fechamento");
  });
  it("mostra meta atingida com valores e data, sem aviso chamativo", () => {
    const note = hydrationGoalNotice(
      { ...pending, status: "atingida", consumed_ml: 2650, closed_at: "2026-11-03T04:00:00Z" },
      Date.parse("2026-11-03T04:05:00Z"),
    );
    expect(note.kind).toBe("met");
    expect(note.message).toContain("2.650 de 2.550");
    expect(note.message).toContain("02/11/2026");
  });
  it("mostra o déficit de um dia encerrado, sem recomendar beber em excesso", () => {
    const note = hydrationGoalNotice(
      { ...pending, status: "nao_atingida", closed_at: "2026-11-03T04:00:00Z" },
      Date.parse("2026-11-03T04:05:00Z"),
    );
    expect(note.kind).toBe("missed");
    expect(note.message).toContain("1.960 ml");
  });
  it("não marca ausência de meta como falha", () => {
    const note = hydrationGoalNotice(
      { goal_date: day, status: "sem_meta" },
      Date.parse("2026-11-03T04:05:00Z"),
    );
    expect(note.kind).toBe("unconfigured");
  });
});

describe("estimateNextHydration após consumo atrasado", () => {
  const H = 3_600_000;
  const base = Date.UTC(2026, 10, 20, 15, 0);
  it("conta do último líquido, não do horário programado", () => {
    const r = estimateNextHydration({
      remainingMl: 1500,
      lastIntakeAt: base,
      lastAmountMl: 250,
      now: base + 60_000,
      cutoff: base + 6 * H,
      recent: [{ at: base, ml: 250 }],
    })!;
    expect(r.at).toBeGreaterThanOrEqual(base + 30 * 60_000);
  });
  it("espaça mais quando bebeu muito na última hora", () => {
    const now = base + 20 * 60_000;
    const r = estimateNextHydration({
      remainingMl: 1500,
      lastIntakeAt: base + 15 * 60_000,
      lastAmountMl: 300,
      now,
      cutoff: base + 6 * H,
      recent: [
        { at: base, ml: 300 },
        { at: base + 15 * 60_000, ml: 300 },
      ],
    })!;
    const sum = 600;
    expect(sum).toBeGreaterThan(500);
    expect(r.at).toBeGreaterThanOrEqual(base + H);
  });
});
