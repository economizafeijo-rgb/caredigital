import { describe, expect, it } from "vitest";
import { acreCalendarDay, acreHour, hydrationGoalNotice, type HydrationGoalSnapshot } from "./hydration-goal";

const day = "2026-11-02";
const pending: HydrationGoalSnapshot = {
  goal_date: day, status: "em_andamento", target_ml: 2550, consumed_ml: 590,
  remaining_ml: 1960, closed_at: null, cutoff_local: "23:00",
};
describe("Fechamento diário da hidratação às 23h no Acre",()=>{
  it("respeita a data do Acre, sem usar a data UTC",()=>{
    expect(acreCalendarDay("2026-11-03T03:59:59Z")).toBe("2026-11-02");
    expect(acreHour("2026-11-03T03:59:59Z")).toBe(22);
    expect(acreCalendarDay("2026-11-03T04:00:00Z")).toBe("2026-11-02");
    expect(acreHour("2026-11-03T04:00:00Z")).toBe(23);
    expect(acreCalendarDay("2026-11-03T05:00:00Z")).toBe("2026-11-03");
  });
  it("não declara falha antes das 23h",()=>{
    const note=hydrationGoalNotice(pending,Date.parse("2026-11-03T03:59:59Z"));
    expect(note.kind).toBe("pending");
    expect(note.message).toContain("1.960");
  });
  it("indica fechamento em processamento após 23h até confirmação do servidor",()=>{
    const note=hydrationGoalNotice(pending,Date.parse("2026-11-03T04:00:01Z"));
    expect(note.kind).toBe("pending");
    expect(note.title).toContain("Fechamento");
  });
  it("mostra meta atingida com valores e data, sem aviso chamativo",()=>{
    const note=hydrationGoalNotice({...pending,status:"atingida",consumed_ml:2650,closed_at:"2026-11-03T04:00:00Z"},
      Date.parse("2026-11-03T04:05:00Z"));
    expect(note.kind).toBe("met");
    expect(note.message).toContain("2.650 de 2.550");
    expect(note.message).toContain("02/11/2026");
  });
  it("mostra o déficit de um dia encerrado, sem recomendar beber em excesso",()=>{
    const note=hydrationGoalNotice({...pending,status:"nao_atingida",closed_at:"2026-11-03T04:00:00Z"},
      Date.parse("2026-11-03T04:05:00Z"));
    expect(note.kind).toBe("missed");
    expect(note.message).toContain("1.960 ml");
  });
  it("não marca ausência de meta como falha",()=>{
    const note=hydrationGoalNotice({goal_date:day,status:"sem_meta"},Date.parse("2026-11-03T04:05:00Z"));
    expect(note.kind).toBe("unconfigured");
  });
});
