import { useEffect, useMemo, useState } from "react";
import { Apple, Beef, Droplet, Flame, Leaf, Sparkles, Target, Wheat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey } from "@/lib/acre-time";
import { goalAdvice, goalTargets, microTargets, parseFoodText, sumNutrients, type Nutrients, type ParsedFood } from "@/lib/food-parser";
import { objectiveLabel } from "@/lib/objective-nutrition";

type Entry = { at: string; source: string; text: string; foods: ParsedFood[]; direct?: Nutrients };
export type DailyNutrition = { total: Nutrients; entries: Entry[]; target: ReturnType<typeof goalTargets>; objective: string | null; loaded: boolean };

/** Soma automática do que o paciente registrou hoje: refeições, bebidas e porções da biblioteca. */
export function useDailyNutrition(patientId: string, ownerId: string, revision = 0): DailyNutrition {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [prefs, setPrefs] = useState<{ objective: string | null; weight: number | null; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null }>({ objective: null, weight: null, kcal: null, protein: null, carbs: null, fat: null });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    const db = supabase as any;
    const from = new Date(acreDateKey() + "T00:00:00-05:00").toISOString();
    void Promise.all([
      db.from("care_activity_log").select("happened_at,details,event_type").eq("patient_id", patientId).eq("owner_id", ownerId).eq("category", "refeicao")
        .in("event_type", ["confirmed", "logged"]).gte("happened_at", from).order("happened_at").limit(60),
      db.from("care_client_beverages").select("name,kind,amount_ml,consumed_at").eq("patient_id", patientId).eq("owner_id", ownerId).gte("consumed_at", from).limit(60),
      db.from("care_food_consumptions").select("food_id,grams,kcal,protein_g,carbs_g,fat_g,fiber_g,recorded_at").eq("patient_id", patientId).eq("owner_id", ownerId).gte("recorded_at", from).limit(100),
      db.from("care_nutrition_preferences").select("objective,weight_kg,target_kcal,target_protein_g,target_carbs_g,target_fat_g").eq("patient_id", patientId).eq("owner_id", ownerId).maybeSingle(),
    ]).then(([meals, drinks, portions, pref]: any[]) => {
      if (!active) return;
      const list: Entry[] = [];
      for (const row of meals.data ?? []) {
        const text = String(row.details?.description || row.details?.title || "");
        list.push({ at: row.happened_at, source: row.event_type === "logged" ? "Refeição registrada" : "Refeição confirmada", text, foods: parseFoodText(text) });
      }
      for (const row of drinks.data ?? []) {
        const text = String(row.name || row.kind || "");
        list.push({ at: row.consumed_at, source: "Bebida", text: `${text} · ${row.amount_ml} ml`, foods: parseFoodText(text, Number(row.amount_ml)) });
      }
      for (const row of portions.data ?? []) {
        list.push({ at: row.recorded_at, source: "Biblioteca alimentar", text: `${row.food_id.replace(/_/g, " ")} · ${Number(row.grams)} g`, foods: [],
          direct: { kcal: Number(row.kcal), protein: Number(row.protein_g), carbs: Number(row.carbs_g), fat: Number(row.fat_g), fiber: Number(row.fiber_g), vitC: 0, vitA: 0, calcium: 0, iron: 0, potassium: 0 } });
      }
      list.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      setEntries(list);
      const p = pref.data ?? {};
      const num = (v: unknown) => Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null;
      setPrefs({ objective: p.objective ?? null, weight: num(p.weight_kg), kcal: num(p.target_kcal), protein: num(p.target_protein_g), carbs: num(p.target_carbs_g), fat: num(p.target_fat_g) });
      setLoaded(true);
    }, () => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [patientId, ownerId, revision]);
  return useMemo(() => {
    const total = sumNutrients(entries.flatMap(entry => entry.direct ? [entry.direct] : entry.foods.map(food => food.nutrients)));
    const base = goalTargets(prefs.objective, prefs.weight);
    const target = { ...base, kcal: prefs.kcal ?? base.kcal, protein: prefs.protein ?? base.protein, carbs: prefs.carbs ?? base.carbs, fat: prefs.fat ?? base.fat };
    return { total, entries, target, objective: prefs.objective, loaded };
  }, [entries, prefs, loaded]);
}

function Ring({ value, target, label, unit, color, icon: Icon }: { value: number; target: number; label: string; unit: string; color: string; icon: typeof Flame }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const r = 34, c = 2 * Math.PI * r;
  return <div className="flex flex-col items-center gap-1.5 text-center">
    <div className="relative size-[84px]">
      <svg viewBox="0 0 84 84" className="-rotate-90" aria-hidden="true"><circle cx="42" cy="42" r={r} fill="none" strokeWidth="9" className="stroke-muted"/>
        <circle cx="42" cy="42" r={r} fill="none" strokeWidth="9" stroke={color} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset .6s ease" }}/></svg>
      <span className="absolute inset-0 grid place-items-center"><Icon size={22} style={{ color }}/></span>
    </div>
    <strong className="text-base tabular-nums">{Math.round(value).toLocaleString("pt-BR")}<span className="text-xs font-semibold text-muted-foreground">/{Math.round(target).toLocaleString("pt-BR")} {unit}</span></strong>
    <span className="text-xs font-semibold text-muted-foreground">{label} · {Math.round(pct * 100)}%</span>
  </div>;
}

export function DailyNutritionPanel({ data, compact = false }: { data: DailyNutrition; compact?: boolean }) {
  const { total, target, entries, objective, loaded } = data;
  const recognized = entries.filter(entry => entry.direct || entry.foods.length);
  return <section className="rounded-3xl border border-border bg-card p-5 shadow-card" aria-label="Nutrição de hoje">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold"><Apple size={20} className="text-emerald-500"/> Nutrição de hoje</h3>
        <p className="text-sm text-muted-foreground">Calculado automaticamente a partir das refeições e líquidos que você registrou.</p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-lime-500 px-3 py-1.5 text-xs font-bold text-white"><Target size={14}/> {objectiveLabel(objective)}</span>
    </div>
    {!loaded ? <div className="mt-4 h-40 animate-pulse rounded-2xl bg-muted"/> : <>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Ring value={total.kcal} target={target.kcal} label="Calorias" unit="kcal" color="#f97316" icon={Flame}/>
        <Ring value={total.protein} target={target.protein} label="Proteínas" unit="g" color="#e11d48" icon={Beef}/>
        <Ring value={total.carbs} target={target.carbs} label="Carboidratos" unit="g" color="#f59e0b" icon={Wheat}/>
        <Ring value={total.fat} target={target.fat} label="Gorduras" unit="g" color="#8b5cf6" icon={Droplet}/>
      </div>
      <p className="mt-4 flex gap-2 rounded-2xl bg-emerald-500/10 p-3 text-sm font-medium text-emerald-800 dark:text-emerald-200"><Sparkles size={18} className="mt-0.5 shrink-0"/>{goalAdvice(objective, total, target)}</p>
      {!compact && <>
        <h4 className="mt-5 flex items-center gap-2 text-sm font-bold"><Leaf size={16} className="text-lime-600"/> Fibras, vitaminas e minerais</h4>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {[{ label: "Fibras", unit: "g", value: total.fiber, target: target.fiber }, ...(Object.keys(microTargets) as (keyof typeof microTargets)[]).map(key => ({ ...microTargets[key], value: total[key] }))].map(item => {
            const pct = Math.min(100, Math.round(item.value / item.target * 100));
            return <div key={item.label} className="rounded-xl bg-muted/50 p-3">
              <div className="flex justify-between text-sm"><span className="font-semibold">{item.label}</span><span className="tabular-nums text-muted-foreground">{item.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} {item.unit}</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400" style={{ width: pct + "%" }}/></div>
              <span className="mt-1 block text-xs text-muted-foreground">{pct}% da referência diária</span>
            </div>;
          })}
        </div>
        <h4 className="mt-5 text-sm font-bold">O que foi calculado hoje</h4>
        <ul className="mt-2 grid max-h-64 gap-2 overflow-y-auto">
          {entries.length === 0 && <li className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Registre uma refeição ou bebida descrevendo os alimentos (ex.: "150 g de arroz, feijão e 2 ovos").</li>}
          {entries.map((entry, index) => <li key={index} className="rounded-xl border border-border p-3 text-sm">
            <div className="flex justify-between gap-2"><strong className="truncate">{entry.text || entry.source}</strong><span className="shrink-0 text-xs text-muted-foreground">{new Date(entry.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Rio_Branco" })}</span></div>
            {entry.direct ? <p className="mt-1 text-xs text-muted-foreground">{Math.round(entry.direct.kcal)} kcal · P {entry.direct.protein.toFixed(1)} g · C {entry.direct.carbs.toFixed(1)} g · G {entry.direct.fat.toFixed(1)} g</p>
              : entry.foods.length ? <div className="mt-1.5 flex flex-wrap gap-1.5">{entry.foods.map((food, i) => <span key={i} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">{food.name.split(",")[0]} {food.grams} g{food.estimatedPortion ? "*" : ""} · {Math.round(food.nutrients.kcal)} kcal</span>)}</div>
              : <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Alimento não reconhecido no catálogo; descreva os itens para calcular.</p>}
          </li>)}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">{recognized.length} de {entries.length} registros calculados · *porção padrão estimada · valores aproximados (TACO/TBCA), não substituem orientação profissional.</p>
      </>}
    </>}
  </section>;
}
