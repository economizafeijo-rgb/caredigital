import { useEffect, useState } from "react";
import {
  Activity,
  BedDouble,
  Droplets,
  Pill,
  Scale,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { MetricPanel } from "./MetricChart";
import { supabase } from "@/integrations/supabase/client";

type Point = { day: string; value: number; protein?: number; carbs?: number; fat?: number };
type Metrics = {
  hydration: Point[];
  weight: Point[];
  macros: Point[];
  energy: Point[];
  sleep: Point[];
  activity: Point[];
  medicationCount: number;
  supplementCount: number;
  hasSleepData: boolean;
  hasActivityData: boolean;
};
const db = supabase as any;
const label = (day: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(new Date(`${day}T12:00:00`))
    .replace(" de ", " ");
const localDay = (value: string) => {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Rio_Branco",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
function group<T extends { day: string }>(rows: T[], key: keyof T): Point[] {
  const map = new Map<string, number>();
  for (const row of rows) map.set(row.day, (map.get(row.day) ?? 0) + Number(row[key] ?? 0));
  return [...map]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, value]) => ({ day: label(day), value }));
}
export function SmartMetricsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          if (!cancelled) setMetrics(null);
          return;
        }
        const grant = await db
          .from("care_patient_access")
          .select("patient_id")
          .eq("user_id", auth.user.id)
          .limit(1);
        const patientId = grant.data?.[0]?.patient_id;
        if (!patientId) {
          if (!cancelled) setMetrics(null);
          return;
        }
        const sinceDate = new Date(Date.now() - 29 * 86400000);
        const since = sinceDate.toISOString();
        const [water, weights, meals, meds, supplements, sleep, activities, goalReviews] =
          await Promise.all([
            db
              .from("care_hydration")
              .select("amount_ml,recorded_at")
              .eq("patient_id", patientId)
              .gte("recorded_at", since)
              .limit(1000),
            db
              .from("care_body_measurements")
              .select("weight_kg,height_cm,recorded_on")
              .eq("patient_id", patientId)
              .order("recorded_on", { ascending: true })
              .limit(1000),
            db
              .from("care_nutrition_meal_logs")
              .select("protein_g,carbs_g,fat_g,recorded_at")
              .eq("patient_id", patientId)
              .gte("recorded_at", since)
              .limit(1000),
            db
              .from("care_client_medication_intakes")
              .select("id")
              .eq("patient_id", patientId)
              .gte("taken_at", since)
              .limit(1000),
            db
              .from("care_supplement_intakes")
              .select("id")
              .eq("patient_id", patientId)
              .gte("taken_at", since)
              .limit(1000),
            db
              .from("care_sleep_logs")
              .select("sleep_date,bed_at,wake_at,quality,awakenings,avg_hr,min_hr")
              .eq("patient_id", patientId)
              .gte("sleep_date", localDay(since))
              .order("sleep_date", { ascending: true })
              .limit(1000),
            db
              .from("care_activity_log")
              .select("happened_at,details,event_type")
              .eq("patient_id", patientId)
              .eq("category", "atividade")
              .gte("happened_at", since)
              .order("happened_at", { ascending: true })
              .limit(1000),
            db
              .from("care_goal_reviews")
              .select("day,metric,actual,unit")
              .eq("patient_id", patientId)
              .in("metric", ["hidratacao", "calorias", "proteina"])
              .gte("day", localDay(since))
              .limit(1000),
          ]);
        const failed = [
          water,
          weights,
          meals,
          meds,
          supplements,
          sleep,
          activities,
          goalReviews,
        ].some((result: any) => result.error);
        if (failed) throw new Error("Não foi possível consultar todos os indicadores.");
        const hydrationByDay = new Map<string, number>();
        for (const row of water.data ?? []) {
          const day = localDay(row.recorded_at);
          hydrationByDay.set(day, (hydrationByDay.get(day) ?? 0) + Number(row.amount_ml ?? 0));
        }
        // Daily snapshots from the original dashboard are more complete than
        // the surviving individual events; prefer them for that date only.
        for (const row of goalReviews.data ?? []) {
          if (row.metric === "hidratacao" && Number(row.actual) > 0) {
            hydrationByDay.set(row.day, Number(row.actual));
          }
        }
        const hydrationRows = [...hydrationByDay].map(([day, amount_ml]) => ({ day, amount_ml }));
        const macroMap = new Map<string, Point>();
        for (const row of meals.data ?? []) {
          const day = localDay(row.recorded_at);
          const point = macroMap.get(day) ?? { day, value: 0, protein: 0, carbs: 0, fat: 0 };
          point.protein! += Number(row.protein_g ?? 0);
          point.carbs! += Number(row.carbs_g ?? 0);
          point.fat! += Number(row.fat_g ?? 0);
          macroMap.set(day, point);
        }
        const reviewRows = goalReviews.data ?? [];
        const energyRows = reviewRows
          .filter((row: any) => row.metric === "calorias" && Number(row.actual) > 0)
          .map((row: any) => ({ day: row.day, value: Number(row.actual) }));
        const proteinSnapshots = reviewRows
          .filter((row: any) => row.metric === "proteina" && Number(row.actual) > 0)
          .map((row: any) => ({
            day: row.day,
            protein: Number(row.actual),
            carbs: 0,
            fat: 0,
            value: Number(row.actual),
          }));
        const measuredMacros = [...macroMap.values()].filter(
          (point) => Number(point.protein) + Number(point.carbs) + Number(point.fat) > 0,
        );
        const sleepRows = (sleep.data ?? []).flatMap((row: any) => {
          const hours =
            (new Date(row.wake_at).getTime() - new Date(row.bed_at).getTime()) / 3600000;
          return Number.isFinite(hours) && hours > 0 && hours < 24
            ? [{ day: row.sleep_date, value: Number(hours.toFixed(2)) }]
            : [];
        });
        const activityRows = (activities.data ?? []).flatMap((row: any) => {
          const minutes = Number(row.details?.duration_minutes ?? 0);
          return Number.isFinite(minutes) && minutes > 0
            ? [{ day: localDay(row.happened_at), value: minutes }]
            : [];
        });
        if (!cancelled)
          setMetrics({
            hydration: group(hydrationRows, "amount_ml"),
            weight: (weights.data ?? []).map((row: any) => ({
              day: label(row.recorded_on),
              value: Number(row.weight_kg),
            })),
            macros: (measuredMacros.length ? measuredMacros : proteinSnapshots)
              .sort((a, b) => a.day.localeCompare(b.day))
              .map((point) => ({ ...point, day: label(point.day) })),
            energy: group(energyRows, "value"),
            sleep: group(sleepRows, "value"),
            activity: group(activityRows, "value"),
            medicationCount: (meds.data ?? []).length,
            supplementCount: (supplements.data ?? []).length,
            hasSleepData: sleepRows.length > 0,
            hasActivityData: activityRows.length > 0,
          });
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError)
    return (
      <section
        aria-label="Métricas inteligentes"
        className="mt-5  border border-border bg-card p-5 text-sm text-muted-foreground"
      >
        Não foi possível carregar os indicadores agora. Tente atualizar a página.
      </section>
    );
  if (!metrics)
    return (
      <div
        role="status"
        aria-label="Carregando indicadores"
        className="mt-3 grid gap-3 md:grid-cols-2 min-[1400px]:grid-cols-3"
      >
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-56 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );

  const hasCarbsFat = metrics.macros.some((point) => Number(point.carbs) + Number(point.fat) > 0);
  return (
    <section
      aria-label="Métricas inteligentes"
      className="mt-3 grid gap-3 md:grid-cols-2 min-[1400px]:grid-cols-3"
    >
      <MetricPanel
        title="Consumo nos últimos 30 dias"
        eyebrow="Hidratação"
        icon={Droplets}
        color="#38bdf8"
        kind="area"
        unit="ml"
        data={metrics.hydration}
        series={[{ key: "value", name: "Água", color: "#38bdf8" }]}
        empty="Nenhum registro de hidratação encontrado neste período."
      />
      <MetricPanel
        title="Evolução corporal"
        eyebrow="Peso e IMC"
        icon={Scale}
        color="#2dd4bf"
        kind="line"
        unit="kg"
        decimals={1}
        domain={["dataMin - 2", "dataMax + 2"]}
        data={metrics.weight}
        series={[{ key: "value", name: "Peso", color: "#2dd4bf" }]}
        empty="Você ainda não possui pesagens registradas. O gráfico será preenchido quando houver uma medição salva."
      />
      <MetricPanel
        title="Energia diária"
        eyebrow="Calorias · registros e resumos históricos"
        icon={UtensilsCrossed}
        color="#fb923c"
        kind="bars"
        unit="kcal"
        data={metrics.energy}
        series={[{ key: "value", name: "Energia", color: "#fb923c" }]}
        empty="Não há resumos calóricos históricos nem refeições com calorias calculadas neste período."
      />
      <MetricPanel
        title="Macronutrientes registrados"
        eyebrow="Nutrição"
        icon={UtensilsCrossed}
        color="#2dd4bf"
        kind={hasCarbsFat ? "stacked" : "bars"}
        unit="g"
        data={metrics.macros}
        series={
          hasCarbsFat
            ? [
                { key: "protein", name: "Proteína", color: "#2dd4bf" },
                { key: "carbs", name: "Carboidratos", color: "#38bdf8" },
                { key: "fat", name: "Gorduras", color: "#fb923c" },
              ]
            : [{ key: "protein", name: "Proteína", color: "#2dd4bf" }]
        }
        empty="Não há refeições com macronutrientes registrados nos últimos 30 dias."
      />
      <MetricPanel
        title="Duração do sono"
        eyebrow="Sono · últimos 30 dias"
        icon={BedDouble}
        color="#a78bfa"
        kind="ring"
        goal={8}
        goalLabel="Meta"
        unit="h"
        decimals={1}
        data={metrics.hasSleepData ? metrics.sleep : []}
        series={[{ key: "value", name: "Sono", color: "#a78bfa" }]}
        empty="Nenhum diário de sono encontrado neste período. Registre o horário de dormir e acordar para acompanhar a evolução."
      />
      <MetricPanel
        title="Atividade física"
        eyebrow="Movimento · últimos 30 dias"
        icon={Activity}
        color="#f97316"
        kind="lollipop"
        unit="min"
        data={metrics.hasActivityData ? metrics.activity : []}
        series={[{ key: "value", name: "Atividade", color: "#f97316" }]}
        empty="Nenhuma atividade com duração registrada neste período. Caminhadas e treinos aparecerão aqui após serem salvos."
      />
      <article className="rounded-2xl border border-border bg-card p-3 shadow-card md:col-span-2 min-[1400px]:col-span-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground">Registros de rotina</p>
            <h3 className="text-sm font-bold">Constância nos últimos 30 dias</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Dias com registro em cada área · quanto mais completo, melhores as análises
          </p>
        </div>
        <ul className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {(
            [
              [Droplets, "Água", metrics.hydration.length, "dias", "#38bdf8", 30],
              [UtensilsCrossed, "Energia", metrics.energy.length, "dias", "#fb923c", 30],
              [UtensilsCrossed, "Macros", metrics.macros.length, "dias", "#2dd4bf", 30],
              [Scale, "Pesagens", metrics.weight.length, "registros", "#2dd4bf", 8],
              [BedDouble, "Sono", metrics.sleep.length, "noites", "#a78bfa", 30],
              [Activity, "Atividade", metrics.activity.length, "dias", "#f97316", 12],
              [Pill, "Medicação", metrics.medicationCount, "doses", "#f43f5e", 0],
              [Sparkles, "Suplementos", metrics.supplementCount, "doses", "#f59e0b", 0],
            ] as const
          ).map(([Icon, label, value, unit, color, goal]) => {
            const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : null;
            return (
              <li key={label} className="rounded-xl border border-border bg-background/40 p-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <Icon size={13} style={{ color }} /> {label}
                </p>
                <p className="mt-1 font-display text-xl font-extrabold leading-none tabular-nums">
                  {value}
                  <span className="ml-1 text-[10px] font-semibold text-muted-foreground">
                    {unit}
                  </span>
                </p>
                {pct !== null ? (
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-muted">
                    <i
                      className="block h-full rounded-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </span>
                ) : (
                  <span className="mt-2 block text-[10px] text-muted-foreground">no período</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Activity className="mt-px shrink-0 text-primary" size={13} />
          Os gráficos mostram somente dados salvos no seu prontuário. Dias sem registro não contam
          como consumo ou atividade igual a zero.
        </p>
      </article>
    </section>
  );
}
