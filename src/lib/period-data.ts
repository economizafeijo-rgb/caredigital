import { beverageNutrients } from "./beverage-nutrients";
import { isBeverageKind } from "./care-intake-categories";
/**
 * Acesso aos dados de qualquer período (dia, mês, ano) para o histórico e para o observador de metas.
 * Tabelas ainda não criadas no banco não derrubam a tela: a fonte vira vazia e é listada em `warnings`.
 */
import { supabase } from "@/integrations/supabase/client";
import { acreAddDays, acreEndOfDay, acreStartOfDay } from "./acre-time";
import {
  emptyRaw,
  goalObservation,
  type DoseEntry,
  type GoalMetric,
  type GoalResult,
  type GoalReview,
  type PeriodRaw,
  type PlanInfo,
  type Targets,
} from "./day-metrics";
import { acreDayHour } from "./day-metrics";
import { goalTargets, parseFoodText, sumNutrients } from "./food-parser";

const db = supabase as any;

export type PrefsInfo = {
  objective: string | null;
  weightKg: number | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  targetWeightKg: number | null;
};
export type PeriodData = { raw: PeriodRaw; prefs: PrefsInfo; warnings: string[] };

const num = (value: unknown) =>
  Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
const PAGE = 1000;

async function fetchAll(
  make: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>,
  maxPages = 12,
): Promise<{ rows: any[]; failed: boolean }> {
  const rows: any[] = [];
  for (let page = 0; page < maxPages; page += 1) {
    const result = await make(page * PAGE, page * PAGE + PAGE - 1);
    if (result.error) return { rows, failed: true };
    const data = result.data ?? [];
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return { rows, failed: false };
}

/** Metas efetivas: as do perfil quando existem; senão as de referência por objetivo e peso. */
export function resolveTargets(prefs: PrefsInfo, waterMl: number | null): Targets {
  const base = goalTargets(prefs.objective, prefs.weightKg);
  return {
    waterMl,
    objective: prefs.objective,
    targetWeightKg: prefs.targetWeightKg,
    kcal: prefs.kcal ?? base.kcal,
    protein: prefs.protein ?? base.protein,
    carbs: prefs.carbs ?? base.carbs,
    fat: prefs.fat ?? base.fat,
  };
}

export async function loadPeriodRaw(
  patientId: string,
  ownerId: string,
  from: string,
  to: string,
): Promise<PeriodData> {
  const raw = emptyRaw();
  const warnings: string[] = [];
  const startIso = acreStartOfDay(from).toISOString();
  const endIso = acreEndOfDay(to).toISOString();
  const scope = (query: any) => query.eq("patient_id", patientId).eq("owner_id", ownerId);
  const note = (name: string, failed: boolean) => {
    if (failed) warnings.push(name);
  };

  const [
    water,
    waterGoals,
    meals,
    mealLogs,
    activities,
    beverages,
    portions,
    supPlans,
    supIntakes,
    medPlans,
    medIntakes,
    checklist,
    sleep,
    weights,
    reviews,
    prefsRow,
  ] = await Promise.all([
    fetchAll((a, b) =>
      scope(db.from("care_hydration").select("amount_ml,recorded_at"))
        .gte("recorded_at", startIso)
        .lt("recorded_at", endIso)
        .order("recorded_at")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(db.from("care_hydration_daily_goals").select("goal_date,target_ml,consumed_ml,status"))
        .gte("goal_date", from)
        .lte("goal_date", to)
        .order("goal_date")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(
        db
          .from("care_activity_log")
          .select("happened_at,details,event_type")
          .eq("category", "refeicao")
          .in("event_type", ["confirmed", "logged"]),
      )
        .gte("happened_at", startIso)
        .lt("happened_at", endIso)
        .order("happened_at")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(
        db
          .from("care_nutrition_meal_logs")
          .select("request_id,meal_name,items,kcal,protein_g,carbs_g,fat_g,recorded_at"),
      )
        .gte("recorded_at", startIso)
        .lt("recorded_at", endIso)
        .order("recorded_at")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(
        db
          .from("care_activity_log")
          .select("happened_at,details")
          .eq("category", "atividade")
          .eq("event_type", "logged"),
      )
        .gte("happened_at", startIso)
        .lt("happened_at", endIso)
        .order("happened_at")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(db.from("care_client_beverages").select("name,kind,amount_ml,consumed_at"))
        .gte("consumed_at", startIso)
        .lt("consumed_at", endIso)
        .order("consumed_at")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(
        db
          .from("care_food_consumptions")
          .select("food_id,grams,kcal,protein_g,carbs_g,fat_g,recorded_at"),
      )
        .gte("recorded_at", startIso)
        .lt("recorded_at", endIso)
        .order("recorded_at")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(db.from("care_supplement_plans").select("id,name,dose,unit,times,active,created_at"))
        .order("created_at")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(db.from("care_supplement_intakes").select("plan_id,taken_on,slot,taken_at"))
        .gte("taken_on", from)
        .lte("taken_on", to)
        .order("taken_at")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(db.from("care_client_medications").select("id,name,dose,times,active,created_at"))
        .order("created_at")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(
        db.from("care_client_medication_intakes").select("medication_id,taken_on,slot,taken_at"),
      )
        .gte("taken_on", from)
        .lte("taken_on", to)
        .order("taken_at")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(
        db
          .from("care_daily_checklist")
          .select("title,category,scheduled_at,completed_at")
          .eq("category", "medicacao"),
      )
        .gte("scheduled_at", startIso)
        .lt("scheduled_at", endIso)
        .order("scheduled_at")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(db.from("care_sleep_logs").select("sleep_date,bed_at,wake_at,quality,awakenings"))
        .gte("sleep_date", from)
        .lte("sleep_date", to)
        .order("sleep_date")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(db.from("care_body_measurements").select("recorded_on,weight_kg"))
        .gte("recorded_on", from)
        .lte("recorded_on", to)
        .order("recorded_on")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(db.from("care_goal_reviews").select("day,metric,status,target,actual,unit,observation"))
        .gte("day", from)
        .lte("day", to)
        .order("day")
        .range(a, b),
    ),
    scope(db.from("care_nutrition_preferences").select("*")).maybeSingle(),
  ]);

  note("hidratação", water.failed);
  note("metas de hidratação", waterGoals.failed);
  note("refeições", meals.failed || mealLogs.failed);
  note("atividade", activities.failed);
  note("bebidas", beverages.failed);
  note("biblioteca alimentar", portions.failed);
  note("suplementos", supPlans.failed || supIntakes.failed);
  note("medicação", medPlans.failed || medIntakes.failed);
  note("agenda de medicação", checklist.failed);
  note("sono", sleep.failed);
  note("peso", weights.failed);
  note("observações das metas", reviews.failed);

  // Hidratação = água + outras bebidas (suco, chá, café, leite…), igual ao painel de hidratação.
  raw.water = [
    ...water.rows.map((row) => ({
      at: row.recorded_at,
      ml: Number(row.amount_ml) || 0,
      name: "Água",
    })),
    ...beverages.rows.map((row) => ({
      at: row.consumed_at,
      ml: Number(row.amount_ml) || 0,
      name: String(row.name || row.kind || "Bebida"),
    })),
  ].sort((a, b) => String(a.at).localeCompare(String(b.at)));
  raw.waterGoals = waterGoals.rows.map((row) => ({
    day: row.goal_date,
    target: Number(row.target_ml) || 0,
    consumed: Number(row.consumed_ml) || 0,
    status: row.status,
  }));

  const nutritionRequests = new Set(mealLogs.rows.map((row) => row.request_id).filter(Boolean));
  for (const row of meals.rows) {
    const requestId = typeof row.details?.request_id === "string" ? row.details.request_id : null;
    if (requestId && nutritionRequests.has(requestId)) continue;
    const text = String(row.details?.description || row.details?.title || "");
    const total = sumNutrients(parseFoodText(text).map((food) => food.nutrients));
    raw.foods.push({
      at: row.happened_at,
      label: text || "Refeição",
      source: row.event_type === "logged" ? "Refeição registrada" : "Refeição confirmada",
      kcal: total.kcal,
      protein: total.protein,
      carbs: total.carbs,
      fat: total.fat,
    });
  }
  for (const row of mealLogs.rows) {
    const items = Array.isArray(row.items) ? row.items.join(", ") : String(row.items ?? "");
    const text = [row.meal_name, items].filter(Boolean).join(": ");
    raw.foods.push({
      at: row.recorded_at,
      label: text || "Refeição",
      source: /reconstruído/i.test(String(row.meal_name))
        ? "Refeição reconstruída"
        : "Registro nutricional",
      kcal: Number(row.kcal) || 0,
      protein: Number(row.protein_g) || 0,
      carbs: Number(row.carbs_g) || 0,
      fat: Number(row.fat_g) || 0,
    });
  }
  for (const row of beverages.rows) {
    const text = String(row.name || row.kind || "Bebida");
    // Primeiro tenta reconhecer o alimento pelo nome; se não reconhecer, usa a estimativa do tipo de líquido.
    const named = parseFoodText(text, Number(row.amount_ml)).map((food) => food.nutrients);
    const byKind = isBeverageKind(String(row.kind))
      ? beverageNutrients(row.kind, Number(row.amount_ml))
      : null;
    const total = named.length
      ? sumNutrients(named)
      : (byKind ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    raw.foods.push({
      at: row.consumed_at,
      label: `${text} · ${Number(row.amount_ml)} ml`,
      source: "Bebida",
      kcal: total.kcal,
      protein: total.protein,
      carbs: total.carbs,
      fat: total.fat,
    });
  }
  for (const row of portions.rows) {
    raw.foods.push({
      at: row.recorded_at,
      label: `${String(row.food_id).replace(/_/g, " ")} · ${Number(row.grams)} g`,
      source: "Biblioteca alimentar",
      kcal: Number(row.kcal) || 0,
      protein: Number(row.protein_g) || 0,
      carbs: Number(row.carbs_g) || 0,
      fat: Number(row.fat_g) || 0,
    });
  }
  raw.activities = activities.rows.map((row) => ({
    at: row.happened_at,
    type: String(row.details?.activity_type ?? "atividade"),
    minutes: Number(row.details?.duration_minutes) || 0,
    km: row.details?.distance_km == null ? null : Number(row.details.distance_km),
  }));

  const planInfo = (row: any, kind: PlanInfo["kind"]): PlanInfo => ({
    id: row.id,
    name: String(row.name),
    dose: `${row.dose ?? ""}${row.unit ? ` ${row.unit}` : ""}`.trim(),
    times: Array.isArray(row.times) ? row.times : [],
    active: row.active !== false,
    createdDay: acreDayHour(row.created_at).day,
    kind,
  });
  raw.plans = [
    ...supPlans.rows.map((row) => planInfo(row, "suplemento")),
    ...medPlans.rows.map((row) => planInfo(row, "medicacao")),
  ];
  const nameOf = new Map(raw.plans.map((plan) => [plan.id, plan.name]));
  const dose = (
    row: any,
    ownerKey: "plan_id" | "medication_id",
    kind: DoseEntry["kind"],
  ): DoseEntry => ({
    at: row.taken_at,
    day: row.taken_on,
    name: nameOf.get(row[ownerKey]) ?? "Dose",
    slot: String(row.slot),
    kind,
  });
  raw.doses = [
    ...supIntakes.rows.map((row) => dose(row, "plan_id", "suplemento")),
    ...medIntakes.rows.map((row) => dose(row, "medication_id", "medicacao")),
  ];
  raw.tasks = checklist.rows.map((row) => ({
    day: acreDayHour(row.scheduled_at).day,
    category: String(row.category),
    title: String(row.title ?? "Medicação"),
    scheduledAt: row.scheduled_at,
    completedAt: row.completed_at ?? null,
  }));
  raw.sleep = sleep.rows.map((row) => {
    const hours = (Date.parse(row.wake_at) - Date.parse(row.bed_at)) / 3_600_000;
    return {
      day: row.sleep_date,
      hours: Number.isFinite(hours) ? hours : 0,
      quality: Number(row.quality) || 0,
      awakenings: Number(row.awakenings) || 0,
      bedAt: row.bed_at,
      wakeAt: row.wake_at,
    };
  });
  raw.weights = weights.rows
    .map((row) => ({ day: row.recorded_on, kg: Number(row.weight_kg) }))
    .filter((row) => Number.isFinite(row.kg));
  raw.reviews = reviews.rows.map((row) => ({
    day: row.day,
    metric: row.metric as GoalMetric,
    status: row.status,
    target: Number(row.target),
    actual: Number(row.actual),
    unit: row.unit,
    observation: row.observation,
  }));

  const p = prefsRow?.data ?? {};
  // Peso do primeiro cadastro: entra no histórico no dia do cadastro, se ainda não houver medida registrada até esse dia.
  const initialKg = Number(p.weight_kg);
  const createdIso = p.created_at ?? p.updated_at;
  if (Number.isFinite(initialKg) && initialKg >= 20 && initialKg <= 350 && createdIso) {
    const day = acreDayHour(createdIso).day;
    if (day >= from && day <= to && !raw.weights.some((row) => row.day <= day))
      raw.weights.unshift({ day, kg: initialKg });
  }
  const prefs: PrefsInfo = {
    objective: p.objective ?? null,
    weightKg: num(p.weight_kg),
    kcal: num(p.target_kcal),
    protein: num(p.target_protein_g),
    carbs: num(p.target_carbs_g),
    fat: num(p.target_fat_g),
    targetWeightKg: num(p.target_weight_kg),
  };
  return { raw, prefs, warnings };
}

/** Grava (ou atualiza) o resultado e a observação de cada meta. Idempotente por paciente + dia + meta. */
export async function saveGoalReviews(
  patientId: string,
  ownerId: string,
  items: { day: string; goal: GoalResult }[],
): Promise<{ saved: number; error: boolean }> {
  const final = items.filter(
    ({ goal }) => goal.status === "atingida" || goal.status === "nao_atingida",
  );
  if (!final.length) return { saved: 0, error: false };
  const auth = await supabase.auth.getUser();
  const uid = auth.data.user?.id;
  if (!uid) return { saved: 0, error: true };
  const now = new Date().toISOString();
  const rows = final.map(({ day, goal }) => ({
    patient_id: patientId,
    owner_id: ownerId,
    day,
    metric: goal.metric,
    status: goal.status,
    target: Math.max(0, goal.target),
    actual: Math.max(0, goal.actual),
    unit: goal.unit,
    observation: goalObservation(goal, day),
    created_by: uid,
    updated_at: now,
  }));
  const result = await db
    .from("care_goal_reviews")
    .upsert(rows, { onConflict: "patient_id,day,metric" });
  return result.error ? { saved: 0, error: true } : { saved: rows.length, error: false };
}

/** Quantos dias antes de `day` ainda vale reavaliar para registrar observações pendentes. */
export const REVIEW_LOOKBACK_DAYS = 30;
export const lookbackStart = (today: string) => acreAddDays(today, -REVIEW_LOOKBACK_DAYS);

export type { GoalReview };
