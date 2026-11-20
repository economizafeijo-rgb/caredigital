import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  BedDouble,
  Droplets,
  Pill,
  Scale,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
function EmptyChart({ children }: { children: string }) {
  return (
    <div className="grid h-44 place-items-center rounded-xl border border-dashed border-border bg-muted/30 px-5 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
function ChartCard({
  title,
  eyebrow,
  icon: Icon,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: typeof Activity;
  children: ReactNode;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-primary">{eyebrow}</p>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <Icon className="shrink-0 text-primary" size={20} />
      </div>
      {children}
    </article>
  );
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
        className="mt-5 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground"
      >
        Não foi possível carregar os indicadores agora. Tente atualizar a página.
      </section>
    );
  if (!metrics)
    return (
      <div
        role="status"
        aria-label="Carregando indicadores"
        className="mt-5 grid gap-4 lg:grid-cols-2"
      >
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-60 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );

  const chartClass = "h-44 w-full";
  return (
    <section aria-label="Métricas inteligentes" className="mt-5 grid gap-4 lg:grid-cols-2">
      <ChartCard title="Consumo nos últimos 30 dias" eyebrow="Hidratação" icon={Droplets}>
        {metrics.hydration.length ? (
          <div className={chartClass}>
            <ResponsiveContainer>
              <AreaChart data={metrics.hydration}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area
                  dataKey="value"
                  name="ml"
                  stroke="var(--water)"
                  fill="var(--water)"
                  fillOpacity={0.18}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart>Nenhum registro de hidratação encontrado neste período.</EmptyChart>
        )}
      </ChartCard>
      <ChartCard title="Evolução corporal" eyebrow="Peso e IMC" icon={Scale}>
        {metrics.weight.length ? (
          <div className={chartClass}>
            <ResponsiveContainer>
              <LineChart data={metrics.weight}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="kg"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart>
            Você ainda não possui pesagens registradas. O gráfico será preenchido quando houver uma
            medição salva.
          </EmptyChart>
        )}
      </ChartCard>
      <ChartCard
        title="Energia diária"
        eyebrow="Calorias · registros e resumos históricos"
        icon={UtensilsCrossed}
      >
        {metrics.energy.length ? (
          <div className={chartClass}>
            <ResponsiveContainer>
              <AreaChart data={metrics.energy}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [`${value} kcal`, "Energia"]} />
                <Area
                  dataKey="value"
                  name="Calorias"
                  stroke="#ea580c"
                  fill="#ea580c"
                  fillOpacity={0.18}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart>
            Não há resumos calóricos históricos nem refeições com calorias calculadas neste período.
          </EmptyChart>
        )}
      </ChartCard>
      <ChartCard title="Macronutrientes registrados" eyebrow="Nutrição" icon={UtensilsCrossed}>
        {metrics.macros.length ? (
          <div className={chartClass}>
            <ResponsiveContainer>
              <BarChart data={metrics.macros}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="protein" name="Proteína (g)" fill="#0e8a6a" />
                {metrics.macros.some((point) => Number(point.carbs) + Number(point.fat) > 0) && (
                  <>
                    <Bar dataKey="carbs" name="Carboidratos (g)" fill="#168fa8" />
                    <Bar dataKey="fat" name="Gorduras (g)" fill="#c96c28" />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart>
            Não há refeições com macronutrientes registrados nos últimos 30 dias.
          </EmptyChart>
        )}
      </ChartCard>
      <ChartCard title="Duração do sono" eyebrow="Sono · últimos 30 dias" icon={BedDouble}>
        {metrics.hasSleepData ? (
          <div className={chartClass}>
            <ResponsiveContainer>
              <AreaChart data={metrics.sleep}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [`${value} h`, "Sono"]} />
                <Area
                  dataKey="value"
                  name="Horas"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.18}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart>
            Nenhum diário de sono encontrado neste período. Registre o horário de dormir e acordar
            para acompanhar a evolução.
          </EmptyChart>
        )}
      </ChartCard>
      <ChartCard title="Atividade física" eyebrow="Movimento · últimos 30 dias" icon={Activity}>
        {metrics.hasActivityData ? (
          <div className={chartClass}>
            <ResponsiveContainer>
              <BarChart data={metrics.activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [`${value} min`, "Atividade"]} />
                <Bar dataKey="value" name="Minutos" fill="#ea580c" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart>
            Nenhuma atividade com duração registrada neste período. Caminhadas e treinos aparecerão
            aqui após serem salvos.
          </EmptyChart>
        )}
      </ChartCard>
      <article className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="col-span-2">
          <p className="text-[11px] font-bold text-muted-foreground">Registros de rotina</p>
          <h3 className="text-lg font-bold">Acompanhamento inteligente</h3>
        </div>
        <div className="rounded-xl bg-med/10 p-3">
          <Pill className="text-med" size={20} />
          <strong className="mt-2 block text-2xl">{metrics.medicationCount}</strong>
          <span className="text-xs text-muted-foreground">doses registradas</span>
        </div>
        <div className="rounded-xl bg-amber-500/10 p-3">
          <Sparkles className="text-amber-600" size={20} />
          <strong className="mt-2 block text-2xl">{metrics.supplementCount}</strong>
          <span className="text-xs text-muted-foreground">doses de suplementos</span>
        </div>
        <div className="col-span-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          <Activity className="mr-1 inline text-primary" size={15} />
          Os gráficos mostram somente dados efetivamente salvos no seu prontuário. Ausência de
          registros não é interpretada como consumo ou atividade igual a zero.
        </div>
      </article>
    </section>
  );
}
