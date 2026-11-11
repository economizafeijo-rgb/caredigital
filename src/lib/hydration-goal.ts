export type HydrationGoalStatus = "sem_meta" | "em_andamento" | "atingida" | "nao_atingida";
export type HydrationGoalSnapshot = {
  goal_date: string;
  status: HydrationGoalStatus;
  target_ml?: number;
  consumed_ml?: number;
  remaining_ml?: number;
  closed_at?: string | null;
  cutoff_local?: string;
};

const format = (amount: number) => Math.max(0, amount).toLocaleString("pt-BR");
export const acreCalendarDay = (value: string | number | Date) => {
  const dt = new Date(value);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Rio_Branco", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(dt);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  return [get("year"),get("month"),get("day")].join("-");
};
export function acreHour(value: string | number | Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Rio_Branco",hour:"2-digit",hourCycle:"h23",
  }).formatToParts(new Date(value));
  return Number(parts.find(part => part.type === "hour")?.value ?? "0");
}

export function hydrationGoalNotice(goal: HydrationGoalSnapshot | null, now: number): {
  kind: "met" | "missed" | "pending" | "unconfigured";
  title: string;
  message: string;
} {
  const target = goal?.target_ml ?? 0;
  const consumed = goal?.consumed_ml ?? 0;
  const remaining = Math.max(0, target-consumed);
  if (!goal || goal.status === "sem_meta" || target <= 0) {
    return {kind:"unconfigured",title:"Meta ainda não definida",
      message:"Defina uma meta individual para receber o resumo do dia às 23h."};
  }
  if (goal.status === "atingida") return {
    kind:"met",title:"Meta diária atingida",
    message:goal.closed_at
      ? `${format(consumed)} de ${format(target)} ml até as 23h. Resultado salvo no histórico de ${goal.goal_date.split("-").reverse().join("/")}.`
      : `${format(consumed)} de ${format(target)} ml registrados. O resultado aparecerá no histórico do dia.`
  };
  if (goal.status === "nao_atingida") return {
    kind:"missed",title:"Dia encerrado às 23h",
    message:`${format(consumed)} de ${format(target)} ml registrados; ${format(remaining)} ml abaixo da meta estimada. Resultado salvo no histórico de ${goal.goal_date.split("-").reverse().join("/")}.`
  };
  const reachedDeadline = acreCalendarDay(now)>goal.goal_date ||
    (acreCalendarDay(now)===goal.goal_date && acreHour(now)>=23);
  if (reachedDeadline) return {kind:"pending",title:"Fechamento das 23h",
    message:"Atualizando o resultado diário. Os consumos posteriores às 23h permanecem registrados, mas não alteram a meta encerrada."};
  return {kind:"pending",title:"Meta aberta até 23h",
    message:`${format(consumed)} de ${format(target)} ml · ${format(remaining)} ml restantes. Meta estimada, respeite suas necessidades e orientação profissional.`};
}

/**
 * Estima o horário e o volume da próxima hidratação a partir do último líquido
 * registrado, do volume restante da meta e do tempo disponível até o corte das 23h.
 * - Porções confortáveis de ~250 ml (máx. 350 ml);
 * - intervalo mínimo proporcional ao volume ingerido (~800 ml/h de absorção);
 * - intervalo máximo de 2h para manter a regularidade.
 */
export function estimateNextHydration(input: {
  remainingMl: number;
  lastIntakeAt: number | null;
  lastAmountMl: number;
  now: number;
  cutoff: number;
}): { at: number; suggestedMl: number; intervalMin: number; portions: number } | null {
  const { remainingMl, lastIntakeAt, lastAmountMl, now, cutoff } = input;
  if (remainingMl < 10 || now >= cutoff) return null;
  const from = lastIntakeAt ?? now;
  const portions = Math.max(1, Math.ceil(remainingMl / 250));
  const windowMin = Math.max(0, (cutoff - from) / 60_000);
  const minGap = Math.max(20, Math.round((lastAmountMl / 800) * 60));
  const spread = windowMin / portions;
  const intervalMin = lastIntakeAt ? Math.round(Math.min(120, Math.max(minGap, spread))) : 0;
  let at = from + intervalMin * 60_000;
  if (at < now) at = now;
  if (at > cutoff) at = cutoff;
  const suggestedMl = Math.min(350, Math.max(10, Math.round(remainingMl / portions / 10) * 10));
  return { at, suggestedMl, intervalMin, portions };
}
