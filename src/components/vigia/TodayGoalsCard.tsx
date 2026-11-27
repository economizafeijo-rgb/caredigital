import { Flame } from "lucide-react";
import { acreDateKey } from "@/lib/acre-time";
import { microTargets } from "@/lib/food-parser";
import { useDailyNutrition } from "./DailyNutritionPanel";
import { useHealthLimits } from "./useHealthLimits";
import { useIntakeRecords } from "./useIntakeRecords";

const nf = (n: number, d = 0) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });

/** Preenche a coluna dos indicadores: quanto do dia já foi consumido em relação às metas. */
export function TodayGoalsCard({
  patientId,
  ownerId,
  revision,
}: {
  patientId: string;
  ownerId: string;
  revision: number;
}) {
  const d = useDailyNutrition(patientId, ownerId, revision);
  const { limits } = useHealthLimits(patientId);
  const intake = useIntakeRecords(patientId, ownerId, 2);
  const today = acreDateKey();
  const cafMg = intake.caffeine
    .filter((r) => acreDateKey(r.at) === today)
    .reduce((a, r) => a + r.mg, 0);
  const lacG = intake.lactose
    .filter((r) => acreDateKey(r.at) === today && !r.free)
    .reduce((a, r) => a + r.g, 0);
  const micro = (Object.keys(microTargets) as (keyof typeof microTargets)[]).map((k) => ({
    label: microTargets[k].label,
    v: d.total[k],
    t: microTargets[k].target,
    u: microTargets[k].unit,
    c: "#2dd4bf",
  }));
  const watch: Row[] = [
    {
      label: "Cafeína",
      v: cafMg,
      t: limits.caffeineDayMg ?? 400,
      u: "mg",
      c: "#f59e0b",
      limit: true,
    },
    {
      label: "Lactose",
      v: lacG,
      t: (limits.lactoseIntolerant ? limits.lactoseDayG : null) ?? 18,
      u: "g",
      c: "#10b981",
      limit: true,
    },
  ];
  const rows: Row[] = [
    { label: "Energia", v: d.total.kcal, t: d.target.kcal, u: "kcal", c: "#fb923c" },
    { label: "Proteínas", v: d.total.protein, t: d.target.protein, u: "g", c: "#fb7185" },
    { label: "Carboidratos", v: d.total.carbs, t: d.target.carbs, u: "g", c: "#fbbf24" },
    { label: "Gorduras", v: d.total.fat, t: d.target.fat, u: "g", c: "#2dd4bf" },
    { label: "Fibras", v: d.total.fiber, t: d.target.fiber, u: "g", c: "#a3e635" },
  ];
  const meals = d.entries.filter((e) => e.entryType !== "beverage").length;
  return (
    <section
      aria-label="Consumo de hoje"
      className="flex flex-1 flex-col border border-border bg-card p-3.5 shadow-card"
      style={{ ["--ca" as string]: "#fb923c" }}
    >
      <div className="care-overview-section-heading shrink-0">
        <div>
          <span className="care-overview-eyebrow">Hoje</span>
          <h3>Consumo em relação às metas</h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Flame size={12} className="text-orange-400" /> {meals}{" "}
          {meals === 1 ? "refeição" : "refeições"}
        </span>
      </div>
      <Group title="Macronutrientes" rows={rows} />
      <Group title="Vitaminas, minerais e fibras" rows={[...micro]} className="mt-4" />
      <Group
        title="Atenção do dia"
        rows={watch}
        className="mt-4"
        note={
          limits.lactoseIntolerant
            ? "Limites calculados do seu perfil."
            : "Cafeína pelo seu perfil; lactose em valor de referência."
        }
      />
    </section>
  );
}

type Row = { label: string; v: number; t: number; u: string; c: string; limit?: boolean };

/** Bloco de barras de progresso; nos itens com limite, passar do valor deixa a barra vermelha. */
function Group({
  title,
  rows,
  className = "",
  note,
}: {
  title: string;
  rows: Row[];
  className?: string;
  note?: string;
}) {
  return (
    <div className={className}>
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <ul className="grid gap-2.5">
        {rows.map((r) => {
          const ratio = r.t > 0 ? r.v / r.t : 0;
          const over = r.limit && ratio > 1;
          return (
            <li key={r.label} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold">{r.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  <b className={over ? "text-red-400" : "text-foreground"}>
                    {nf(r.v, r.u === "kcal" || r.u === "mg" || r.u === "mcg" ? 0 : 1)}
                  </b>{" "}
                  / {nf(r.t)} {r.u} · {nf(ratio * 100)}%
                </span>
              </div>
              <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <i
                  className="block h-full rounded-full transition-[width] duration-700"
                  style={{
                    width: `${Math.min(100, ratio * 100)}%`,
                    background: over
                      ? "#ef4444"
                      : `linear-gradient(90deg, ${r.c}, color-mix(in srgb, ${r.c} 60%, #fff))`,
                  }}
                />
              </span>
            </li>
          );
        })}
      </ul>
      {note && <p className="mt-2 text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}
