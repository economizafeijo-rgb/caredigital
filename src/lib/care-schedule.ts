/** Confirmações de cuidados programados seguem a mesma janela do servidor (Supabase). */
export const CARE_CONFIRM_WINDOW_MS = 15 * 60 * 1000;

export type CareScheduleState = "confirmed" | "waiting" | "available" | "missed";
export type ScheduledCare = {scheduled_at: string; completed_at?: string | null};

export function getCareScheduleState(task: ScheduledCare, now = Date.now()): CareScheduleState {
  if (task.completed_at) return "confirmed";
  const scheduled = Date.parse(task.scheduled_at);
  if (!Number.isFinite(scheduled)) return "missed";
  if (now < scheduled) return "waiting";
  if (now >= scheduled + CARE_CONFIRM_WINDOW_MS) return "missed";
  return "available";
}

export const canConfirmCare = (task: ScheduledCare, now = Date.now()) =>
  getCareScheduleState(task, now) === "available";

export function careScheduleLabel(task: ScheduledCare, now = Date.now()): string {
  const state = getCareScheduleState(task, now);
  return state === "confirmed" ? "Confirmado"
    : state === "waiting" ? "Aguardando horário"
    : state === "available" ? "Disponível para confirmação"
    : "Não confirmado";
}

export function careScheduleBlockMessage(task: ScheduledCare, now = Date.now()): string {
  const state = getCareScheduleState(task, now);
  if (state === "waiting") {
    return "O horário programado ainda não chegou. Aguarde a liberação para registrar este cuidado. Nenhuma confirmação foi salva.";
  }
  if (state === "missed") {
    return "A janela de confirmação de 15 minutos após o horário programado foi encerrada. O cuidado permanecerá como “Não confirmado”. Não é possível realizar confirmação retroativa. Se for medicação, procure orientação do profissional responsável; não dobre a dose por conta própria.";
  }
  return state === "confirmed"
    ? "Este cuidado já está confirmado no prontuário."
    : "";
}
