import { describe, expect, it } from "vitest";
import {
  careReminderState,
  mealAnswersTask,
  summarizeCareReminders,
  type ReminderTask,
} from "./care-reminders";

const at = (iso: string) => Date.parse(iso);
const meal: ReminderTask = {
  id: "t1",
  title: "Jantar",
  category: "refeicao",
  scheduled_at: "2026-11-20T23:00:00.000Z",
  completed_at: null,
};

describe("refeição registrada encerra o lembrete", () => {
  it("meal logged right after the reminder time resolves it", () => {
    expect(mealAnswersTask(meal, [at("2026-11-20T23:02:00.000Z")])).toBe(true);
  });

  it("meal logged up to 30 min before the reminder also resolves it", () => {
    expect(mealAnswersTask(meal, [at("2026-11-20T22:30:00.000Z")])).toBe(true);
  });

  it("meal far before the reminder does not resolve it", () => {
    expect(mealAnswersTask(meal, [at("2026-11-20T18:00:00.000Z")])).toBe(false);
  });

  it("meal long after the 2 h limit belongs to another reminder", () => {
    expect(mealAnswersTask(meal, [at("2026-11-21T02:00:00.000Z")])).toBe(false);
  });

  it("does not affect medication or hydration tasks", () => {
    expect(
      mealAnswersTask({ ...meal, category: "medicacao" }, [at("2026-11-20T23:02:00.000Z")]),
    ).toBe(false);
  });

  it("does not affect a task already confirmed", () => {
    expect(mealAnswersTask({ ...meal, completed_at: "x" }, [at("2026-11-20T23:02:00.000Z")])).toBe(
      false,
    );
  });

  it("answered task drops out of the live banner", () => {
    const now = at("2026-11-20T23:04:00.000Z");
    const answered = new Set(["t1"]);
    expect(careReminderState(meal, now, answered)).toBe("responded");
    expect(summarizeCareReminders([meal], now, answered).primary).toBeNull();
  });
});
