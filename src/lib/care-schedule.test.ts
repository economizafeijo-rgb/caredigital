import {describe, expect, it} from "vitest";
import {CARE_CONFIRM_WINDOW_MS, canConfirmCare, careScheduleLabel, getCareScheduleState} from "./care-schedule";

const task = {scheduled_at: "2026-11-02T12:00:00.000Z", completed_at: null};
const start = Date.parse(task.scheduled_at);

describe("janela de confirmação de cuidados", () => {
  it("impede confirmação antes do horário", () => {
    expect(getCareScheduleState(task, start - 1)).toBe("waiting");
    expect(canConfirmCare(task, start - 1)).toBe(false);
  });
  it("permite o horário programado e os minutos da janela", () => {
    expect(canConfirmCare(task, start)).toBe(true);
    expect(canConfirmCare(task, start + CARE_CONFIRM_WINDOW_MS - 1)).toBe(true);
  });
  it("bloqueia confirmações retroativas e exibe não confirmado", () => {
    expect(canConfirmCare(task, start + CARE_CONFIRM_WINDOW_MS)).toBe(false);
    expect(careScheduleLabel(task, start + CARE_CONFIRM_WINDOW_MS)).toBe("Não confirmado");
  });
  it("mantém a confirmação já registrada", () => {
    expect(getCareScheduleState({...task, completed_at: task.scheduled_at}, start + 3000000)).toBe("confirmed");
  });
  it("nunca libera horário inválido", () => {
    expect(canConfirmCare({...task, scheduled_at: "invalido"}, start)).toBe(false);
  });
});
