/** Refeições e hidratação admitem atraso; horários futuros continuam bloqueados. */
export const CARE_CONFIRM_WINDOW_MS = 15 * 60 * 1000;

export type CareScheduleState = "confirmed" | "waiting" | "available" | "missed";
export type ScheduledCare = {scheduled_at: string; completed_at?: string | null; category?: string};

export function getCareScheduleState(task: ScheduledCare, now = Date.now()): CareScheduleState {
  if (task.completed_at) return "confirmed";
  const scheduled = Date.parse(task.scheduled_at);
  if (!Number.isFinite(scheduled)) return "missed";
  if (now < scheduled) return "waiting";
  // Refeições e hidratação continuam registráveis após o horário, sempre com hora real do servidor.
  if (task.category === "refeicao" || task.category === "hidratacao") return "available";
  if (now >= scheduled + CARE_CONFIRM_WINDOW_MS) return "missed";
  return "available";
}

export const canConfirmCare = (task: ScheduledCare, now = Date.now()) =>
  getCareScheduleState(task, now) === "available";

export function careScheduleLabel(task: ScheduledCare, now = Date.now()): string {
  const state = getCareScheduleState(task, now);
  return state === "confirmed" ? "Confirmado"
    : state === "waiting" ? "Aguardando horário"
    : state === "available" ? ((task.category === "refeicao" || task.category === "hidratacao") && now >= Date.parse(task.scheduled_at) + CARE_CONFIRM_WINDOW_MS ? "Registro em atraso · hora real" : "Disponível para confirmação")
    : "Não confirmado";
}

export function careScheduleBlockMessage(task: ScheduledCare, now = Date.now()): string {
  const state = getCareScheduleState(task, now);
  if (state === "waiting") {
    return "O horário programado ainda não chegou. Aguarde a liberação para registrar este cuidado. Nenhuma confirmação foi salva.";
  }
  if (state === "missed") {
    return "O horário programado já passou. Se for medicação, confirme somente uma dose realmente tomada agora; caso contrário, procure orientação do profissional responsável. Não dobre a dose.";
  }
  return state === "confirmed"
    ? "Este cuidado já está confirmado no prontuário."
    : "";
}
