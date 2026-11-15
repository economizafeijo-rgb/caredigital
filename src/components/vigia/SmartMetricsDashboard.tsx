import { useEffect, useState } from "react";
import { Activity, Droplets, Flame, Pill, Scale, Sparkles, UtensilsCrossed } from "lucide-react";
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

type Point = {
  day: string;
  value: number;
  weight?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};
type Metrics = {
  hydration: Point[];
  weight: Point[];
  macros: Point[];
  medicationCount: number;
  supplementCount: number;
};
const db = supabase as any;
const dateKey = (d: Date) => d.toISOString().slice(0, 10);
const label = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(new Date(`${d}T12:00:00`))
    .replace(" de ", " ");
function group<T extends { day: string }>(rows: T[], key: keyof T): Point[] {
  const map = new Map<string, number>();
  for (const row of rows) map.set(row.day, (map.get(row.day) ?? 0) + Number(row[key] ?? 0));
  return [...map]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, value]) => ({ day: label(day), value }));
}

export function SmartMetricsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  useEffect(() => {
    void (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const grant = await db
        .from("care_patient_access")
        .select("patient_id")
        .eq("user_id", user.user.id)
        .limit(1);
      const patientId = grant.data?.[0]?.patient_id;
      if (!patientId) return;
      const since = new Date(Date.now() - 29 * 86400000).toISOString();
      const [water, weights, meals, meds, supplements] = await Promise.all([
        db
          .from("care_hydration")
          .select("amount_ml,recorded_at")
          .eq("patient_id", patientId)
          .gte("recorded_at", since)
          .limit(1000),
        db
          .from("care_body_measurements")
          .select("weight_kg,recorded_on")
          .eq("patient_id", patientId)
          .order("recorded_on"),
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
      ]);
      const hydrationRows = (water.data ?? []).map((r: any) => ({
        day: String(r.recorded_at).slice(0, 10),
        amount_ml: r.amount_ml,
      }));
      const macroMap = new Map<string, Point>();
      for (const r of meals.data ?? []) {
        const day = String(r.recorded_at).slice(0, 10);
        const p = macroMap.get(day) ?? { day, value: 0, protein: 0, carbs: 0, fat: 0 };
        p.protein! += Number(r.protein_g ?? 0);
        p.carbs! += Number(r.carbs_g ?? 0);
        p.fat! += Number(r.fat_g ?? 0);
        macroMap.set(day, p);
      }
      setMetrics({
        hydration: group(hydrationRows, "amount_ml"),
        weight: (weights.data ?? []).map((r: any) => ({
          day: label(r.recorded_on),
          value: Number(r.weight_kg),
        })),
        macros: [...macroMap.values()].map((p) => ({ ...p, day: label(p.day) })),
        medicationCount: (meds.data ?? []).length,
        supplementCount: (supplements.data ?? []).length,
      });
    })();
  }, []);
  if (!metrics) return null;
  const chartClass = "h-44 w-full";
  return (
    <section aria-label="Métricas inteligentes" className="mt-5 grid gap-4 lg:grid-cols-2">
      <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-water">
              Hidratação
            </p>
            <h3 className="text-lg font-bold">Consumo nos últimos 30 dias</h3>
          </div>
          <Droplets className="text-water" size={20} />
        </div>
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
      </article>
      <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-primary">Peso</p>
            <h3 className="text-lg font-bold">Evolução corporal</h3>
          </div>
          <Scale className="text-primary" size={20} />
        </div>
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
      </article>
      <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-meal">Nutrição</p>
            <h3 className="text-lg font-bold">Macronutrientes registrados</h3>
          </div>
          <UtensilsCrossed className="text-meal" size={20} />
        </div>
        <div className={chartClass}>
          <ResponsiveContainer>
            <BarChart data={metrics.macros}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="protein" name="Proteína (g)" fill="#0e8a6a" />
              <Bar dataKey="carbs" name="Carboidratos (g)" fill="#168fa8" />
              <Bar dataKey="fat" name="Gorduras (g)" fill="#c96c28" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
      <article className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="col-span-2">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
            Registros de rotina
          </p>
          <h3 className="text-lg font-bold">Acompanhamento inteligente</h3>
        </div>
        <div className="rounded-xl bg-med/10 p-3">
          <Pill className="text-med" size={20} />
          <strong className="mt-2 block text-2xl">{metrics.medicationCount}</strong>
          <span className="text-xs text-muted-foreground">medicações registradas</span>
        </div>
        <div className="rounded-xl bg-amber-500/10 p-3">
          <Sparkles className="text-amber-600" size={20} />
          <strong className="mt-2 block text-2xl">{metrics.supplementCount}</strong>
          <span className="text-xs text-muted-foreground">suplementos registrados</span>
        </div>
        <div className="col-span-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          <Activity className="mr-1 inline text-primary" size={15} /> Sono, treinos, caminhadas e
          corridas poderão ser conectados quando houver dados do dispositivo ou GPS.
        </div>
      </article>
    </section>
  );
}
