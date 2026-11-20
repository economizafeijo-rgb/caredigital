import { Flame } from "lucide-react";
import { useDailyNutrition } from "./DailyNutritionPanel";

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
  const rows = [
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
      <ul className="grid flex-1 content-between gap-2.5">
        {rows.map((r) => {
          const pct = r.t > 0 ? Math.min(100, (r.v / r.t) * 100) : 0;
          return (
            <li key={r.label} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold">{r.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  <b className="text-foreground">{nf(r.v, r.u === "kcal" ? 0 : 1)}</b> / {nf(r.t)}{" "}
                  {r.u} · {nf(r.t > 0 ? (r.v / r.t) * 100 : 0)}%
                </span>
              </div>
              <span className="h-2 bg-muted" aria-hidden="true">
                <i
                  className="block h-full transition-[width] duration-700"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${r.c}, color-mix(in srgb, ${r.c} 60%, #fff))`,
                  }}
                />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
