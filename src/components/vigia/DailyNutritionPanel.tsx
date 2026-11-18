import { useEffect, useMemo, useState } from "react";
import {
  Apple,
  Beef,
  Droplet,
  Flame,
  Leaf,
  Sparkles,
  Target,
  Wheat,
  LockKeyhole,
  Pencil,
  Trash2,
} from "lucide-react";
import { RecordInfo } from "./RecordInfo";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey, DAY_CUTOFF_HOUR } from "@/lib/acre-time";
import {
  goalAdvice,
  goalTargets,
  microTargets,
  parseFoodText,
  sumNutrients,
  type Nutrients,
  type ParsedFood, isLiquid, measureUnit } from "@/lib/food-parser";
import { objectiveLabel } from "@/lib/objective-nutrition";
import { useDialog } from "@/lib/dialog";

type Entry = {
  at: string;
  source: string;
  text: string;
  foods: ParsedFood[];
  direct?: Nutrients;
  entryType?: "meal" | "beverage" | "food";
  entryId?: string;
  amountMl?: number;
};
export type DailyNutrition = {
  total: Nutrients;
  entries: Entry[];
  target: ReturnType<typeof goalTargets>;
  objective: string | null;
  loaded: boolean;
  patientId: string;
  refresh: () => void;
};

/** Soma automática do que o paciente registrou hoje: refeições, bebidas e porções da biblioteca. */
export function useDailyNutrition(
  patientId: string,
  ownerId: string,
  revision = 0,
): DailyNutrition {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [prefs, setPrefs] = useState<{
    objective: string | null;
    weight: number | null;
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  }>({ objective: null, weight: null, kcal: null, protein: null, carbs: null, fat: null });
  const [loaded, setLoaded] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    const db = supabase as any;
    const from = new Date(acreDateKey() + "T00:00:00-05:00").toISOString();
    void Promise.all([
      db
        .from("care_activity_log")
        .select("id,happened_at,details,event_type,source")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .eq("category", "refeicao")
        .in("event_type", ["confirmed", "logged"])
        .gte("happened_at", from)
        .order("happened_at")
        .limit(60),
      db
        .from("care_client_beverages")
        .select("id,name,kind,amount_ml,consumed_at")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .gte("consumed_at", from)
        .limit(60),
      db
        .from("care_food_consumptions")
        .select("id,food_id,grams,kcal,protein_g,carbs_g,fat_g,fiber_g,recorded_at")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .gte("recorded_at", from)
        .limit(100),
      db
        .from("care_nutrition_preferences")
        .select("objective,weight_kg,target_kcal,target_protein_g,target_carbs_g,target_fat_g")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .maybeSingle(),
    ]).then(
      ([meals, drinks, portions, pref]: any[]) => {
        if (!active) return;
        const list: Entry[] = [];
        for (const row of meals.data ?? []) {
          // Versões antigas (editadas/excluídas) e registros da biblioteca (já listados como porções) não entram.
          if (row.details?.superseded || row.source === "client_nutrition_library") continue;
          const text = String(row.details?.description || row.details?.title || "");
          list.push({
            at: row.happened_at,
            source: row.event_type === "logged" ? "Refeição registrada" : "Refeição confirmada",
            text,
            foods: parseFoodText(text),
            // Só registros avulsos podem ser editados/excluídos aqui; cuidados da agenda se ajustam na agenda.
            entryType: row.event_type === "logged" ? "meal" : undefined,
            entryId: row.event_type === "logged" ? row.id : undefined,
          });
        }
        for (const row of drinks.data ?? []) {
          const text = String(row.name || row.kind || "");
          list.push({
            at: row.consumed_at,
            source: "Bebida",
            text: `${text} · ${row.amount_ml} ml`,
            foods: parseFoodText(text, Number(row.amount_ml)),
            entryType: "beverage",
            entryId: row.id,
            amountMl: Number(row.amount_ml),
          });
        }
        for (const row of portions.data ?? []) {
          list.push({
            at: row.recorded_at,
            source: "Biblioteca alimentar",
            text: `${row.food_id.replace(/_/g, " ")} · Porção: ${Number(row.grams)} ${measureUnit(row.food_id)}`,
            foods: [],
            entryType: "food",
            entryId: row.id,
            direct: {
              kcal: Number(row.kcal),
              protein: Number(row.protein_g),
              carbs: Number(row.carbs_g),
              fat: Number(row.fat_g),
              fiber: Number(row.fiber_g),
              vitC: 0,
              vitA: 0,
              calcium: 0,
              iron: 0,
              potassium: 0,
            },
          });
        }
        // Refeições e líquidos contam somente até o fechamento do dia (22h, horário do Acre).
      const dayCutoff = Date.parse(acreDateKey() + `T${String(DAY_CUTOFF_HOUR).padStart(2, "0")}:00:00-05:00`);
      const counted = list.filter(entry => Date.parse(entry.at) < dayCutoff);
      counted.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      list.length = 0; list.push(...counted);
        setEntries(list);
        const p = pref.data ?? {};
        const num = (v: unknown) =>
          Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null;
        setPrefs({
          objective: p.objective ?? null,
          weight: num(p.weight_kg),
          kcal: num(p.target_kcal),
          protein: num(p.target_protein_g),
          carbs: num(p.target_carbs_g),
          fat: num(p.target_fat_g),
        });
        setLoaded(true);
      },
      () => {
        if (active) setLoaded(true);
      },
    );
    return () => {
      active = false;
    };
  }, [patientId, ownerId, revision, reload]);
  return useMemo(() => {
    const total = sumNutrients(
      entries.flatMap((entry) =>
        entry.direct ? [entry.direct] : entry.foods.map((food) => food.nutrients),
      ),
    );
    const base = goalTargets(prefs.objective, prefs.weight);
    const target = {
      ...base,
      kcal: prefs.kcal ?? base.kcal,
      protein: prefs.protein ?? base.protein,
      carbs: prefs.carbs ?? base.carbs,
      fat: prefs.fat ?? base.fat,
    };
    return {
      total,
      entries,
      target,
      objective: prefs.objective,
      loaded,
      patientId,
      refresh: () => setReload((value) => value + 1),
    };
  }, [entries, prefs, loaded]);
}

function Ring({
  value,
  target,
  label,
  unit,
  color,
  icon: Icon,
}: {
  value: number;
  target: number;
  label: string;
  unit: string;
  color: string;
  icon: typeof Flame;
}) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const r = 34,
    c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="relative size-[84px]">
        <svg viewBox="0 0 84 84" className="-rotate-90" aria-hidden="true">
          <circle cx="42" cy="42" r={r} fill="none" strokeWidth="9" className="stroke-muted" />
          <circle
            cx="42"
            cy="42"
            r={r}
            fill="none"
            strokeWidth="9"
            stroke={color}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset .6s ease" }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          <Icon size={22} style={{ color }} />
        </span>
      </div>
      <strong className="text-base tabular-nums">
        {Math.round(value).toLocaleString("pt-BR")}
        <span className="text-xs font-semibold text-muted-foreground">
          /{Math.round(target).toLocaleString("pt-BR")} {unit}
        </span>
      </strong>
      <span className="text-xs font-semibold text-muted-foreground">
        {label} · {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

export function DailyNutritionPanel({
  data,
  compact = false,
  hideSummary = false,
}: {
  data: DailyNutrition;
  compact?: boolean;
  /** Oculta cabeçalho e anéis (quando o NutritionHero já mostra o resumo). */
  hideSummary?: boolean;
}) {
  const { total, target, entries, objective, loaded, patientId, refresh } = data;
  const { confirm, prompt } = useDialog();
  const [busyEntry, setBusyEntry] = useState<string | null>(null);
  const recognized = entries.filter((entry) => entry.direct || entry.foods.length);
  async function editEntry(entry: Entry) {
    if (!entry.entryId || !entry.entryType || busyEntry) return;
    const value = await prompt(
      entry.entryType === "food"
        ? "Editar porção"
        : entry.entryType === "meal"
          ? "Editar refeição"
          : "Editar bebida",
      entry.entryType === "food"
        ? "Informe a nova quantidade em gramas"
        : "Descreva o registro atualizado",
    );
    if (value === null) return;
    setBusyEntry(entry.entryId);
    try {
      if (entry.entryType === "food") {
        const grams = Number(value.replace(",", "."));
        if (!Number.isFinite(grams) || grams < 1 || grams > 2000)
          throw new Error("Informe entre 1 e 2.000 g.");
        const result = await (supabase as any).rpc("care_update_food_portion", {
          p_entry_id: entry.entryId,
          p_grams: grams,
          p_verified: true,
        });
        if (result.error) throw result.error;
      } else {
        const description = value.trim();
        if (description.length < 3) throw new Error("Informe pelo menos 3 caracteres.");
        const result = await (supabase as any).rpc("care_update_intake_entry", {
          p_patient_id: patientId,
          p_entry_type: entry.entryType,
          p_entry_id: entry.entryId,
          p_description: description,
          p_amount_ml: entry.entryType === "beverage" ? (entry.amountMl ?? 200) : null,
          p_consumed_at: entry.at,
        });
        if (result.error) throw result.error;
      }
      refresh();
    } catch (error) {
      await confirm(
        "Não foi possível editar",
        error instanceof Error ? error.message : "Confira o registro e tente novamente.",
      );
    } finally {
      setBusyEntry(null);
    }
  }
  async function deleteEntry(entry: Entry) {
    if (!entry.entryId || !entry.entryType || busyEntry) return;
    if (
      !(await confirm(
        "Excluir registro",
        "O registro será removido e as métricas serão recalculadas. Deseja continuar?",
        true,
      ))
    )
      return;
    setBusyEntry(entry.entryId);
    try {
      const result =
        entry.entryType === "food"
          ? await (supabase as any).rpc("care_delete_food_portion", {
              p_entry_id: entry.entryId,
              p_verified: true,
            })
          : await (supabase as any).rpc("care_delete_intake_entry", {
              p_patient_id: patientId,
              p_entry_type: entry.entryType,
              p_entry_id: entry.entryId,
            });
      if (result.error) throw result.error;
      refresh();
    } catch (error) {
      await confirm(
        "Não foi possível excluir",
        error instanceof Error ? error.message : "Confira o registro e tente novamente.",
      );
    } finally {
      setBusyEntry(null);
    }
  }
  return (
    <section
      className="rounded-3xl border border-border bg-card p-5 shadow-card"
      aria-label="Nutrição de hoje"
    >
      {!hideSummary && <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Apple size={20} className="text-emerald-500" /> Nutrição de hoje
          </h3>
          <p className="text-sm text-muted-foreground">
            Calculado automaticamente a partir das refeições e líquidos que você registrou.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-lime-500 px-3 py-1.5 text-xs font-bold text-white">
          <Target size={14} /> {objectiveLabel(objective)}
        </span>
      </div>}
      {!loaded ? (
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <>
          {!hideSummary && <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Ring
              value={total.kcal}
              target={target.kcal}
              label="Calorias"
              unit="kcal"
              color="#f97316"
              icon={Flame}
            />
            <Ring
              value={total.protein}
              target={target.protein}
              label="Proteínas"
              unit="g"
              color="#e11d48"
              icon={Beef}
            />
            <Ring
              value={total.carbs}
              target={target.carbs}
              label="Carboidratos"
              unit="g"
              color="#f59e0b"
              icon={Wheat}
            />
            <Ring
              value={total.fat}
              target={target.fat}
              label="Gorduras"
              unit="g"
              color="#8b5cf6"
              icon={Droplet}
            />
          </div>}
          <p className={`${hideSummary ? "" : "mt-4 "}flex gap-2 rounded-2xl bg-emerald-500/10 p-3 text-sm font-medium text-emerald-800 dark:text-emerald-200`}>
            <Sparkles size={18} className="mt-0.5 shrink-0" />
            {goalAdvice(objective, total, target)}
          </p>
          {!compact && (
            <>
              <h4 className="mt-5 flex items-center gap-2 text-sm font-bold">
                <Leaf size={16} className="text-lime-600" /> Fibras, vitaminas e minerais
              </h4>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {[
                  { label: "Fibras", unit: "g", value: total.fiber, target: target.fiber },
                  ...(Object.keys(microTargets) as (keyof typeof microTargets)[]).map((key) => ({
                    ...microTargets[key],
                    value: total[key],
                  })),
                ].map((item) => {
                  const pct = Math.min(100, Math.round((item.value / item.target) * 100));
                  return (
                    <div key={item.label} className="rounded-xl bg-muted/50 p-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold">{item.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {item.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{" "}
                          {item.unit}
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <i
                          className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400"
                          style={{ width: pct + "%" }}
                        />
                      </div>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {pct}% da referência diária
                      </span>
                    </div>
                  );
                })}
              </div>
              <h4 className="mt-5 text-sm font-bold">O que foi calculado hoje</h4>
              <ul className="mt-2 grid max-h-64 gap-2 overflow-y-auto">
                {entries.length === 0 && (
                  <li className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    Registre uma refeição ou bebida descrevendo os alimentos (ex.: "150 g de arroz,
                    feijão e 2 ovos").
                  </li>
                )}
                {entries.map((entry, index) => (
                  <li
                    key={entry.entryId ?? index}
                    className="rounded-xl border border-border p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <strong className="flex min-w-0 items-center gap-1.5 truncate">
                        <LockKeyhole
                          size={13}
                          className="shrink-0 text-muted-foreground"
                          aria-label="Registro protegido, editável"
                        />
                        <span className="truncate">{entry.text || entry.source}</span>
                      </strong>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "America/Rio_Branco",
                          })}
                        </span>
                        <RecordInfo
                          title={entry.text || entry.source}
                          at={entry.at}
                          category={entry.entryType === "beverage" ? "Bebida" : entry.entryType === "food" ? "Alimento" : "Refeição"}
                          color={entry.entryType === "beverage" ? "#0ea5e9" : "#10b981"}
                          rows={(() => {
                            const n = entry.direct ?? sumNutrients(entry.foods.map((f) => f.nutrients));
                            const fmt = (v: number, d = 0) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });
                            return [
                              ...(entry.foods.length ? [{ label: "Consumido", value: entry.foods.map((f) => `${f.name} (${fmt(f.grams)} ${measureUnit(f.id)}${f.estimatedPortion ? ", porção estimada" : ""})`).join(", ") }] : []),
                              ...(entry.amountMl ? [{ label: "Quantidade", value: `${fmt(entry.amountMl)} ml` }] : entry.foods.length ? [{ label: "Quantidade", value: [["g", entry.foods.filter((f) => !isLiquid(f.id)).reduce((a, f) => a + f.grams, 0)], ["ml", entry.foods.filter((f) => isLiquid(f.id)).reduce((a, f) => a + f.grams, 0)]].filter(([, v]) => Number(v) > 0).map(([u, v]) => `${fmt(Number(v))} ${u}`).join(" + ") }] : []),
                              ...(n.kcal > 0 ? [{ label: "Energia", value: `${fmt(n.kcal)} kcal` }, { label: "Macros", value: `P ${fmt(n.protein, 1)} g · C ${fmt(n.carbs, 1)} g · G ${fmt(n.fat, 1)} g` }] : []),
                              ...(n.fiber > 0 ? [{ label: "Fibras", value: `${fmt(n.fiber, 1)} g` }] : []),
                              { label: "Origem", value: entry.source },
                            ];
                          })()}
                        />
                        {entry.entryId && (
                          <>
                            <button
                              type="button"
                              title="Editar registro"
                              aria-label="Editar registro"
                              disabled={busyEntry === entry.entryId}
                              onClick={() => void editEntry(entry)}
                              className="rounded-md p-1 text-primary hover:bg-primary/10 disabled:opacity-50"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              title="Excluir registro"
                              aria-label="Excluir registro"
                              disabled={busyEntry === entry.entryId}
                              onClick={() => void deleteEntry(entry)}
                              className="rounded-md p-1 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {entry.direct ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Math.round(entry.direct.kcal)} kcal · P {entry.direct.protein.toFixed(1)} g
                        · C {entry.direct.carbs.toFixed(1)} g · G {entry.direct.fat.toFixed(1)} g
                      </p>
                    ) : entry.foods.length ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {entry.foods.map((food, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200"
                          >
                            {food.name.split(",")[0]} {food.grams} {measureUnit(food.id)}
                            {food.estimatedPortion ? "*" : ""} · {Math.round(food.nutrients.kcal)}{" "}
                            kcal
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        Alimento não reconhecido no catálogo; descreva os itens para calcular.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                {recognized.length} de {entries.length} registros calculados · *porção padrão
                estimada · valores aproximados (TACO/TBCA), não substituem orientação profissional.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
