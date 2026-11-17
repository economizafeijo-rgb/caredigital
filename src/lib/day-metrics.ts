/**
 * Métricas do dia (24 h), metas e observações.
 *
 * Tudo aqui é puro e testável: recebe registros brutos e devolve, para cada dia (calendário do Acre),
 * o que foi consumido por hora, o resultado de cada meta e a observação a registrar quando ela não é atingida.
 */
import { acreAddDays, DAY_CUTOFF_HOUR } from "./acre-time";

export const SLEEP_GOAL_HOURS = 8;

export type GoalMetric = "hidratacao" | "calorias" | "proteina" | "suplementos" | "medicacao" | "sono";
export type GoalStatus = "atingida" | "nao_atingida" | "em_andamento" | "sem_registro" | "sem_meta";
export type DaySummary = "ok" | "partial" | "miss" | "open" | "empty" | "future";

export const GOAL_METRICS: GoalMetric[] = ["hidratacao", "calorias", "proteina", "suplementos", "medicacao", "sono"];
export const GOAL_INFO: Record<GoalMetric, { label: string; unit: string; noun: string }> = {
  hidratacao: { label: "Hidratação", unit: "ml", noun: "meta de hidratação" },
  calorias: { label: "Calorias", unit: "kcal", noun: "meta de calorias" },
  proteina: { label: "Proteínas", unit: "g", noun: "meta de proteínas" },
  suplementos: { label: "Suplementos", unit: "doses", noun: "doses de suplementos" },
  medicacao: { label: "Medicação", unit: "doses", noun: "doses de medicação" },
  sono: { label: "Sono", unit: "h", noun: "meta de sono" },
};

/* ---------------------------- registros brutos ---------------------------- */

export type WaterEntry = { at: string; ml: number };
export type FoodEntry = { at: string; label: string; source: string; kcal: number; protein: number; carbs: number; fat: number };
export type DoseEntry = { at: string; day: string; name: string; slot: string; kind: "suplemento" | "medicacao" };
export type TaskEntry = { day: string; category: string; title: string; scheduledAt: string; completedAt: string | null };
export type SleepEntry = { day: string; hours: number; quality: number; awakenings: number; bedAt: string; wakeAt: string };
export type ActivityEntry = { at: string; type: string; minutes: number; km: number | null };
export type WeightEntry = { day: string; kg: number };
export type PlanInfo = { id: string; name: string; dose: string; times: string[]; active: boolean; createdDay: string; kind: "suplemento" | "medicacao" };
export type WaterGoalRow = { day: string; target: number; consumed: number; status: string };
export type GoalReview = { day: string; metric: GoalMetric; status: "atingida" | "nao_atingida"; target: number; actual: number; unit: string; observation: string };

export type PeriodRaw = {
  water: WaterEntry[];
  waterGoals: WaterGoalRow[];
  foods: FoodEntry[];
  doses: DoseEntry[];
  plans: PlanInfo[];
  tasks: TaskEntry[];
  sleep: SleepEntry[];
  activities: ActivityEntry[];
  weights: WeightEntry[];
  reviews: GoalReview[];
};
export const emptyRaw = (): PeriodRaw => ({ water: [], waterGoals: [], foods: [], doses: [], plans: [], tasks: [], sleep: [], activities: [], weights: [], reviews: [] });

export type Targets = {
  waterMl: number | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  objective: string | null;
  targetWeightKg: number | null;
};
export type Ctx = { targets: Targets; nowMs: number };

/* ------------------------------- resultados ------------------------------- */

export type GoalResult = {
  metric: GoalMetric;
  label: string;
  unit: string;
  target: number;
  actual: number;
  pct: number;
  status: GoalStatus;
  /** Critério usado, mostrado ao usuário para ele entender como a meta é avaliada. */
  rule: string;
  /** Verdadeiro quando o resultado não pode mais piorar durante o dia (pode ser registrado na hora). */
  monotonic: boolean;
};

export type Hour = { water: number; kcal: number; protein: number; carbs: number; fat: number };
export type DayMetrics = {
  day: string;
  closed: boolean;
  future: boolean;
  hasData: boolean;
  /** Água somada nas 24 horas do dia: todos os registros contam para a meta. */
  waterMl: number;
  /** Igual a waterMl (mantido por compatibilidade com as telas). */
  waterAllMl: number;
  hours: Hour[];
  foods: FoodEntry[];
  water: WaterEntry[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  supplements: { planned: number; taken: number; entries: DoseEntry[] };
  medication: { planned: number; taken: number; entries: DoseEntry[]; tasks: TaskEntry[] };
  sleep: SleepEntry | null;
  weightKg: number | null;
  activityMinutes: number;
  activityKm: number;
  goals: GoalResult[];
  /** Percentual das metas avaliadas que foram atingidas; null se nenhuma foi avaliada. */
  score: number | null;
  summary: DaySummary;
  reviews: GoalReview[];
};

/* --------------------------------- tempo --------------------------------- */

const partsFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Rio_Branco", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
});
/** Dia (YYYY-MM-DD) e hora (0-23) de um instante, sempre no fuso do Acre. */
export function acreDayHour(at: string | number | Date): { day: string; hour: number } {
  const parts = partsFormat.formatToParts(new Date(at));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24 };
}

export const isDayKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
export const longDay = (day: string) => day.split("-").reverse().join("/");
export const monthKey = (day: string) => day.slice(0, 7);

export function periodDays(from: string, to: string): string[] {
  const list: string[] = [];
  for (let day = from; day <= to && list.length < 800; day = acreAddDays(day, 1)) list.push(day);
  return list;
}
export function monthRange(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}` };
}
export const yearRange = (year: number) => ({ from: `${year}-01-01`, to: `${year}-12-31` });
export const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const monthLabel = (year: number, month: number) => `${MONTH_NAMES[month - 1]} de ${year}`;

/** Calendário do mês em semanas de domingo a sábado; dias fora do mês ficam null. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const { from, to } = monthRange(year, month);
  const lead = new Date(`${from}T12:00:00Z`).getUTCDay();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  cells.push(...periodDays(from, to));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/* --------------------------------- metas --------------------------------- */

const nf = (value: number, digits = 0) => value.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const pctOf = (actual: number, target: number) => (target > 0 ? Math.round((actual / target) * 100) : 0);
const hm = (hours: number) => `${Math.floor(hours)}h${String(Math.round((hours % 1) * 60)).padStart(2, "0")}`;

/** Faixa aceita para as calorias, conforme o objetivo do usuário. */
export function kcalBand(objective: string | null): { min: number; max: number; rule: string } {
  if (objective === "emagrecimento") return { min: 0.8, max: 1.05, rule: "entre 80% e 105% da meta (sem passar dela)" };
  if (objective === "ganho_peso" || objective === "hipertrofia") return { min: 0.9, max: Infinity, rule: "pelo menos 90% da meta" };
  return { min: 0.9, max: 1.1, rule: "entre 90% e 110% da meta" };
}

type Slot = {
  water: WaterEntry[]; foods: FoodEntry[]; doses: DoseEntry[]; tasks: TaskEntry[]; sleep: SleepEntry | null;
  activities: ActivityEntry[]; weight: number | null; waterGoal: WaterGoalRow | null; reviews: GoalReview[];
};
const newSlot = (): Slot => ({ water: [], foods: [], doses: [], tasks: [], sleep: null, activities: [], weight: null, waterGoal: null, reviews: [] });

function indexRaw(raw: PeriodRaw): Map<string, Slot> {
  const map = new Map<string, Slot>();
  const slot = (day: string) => { let s = map.get(day); if (!s) { s = newSlot(); map.set(day, s); } return s; };
  for (const row of raw.water) slot(acreDayHour(row.at).day).water.push(row);
  for (const row of raw.foods) slot(acreDayHour(row.at).day).foods.push(row);
  for (const row of raw.doses) slot(row.day).doses.push(row);
  for (const row of raw.tasks) slot(row.day).tasks.push(row);
  for (const row of raw.sleep) slot(row.day).sleep = row;
  for (const row of raw.activities) slot(acreDayHour(row.at).day).activities.push(row);
  for (const row of raw.weights) slot(row.day).weight = row.kg;
  for (const row of raw.waterGoals) slot(row.day).waterGoal = row;
  for (const row of raw.reviews) slot(row.day).reviews.push(row);
  return map;
}

function buildOne(index: Map<string, Slot>, plans: PlanInfo[], day: string, ctx: Ctx): DayMetrics {
  const s = index.get(day) ?? newSlot();
  const now = acreDayHour(ctx.nowMs);
  const future = day > now.day;
  const closed = day < now.day || (day === now.day && now.hour >= DAY_CUTOFF_HOUR);

  const hours: Hour[] = Array.from({ length: 24 }, () => ({ water: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 }));
  let waterMl = 0;
  let waterAllMl = 0;
  for (const entry of s.water) {
    const { hour } = acreDayHour(entry.at);
    hours[hour].water += entry.ml;
    waterAllMl += entry.ml;
    waterMl += entry.ml; // a janela de registro é de 24 h; o horário ideal é só uma orientação
  }
  const counted = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const food of s.foods) {
    const { hour } = acreDayHour(food.at);
    hours[hour].kcal += food.kcal; hours[hour].protein += food.protein; hours[hour].carbs += food.carbs; hours[hour].fat += food.fat;
    // Refeições contam somente até o fechamento do dia, como no painel do dia.
    if (hour < DAY_CUTOFF_HOUR) { counted.kcal += food.kcal; counted.protein += food.protein; counted.carbs += food.carbs; counted.fat += food.fat; }
  }
  // A meta de água oficial vem do servidor quando existe (mesma regra, fonte única).
  if (s.waterGoal) waterMl = Math.max(waterMl, s.waterGoal.consumed);

  const unique = (list: DoseEntry[]) => new Map(list.map((dose) => [`${dose.name}|${dose.slot}`, dose])).size;
  const supplementDoses = s.doses.filter((dose) => dose.kind === "suplemento");
  const medDoses = s.doses.filter((dose) => dose.kind === "medicacao");
  const medTasks = s.tasks.filter((task) => task.category === "medicacao");
  const plannedFor = (kind: PlanInfo["kind"]) => plans.filter((plan) => plan.kind === kind && plan.active && plan.createdDay <= day).reduce((total, plan) => total + plan.times.length, 0);
  const supplementsPlanned = plannedFor("suplemento");
  const supplementsTaken = unique(supplementDoses);
  const medicationPlanned = plannedFor("medicacao") + medTasks.length;
  const medicationTaken = unique(medDoses) + medTasks.filter((task) => task.completedAt).length;

  const activityMinutes = s.activities.reduce((total, item) => total + item.minutes, 0);
  const activityKm = s.activities.reduce((total, item) => total + (item.km ?? 0), 0);
  const hasData = s.water.length + s.foods.length + s.doses.length + s.activities.length > 0
    || s.tasks.some((task) => task.completedAt) || s.sleep !== null || s.weight !== null;

  const goals: GoalResult[] = [];
  const { targets } = ctx;
  const finish = (status: GoalStatus, met: boolean): GoalStatus => (met ? "atingida" : !hasData && closed ? "sem_registro" : closed ? "nao_atingida" : status);

  // Hidratação: a meta do servidor do dia vence a meta atual (a meta pode ter mudado ao longo do tempo).
  const waterTarget = s.waterGoal?.target ?? (day >= now.day ? targets.waterMl : null);
  if (waterTarget && waterTarget > 0) {
    goals.push({
      metric: "hidratacao", label: GOAL_INFO.hidratacao.label, unit: "ml", target: waterTarget, actual: waterMl, pct: pctOf(waterMl, waterTarget),
      status: waterMl >= waterTarget ? "atingida" : !hasData && day < now.day ? "sem_registro" : day < now.day ? "nao_atingida" : "em_andamento",
      rule: "beber a meta de água ao longo do dia (registros liberados nas 24 horas)", monotonic: true,
    });
  }
  if (targets.kcal && targets.kcal > 0 && !future) {
    const band = kcalBand(targets.objective);
    const inBand = counted.kcal >= targets.kcal * band.min && counted.kcal <= targets.kcal * band.max;
    // Em faixa com teto, só dá para afirmar o resultado ao fechar o dia; sem teto, o resultado só melhora.
    const monotonic = band.max === Infinity;
    goals.push({
      metric: "calorias", label: GOAL_INFO.calorias.label, unit: "kcal", target: targets.kcal, actual: Math.round(counted.kcal), pct: pctOf(counted.kcal, targets.kcal),
      status: monotonic ? finish("em_andamento", inBand) : closed ? (!hasData ? "sem_registro" : inBand ? "atingida" : "nao_atingida") : "em_andamento",
      rule: band.rule, monotonic,
    });
  }
  if (targets.protein && targets.protein > 0 && !future) {
    const met = counted.protein >= targets.protein * 0.9;
    goals.push({
      metric: "proteina", label: GOAL_INFO.proteina.label, unit: "g", target: targets.protein, actual: Math.round(counted.protein), pct: pctOf(counted.protein, targets.protein),
      status: finish("em_andamento", met), rule: "pelo menos 90% da meta de proteínas", monotonic: true,
    });
  }
  if (supplementsPlanned > 0) {
    goals.push({
      metric: "suplementos", label: GOAL_INFO.suplementos.label, unit: "doses", target: supplementsPlanned, actual: supplementsTaken, pct: pctOf(supplementsTaken, supplementsPlanned),
      status: finish("em_andamento", supplementsTaken >= supplementsPlanned), rule: "tomar todas as doses programadas", monotonic: true,
    });
  }
  if (medicationPlanned > 0) {
    goals.push({
      metric: "medicacao", label: GOAL_INFO.medicacao.label, unit: "doses", target: medicationPlanned, actual: medicationTaken, pct: pctOf(medicationTaken, medicationPlanned),
      status: finish("em_andamento", medicationTaken >= medicationPlanned), rule: "confirmar todas as doses programadas", monotonic: true,
    });
  }
  if (!future) {
    if (s.sleep) {
      const met = s.sleep.hours >= SLEEP_GOAL_HOURS * 0.9;
      goals.push({
        metric: "sono", label: GOAL_INFO.sono.label, unit: "h", target: SLEEP_GOAL_HOURS, actual: Number(s.sleep.hours.toFixed(2)), pct: pctOf(s.sleep.hours, SLEEP_GOAL_HOURS),
        status: met ? "atingida" : "nao_atingida", rule: "dormir pelo menos 90% das 8 horas de meta", monotonic: false,
      });
    } else if (closed && hasData) {
      goals.push({ metric: "sono", label: GOAL_INFO.sono.label, unit: "h", target: SLEEP_GOAL_HOURS, actual: 0, pct: 0, status: "sem_registro", rule: "dormir pelo menos 90% das 8 horas de meta", monotonic: false });
    }
  }

  // Dias que ainda não chegaram não têm metas para avaliar (nem pontos no calendário).
  if (future) goals.length = 0;
  const evaluated = goals.filter((goal) => goal.status === "atingida" || goal.status === "nao_atingida");
  const met = evaluated.filter((goal) => goal.status === "atingida").length;
  const score = evaluated.length ? Math.round((met / evaluated.length) * 100) : null;
  const pending = goals.filter((goal) => goal.status === "em_andamento").length;
  const summary: DaySummary = future ? "future"
    : evaluated.length === 0 ? (!closed && hasData ? "open" : "empty")
      : !closed && (pending > 0 || met < evaluated.length) ? "open"
        : met === evaluated.length ? "ok" : met === 0 ? "miss" : "partial";

  return {
    day, closed, future, hasData, waterMl, waterAllMl, hours, foods: s.foods.slice().sort((a, b) => a.at.localeCompare(b.at)),
    water: s.water.slice().sort((a, b) => a.at.localeCompare(b.at)),
    kcal: Math.round(counted.kcal), protein: Math.round(counted.protein), carbs: Math.round(counted.carbs), fat: Math.round(counted.fat),
    supplements: { planned: supplementsPlanned, taken: supplementsTaken, entries: supplementDoses },
    medication: { planned: medicationPlanned, taken: medicationTaken, entries: medDoses, tasks: medTasks },
    sleep: s.sleep, weightKg: s.weight, activityMinutes, activityKm, goals, score, summary, reviews: s.reviews,
  };
}

export function buildDays(raw: PeriodRaw, from: string, to: string, ctx: Ctx): DayMetrics[] {
  const index = indexRaw(raw);
  return periodDays(from, to).map((day) => buildOne(index, raw.plans, day, ctx));
}
export const buildDay = (raw: PeriodRaw, day: string, ctx: Ctx) => buildDays(raw, day, day, ctx)[0];

/* ------------------------------ observações ------------------------------- */

/** Texto da observação registrada quando uma meta não é atingida (ou da conquista, quando é atingida). */
export function goalObservation(goal: GoalResult, day: string): string {
  const date = longDay(day);
  const missing = Math.max(0, goal.target - goal.actual);
  if (goal.status === "atingida") {
    return `${GOAL_INFO[goal.metric].noun[0].toUpperCase()}${GOAL_INFO[goal.metric].noun.slice(1)} atingida em ${date}: ${goalValue(goal)} (${goal.pct}%).`;
  }
  switch (goal.metric) {
    case "hidratacao":
      return `Meta de hidratação não atingida em ${date}: ${nf(goal.actual)} de ${nf(goal.target)} ml (${goal.pct}%). Faltaram ${nf(missing)} ml.`;
    case "calorias": {
      const diff = Math.round(goal.actual - goal.target);
      return `Meta de calorias não atingida em ${date}: ${nf(goal.actual)} de ${nf(goal.target)} kcal (${goal.pct}%), ${nf(Math.abs(diff))} kcal ${diff < 0 ? "abaixo" : "acima"} da meta.`;
    }
    case "proteina":
      return `Meta de proteínas não atingida em ${date}: ${nf(goal.actual)} de ${nf(goal.target)} g (${goal.pct}%). Faltaram ${nf(missing)} g.`;
    case "suplementos":
      return `Doses de suplementos incompletas em ${date}: ${nf(goal.actual)} de ${nf(goal.target)} tomadas. Faltaram ${nf(missing)}.`;
    case "medicacao":
      return `Atenção: ${nf(goal.actual)} de ${nf(goal.target)} doses de medicação confirmadas em ${date}. ${nf(missing)} sem confirmação.`;
    case "sono":
      return `Sono abaixo da meta em ${date}: ${hm(goal.actual)} dormidas de ${goal.target} h (${goal.pct}%).`;
  }
}

export function goalValue(goal: Pick<GoalResult, "metric" | "actual" | "target" | "unit">): string {
  if (goal.metric === "sono") return `${hm(goal.actual)} de ${goal.target} h`;
  if (goal.unit === "doses") return `${nf(goal.actual)} de ${nf(goal.target)} doses`;
  return `${nf(goal.actual)} de ${nf(goal.target)} ${goal.unit}`;
}

/* ------------------------------- resumos ---------------------------------- */

export type PeriodSummary = {
  days: number;
  daysWithData: number;
  daysEvaluated: number;
  daysAllMet: number;
  goalsEvaluated: number;
  goalsMet: number;
  goalsMissed: number;
  avgWaterMl: number | null;
  avgKcal: number | null;
  avgProtein: number | null;
  avgSleepHours: number | null;
  supplementAdherence: number | null;
  medicationAdherence: number | null;
  activityMinutes: number;
  weightFirst: number | null;
  weightLast: number | null;
};

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export function summarize(days: DayMetrics[]): PeriodSummary {
  const active = days.filter((day) => day.hasData);
  const evaluated = days.filter((day) => day.score !== null);
  const all = days.flatMap((day) => day.goals).filter((goal) => goal.status === "atingida" || goal.status === "nao_atingida");
  const adherence = (pick: (day: DayMetrics) => { planned: number; taken: number }) => {
    const rows = days.map(pick).filter((row) => row.planned > 0);
    const planned = rows.reduce((total, row) => total + row.planned, 0);
    return planned ? Math.round((rows.reduce((total, row) => total + Math.min(row.taken, row.planned), 0) / planned) * 100) : null;
  };
  const weights = days.filter((day) => day.weightKg !== null).map((day) => day.weightKg as number);
  const round = (value: number | null) => (value === null ? null : Math.round(value));
  return {
    days: days.length,
    daysWithData: active.length,
    daysEvaluated: evaluated.length,
    daysAllMet: evaluated.filter((day) => day.summary === "ok").length,
    goalsEvaluated: all.length,
    goalsMet: all.filter((goal) => goal.status === "atingida").length,
    goalsMissed: all.filter((goal) => goal.status === "nao_atingida").length,
    avgWaterMl: round(mean(active.filter((day) => day.waterMl > 0).map((day) => day.waterMl))),
    avgKcal: round(mean(active.filter((day) => day.kcal > 0).map((day) => day.kcal))),
    avgProtein: round(mean(active.filter((day) => day.protein > 0).map((day) => day.protein))),
    avgSleepHours: (() => { const value = mean(days.filter((day) => day.sleep).map((day) => day.sleep!.hours)); return value === null ? null : Number(value.toFixed(1)); })(),
    supplementAdherence: adherence((day) => day.supplements),
    medicationAdherence: adherence((day) => day.medication),
    activityMinutes: days.reduce((total, day) => total + day.activityMinutes, 0),
    weightFirst: weights[0] ?? null,
    weightLast: weights.length ? weights[weights.length - 1] : null,
  };
}

/** Um resumo por mês (1-12) do ano, para a visão anual. */
export function monthlySummaries(days: DayMetrics[]): { month: number; summary: PeriodSummary; days: DayMetrics[] }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const key = `${days[0]?.day.slice(0, 4) ?? "0000"}-${String(i + 1).padStart(2, "0")}`;
    const list = days.filter((day) => monthKey(day.day) === key);
    return { month: i + 1, summary: summarize(list), days: list };
  });
}

export const summaryTone: Record<DaySummary, { label: string; cell: string; dot: string }> = {
  ok: { label: "Todas as metas atingidas", cell: "bg-emerald-500/15 text-emerald-800 ring-emerald-500/40 dark:text-emerald-200", dot: "bg-emerald-500" },
  partial: { label: "Metas parciais", cell: "bg-amber-500/15 text-amber-800 ring-amber-500/40 dark:text-amber-200", dot: "bg-amber-500" },
  miss: { label: "Metas não atingidas", cell: "bg-rose-500/15 text-rose-800 ring-rose-500/40 dark:text-rose-200", dot: "bg-rose-500" },
  open: { label: "Dia em andamento", cell: "bg-sky-500/15 text-sky-800 ring-sky-500/40 dark:text-sky-200", dot: "bg-sky-500" },
  empty: { label: "Sem registros", cell: "bg-muted/50 text-muted-foreground ring-transparent", dot: "bg-muted-foreground/30" },
  future: { label: "Ainda não chegou", cell: "bg-transparent text-muted-foreground/50 ring-transparent", dot: "bg-transparent" },
};
