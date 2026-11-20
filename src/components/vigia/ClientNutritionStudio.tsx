import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  ChefHat,
  Clock3,
  Coffee,
  Moon,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  Sun,
  Timer,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { NutritionCalculator } from "./NutritionCalculator";
import { NutritionStudioHero, type HeroChip } from "./NutritionStudioHero";
import { CookingTimer } from "./CookingTimer";
import { ExportPlanButton } from "./ExportPlanButton";
import { useDailyNutrition } from "./DailyNutritionPanel";
import { supabase } from "@/integrations/supabase/client";
import {
  ingredientById,
  ingredients,
  mealSlots,
  menuForDay,
  nutritionSources,
  proteinRange,
  recipeFits,
  recipeTotals,
  recipeTriggers,
  recipes,
  triggerNames,
  type Goal,
  type Ingredient,
  type MealTime,
  type Recipe,
} from "@/lib/nutrition-catalog";
type MacroTargets = { protein: string; carbs: string; fat: string; kcal: string };

type Props = { patientId: string; ownerId: string; onLogged?: () => void };
type View = "calculadora" | "cardapio" | "receitas" | "preparo";
const goalOptions: { value: Goal; label: string; description: string }[] = [
  {
    value: "equilibrio",
    label: "Alimentação equilibrada",
    description: "Variedade de refeições e alimentos in natura",
  },
  {
    value: "emagrecimento",
    label: "Controle de peso",
    description: "Opções de refeições variadas; sem restrição extrema",
  },
  {
    value: "ganho_peso",
    label: "Ganho de peso",
    description: "Refeições regulares e boas fontes de energia",
  },
  {
    value: "hipertrofia",
    label: "Hipertrofia",
    description: "Distribuição de proteínas ao longo do dia",
  },
];
const timeLabels: Record<MealTime, string> = {
  cafe: "Café da manhã",
  almoco: "Almoço",
  jantar: "Jantar",
  lanche: "Lanche",
};
const viewOptions: { key: View; label: string; icon: LucideIcon; color: string }[] = [
  { color: "#0d9488", key: "calculadora", label: "Calculadora de alimentos", icon: Calculator },
  { color: "#d97706", key: "cardapio", label: "Cardápio da semana", icon: UtensilsCrossed },
  { color: "#e11d48", key: "receitas", label: "Receitas", icon: ChefHat },
  { color: "#4f46e5", key: "preparo", label: "Tempo de preparo", icon: Timer },
];
const slotStyle: Record<MealTime, { icon: LucideIcon; color: string }> = {
  cafe: { icon: Coffee, color: "#d97706" },
  almoco: { icon: Sun, color: "#059669" },
  jantar: { icon: Moon, color: "#4f46e5" },
  lanche: { icon: UtensilsCrossed, color: "#e11d48" },
};
const week = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const safeNumber = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const norm = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
const navButton = (selected: boolean) =>
  "rounded-lg px-3 py-2 text-xs font-bold transition-colors " +
  (selected ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted");
export function ClientNutritionStudio({ patientId, ownerId, onLogged }: Props) {
  const nutrition = useDailyNutrition(patientId, ownerId, 0);
  const [view, setView] = useState<View>("calculadora");
  const [showSettings, setShowSettings] = useState(false);
  const [goal, setGoal] = useState<Goal>("equilibrio");
  const [sensitive, setSensitive] = useState(false);
  const [avoided, setAvoided] = useState<string[]>([]);
  const [weight, setWeight] = useState("");
  const [macroTargets, setMacroTargets] = useState<MacroTargets>({
    protein: "",
    carbs: "",
    fat: "",
    kcal: "",
  });
  const [mealFilter, setMealFilter] = useState<"todos" | MealTime>("todos");
  const [search, setSearch] = useState("");
  const [foodGroup, setFoodGroup] = useState<"todos" | Ingredient["group"]>("todos");
  const [day, setDay] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [showAvoid, setShowAvoid] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await (supabase as any)
        .from("care_nutrition_preferences")
        .select(
          "objective,gastritis_sensitive,avoided_ingredients,weight_kg,target_protein_g,target_carbs_g,target_fat_g,target_kcal",
        )
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (!alive) return;
      if (r.error)
        setLoadError(
          "Preferências não carregadas. É possível consultar receitas, mas o salvamento exige a atualização do banco de dados.",
        );
      else if (r.data) {
        if (goalOptions.some((o) => o.value === r.data.objective))
          setGoal(r.data.objective as Goal);
        setSensitive(Boolean(r.data.gastritis_sensitive));
        setAvoided(
          (Array.isArray(r.data.avoided_ingredients) ? r.data.avoided_ingredients : []).filter(
            (id: unknown) => typeof id === "string" && ingredientById.has(id),
          ),
        );
        if (Number.isFinite(Number(r.data.weight_kg)) && r.data.weight_kg !== null)
          setWeight(String(r.data.weight_kg));
        setMacroTargets({
          protein: r.data.target_protein_g == null ? "" : String(r.data.target_protein_g),
          carbs: r.data.target_carbs_g == null ? "" : String(r.data.target_carbs_g),
          fat: r.data.target_fat_g == null ? "" : String(r.data.target_fat_g),
          kcal: r.data.target_kcal == null ? "" : String(r.data.target_kcal),
        });
      }
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [patientId, ownerId]);

  const filteredRecipes = useMemo(
    () =>
      recipes.filter(
        (r) =>
          recipeFits(r, goal, sensitive, avoided) &&
          (mealFilter === "todos" || r.slot === mealFilter) &&
          (!search.trim() ||
            norm(
              r.title +
                " " +
                r.description +
                " " +
                r.ingredients.map(([id]) => ingredientById.get(id)?.name ?? "").join(" "),
            ).includes(norm(search.trim()))),
      ),
    [goal, sensitive, avoided, mealFilter, search],
  );
  const selectableRecipes = useMemo(
    () => recipes.filter((r) => recipeFits(r, goal, sensitive, avoided)),
    [goal, sensitive, avoided],
  );
  const plan = useMemo(
    () => menuForDay(day, selectableRecipes, rotation, goal),
    [day, selectableRecipes, rotation, goal],
  );
  const planNutrition = plan.reduce(
    (acc, { recipe }) => {
      if (recipe) {
        const info = recipeTotals(recipe);
        acc.protein += info.protein;
        acc.kcal += info.kcal;
      }
      return acc;
    },
    { protein: 0, kcal: 0 },
  );
  const visibleFoods = useMemo(
    () =>
      ingredients.filter(
        (f) =>
          (foodGroup === "todos" || f.group === foodGroup) &&
          (!search.trim() || norm(f.name).includes(norm(search.trim()))),
      ),
    [foodGroup, search],
  );
  const chosen = recipes.find((r) => r.id === selectedId) || null;
  const protein = proteinRange(Number(weight.replace(",", ".")), goal);
  const selectedGoal = goalOptions.find((o) => o.value === goal)!;
  const triggers = (r: Recipe) => recipeTriggers(r).map((flag) => triggerNames[flag]);
  function openRecipe(recipe: Recipe) {
    setSelectedId(recipe.id);
    setNotice("");
  }
  function chooseView(key: View) {
    setView(key);
    setSelectedId(null);
    setSearch("");
    setMealFilter("todos");
  }

  async function save() {
    if (!patientId || !ownerId || saving) return;
    const kg = weight.trim() ? Number(weight.replace(",", ".")) : null;
    if (kg !== null && (!Number.isFinite(kg) || kg < 30 || kg > 300)) {
      setNotice("Informe peso entre 30 e 300 kg, ou deixe em branco.");
      return;
    }
    const limits: Record<keyof MacroTargets, [number, number]> = {
      protein: [1, 500],
      carbs: [1, 1200],
      fat: [1, 350],
      kcal: [500, 7000],
    };
    const values = Object.fromEntries(
      (Object.keys(limits) as (keyof MacroTargets)[]).map((key) => {
        const raw = macroTargets[key].trim();
        return [key, raw ? Number(raw.replace(",", ".")) : null];
      }),
    ) as Record<keyof MacroTargets, number | null>;
    for (const key of Object.keys(limits) as (keyof MacroTargets)[]) {
      const n = values[key];
      const [min, max] = limits[key];
      if (n !== null && (!Number.isFinite(n) || n < min || n > max)) {
        setNotice("Revise a meta de " + key + ": intervalo aceito " + min + "–" + max + ".");
        return;
      }
    }
    setSaving(true);
    setNotice("");
    try {
      const { data: user, error: authError } = await supabase.auth.getUser();
      if (authError || !user.user)
        throw new Error("Entre novamente para salvar suas preferências.");
      const r = await (supabase as any)
        .from("care_nutrition_preferences")
        .upsert(
          {
            patient_id: patientId,
            owner_id: ownerId,
            objective: goal,
            gastritis_sensitive: sensitive,
            avoided_ingredients: avoided,
            weight_kg: kg,
            target_protein_g: values.protein,
            target_carbs_g: values.carbs,
            target_fat_g: values.fat,
            target_kcal: values.kcal,
            updated_by: user.user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "patient_id" },
        )
        .select("patient_id")
        .single();
      if (r.error || r.data?.patient_id !== patientId)
        throw new Error(r.error?.message ?? "O banco não confirmou o salvamento.");
      setNotice("Preferências atualizadas no prontuário privado deste paciente.");
      setLoadError("");
    } catch (e) {
      setNotice(
        e instanceof Error ? "Não foi possível salvar: " + e.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }
  const isIgnored = (item: Ingredient) => avoided.includes(item.id);
  const sourceLink = (url: string, title: string) => (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-primary underline decoration-primary/35 underline-offset-2"
    >
      {title}
    </a>
  );
  const t = nutrition.target,
    tot = nutrition.total;
  const targetChips = [
    { k: "kcal", label: "Energia", v: tot.kcal, goal: t.kcal, unit: "kcal", color: "#fb923c" },
    {
      k: "protein",
      label: "Proteína",
      v: tot.protein,
      goal: t.protein,
      unit: "g",
      color: "#fb7185",
    },
    { k: "carbs", label: "Carboidratos", v: tot.carbs, goal: t.carbs, unit: "g", color: "#fbbf24" },
    { k: "fat", label: "Gorduras", v: tot.fat, goal: t.fat, unit: "g", color: "#a78bfa" },
  ];
  const RecipeCard = ({
    r,
    active,
    onClick,
    label,
  }: {
    r: Recipe;
    active: boolean;
    onClick: () => void;
    label?: string;
  }) => {
    const st = slotStyle[r.slot];
    const Icon = st.icon;
    const totals = recipeTotals(r);
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={
          "group relative flex flex-col overflow-hidden rounded-2xl border text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-lg " +
          (active ? "border-transparent shadow-lg" : "border-border bg-card")
        }
        style={
          active ? { boxShadow: `0 0 0 2px ${st.color}, 0 14px 30px -16px ${st.color}` } : undefined
        }
      >
        <span
          className="relative flex h-16 items-center gap-2 px-3 text-white"
          style={{
            background: `linear-gradient(120deg, ${st.color}, color-mix(in srgb, ${st.color} 55%, #000))`,
          }}
        >
          <span className="grid size-9 place-items-center rounded-xl bg-white/15">
            <Icon size={18} />
          </span>
          <span className="text-[11px] font-bold">{label ?? timeLabels[r.slot]}</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-0.5 text-[11px]">
            <Clock3 size={11} />
            {r.minutes} min
          </span>
        </span>
        <span className="flex flex-1 flex-col p-3">
          <strong className="text-sm leading-snug">{r.title}</strong>
          <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</span>
          <span className="mt-auto flex gap-3 pt-2 text-[11px] font-semibold tabular-nums">
            <span>{totals.kcal} kcal</span>
            <span className="text-rose-600 dark:text-rose-300">
              P {safeNumber(totals.protein)} g
            </span>
          </span>
        </span>
      </button>
    );
  };
  const RecipeDetail = ({ r }: { r: Recipe }) => {
    const totals = recipeTotals(r);
    const st = slotStyle[r.slot];
    return (
      <aside
        className="nv-fade-in self-start overflow-hidden rounded-2xl border border-border bg-card lg:sticky lg:top-2"
        aria-label={r.title}
      >
        <div
          className="flex items-start justify-between gap-2 p-4 text-white"
          style={{
            background: `linear-gradient(120deg, ${st.color}, color-mix(in srgb, ${st.color} 50%, #000))`,
          }}
        >
          <div>
            <p className="text-[11px] font-bold text-white/80">
              {timeLabels[r.slot]} · {r.minutes} min
            </p>
            <h4 className="mt-0.5 text-lg font-extrabold leading-tight">{r.title}</h4>
          </div>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            aria-label="Fechar receita"
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/15 hover:bg-white/25"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">{r.description}</p>
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
            {[
              ["kcal", totals.kcal, ""],
              ["Prot.", totals.protein, "g"],
              ["Carb.", totals.carbs, "g"],
              ["Gord.", totals.fat, "g"],
            ].map(([l, v, u]) => (
              <span key={l as string} className="rounded-xl bg-muted/60 py-2">
                <strong className="block text-sm tabular-nums">
                  {safeNumber(Number(v))}
                  {u}
                </strong>
                <span className="text-[11px] text-muted-foreground">{l}</span>
              </span>
            ))}
          </div>
          <h5 className="mt-4 text-xs font-bold">Ingredientes</h5>
          <ul className="mt-1 divide-y divide-border/60">
            {r.ingredients.map(([id, grams]) => (
              <li key={id} className="flex justify-between gap-2 py-1.5 text-xs">
                <span>{ingredientById.get(id)?.name ?? id}</span>
                <strong className="shrink-0 tabular-nums">{grams} g</strong>
              </li>
            ))}
          </ul>
          <h5 className="mt-3 text-xs font-bold">Preparo</h5>
          <ol className="mt-1 grid gap-1.5 text-xs leading-relaxed">
            {r.steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          {triggers(r).length > 0 && (
            <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/[.06] p-2 text-[11px]">
              <AlertTriangle size={12} className="mr-1 inline" /> Verifique tolerância a:{" "}
              {triggers(r).join(", ")}.
            </p>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Valores aproximados; variam com marca, preparo e porção.
          </p>
        </div>
      </aside>
    );
  };
  return (
    <section
      className="nutrition-studio flex min-h-0 min-w-0 flex-col gap-3 text-foreground"
      aria-label="Cardápios e dietas"
    >
      <NutritionStudioHero
        goal={goal}
        goals={goalOptions}
        onGoal={(value) => {
          setGoal(value as Goal);
          setSelectedId(null);
        }}
        chips={targetChips as HeroChip[]}
        settingsOpen={showSettings}
        onToggleSettings={() => setShowSettings((v) => !v)}
        settingsBadge={avoided.length + (sensitive ? 1 : 0)}
        exportSlot={
          <ExportPlanButton patientId={patientId} ownerId={ownerId} label="Exportar cardápio" />
        }
      />

      {showSettings && (
        <div className="nv-rise grid gap-3 rounded-2xl border border-border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-3">
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-emerald-600"
                checked={sensitive}
                onChange={(e) => {
                  setSensitive(e.target.checked);
                  setSelectedId(null);
                }}
              />
              <span>
                <strong className="block">Estômago sensível / gastrite</strong>
                <span className="text-xs text-muted-foreground">
                  Esconde receitas com gatilhos frequentes (ácidos, frituras, picantes). Não garante
                  tolerância.
                </span>
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <label className="text-xs font-semibold">
                Peso (kg)
                <input
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  inputMode="decimal"
                  placeholder="70"
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"
                />
              </label>
              {(
                [
                  ["kcal", "Energia (kcal)"],
                  ["protein", "Proteína (g)"],
                  ["carbs", "Carbo (g)"],
                  ["fat", "Gordura (g)"],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className="text-xs font-semibold">
                  {l}
                  <input
                    value={macroTargets[k]}
                    onChange={(e) => setMacroTargets({ ...macroTargets, [k]: e.target.value })}
                    inputMode="decimal"
                    placeholder={String(Math.round(t[k]))}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  />
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Deixe as metas em branco para usar a estimativa pelo objetivo e peso.
              {protein
                ? ` Proteína indicada para seu objetivo: ${protein.low}–${protein.high} g/dia.`
                : ""}
            </p>
          </div>
          <div>
            <p className="text-sm font-bold">
              Não quero estes ingredientes{" "}
              <span className="font-normal text-muted-foreground">({avoided.length})</span>
            </p>
            <div className="mt-2 flex max-h-36 flex-wrap gap-1 overflow-y-auto">
              {ingredients.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={isIgnored(f)}
                  onClick={() => {
                    setAvoided((old) =>
                      old.includes(f.id) ? old.filter((x) => x !== f.id) : [...old, f.id],
                    );
                    setSelectedId(null);
                  }}
                  className={
                    "rounded-full border px-2 py-1 text-[11px] font-semibold transition " +
                    (isIgnored(f)
                      ? "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-200"
                      : "border-border text-muted-foreground hover:bg-muted")
                  }
                >
                  {isIgnored(f) ? "× " : ""}
                  {f.name}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              {(notice || loadError) && (
                <p role="status" className="mr-auto text-xs text-muted-foreground">
                  {notice || loadError}
                </p>
              )}
              <button
                type="button"
                disabled={!loaded || saving}
                onClick={() => void save().then(() => nutrition.refresh())}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
              >
                <Save size={15} />
                {saving ? "Salvando…" : "Salvar preferências"}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        className="flex gap-0 overflow-x-auto border-b border-border"
        aria-label="Seções de nutrição"
      >
        {viewOptions.map((o) => {
          const Icon = o.icon;
          const on = view === o.key;
          return (
            <button
              key={o.key}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => chooseView(o.key)}
              className={
                "-mb-px inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition " +
                (on
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              <Icon size={15} />
              <span className="truncate">{o.label}</span>
            </button>
          );
        })}
      </nav>
      {sensitive && view !== "calculadora" && view !== "preparo" && (
        <p className="flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[.06] px-3 py-2 text-xs">
          <ShieldAlert size={15} className="shrink-0 text-amber-600" /> Modo estômago sensível
          ativo: receitas com gatilhos frequentes foram ocultadas. Nenhum cardápio garante ausência
          de sintomas.
        </p>
      )}

      <div
        className={
          "flex min-h-0 min-w-0 flex-1 flex-col gap-3 " +
          (view === "calculadora" ? "xl:overflow-hidden" : "xl:overflow-y-auto")
        }
      >
        {view === "preparo" && <CookingTimer patientId={patientId} />}

        {view === "calculadora" && (
          <NutritionCalculator patientId={patientId} nutrition={nutrition} onLogged={onLogged} />
        )}

        {view === "cardapio" && (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold">Sugestões para 7 dias</h3>
                  <p className="text-xs text-muted-foreground">{selectedGoal.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRotation((n) => n + 1);
                    setSelectedId(null);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold transition hover:bg-muted active:scale-95"
                >
                  <RotateCcw size={14} /> Gerar outras opções
                </button>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {week.map((label, i) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => {
                      setDay(i);
                      setSelectedId(null);
                    }}
                    aria-pressed={day === i}
                    className={
                      "h-10 rounded-xl text-xs font-bold transition active:scale-95 " +
                      (day === i
                        ? "bg-foreground text-background"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {selectableRecipes.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm">
                  Nenhuma receita combina com todas as restrições. Revise as preferências.
                </p>
              ) : (
                <div
                  key={day + "-" + rotation}
                  className="nv-fade-in mt-3 grid gap-3 sm:grid-cols-2"
                >
                  {plan.map(({ slot, recipe }) =>
                    recipe ? (
                      <RecipeCard
                        key={slot.id}
                        r={recipe}
                        label={slot.label}
                        active={chosen?.id === recipe.id}
                        onClick={() => openRecipe(recipe)}
                      />
                    ) : (
                      <div
                        key={slot.id}
                        className="grid place-items-center rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground"
                      >
                        {slot.label}: sem opção com os filtros.
                      </div>
                    ),
                  )}
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-3 text-sm">
                <span>
                  Total do dia
                  <strong className="block text-lg tabular-nums">
                    {safeNumber(Math.round(planNutrition.kcal))} kcal
                  </strong>
                  <span className="text-[11px] text-muted-foreground">
                    meta {safeNumber(Math.round(t.kcal))} kcal
                  </span>
                </span>
                <span>
                  Proteína do dia
                  <strong className="block text-lg tabular-nums">
                    {safeNumber(planNutrition.protein)} g
                  </strong>
                  <span className="text-[11px] text-muted-foreground">
                    meta {safeNumber(Math.round(t.protein))} g
                  </span>
                </span>
              </div>
            </div>
            {chosen ? (
              <RecipeDetail r={chosen} />
            ) : (
              <aside className="self-start rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                <ChefHat size={28} className="mx-auto mb-2 text-primary" />
                Toque em uma refeição para ver ingredientes, preparo e valores.
              </aside>
            )}
          </div>
        )}

        {view === "receitas" && (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap gap-2">
                <label className="relative min-w-[12rem] flex-1">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar: banana, frango, macaxeira…"
                    aria-label="Buscar receitas"
                    className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
                  />
                </label>
                <div className="flex flex-wrap gap-1" role="group" aria-label="Refeição">
                  {(
                    [["todos", "Todas"], ...mealSlots.map((s) => [s.id, s.label])] as [
                      string,
                      string,
                    ][]
                  ).map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={mealFilter === k}
                      onClick={() => setMealFilter(k as typeof mealFilter)}
                      className={
                        "h-10 rounded-xl px-3 text-xs font-semibold transition " +
                        (mealFilter === k
                          ? "bg-foreground text-background"
                          : "bg-muted/60 text-muted-foreground hover:text-foreground")
                      }
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {filteredRecipes.length} receitas para o seu objetivo e preferências.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredRecipes.map((r) => (
                  <RecipeCard
                    key={r.id}
                    r={r}
                    active={chosen?.id === r.id}
                    onClick={() => openRecipe(r)}
                  />
                ))}
              </div>
              {!filteredRecipes.length && (
                <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Nenhuma receita com esses filtros.
                </p>
              )}
            </div>
            {chosen ? (
              <RecipeDetail r={chosen} />
            ) : (
              <aside className="self-start rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                <ChefHat size={28} className="mx-auto mb-2 text-primary" />
                Escolha uma receita para ver o passo a passo.
              </aside>
            )}
          </div>
        )}

        <details className="rounded-2xl border border-border bg-card px-4 py-3 text-xs">
          <summary className="flex cursor-pointer items-center gap-1.5 font-semibold">
            <BookOpen size={14} className="text-primary" /> Fontes e metodologia
          </summary>
          <div className="mt-2 space-y-1.5">
            {nutritionSources.map((item) => (
              <p key={item.url}>{sourceLink(item.url, item.title)}</p>
            ))}
          </div>
          <p className="mt-2 text-muted-foreground">
            Valores educativos (TACO/UNICAMP e estimativas editoriais). Não substituem orientação de
            nutricionista.
          </p>
        </details>
      </div>
    </section>
  );
}
