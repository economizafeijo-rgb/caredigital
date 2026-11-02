/** UI-only reminders for real, scheduled patient tasks. No clinical conclusion is
 * inferred from a missing confirmation, and no records are altered here. */
export const CARE_REMINDER_WINDOW_MS = 10 * 60 * 1000;
/** Only the most recent, still unanswered events belong in the live banner. */
export const CARE_RECENT_UNANSWERED_MS = 2 * 60 * 60 * 1000;
export type ReminderCategory = "medicacao" | "hidratacao" | "refeicao" | "outro";
export type ReminderTask = {
  id: string;
  title: string;
  category: string;
  scheduled_at: string;
  completed_at: string | null;
};
export type ReminderState = "waiting" | "due" | "unconfirmed" | "confirmed" | "responded";
export type CareReminder = {
  task: ReminderTask;
  state: ReminderState;
  elapsedMs: number;
  remainingMs: number;
};
export type ReminderSummary = {
  primary: CareReminder | null;
  dueCount: number;
  unconfirmedCount: number;
  next: CareReminder | null;
};

export function careReminderState(task: ReminderTask, now: number, answeredTaskIds:ReadonlySet<string>=new Set()): ReminderState {
  if (task.completed_at) return "confirmed";
  // A client reply of "Não bebi" is an acknowledged event, never an unanswered
  // reminder. It must remain in the patient's history, not in the live banner.
  if (task.category === "hidratacao" && answeredTaskIds.has(task.id)) return "responded";
  const scheduled = Date.parse(task.scheduled_at);
  if (!Number.isFinite(scheduled)) return "waiting";
  if (now < scheduled) return "waiting";
  if (now - scheduled < CARE_REMINDER_WINDOW_MS) return "due";
  return "unconfirmed";
}

export function summarizeCareReminders(tasks: ReminderTask[], now: number, answeredTaskIds:ReadonlySet<string>=new Set()): ReminderSummary {
  const entries: CareReminder[] = tasks
    .filter(task => ["medicacao", "hidratacao", "refeicao", "outro"].includes(task.category))
    .filter(task => Number.isFinite(Date.parse(task.scheduled_at)))
    .map(task => {
      const scheduled = Date.parse(task.scheduled_at);
      return {
        task,
        state: careReminderState(task, now, answeredTaskIds),
        elapsedMs: Math.max(0, now - scheduled),
        remainingMs: Math.max(0, scheduled + CARE_REMINDER_WINDOW_MS - now),
      };
    });
  const due = entries.filter(entry => entry.state === "due")
    .sort((a,b) => Date.parse(a.task.scheduled_at) - Date.parse(b.task.scheduled_at));
  const unconfirmed = entries.filter(entry => entry.state === "unconfirmed" && entry.elapsedMs <= CARE_RECENT_UNANSWERED_MS)
    .sort((a,b) => Date.parse(b.task.scheduled_at) - Date.parse(a.task.scheduled_at));
  const future = entries.filter(entry => entry.state === "waiting")
    .sort((a,b) => Date.parse(a.task.scheduled_at) - Date.parse(b.task.scheduled_at));
  // Current reminders always outrank older unconfirmed items so a newly due
  // dose, drink or meal is never hidden by a morning task.
  return {
    primary: due[0] ?? unconfirmed[0] ?? null,
    dueCount: due.length,
    unconfirmedCount: unconfirmed.length,
    next: future[0] ?? null,
  };
}
export const reminderCategoryLabel = (category: string) =>
  category === "medicacao" ? "Medicação" :
  category === "hidratacao" ? "Hidratação" :
  category === "refeicao" ? "Alimentação" : "Cuidado programado";

export const reminderClock = (iso: string) => new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Rio_Branco", hour: "2-digit", minute: "2-digit", hour12: false,
}).format(new Date(iso));

export const reminderMmSs = (timeMs: number) => {
  const seconds = Math.max(0, Math.ceil(timeMs / 1000));
  return `${String(Math.floor(seconds/60)).padStart(2, "0")}:${String(seconds%60).padStart(2, "0")}`;
};
