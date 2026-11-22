import { WATER_LAST_RECOMMENDED_HOUR } from "./nutrition-science";
import { COMFORT_ML_PER_HOUR } from "./hydration-need";
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
    timeZone: "America/Rio_Branco",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dt);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return [get("year"), get("month"), get("day")].join("-");
};
export function acreHour(value: string | number | Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Rio_Branco",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  return Number(parts.find((part) => part.type === "hour")?.value ?? "0");
}

export function hydrationGoalNotice(
  goal: HydrationGoalSnapshot | null,
  now: number,
): {
  kind: "met" | "missed" | "pending" | "unconfigured";
  title: string;
  message: string;
} {
  const target = goal?.target_ml ?? 0;
  const consumed = goal?.consumed_ml ?? 0;
  const remaining = Math.max(0, target - consumed);
  if (!goal || goal.status === "sem_meta" || target <= 0) {
    return {
      kind: "unconfigured",
      title: "Meta ainda não definida",
      message: "Defina uma meta individual para receber o resumo do dia ao final do dia.",
    };
  }
  if (goal.status === "atingida")
    return {
      kind: "met",
      title: "Meta diária atingida",
      message: goal.closed_at
        ? `${format(consumed)} de ${format(target)} ml no dia. Resultado salvo no histórico de ${goal.goal_date.split("-").reverse().join("/")}.`
        : `${format(consumed)} de ${format(target)} ml registrados. O resultado aparecerá no histórico do dia.`,
    };
  if (goal.status === "nao_atingida")
    return {
      kind: "missed",
      title: "Dia encerrado",
      message: `${format(consumed)} de ${format(target)} ml registrados; ${format(remaining)} ml abaixo da meta estimada. Resultado salvo no histórico de ${goal.goal_date.split("-").reverse().join("/")}.`,
    };
  const reachedDeadline = acreCalendarDay(now) > goal.goal_date;
  if (reachedDeadline)
    return {
      kind: "pending",
      title: "Fechamento do dia",
      message:
        "Atualizando o resultado diário. Todos os registros do dia, em qualquer horário, contam para a meta.",
    };
  return {
    kind: "pending",
    title: "Meta aberta",
    message: `${format(consumed)} de ${format(target)} ml · ${format(remaining)} ml restantes. Pode registrar a qualquer hora; o ideal é concluir até as ${WATER_LAST_RECOMMENDED_HOUR}h para não atrapalhar o sono. Meta estimada: respeite suas necessidades e a orientação profissional.`,
  };
}

/** Intervalo mínimo entre avisos de água: evita sobrecarregar a pessoa com lembretes. */
const MIN_GAP_MIN = 45;
/** Porção sugerida: um copo (100 a 300 ml), ou o que falta quando for menos que isso. */
const sipSize = (remainingMl: number, portions: number) =>
  Math.min(
    Math.max(10, Math.round(remainingMl)),
    Math.min(300, Math.max(100, Math.round(remainingMl / portions / 10) * 10)),
  );

/**
 * Estima o horário e o volume da próxima hidratação a partir do último líquido
 * registrado, do volume restante da meta e do tempo disponível até o horário ideal para concluir a água (padrão 20h).
 * Base científica: os rins eliminam cerca de 0,8 a 1 L de água por hora e acima de ~0,75 L/h
 * de forma contínua há risco de hiponatremia; por isso o ritmo fica em até 500 ml/h, com folga.
 * - Porções confortáveis de 100 a 300 ml (cerca de um copo);
 * - intervalo mínimo de 45 min e o necessário para o ritmo não passar de 500 ml/h;
 * - qualquer líquido registrado, a qualquer hora, recalcula o próximo horário a partir dele;
 * - intervalo máximo de 2h para manter a regularidade;
 * - `safeRemainingMl`: o máximo que cabe até o horário-limite sem passar de 500 ml/h. Se o restante for maior,
 *   `reachable` é falso: não se deve compensar bebendo de uma vez.
 */
export function estimateNextHydration(input: {
  remainingMl: number;
  lastIntakeAt: number | null;
  lastAmountMl: number;
  now: number;
  cutoff: number;
  /** Líquidos registrados recentemente (qualquer horário, mesmo fora do programado). */
  recent?: { at: number; ml: number }[];
}): {
  at: number;
  suggestedMl: number;
  intervalMin: number;
  portions: number;
  reachable: boolean;
  safeRemainingMl: number;
} | null {
  const { remainingMl, lastIntakeAt, lastAmountMl, now, cutoff, recent = [] } = input;
  if (remainingMl < 10 || now >= cutoff) return null;
  const from = lastIntakeAt ?? now;
  const portions = Math.max(1, Math.ceil(remainingMl / 250));
  // O tempo que ainda existe até o horário-limite conta a partir de agora (ou do último gole, se for mais tarde),
  // nunca de um gole antigo: assim o ritmo sempre mira o fim da meta sem acumular atraso.
  const windowMin = Math.max(0, (cutoff - Math.max(now, from)) / 60_000);
  const minGap = Math.max(MIN_GAP_MIN, Math.round((lastAmountMl / COMFORT_ML_PER_HOUR) * 60));
  const spread = windowMin / portions;
  const intervalMin = lastIntakeAt ? Math.round(Math.min(120, Math.max(minGap, spread))) : 0;
  let at = from + intervalMin * 60_000;
  if (at < now) at = now;
  const suggested = sipSize(remainingMl, portions);
  // Janela móvel de 1 h: o próximo copo só vem quando o que já foi bebido na última hora,
  // somado à porção sugerida, cabe no ritmo confortável (protege os rins após beber atrasado ou muito de uma vez).
  const inLastHour = (t: number) =>
    recent.filter((r) => r.at > t - 3_600_000 && r.at <= t).reduce((sum, r) => sum + r.ml, 0);
  const sorted = [...recent].sort((a, b) => a.at - b.at);
  while (at < cutoff && inLastHour(at) + suggested > COMFORT_ML_PER_HOUR) {
    const next = sorted.find((r) => r.at + 3_600_000 > at);
    if (!next) break;
    at = Math.max(at + 60_000, next.at + 3_600_000 + 1000);
  }
  if (at > cutoff) at = cutoff;
  const suggestedMl = suggested;
  const safeRemainingMl =
    Math.round(
      ((Math.max(0, cutoff - Math.max(now, from)) / 3_600_000) * COMFORT_ML_PER_HOUR) / 10,
    ) * 10;
  return {
    at,
    suggestedMl,
    intervalMin,
    portions,
    reachable: remainingMl <= safeRemainingMl,
    safeRemainingMl,
  };
}

export type HydrationDose = { at: number; ml: number };

/**
 * Plano completo das doses que faltam até o horário-limite.
 * Simula cada dose sendo tomada no horário sugerido e recalcula a seguinte, então o plano sempre:
 * termina a meta até o horário ideal (se couber), mantém no máximo 500 ml em qualquer hora corrida
 * e nunca pede para compensar atraso bebendo tudo de uma vez.
 * `unreachableMl` é o quanto da meta NÃO cabe com segurança até o limite.
 */
export function planHydrationSchedule(input: {
  remainingMl: number;
  lastIntakeAt: number | null;
  lastAmountMl: number;
  now: number;
  cutoff: number;
  recent?: { at: number; ml: number }[];
}): { doses: HydrationDose[]; reachable: boolean; safeRemainingMl: number; unreachableMl: number } {
  let remaining = Math.max(0, input.remainingMl);
  let lastAt = input.lastIntakeAt;
  let lastMl = input.lastAmountMl;
  let now = input.now;
  const recent = [...(input.recent ?? [])];
  const doses: HydrationDose[] = [];
  const first = estimateNextHydration({ ...input, remainingMl: remaining, recent });
  for (let i = 0; i < 40 && remaining >= 10; i += 1) {
    const step = estimateNextHydration({
      remainingMl: remaining,
      lastIntakeAt: lastAt,
      lastAmountMl: lastMl,
      now,
      cutoff: input.cutoff,
      recent,
    });
    if (!step || step.at > input.cutoff) break;
    doses.push({ at: step.at, ml: step.suggestedMl });
    recent.push({ at: step.at, ml: step.suggestedMl });
    remaining -= step.suggestedMl;
    lastAt = step.at;
    lastMl = step.suggestedMl;
    now = Math.max(now, step.at);
  }
  const planned = doses.reduce((sum, d) => sum + d.ml, 0);
  return {
    doses,
    reachable: remaining < 10,
    safeRemainingMl: first?.safeRemainingMl ?? 0,
    unreachableMl: Math.max(0, Math.round(input.remainingMl - planned)),
  };
}
