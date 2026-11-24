import { FoodVitamins } from "./FoodVitamins";
import { Fold } from "./Fold";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Apple,
  Beef,
  Carrot,
  Check,
  CupSoda,
  Leaf,
  Loader2,
  MapPin,
  Minus,
  PieChart,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  Wheat,
  X,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ingredients,
  gramsForMacro,
  regionalFoodIds,
  type Ingredient,
} from "@/lib/nutrition-catalog";
import {
  isLiquid,
  microTargets,
  nutrientsFor,
  typicalPortion,
  type Nutrients,
} from "@/lib/food-parser";
import { useDialog } from "@/lib/dialog";
import { parseDecimal } from "@/lib/public-signup-validation";
import type { DailyNutrition } from "./DailyNutritionPanel";
import { HealthDot, HealthHint } from "./FoodHealthHint";

type Group = "todos" | "regionais" | "meus" | Ingredient["group"];
const groups: { key: Group; label: string; icon: LucideIcon; color: string }[] = [
  { key: "todos", label: "Todos", icon: Sparkles, color: "#64748b" },
  { key: "regionais", label: "Do Acre", icon: MapPin, color: "#059669" },
  { key: "meus", label: "Meus alimentos", icon: UserRound, color: "#0f766e" },
  { key: "frutas", label: "Frutas", icon: Apple, color: "#e11d48" },
  { key: "cereais", label: "Cereais e raízes", icon: Wheat, color: "#d97706" },
  { key: "proteinas", label: "Proteínas", icon: Beef, color: "#be123c" },
  { key: "legumes", label: "Legumes e verduras", icon: Carrot, color: "#16a34a" },
  { key: "bebidas", label: "Bebidas", icon: CupSoda, color: "#0284c7" },
];
const groupMeta = (g: Ingredient["group"]) => groups.find((x) => x.key === g) ?? groups[0];
const macroColors = { protein: "#e11d48", carbs: "#f59e0b", fat: "#8b5cf6" } as const;
const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const n = (v: number, d = 0) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });

type Unit = { key: string; label: string; grams: (f: Ingredient) => number };
const liquidUnits: Unit[] = [
  { key: "copo", label: "Copo", grams: () => 200 },
  { key: "xicara", label: "Xícara", grams: () => 160 },
  { key: "garrafa", label: "Garrafa", grams: () => 500 },
  { key: "g", label: "Mililitros", grams: () => 1 },
];
const units: Unit[] = [
  { key: "porcao", label: "Porção", grams: (f) => typicalPortion(f.id) },
  { key: "g", label: "Gramas", grams: () => 1 },
  { key: "colher", label: "Colher de sopa", grams: () => 25 },
  { key: "concha", label: "Concha", grams: () => 100 },
  { key: "xicara", label: "Xícara", grams: () => 160 },
  { key: "fatia", label: "Fatia", grams: () => 30 },
];

/** Selo visual do alimento: cor e ícone do grupo, com a inicial do nome. */
export function FoodBadge({ food, size = 40 }: { food: Ingredient; size?: number }) {
  const g = groupMeta(food.group);
  const Icon = g.icon;
  return (
    <span
      className="relative grid shrink-0 place-items-center text-white shadow-sm"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${g.color}, color-mix(in srgb, ${g.color} 55%, #000))`,
      }}
      aria-hidden="true"
    >
      <Icon size={size * 0.45} strokeWidth={2.2} />
      {regionalFoodIds.has(food.id) && (
        <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-emerald-400 ring-2 ring-card">
          <MapPin size={9} className="text-emerald-950" />
        </span>
      )}
    </span>
  );
}

function Donut({
  n: nut,
  hover,
  setHover,
}: {
  n: Nutrients;
  hover: string | null;
  setHover: (k: string | null) => void;
}) {
  const parts = [
    { k: "protein", label: "Proteína", kcal: nut.protein * 4, g: nut.protein },
    { k: "carbs", label: "Carboidrato", kcal: nut.carbs * 4, g: nut.carbs },
    { k: "fat", label: "Gordura", kcal: nut.fat * 9, g: nut.fat },
  ] as const;
  const total = parts.reduce((a, p) => a + p.kcal, 0) || 1;
  const R = 46,
    C = 2 * Math.PI * R;
  let acc = 0;
  const h = parts.find((p) => p.k === hover);
  return (
    <div className="relative size-32 shrink-0 2xl:size-36">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="currentColor"
          className="text-muted"
          strokeWidth="14"
        />
        {parts.map((p) => {
          const frac = p.kcal / total,
            len = Math.max(0, frac * C - 2);
          const el = (
            <circle
              key={p.k}
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={macroColors[p.k]}
              strokeWidth={hover === p.k ? 18 : 14}
              strokeDasharray={`${len} ${C}`}
              strokeDashoffset={-acc}
              onPointerEnter={() => setHover(p.k)}
              onPointerLeave={() => setHover(null)}
              className="cursor-pointer"
              style={{
                transition:
                  "stroke-dasharray .7s cubic-bezier(.2,.8,.2,1), stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1), stroke-width .2s",
                opacity: hover && hover !== p.k ? 0.35 : 1,
              }}
            />
          );
          acc += frac * C;
          return el;
        })}
      </svg>
      <span className="pointer-events-none absolute inset-0 grid place-items-center text-center leading-tight">
        {h ? (
          <span>
            <strong
              className="block text-xl font-extrabold tabular-nums"
              style={{ color: macroColors[h.k] }}
            >
              {Math.round((h.kcal / total) * 100)}%
            </strong>
            <span className="text-[11px] text-muted-foreground">
              {h.label}
              <br />
              {n(h.g, 1)} g
            </span>
          </span>
        ) : (
          <span>
            <strong className="block font-display text-3xl font-extrabold tabular-nums">
              {n(nut.kcal)}
            </strong>
            <span className="text-[11px] font-semibold text-muted-foreground">kcal</span>
          </span>
        )}
      </span>
    </div>
  );
}

type TrayItem = { id: string; name: string; grams: number; food: Ingredient };

/**
 * Calculadora de alimentos: escolha o alimento e a medida, veja macros, vitaminas,
 * quanto falta para a meta do dia e compare com alimentos parecidos.
 */
export function NutritionCalculator({
  patientId,
  nutrition,
  onLogged,
}: {
  patientId: string;
  nutrition: DailyNutrition;
  onLogged?: () => void;
}) {
  const dialog = useDialog();
  const [group, setGroup] = useState<Group>("todos");
  const [query, setQuery] = useState("");
  const [foodId, setFoodId] = useState("pirarucu");
  const [unit, setUnit] = useState("porcao");
  const [qty, setQty] = useState(1);
  const [hover, setHover] = useState<string | null>(null);
  const [tab, setTab] = useState<"nutrientes" | "meta" | "comparar">("nutrientes");
  const [compareBy, setCompareBy] = useState<"protein" | "carbs" | "fat" | "kcal">("protein");
  const [tray, setTray] = useState<TrayItem[]>([]);
  const [mealName, setMealName] = useState("Almoço");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const requestId = useRef<string | null>(null);

  const [custom, setCustom] = useState<Ingredient[]>([]);
  const [reloadCustom, setReloadCustom] = useState(0);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    group: "cereais" as Ingredient["group"],
    base: "100",
    kcal: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
  });
  useEffect(() => {
    let active = true;
    void (supabase as any)
      .from("care_food_catalog")
      .select("id,name,food_group,kcal,protein_g,carbs_g,fat_g,fiber_g,flags")
      .eq("owner_patient_id", patientId)
      .order("name")
      .then(({ data, error }: any) => {
        if (!active || error) return;
        setCustom(
          (data ?? [])
            .filter((r: any) => !(r.flags ?? []).includes("arquivado"))
            .map((r: any) => ({
              id: r.id,
              name: r.name,
              group: r.food_group,
              kcal: Number(r.kcal),
              protein: Number(r.protein_g),
              carbs: Number(r.carbs_g),
              fat: Number(r.fat_g),
              fiber: Number(r.fiber_g ?? 0),
              provenance: "rotulo" as const,
            })),
        );
      });
    return () => {
      active = false;
    };
  }, [patientId, reloadCustom]);
  const customIds = useMemo(() => new Set(custom.map((c) => c.id)), [custom]);
  const usable = useMemo(
    () => [
      ...custom,
      ...ingredients.filter(
        (f) => f.kcal !== null && f.protein !== null && f.carbs !== null && f.fat !== null,
      ),
    ],
    [custom],
  );
  const list = useMemo(
    () =>
      usable
        .filter(
          (f) =>
            (group === "todos" ||
              (group === "regionais"
                ? regionalFoodIds.has(f.id)
                : group === "meus"
                  ? customIds.has(f.id)
                  : f.group === group)) &&
            (!query.trim() || norm(f.name).includes(norm(query.trim()))),
        )
        .sort(
          (a, b) =>
            Number(customIds.has(b.id)) - Number(customIds.has(a.id)) ||
            Number(regionalFoodIds.has(b.id)) - Number(regionalFoodIds.has(a.id)) ||
            a.name.localeCompare(b.name, "pt-BR"),
        ),
    [usable, group, query, customIds],
  );
  const food = usable.find((f) => f.id === foodId) ?? usable[0];
  const liquid = food.group === "bebidas" || isLiquid(food.id);
  const U = liquid ? "ml" : "g";
  const unitList = liquid ? liquidUnits : units;
  const u = unitList.find((x) => x.key === unit) ?? unitList[0];
  const grams = Math.max(1, Math.round(u.grams(food) * qty));
  const nut = useMemo(() => nutrientsFor(food, grams), [food, grams]);
  const per100 = useMemo(() => nutrientsFor(food, 100), [food]);
  const { target, total } = nutrition;
  const left = {
    protein: Math.max(0, target.protein - total.protein),
    carbs: Math.max(0, target.carbs - total.carbs),
    fat: Math.max(0, target.fat - total.fat),
    kcal: Math.max(0, target.kcal - total.kcal),
  };
  const toFillProtein = left.protein > 0 ? gramsForMacro(food, "protein", left.protein) : null;
  const micros = (Object.keys(microTargets) as (keyof typeof microTargets)[]).map((k) => ({
    k,
    ...microTargets[k],
    value: nut[k],
    pct: Math.min(100, (nut[k] / microTargets[k].target) * 100),
  }));
  const fiberPct = Math.min(100, (nut.fiber / 25) * 100);
  const rich = [
    ...micros.filter((m) => m.pct >= 15).map((m) => m.label),
    ...(fiberPct >= 15 ? ["Fibras"] : []),
  ];
  const similar = useMemo(() => {
    const pool = usable.filter((f) => f.group === food.group);
    const val = (f: Ingredient) => (compareBy === "kcal" ? (f.kcal ?? 0) : (f[compareBy] ?? 0));
    const sorted = [...pool].sort((a, b) => val(b) - val(a));
    const top = sorted.slice(0, 8);
    if (!top.some((f) => f.id === food.id)) top[top.length - 1] = food;
    return { items: top, max: Math.max(1, ...top.map(val)), val };
  }, [usable, food, compareBy]);

  useEffect(() => {
    setQty(1);
    setUnit(food.group === "bebidas" || isLiquid(food.id) ? "copo" : "porcao");
    setNotice(null);
    requestId.current = null;
  }, [foodId]);

  async function createFood() {
    const base = parseDecimal(draft.base);
    const vals = {
      kcal: parseDecimal(draft.kcal),
      protein: parseDecimal(draft.protein),
      carbs: parseDecimal(draft.carbs),
      fat: parseDecimal(draft.fat),
      fiber: parseDecimal(draft.fiber || "0"),
    };
    if (draft.name.trim().length < 2)
      return setNotice({ ok: false, text: "Dê um nome ao alimento." });
    if (!base || base < 1 || base > 2000)
      return setNotice({ ok: false, text: "Informe o tamanho da porção entre 1 e 2.000 g." });
    if (Object.values(vals).some((v) => v === null || v < 0))
      return setNotice({
        ok: false,
        text: "Preencha calorias, proteína, carboidrato e gordura com números (0 se não tiver).",
      });
    const k = 100 / base;
    const per = {
      kcal: vals.kcal! * k,
      protein: vals.protein! * k,
      carbs: vals.carbs! * k,
      fat: vals.fat! * k,
      fiber: vals.fiber! * k,
    };
    if (per.protein + per.carbs + per.fat + per.fiber > 100.5)
      return setNotice({
        ok: false,
        text: "Os macronutrientes somam mais que o peso da porção. Confira o rótulo.",
      });
    if (per.kcal > 900)
      return setNotice({
        ok: false,
        text: "Calorias acima do possível para esse peso. Confira o rótulo.",
      });
    if (
      !(await dialog.confirm(
        "Criar alimento?",
        `${draft.name.trim()}: ${n(per.kcal)} kcal, ${n(per.protein, 1)} g de proteína, ${n(per.carbs, 1)} g de carboidrato e ${n(per.fat, 1)} g de gordura por 100 g.`,
        false,
        "Criar alimento",
      ))
    )
      return;
    setBusy(true);
    setNotice(null);
    const r = await (supabase as any).rpc("care_create_custom_food", {
      p_patient_id: patientId,
      p_name: draft.name.trim(),
      p_group: draft.group,
      p_kcal: +per.kcal.toFixed(2),
      p_protein: +per.protein.toFixed(2),
      p_carbs: +per.carbs.toFixed(2),
      p_fat: +per.fat.toFixed(2),
      p_fiber: +per.fiber.toFixed(2),
    });
    setBusy(false);
    if (r.error) return setNotice({ ok: false, text: r.error.message });
    setCreating(false);
    setDraft({
      name: "",
      group: "cereais",
      base: "100",
      kcal: "",
      protein: "",
      carbs: "",
      fat: "",
      fiber: "",
    });
    setReloadCustom((v) => v + 1);
    setGroup("meus");
    if (r.data) setFoodId(String(r.data));
    setNotice({ ok: true, text: "Alimento criado. Ele aparece só para você." });
  }
  async function removeFood() {
    if (
      !(await dialog.confirm(
        "Remover alimento?",
        `${food.name} sai da sua lista. Registros antigos continuam no histórico.`,
        true,
      ))
    )
      return;
    const r = await (supabase as any).rpc("care_delete_custom_food", { p_food_id: food.id });
    if (r.error) return setNotice({ ok: false, text: r.error.message });
    setFoodId("pirarucu");
    setReloadCustom((v) => v + 1);
  }
  async function logNow() {
    if (busy) return;
    if (
      !(await dialog.confirm(
        "Registrar consumo?",
        `Registrar ${n(grams)} ${U} de ${food.name} agora?`,
        false,
        "Registrar",
      ))
    )
      return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await (supabase as any).rpc("care_log_food_portion", {
        p_patient_id: patientId,
        p_food_id: food.id,
        p_grams: grams,
        p_request_id: (requestId.current ??= crypto.randomUUID()),
      });
      if (r.error || !r.data?.id) throw new Error(r.error?.message ?? "Registro não confirmado.");
      requestId.current = null;
      setNotice({ ok: true, text: `${food.name} (${n(grams)} ${U}) registrado no seu dia.` });
      nutrition.refresh();
      onLogged?.();
    } catch (e) {
      setNotice({
        ok: false,
        text: e instanceof Error ? e.message : "Não foi possível registrar.",
      });
    } finally {
      setBusy(false);
    }
  }
  async function logTray() {
    if (busy || !tray.length) return;
    if (
      !(await dialog.confirm(
        "Registrar prato?",
        `Registrar ${mealName} com ${tray.length} alimento(s)?`,
        false,
        "Registrar prato",
      ))
    )
      return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await (supabase as any).rpc("care_save_food_meal", {
        p_patient_id: patientId,
        p_name: mealName,
        p_items: tray.map((t) => ({ id: t.id, grams: t.grams })),
        p_request_id: crypto.randomUUID(),
        p_replace_id: null,
      });
      if (r.error || !r.data?.id) throw new Error(r.error?.message ?? "Falha ao salvar o prato.");
      setTray([]);
      setNotice({ ok: true, text: `${mealName} registrado com ${tray.length} alimento(s).` });
      nutrition.refresh();
      onLogged?.();
    } catch (e) {
      setNotice({
        ok: false,
        text: e instanceof Error ? e.message : "Não foi possível registrar o prato.",
      });
    } finally {
      setBusy(false);
    }
  }
  const trayTotal = tray.reduce(
    (a, t) => {
      const x = nutrientsFor(t.food, t.grams);
      return {
        kcal: a.kcal + x.kcal,
        protein: a.protein + x.protein,
        carbs: a.carbs + x.carbs,
        fat: a.fat + x.fat,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const macroRows = [
    {
      k: "protein" as const,
      label: "Proteína",
      g: nut.protein,
      goal: target.protein,
      left: left.protein,
    },
    {
      k: "carbs" as const,
      label: "Carboidratos",
      g: nut.carbs,
      goal: target.carbs,
      left: left.carbs,
    },
    { k: "fat" as const, label: "Gorduras", g: nut.fat, goal: target.fat, left: left.fat },
  ];

  const gm = groupMeta(food.group);
  const card = "border border-border bg-card";
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
      {/* Catálogo */}
      <aside
        className={`${card} flex min-h-0 flex-col overflow-hidden xl:sticky xl:top-2 xl:max-h-[calc(100dvh-5rem)]`}
        aria-label="Catálogo de alimentos"
      >
        <div className="border-b border-border p-3">
          <label className="relative block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Buscar alimento…"
              aria-label="Buscar alimento"
              className="h-9 w-full border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-foreground/50"
            />
          </label>
          <div
            className="-mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none]"
            role="group"
            aria-label="Grupos de alimentos"
          >
            {groups.map((g) => (
              <button
                key={g.key}
                type="button"
                aria-pressed={group === g.key}
                onClick={() => setGroup(g.key)}
                className={`inline-flex h-7 shrink-0 items-center gap-1.5 border px-2.5 text-xs font-semibold transition active:scale-95 ${group === g.key ? "border-foreground bg-foreground text-background" : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <g.icon size={12} />
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-1.5 max-xl:max-h-[22rem]">
          {list.map((f) => {
            const on = f.id === food.id;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setFoodId(f.id)}
                  aria-pressed={on}
                  className={`group flex w-full items-center gap-2.5 border-l-2 px-2 py-1.5 text-left transition ${on ? "border-l-primary bg-primary/10" : "border-l-transparent hover:bg-muted/60"}`}
                >
                  <FoodBadge food={f} size={32} />
                  <span className="min-w-0 flex-1">
                    <strong className="flex items-start gap-1.5 text-[13px] leading-tight">
                      <span className="line-clamp-2 break-words">{f.name}</span>
                      <HealthDot food={f} />
                    </strong>
                    <span className="flex gap-1.5 text-[10.5px] font-semibold tabular-nums">
                      <span style={{ color: macroColors.protein }}>P {n(f.protein ?? 0, 1)}</span>
                      <span style={{ color: macroColors.carbs }}>C {n(f.carbs ?? 0, 1)}</span>
                      <span style={{ color: macroColors.fat }}>G {n(f.fat ?? 0, 1)}</span>
                    </span>
                  </span>
                  <span className="shrink-0 bg-muted px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-muted-foreground">
                    {n(f.kcal ?? 0)}
                  </span>
                </button>
              </li>
            );
          })}
          {!list.length && (
            <li className="m-2 border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Nenhum alimento encontrado.
            </li>
          )}
        </ul>
        <div className="border-t border-border p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {list.length} alimentos · kcal por 100 g
            </p>
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              aria-expanded={creating}
              className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap bg-primary/10 px-2.5 text-xs font-bold text-primary transition hover:bg-primary/15"
            >
              <Plus size={13} /> Criar alimento
            </button>
          </div>
          {creating && (
            <div className="nv-rise mt-2 grid gap-2 border border-primary/30 bg-primary/[.04] p-3 text-xs">
              <p className="font-bold">
                Novo alimento{" "}
                <span className="font-normal text-muted-foreground">· só você vê</span>
              </p>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                maxLength={80}
                placeholder="Nome (ex.: Bolo de macaxeira da vó)"
                className="h-9 border border-border bg-background px-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="font-semibold">
                  Grupo
                  <select
                    value={draft.group}
                    onChange={(e) =>
                      setDraft({ ...draft, group: e.target.value as Ingredient["group"] })
                    }
                    className="mt-1 h-9 w-full border border-border bg-background px-2 text-sm"
                  >
                    {groups
                      .filter((g) => !["todos", "regionais", "meus"].includes(g.key))
                      .map((g) => (
                        <option key={g.key} value={g.key}>
                          {g.label}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="font-semibold">
                  Valores por porção de (g)
                  <input
                    inputMode="decimal"
                    value={draft.base}
                    onChange={(e) => setDraft({ ...draft, base: e.target.value })}
                    className="mt-1 h-9 w-full border border-border bg-background px-2 text-sm"
                  />
                </label>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {(
                  [
                    ["kcal", "kcal"],
                    ["protein", "Prot. g"],
                    ["carbs", "Carb. g"],
                    ["fat", "Gord. g"],
                    ["fiber", "Fibra g"],
                  ] as const
                ).map(([k, l]) => (
                  <label key={k} className="font-semibold">
                    {l}
                    <input
                      inputMode="decimal"
                      value={draft[k]}
                      onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                      placeholder="0"
                      className="mt-1 h-9 w-full border border-border bg-background px-1.5 text-center text-sm"
                    />
                  </label>
                ))}
              </div>
              <p className="text-muted-foreground">
                Copie do rótulo da embalagem. Use vírgula ou ponto.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="h-9 px-3 font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void createFood()}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1 bg-primary px-3 font-bold text-primary-foreground disabled:opacity-60"
                >
                  <Check size={13} /> Salvar alimento
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <section
        key={food.id}
        className="nv-fade-in grid min-w-0 content-start gap-3"
        aria-label={`Valores de ${food.name}`}
      >
        <div className="border border-border bg-card p-4">
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
            <FoodBadge food={food} size={38} />
            <div className="min-w-0">
              <h3 className="break-words text-lg font-extrabold leading-tight">{food.name}</h3>
              <p className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <span className="bg-muted px-2 py-0.5">{gm.label}</span>
                {regionalFoodIds.has(food.id) && (
                  <span className="bg-muted px-2 py-0.5">Típico do Acre</span>
                )}
                <span className="bg-muted px-2 py-0.5 text-muted-foreground">
                  {customIds.has(food.id)
                    ? "Criado por você"
                    : food.provenance === "TACO"
                      ? "Tabela TACO"
                      : food.provenance === "IBGE"
                        ? "Tabela IBGE"
                        : "Estimativa"}
                </span>
                {customIds.has(food.id) && (
                  <button
                    type="button"
                    onClick={() => void removeFood()}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={11} /> Remover
                  </button>
                )}
              </p>
              <div className="mt-2">
                <HealthHint food={food} onPick={(id) => setFoodId(id)} />
              </div>
            </div>
            <div className="col-span-2 border-t border-border pt-2 text-left sm:col-span-1 sm:border-0 sm:pt-0 sm:text-right">
              <p className="font-display text-3xl font-extrabold leading-none tabular-nums">
                {n(nut.kcal)}
                <span className="ml-1 text-base font-semibold text-muted-foreground">kcal</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                em {n(grams)} {U} · {n(per100.kcal)} kcal/100 {U}
              </p>
            </div>
          </div>
        </div>

        {/* Porção */}
        <div className="border border-border bg-card p-4">
          <p className="mb-2 text-xs font-bold text-muted-foreground">Quanto você vai comer?</p>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex flex-wrap gap-1 bg-muted p-1"
              role="radiogroup"
              aria-label="Medida"
            >
              {unitList.map((x) => (
                <button
                  key={x.key}
                  type="button"
                  role="radio"
                  aria-checked={unit === x.key}
                  onClick={() => {
                    setUnit(x.key);
                    setQty(x.key === "g" ? Math.round(grams) : 1);
                  }}
                  className={`h-8 px-2.5 text-xs font-semibold transition active:scale-95 ${unit === x.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {x.label}
                  {x.key !== "g" && (
                    <span
                      className={
                        unit === x.key ? "text-muted-foreground" : "text-muted-foreground/70"
                      }
                    >
                      {" "}
                      · {n(x.grams(food))}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                onClick={() =>
                  setQty((q) =>
                    Math.max(unit === "g" ? 5 : 0.5, +(q - (unit === "g" ? 10 : 0.5)).toFixed(1)),
                  )
                }
                className="grid size-9 place-items-center border border-border transition hover:bg-muted active:scale-90"
              >
                <Minus size={15} />
              </button>
              <label className="sr-only" htmlFor="nv-calc-qty">
                Quantidade
              </label>
              <input
                id="nv-calc-qty"
                inputMode="decimal"
                value={qty}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(",", "."));
                  if (Number.isFinite(v) && v >= 0) setQty(Math.min(unit === "g" ? 2000 : 20, v));
                }}
                className="h-9 w-16 border border-border bg-background text-center text-base font-bold tabular-nums outline-none focus:border-foreground/50"
              />
              <button
                type="button"
                aria-label="Aumentar quantidade"
                onClick={() =>
                  setQty((q) =>
                    Math.min(unit === "g" ? 2000 : 20, +(q + (unit === "g" ? 10 : 0.5)).toFixed(1)),
                  )
                }
                className="grid size-9 place-items-center border border-border transition hover:bg-muted active:scale-90"
              >
                <Plus size={15} />
              </button>
              <span className="min-w-[4.5rem] text-sm font-bold tabular-nums text-muted-foreground">
                = {n(grams)} {U}
              </span>
            </div>
          </div>
          <input
            type="range"
            min={5}
            max={600}
            step={5}
            value={Math.min(600, grams)}
            aria-label={liquid ? "Quantidade em mililitros" : "Quantidade em gramas"}
            onChange={(e) => {
              setUnit("g");
              setQty(Number(e.target.value));
            }}
            className="nv-range mt-2 w-full !h-1.5"
            style={{
              ["--nv-pct" as string]: `${(Math.min(600, grams) / 600) * 100}%`,
            }}
          />
          <div
            className="mt-2 flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Quantidade rápida"
          >
            <span className="mr-1 text-[11px] font-semibold text-muted-foreground">Quantidade</span>
            {(unit === "g" ? [50, 100, 150, 200, 300] : [0.5, 1, 1.5, 2, 3]).map((q) => (
              <button
                key={q}
                type="button"
                aria-pressed={qty === q}
                onClick={() => setQty(q)}
                className={`h-7 px-2.5 text-xs font-bold tabular-nums transition active:scale-95 ${qty === q ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:bg-muted"}`}
              >
                {unit === "g" ? `${q} ${U}` : `${String(q).replace(".", ",")}×`}
              </button>
            ))}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void logNow()}
              disabled={busy}
              className="inline-flex h-10 items-center gap-1.5 bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:brightness-110 active:scale-[.97] disabled:opacity-60"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}{" "}
              Registrar {n(grams)} {U}
            </button>
            <button
              type="button"
              onClick={() => setTray((t) => [...t, { id: food.id, name: food.name, grams, food }])}
              className="inline-flex h-10 items-center gap-1.5 border border-border px-4 text-sm font-bold transition hover:bg-muted active:scale-[.97]"
            >
              <Plus size={15} /> Adicionar ao prato{tray.length ? ` (${tray.length})` : ""}
            </button>
            {notice && (
              <p
                role="status"
                className={`px-3 py-2 text-xs font-semibold ${notice.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}
              >
                {notice.text}
              </p>
            )}
          </div>
        </div>

        {/* Abas de análise */}
        <div className="border border-border bg-card">
          <nav
            className="flex overflow-x-auto border-b border-border"
            aria-label="Análise do alimento"
          >
            {(
              [
                ["nutrientes", "Nutrientes", PieChart],
                ["meta", "Meta de hoje", Target],
                ["comparar", "Comparar", Sparkles],
              ] as const
            ).map(([k, l, Icon]) => (
              <button
                key={k}
                type="button"
                aria-current={tab === k ? "page" : undefined}
                onClick={() => setTab(k)}
                className={
                  "-mb-px inline-flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm font-semibold " +
                  (tab === k
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground")
                }
              >
                <Icon size={15} />
                {l}
              </button>
            ))}
          </nav>
          <div key={tab} className="nv-fade-in grid gap-3 p-3">
            {tab === "nutrientes" && (
              <>
                <div className="grid gap-3 lg:grid-cols-2">
                  <Fold
                    title="Composição da porção"
                    icon={PieChart}
                    color="#0d9488"
                    info="Mostra quanto da porção escolhida é proteína, carboidrato e gordura. Passe o mouse ou toque no gráfico para ver cada parte."
                  >
                    <div className="mt-3 flex items-center gap-4">
                      <Donut n={nut} hover={hover} setHover={setHover} />
                      <ul className="grid min-w-0 flex-1 gap-2">
                        {macroRows.map((m) => (
                          <li
                            key={m.k}
                            onPointerEnter={() => setHover(m.k)}
                            onPointerLeave={() => setHover(null)}
                            className={`px-2 py-1 transition ${hover === m.k ? "bg-muted" : ""}`}
                          >
                            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                              <i
                                className="size-2 rounded-full"
                                style={{ background: macroColors[m.k] }}
                              />
                              {m.label}
                            </span>
                            <strong
                              className="text-base tabular-nums"
                              style={{ color: macroColors[m.k] }}
                            >
                              {n(m.g, 1)} g
                            </strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Fold>

                  <Fold
                    title="Vitaminas e fibras"
                    icon={Leaf}
                    color="#059669"
                    aside="% do dia"
                    info="Percentual do que você precisa por dia (referência Anvisa/IOM) que esta porção fornece. Valores aproximados."
                  >
                    {rich.length > 0 && (
                      <p className="mt-2 flex flex-wrap gap-1">
                        {rich.slice(0, 3).map((r) => (
                          <span
                            key={r}
                            className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300"
                          >
                            Fonte de {r.toLowerCase()}
                          </span>
                        ))}
                      </p>
                    )}
                    <ul className="mt-2.5 grid gap-2">
                      {[
                        { k: "fiber", label: "Fibras", value: nut.fiber, unit: "g", pct: fiberPct },
                        ...micros,
                      ].map((m, i) => (
                        <li
                          key={m.k}
                          className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2 text-xs"
                        >
                          <span
                            className="truncate font-semibold"
                            title={`${n(m.value, m.value < 10 ? 1 : 0)} ${m.unit}`}
                          >
                            {m.label}
                          </span>
                          <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <i
                              className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-700 ease-out"
                              style={{
                                width: `${Math.max(m.pct, m.value > 0 ? 2 : 0)}%`,
                                transitionDelay: `${i * 50}ms`,
                              }}
                            />
                          </span>
                          <span className="text-right font-semibold tabular-nums text-muted-foreground">
                            {n(m.pct)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[10.5px] text-muted-foreground">
                      Referência Anvisa/IOM · valores aproximados.
                    </p>
                  </Fold>
                </div>

                <FoodVitamins foodId={food.id} />
              </>
            )}
            {tab === "meta" && (
              <>
                <div className={`${card} p-4`}>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="flex items-center gap-1.5 text-sm font-bold">
                      <Target size={15} className="text-primary" /> Meta de hoje
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      {n(total.kcal)} / {n(target.kcal)} kcal
                    </span>
                  </div>
                  <ul className="mt-3 grid gap-3">
                    {macroRows.map((m) => {
                      const pct = m.goal ? Math.min(100, (m.g / m.goal) * 100) : 0;
                      const prev = m.goal ? Math.min(100, ((m.goal - m.left) / m.goal) * 100) : 0;
                      return (
                        <li key={m.k}>
                          <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="font-semibold">{m.label}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {m.left > 0 ? `faltam ${n(m.left)} g` : "meta atingida"}
                            </span>
                          </div>
                          <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-muted">
                            <i
                              className="absolute inset-y-0 left-0 rounded-full"
                              style={{
                                width: `${prev}%`,
                                background: `color-mix(in srgb, ${macroColors[m.k]} 35%, transparent)`,
                              }}
                            />
                            <i
                              className="absolute inset-y-0 rounded-full transition-[width,left] duration-700 ease-out"
                              style={{
                                left: `${prev}%`,
                                width: `${Math.min(100 - prev, pct)}%`,
                                background: macroColors[m.k],
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 bg-muted/60 p-2.5 text-xs leading-snug">
                    {left.protein <= 0 ? (
                      "Proteína de hoje alcançada. Prefira variar os alimentos."
                    ) : toFillProtein ? (
                      <>
                        Esta porção cobre{" "}
                        <strong>{n(Math.min(100, (nut.protein / left.protein) * 100))}%</strong> da
                        proteína que falta. Só com {food.name.toLowerCase()}, seriam{" "}
                        <strong>{n(toFillProtein)} g</strong>.
                      </>
                    ) : (
                      `${food.name} tem pouca proteína. Combine com pirarucu, frango ou ovo.`
                    )}
                  </p>
                  <p className="mt-1.5 flex gap-3 text-[10.5px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <i className="h-1.5 w-3 rounded-full bg-rose-500/35" /> já comido
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <i className="h-1.5 w-3 rounded-full bg-rose-500" /> esta porção
                    </span>
                  </p>
                </div>

                <Fold
                  title={`Quanto de ${food.name.toLowerCase()} para fechar a meta de hoje`}
                  icon={Target}
                  color="#d97706"
                  aside="toque em “Usar” para aplicar a quantidade"
                  info="Calcula a quantidade deste alimento que completaria o que falta de energia, proteína, carboidrato ou gordura hoje. É só uma referência: não precisa fechar a meta com um único alimento."
                >
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        k: "protein" as const,
                        label: "Proteína",
                        unit: "g",
                        left: left.protein,
                        per: per100.protein,
                        color: macroColors.protein,
                      },
                      {
                        k: "kcal" as const,
                        label: "Calorias",
                        unit: "kcal",
                        left: left.kcal,
                        per: per100.kcal,
                        color: "#f97316",
                      },
                      {
                        k: "carbs" as const,
                        label: "Carboidratos",
                        unit: "g",
                        left: left.carbs,
                        per: per100.carbs,
                        color: macroColors.carbs,
                      },
                      {
                        k: "fat" as const,
                        label: "Gorduras",
                        unit: "g",
                        left: left.fat,
                        per: per100.fat,
                        color: macroColors.fat,
                      },
                    ].map((r) => {
                      const need =
                        r.left > 0 && r.per > 0
                          ? Math.ceil(((r.left / r.per) * 100) / 5) * 5
                          : null;
                      const portions = need ? need / Math.max(1, typicalPortion(food.id)) : 0;
                      const tooMuch = need !== null && need > 1500;
                      const cover =
                        r.left > 0
                          ? Math.min(100, ((r.k === "kcal" ? nut.kcal : nut[r.k]) / r.left) * 100)
                          : 100;
                      return (
                        <div key={r.k} className="border border-border bg-muted/25 p-3">
                          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <i className="size-2 rounded-full" style={{ background: r.color }} />
                              {r.label}
                            </span>
                            <span className="tabular-nums">
                              {r.left > 0 ? `faltam ${n(r.left)} ${r.unit}` : "meta atingida"}
                            </span>
                          </div>
                          {r.left <= 0 ? (
                            <p className="mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              Você já chegou lá hoje.
                            </p>
                          ) : need === null ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                              Este alimento não tem {r.label.toLowerCase()}.
                            </p>
                          ) : tooMuch ? (
                            <p className="mt-2 text-sm">
                              <strong className="tabular-nums">
                                {n(need)} {U}
                              </strong>{" "}
                              <span className="text-muted-foreground">
                                — quantidade alta; combine com outros alimentos.
                              </span>
                            </p>
                          ) : (
                            <div className="mt-1.5 flex items-end justify-between gap-2">
                              <p className="leading-tight">
                                <strong
                                  className="text-xl font-extrabold tabular-nums"
                                  style={{ color: r.color }}
                                >
                                  {n(need)} {U}
                                </strong>
                                <span className="block text-[11px] text-muted-foreground">
                                  ≈ {n(portions, 1)} porç{portions >= 2 ? "ões" : "ão"} · a atual
                                  cobre {n(cover)}%
                                </span>
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setUnit("g");
                                  setQty(need);
                                }}
                                className="h-8 shrink-0 bg-primary px-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 active:scale-95"
                              >
                                Usar
                              </button>
                            </div>
                          )}
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                            <i
                              className="block h-full rounded-full transition-[width] duration-700"
                              style={{ width: `${cover}%`, background: r.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Fold>
              </>
            )}
            {tab === "comparar" && (
              <div className={`${card} p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold">
                    Compare com {gm.label.toLowerCase()}{" "}
                    <span className="font-normal text-muted-foreground">· por 100 {U}</span>
                  </h4>
                  <div
                    className="flex gap-0.5 bg-muted p-0.5"
                    role="group"
                    aria-label="Comparar por"
                  >
                    {(
                      [
                        ["protein", "Proteína"],
                        ["carbs", "Carbo"],
                        ["fat", "Gordura"],
                        ["kcal", "Calorias"],
                      ] as const
                    ).map(([k, l]) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={compareBy === k}
                        onClick={() => setCompareBy(k)}
                        className={`h-7 px-2.5 text-[11px] font-semibold transition ${compareBy === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <ul className="mt-3 grid gap-1">
                  {similar.items.map((f, i) => {
                    const v = similar.val(f),
                      on = f.id === food.id;
                    const color = compareBy === "kcal" ? "#f97316" : macroColors[compareBy];
                    return (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => setFoodId(f.id)}
                          title={`${f.name}: ${n(v, compareBy === "kcal" ? 0 : 1)}${compareBy === "kcal" ? " kcal" : " g de " + compareBy.replace("protein", "proteína").replace("carbs", "carboidrato").replace("fat", "gordura")} por 100 ${U}${on ? " (alimento aberto)" : " · clique para abrir este alimento"}`}
                          className={`group grid w-full grid-cols-[8rem_1fr_3.5rem] items-center gap-2 px-1.5 py-1 text-left text-xs transition hover:bg-muted/60 sm:grid-cols-[11rem_1fr_3.5rem] ${on ? "bg-muted/70" : ""}`}
                        >
                          <span className={`truncate ${on ? "font-bold" : ""}`}>{f.name}</span>
                          <span className="h-2.5 overflow-hidden rounded-full bg-muted">
                            <i
                              className="block h-full rounded-full transition-[width] duration-700 ease-out"
                              style={{
                                width: `${(v / similar.max) * 100}%`,
                                background: on
                                  ? color
                                  : `color-mix(in srgb, ${color} 40%, transparent)`,
                                transitionDelay: `${i * 40}ms`,
                              }}
                            />
                          </span>
                          <span className="text-right font-semibold tabular-nums">
                            {n(v, compareBy === "kcal" ? 0 : 1)}
                            {compareBy === "kcal" ? "" : " g"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Meu prato */}
        {tray.length > 0 && (
          <div
            className={`flex flex-col border p-4 ${tray.length ? "border-primary/40 bg-primary/[.04]" : "border-dashed border-border bg-card"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold">
                Meu prato{tray.length ? ` · ${tray.length}` : ""}
              </h4>
              <select
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                aria-label="Refeição"
                className="h-8 border border-border bg-background px-2 text-xs"
              >
                {[
                  "Café da manhã",
                  "Lanche da manhã",
                  "Almoço",
                  "Lanche da tarde",
                  "Jantar",
                  "Ceia",
                ].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            {tray.length === 0 ? (
              <p className="my-auto py-6 text-center text-xs text-muted-foreground">
                Monte uma refeição com vários alimentos: escolha a medida e toque em{" "}
                <strong>Adicionar ao prato</strong>. Depois registre tudo de uma vez.
              </p>
            ) : (
              <>
                <ul className="mt-2 grid gap-1">
                  {tray.map((t, i) => (
                    <li key={i} className="flex items-center gap-2 bg-card px-2 py-1.5 text-sm">
                      <FoodBadge food={t.food} size={24} />
                      <span className="min-w-0 flex-1 truncate">{t.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {n(t.grams)}{" "}
                        {t.food.group === "bebidas" || isLiquid(t.food.id) ? "ml" : "g"}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remover ${t.name}`}
                        onClick={() => setTray((x) => x.filter((_, j) => j !== i))}
                        className="grid size-7 place-items-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs tabular-nums">
                  <strong>{n(trayTotal.kcal)} kcal</strong> ·{" "}
                  <span style={{ color: macroColors.protein }}>P {n(trayTotal.protein, 1)}</span> ·{" "}
                  <span style={{ color: macroColors.carbs }}>C {n(trayTotal.carbs, 1)}</span> ·{" "}
                  <span style={{ color: macroColors.fat }}>G {n(trayTotal.fat, 1)}</span>
                </p>
                <div className="mt-auto flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setTray([])}
                    className="inline-flex h-9 items-center gap-1 border border-border px-3 text-xs font-semibold hover:bg-muted"
                  >
                    <X size={13} /> Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => void logTray()}
                    disabled={busy}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 bg-primary px-3 text-xs font-bold text-primary-foreground transition hover:brightness-110 active:scale-[.97] disabled:opacity-60"
                  >
                    <Check size={14} /> Registrar prato
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
