import { useEffect, useMemo, useRef, useState } from "react";
import {
  Apple, Beef, Carrot, Check, CupSoda, Leaf, Loader2, MapPin, Minus, Plus, Search, Sparkles, Target, Trash2, UserRound, Wheat, X, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ingredients, gramsForMacro, regionalFoodIds, type Ingredient } from "@/lib/nutrition-catalog";
import { microTargets, nutrientsFor, typicalPortion, type Nutrients } from "@/lib/food-parser";
import { useDialog } from "@/lib/dialog";
import { parseDecimal } from "@/lib/public-signup-validation";
import type { DailyNutrition } from "./DailyNutritionPanel";

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
    <span className="relative grid shrink-0 place-items-center rounded-2xl text-white shadow-sm" style={{ width: size, height: size, background: `linear-gradient(135deg, ${g.color}, color-mix(in srgb, ${g.color} 55%, #000))` }} aria-hidden="true">
      <Icon size={size * 0.45} strokeWidth={2.2} />
      {regionalFoodIds.has(food.id) && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-emerald-400 ring-2 ring-card"><MapPin size={9} className="text-emerald-950" /></span>}
    </span>
  );
}

function Donut({ n: nut, hover, setHover }: { n: Nutrients; hover: string | null; setHover: (k: string | null) => void }) {
  const parts = [
    { k: "protein", label: "Proteína", kcal: nut.protein * 4, g: nut.protein },
    { k: "carbs", label: "Carboidrato", kcal: nut.carbs * 4, g: nut.carbs },
    { k: "fat", label: "Gordura", kcal: nut.fat * 9, g: nut.fat },
  ] as const;
  const total = parts.reduce((a, p) => a + p.kcal, 0) || 1;
  const R = 46, C = 2 * Math.PI * R;
  let acc = 0;
  const h = parts.find((p) => p.k === hover);
  return (
    <div className="relative size-40 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" className="text-muted" strokeWidth="14" />
        {parts.map((p) => {
          const frac = p.kcal / total, len = Math.max(0, frac * C - 2);
          const el = <circle key={p.k} cx="60" cy="60" r={R} fill="none" stroke={macroColors[p.k]} strokeWidth={hover === p.k ? 18 : 14} strokeDasharray={`${len} ${C}`} strokeDashoffset={-acc}
            onPointerEnter={() => setHover(p.k)} onPointerLeave={() => setHover(null)} className="cursor-pointer" style={{ transition: "stroke-dasharray .7s cubic-bezier(.2,.8,.2,1), stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1), stroke-width .2s", opacity: hover && hover !== p.k ? 0.35 : 1 }} />;
          acc += frac * C;
          return el;
        })}
      </svg>
      <span className="pointer-events-none absolute inset-0 grid place-items-center text-center leading-tight">
        {h ? <span><strong className="block text-xl font-extrabold tabular-nums" style={{ color: macroColors[h.k] }}>{Math.round((h.kcal / total) * 100)}%</strong><span className="text-[11px] text-muted-foreground">{h.label}<br />{n(h.g, 1)} g</span></span>
          : <span><strong className="block font-display text-3xl font-extrabold tabular-nums">{n(nut.kcal)}</strong><span className="text-[11px] font-semibold text-muted-foreground">kcal</span></span>}
      </span>
    </div>
  );
}

type TrayItem = { id: string; name: string; grams: number; food: Ingredient };

/**
 * Calculadora de alimentos: escolha o alimento e a medida, veja macros, vitaminas,
 * quanto falta para a meta do dia e compare com alimentos parecidos.
 */
export function NutritionCalculator({ patientId, nutrition, onLogged }: { patientId: string; nutrition: DailyNutrition; onLogged?: () => void }) {
  const dialog = useDialog();
  const [group, setGroup] = useState<Group>("todos");
  const [query, setQuery] = useState("");
  const [foodId, setFoodId] = useState("pirarucu");
  const [unit, setUnit] = useState("porcao");
  const [qty, setQty] = useState(1);
  const [hover, setHover] = useState<string | null>(null);
  const [compareBy, setCompareBy] = useState<"protein" | "carbs" | "fat" | "kcal">("protein");
  const [tray, setTray] = useState<TrayItem[]>([]);
  const [mealName, setMealName] = useState("Almoço");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const requestId = useRef<string | null>(null);

  const [custom, setCustom] = useState<Ingredient[]>([]);
  const [reloadCustom, setReloadCustom] = useState(0);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", group: "cereais" as Ingredient["group"], base: "100", kcal: "", protein: "", carbs: "", fat: "", fiber: "" });
  useEffect(() => {
    let active = true;
    void (supabase as any).from("care_food_catalog").select("id,name,food_group,kcal,protein_g,carbs_g,fat_g,fiber_g,flags").eq("owner_patient_id", patientId).order("name")
      .then(({ data, error }: any) => {
        if (!active || error) return;
        setCustom((data ?? []).filter((r: any) => !(r.flags ?? []).includes("arquivado")).map((r: any) => ({ id: r.id, name: r.name, group: r.food_group, kcal: Number(r.kcal), protein: Number(r.protein_g), carbs: Number(r.carbs_g), fat: Number(r.fat_g), fiber: Number(r.fiber_g ?? 0), provenance: "rotulo" as const })));
      });
    return () => { active = false; };
  }, [patientId, reloadCustom]);
  const customIds = useMemo(() => new Set(custom.map((c) => c.id)), [custom]);
  const usable = useMemo(() => [...custom, ...ingredients.filter((f) => f.kcal !== null && f.protein !== null && f.carbs !== null && f.fat !== null)], [custom]);
  const list = useMemo(() => usable.filter((f) =>
    (group === "todos" || (group === "regionais" ? regionalFoodIds.has(f.id) : group === "meus" ? customIds.has(f.id) : f.group === group)) &&
    (!query.trim() || norm(f.name).includes(norm(query.trim())))
  ).sort((a, b) => Number(customIds.has(b.id)) - Number(customIds.has(a.id)) || Number(regionalFoodIds.has(b.id)) - Number(regionalFoodIds.has(a.id)) || a.name.localeCompare(b.name, "pt-BR")), [usable, group, query, customIds]);
  const food = usable.find((f) => f.id === foodId) ?? usable[0];
  const u = units.find((x) => x.key === unit) ?? units[0];
  const grams = Math.max(1, Math.round(u.grams(food) * qty));
  const nut = useMemo(() => nutrientsFor(food, grams), [food, grams]);
  const per100 = useMemo(() => nutrientsFor(food, 100), [food]);
  const { target, total } = nutrition;
  const left = { protein: Math.max(0, target.protein - total.protein), carbs: Math.max(0, target.carbs - total.carbs), fat: Math.max(0, target.fat - total.fat), kcal: Math.max(0, target.kcal - total.kcal) };
  const toFillProtein = left.protein > 0 ? gramsForMacro(food, "protein", left.protein) : null;
  const micros = (Object.keys(microTargets) as (keyof typeof microTargets)[]).map((k) => ({ k, ...microTargets[k], value: nut[k], pct: Math.min(100, (nut[k] / microTargets[k].target) * 100) }));
  const fiberPct = Math.min(100, (nut.fiber / 25) * 100);
  const rich = [...micros.filter((m) => m.pct >= 15).map((m) => m.label), ...(fiberPct >= 15 ? ["Fibras"] : [])];
  const similar = useMemo(() => {
    const pool = usable.filter((f) => f.group === food.group);
    const val = (f: Ingredient) => (compareBy === "kcal" ? f.kcal ?? 0 : f[compareBy] ?? 0);
    const sorted = [...pool].sort((a, b) => val(b) - val(a));
    const top = sorted.slice(0, 8);
    if (!top.some((f) => f.id === food.id)) top[top.length - 1] = food;
    return { items: top, max: Math.max(1, ...top.map(val)), val };
  }, [usable, food, compareBy]);

  useEffect(() => { setQty(1); setUnit("porcao"); setNotice(null); requestId.current = null; }, [foodId]);

  async function createFood() {
    const base = parseDecimal(draft.base);
    const vals = { kcal: parseDecimal(draft.kcal), protein: parseDecimal(draft.protein), carbs: parseDecimal(draft.carbs), fat: parseDecimal(draft.fat), fiber: parseDecimal(draft.fiber || "0") };
    if (draft.name.trim().length < 2) return setNotice({ ok: false, text: "Dê um nome ao alimento." });
    if (!base || base < 1 || base > 2000) return setNotice({ ok: false, text: "Informe o tamanho da porção entre 1 e 2.000 g." });
    if (Object.values(vals).some((v) => v === null || v < 0)) return setNotice({ ok: false, text: "Preencha calorias, proteína, carboidrato e gordura com números (0 se não tiver)." });
    const k = 100 / base;
    const per = { kcal: vals.kcal! * k, protein: vals.protein! * k, carbs: vals.carbs! * k, fat: vals.fat! * k, fiber: vals.fiber! * k };
    if (per.protein + per.carbs + per.fat + per.fiber > 100.5) return setNotice({ ok: false, text: "Os macronutrientes somam mais que o peso da porção. Confira o rótulo." });
    if (per.kcal > 900) return setNotice({ ok: false, text: "Calorias acima do possível para esse peso. Confira o rótulo." });
    if (!(await dialog.confirm("Criar alimento?", `${draft.name.trim()}: ${n(per.kcal)} kcal, ${n(per.protein, 1)} g de proteína, ${n(per.carbs, 1)} g de carboidrato e ${n(per.fat, 1)} g de gordura por 100 g.`, false, "Criar alimento"))) return;
    setBusy(true); setNotice(null);
    const r = await (supabase as any).rpc("care_create_custom_food", { p_patient_id: patientId, p_name: draft.name.trim(), p_group: draft.group, p_kcal: +per.kcal.toFixed(2), p_protein: +per.protein.toFixed(2), p_carbs: +per.carbs.toFixed(2), p_fat: +per.fat.toFixed(2), p_fiber: +per.fiber.toFixed(2) });
    setBusy(false);
    if (r.error) return setNotice({ ok: false, text: r.error.message });
    setCreating(false); setDraft({ name: "", group: "cereais", base: "100", kcal: "", protein: "", carbs: "", fat: "", fiber: "" });
    setReloadCustom((v) => v + 1); setGroup("meus"); if (r.data) setFoodId(String(r.data));
    setNotice({ ok: true, text: "Alimento criado. Ele aparece só para você." });
  }
  async function removeFood() {
    if (!(await dialog.confirm("Remover alimento?", `${food.name} sai da sua lista. Registros antigos continuam no histórico.`, true))) return;
    const r = await (supabase as any).rpc("care_delete_custom_food", { p_food_id: food.id });
    if (r.error) return setNotice({ ok: false, text: r.error.message });
    setFoodId("pirarucu"); setReloadCustom((v) => v + 1);
  }
  async function logNow() {
    if (busy) return;
    if (!(await dialog.confirm("Registrar consumo?", `Registrar ${n(grams)} g de ${food.name} agora?`, false, "Registrar"))) return;
    setBusy(true); setNotice(null);
    try {
      const r = await (supabase as any).rpc("care_log_food_portion", { p_patient_id: patientId, p_food_id: food.id, p_grams: grams, p_request_id: (requestId.current ??= crypto.randomUUID()) });
      if (r.error || !r.data?.id) throw new Error(r.error?.message ?? "Registro não confirmado.");
      requestId.current = null;
      setNotice({ ok: true, text: `${food.name} (${n(grams)} g) registrado no seu dia.` });
      nutrition.refresh(); onLogged?.();
    } catch (e) { setNotice({ ok: false, text: e instanceof Error ? e.message : "Não foi possível registrar." }); }
    finally { setBusy(false); }
  }
  async function logTray() {
    if (busy || !tray.length) return;
    if (!(await dialog.confirm("Registrar prato?", `Registrar ${mealName} com ${tray.length} alimento(s)?`, false, "Registrar prato"))) return;
    setBusy(true); setNotice(null);
    try {
      const r = await (supabase as any).rpc("care_save_food_meal", { p_patient_id: patientId, p_name: mealName, p_items: tray.map((t) => ({ id: t.id, grams: t.grams })), p_request_id: crypto.randomUUID(), p_replace_id: null });
      if (r.error || !r.data?.id) throw new Error(r.error?.message ?? "Falha ao salvar o prato.");
      setTray([]);
      setNotice({ ok: true, text: `${mealName} registrado com ${tray.length} alimento(s).` });
      nutrition.refresh(); onLogged?.();
    } catch (e) { setNotice({ ok: false, text: e instanceof Error ? e.message : "Não foi possível registrar o prato." }); }
    finally { setBusy(false); }
  }
  const trayTotal = tray.reduce((a, t) => { const x = nutrientsFor(t.food, t.grams); return { kcal: a.kcal + x.kcal, protein: a.protein + x.protein, carbs: a.carbs + x.carbs, fat: a.fat + x.fat }; }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const macroRows = [
    { k: "protein" as const, label: "Proteína", g: nut.protein, goal: target.protein, left: left.protein },
    { k: "carbs" as const, label: "Carboidratos", g: nut.carbs, goal: target.carbs, left: left.carbs },
    { k: "fat" as const, label: "Gorduras", g: nut.fat, goal: target.fat, left: left.fat },
  ];

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      {/* Escolha do alimento */}
      <aside className="flex min-h-0 flex-col rounded-2xl border border-border bg-card p-3">
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Buscar alimento: pirarucu, tapioca, ovo…" aria-label="Buscar alimento"
            className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15" />
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Grupos de alimentos">
          {groups.map((g) => <button key={g.key} type="button" aria-pressed={group === g.key} onClick={() => setGroup(g.key)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition active:scale-95 ${group === g.key ? "text-white shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            style={group === g.key ? { background: g.color } : undefined}><g.icon size={13} />{g.label}</button>)}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">{list.length} alimentos · valores por 100 g</p>
          <button type="button" onClick={() => setCreating((v) => !v)} aria-expanded={creating} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-semibold text-primary transition hover:bg-primary/10"><Plus size={13} /> Criar alimento</button>
        </div>
        {creating && (
          <div className="nv-rise mt-2 grid gap-2 rounded-xl border border-primary/30 bg-primary/[.04] p-3 text-xs">
            <p className="font-bold">Novo alimento <span className="font-normal text-muted-foreground">· só você vê</span></p>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} placeholder="Nome (ex.: Bolo de macaxeira da vó)" className="h-9 rounded-lg border border-border bg-background px-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <label className="font-semibold">Grupo<select value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value as Ingredient["group"] })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
                {groups.filter((g) => !["todos", "regionais", "meus"].includes(g.key)).map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}</select></label>
              <label className="font-semibold">Valores por porção de (g)<input inputMode="decimal" value={draft.base} onChange={(e) => setDraft({ ...draft, base: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {([["kcal", "kcal"], ["protein", "Prot. g"], ["carbs", "Carb. g"], ["fat", "Gord. g"], ["fiber", "Fibra g"]] as const).map(([k, l]) => <label key={k} className="font-semibold">{l}<input inputMode="decimal" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} placeholder="0" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-1.5 text-center text-sm" /></label>)}
            </div>
            <p className="text-muted-foreground">Copie do rótulo da embalagem. Use vírgula ou ponto.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(false)} className="h-9 rounded-lg px-3 font-semibold text-muted-foreground hover:bg-muted">Cancelar</button>
              <button type="button" onClick={() => void createFood()} disabled={busy} className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 font-bold text-primary-foreground disabled:opacity-60"><Check size={13} /> Salvar alimento</button>
            </div>
          </div>
        )}
        <ul className="mt-1 -mx-1 max-h-[26rem] min-h-0 flex-1 overflow-y-auto px-1 xl:max-h-[34rem]">
          {list.map((f) => {
            const on = f.id === food.id;
            return (
              <li key={f.id}>
                <button type="button" onClick={() => setFoodId(f.id)} aria-pressed={on}
                  className={`group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ${on ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted/60"}`}>
                  <FoodBadge food={f} size={36} />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{f.name}</strong>
                    <span className="flex gap-2 text-[11px] tabular-nums text-muted-foreground"><span>{n(f.kcal ?? 0)} kcal</span><span style={{ color: macroColors.protein }}>P {n(f.protein ?? 0, 1)}</span><span style={{ color: macroColors.carbs }}>C {n(f.carbs ?? 0, 1)}</span><span style={{ color: macroColors.fat }}>G {n(f.fat ?? 0, 1)}</span></span>
                  </span>
                </button>
              </li>
            );
          })}
          {!list.length && <li className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Nenhum alimento encontrado.</li>}
        </ul>
      </aside>

      {/* Resultado */}
      <section key={food.id} className="nv-fade-in grid min-w-0 gap-3" aria-label={`Valores de ${food.name}`}>
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start gap-3">
            <FoodBadge food={food} size={52} />
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-extrabold leading-tight">{food.name}</h3>
              <p className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{groupMeta(food.group).label}</span>
                {regionalFoodIds.has(food.id) && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">Típico do Acre</span>}
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{customIds.has(food.id) ? "Criado por você" : food.provenance === "TACO" ? "Tabela TACO" : "Estimativa"}</span>
                {customIds.has(food.id) && <button type="button" onClick={() => void removeFood()} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-destructive hover:bg-destructive/10"><Trash2 size={11} /> Remover</button>}
              </p>
            </div>
          </div>

          {/* Medida */}
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Medida">
              {units.map((x) => <button key={x.key} type="button" role="radio" aria-checked={unit === x.key} onClick={() => { setUnit(x.key); setQty(x.key === "g" ? Math.round(grams) : 1); }}
                className={`h-9 rounded-xl border px-3 text-xs font-semibold transition active:scale-95 ${unit === x.key ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"}`}>
                {x.label}{x.key !== "g" && <span className={unit === x.key ? "text-primary-foreground/70" : "text-muted-foreground"}> · {n(x.grams(food))} g</span>}
              </button>)}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Diminuir quantidade" onClick={() => setQty((q) => Math.max(unit === "g" ? 5 : 0.5, +(q - (unit === "g" ? 10 : 0.5)).toFixed(1)))} className="grid size-10 place-items-center rounded-xl border border-border transition hover:bg-muted active:scale-90"><Minus size={16} /></button>
              <label className="sr-only" htmlFor="nv-calc-qty">Quantidade</label>
              <input id="nv-calc-qty" inputMode="decimal" value={qty} onChange={(e) => { const v = Number(e.target.value.replace(",", ".")); if (Number.isFinite(v) && v >= 0) setQty(Math.min(unit === "g" ? 2000 : 20, v)); }}
                className="h-10 w-20 rounded-xl border border-border bg-background text-center text-lg font-bold tabular-nums outline-none focus:border-primary" />
              <button type="button" aria-label="Aumentar quantidade" onClick={() => setQty((q) => Math.min(unit === "g" ? 2000 : 20, +(q + (unit === "g" ? 10 : 0.5)).toFixed(1)))} className="grid size-10 place-items-center rounded-xl border border-border transition hover:bg-muted active:scale-90"><Plus size={16} /></button>
              <span className="min-w-[4.5rem] text-sm font-semibold tabular-nums text-muted-foreground">= {n(grams)} g</span>
            </div>
          </div>
          <input type="range" min={5} max={600} step={5} value={Math.min(600, grams)} aria-label="Quantidade em gramas" onChange={(e) => { setUnit("g"); setQty(Number(e.target.value)); }}
            className="nv-range mt-3 w-full" style={{ ["--nv-pct" as string]: `${(Math.min(600, grams) / 600) * 100}%` }} />

          {/* Energia e macros */}
          <div className="mt-5 grid items-center gap-5 md:grid-cols-[auto_minmax(0,1fr)]">
            <div className="mx-auto"><Donut n={nut} hover={hover} setHover={setHover} /></div>
            <div className="grid gap-3">
              {macroRows.map((m) => {
                const pct = m.goal ? Math.min(100, (m.g / m.goal) * 100) : 0;
                const prev = m.goal ? Math.min(100, ((m.goal - m.left) / m.goal) * 100) : 0;
                return (
                  <div key={m.k} onPointerEnter={() => setHover(m.k)} onPointerLeave={() => setHover(null)} className={`rounded-xl p-2 transition ${hover === m.k ? "bg-muted/60" : ""}`}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-semibold">{m.label}</span>
                      <span className="tabular-nums"><strong className="text-base" style={{ color: macroColors[m.k] }}>{n(m.g, 1)} g</strong> <span className="text-xs text-muted-foreground">· {n(pct)}% da meta de {n(m.goal)} g</span></span>
                    </div>
                    <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted" title="Cinza: já consumido hoje · cor: esta porção">
                      <i className="absolute inset-y-0 left-0 rounded-full bg-foreground/15" style={{ width: `${prev}%` }} />
                      <i className="absolute inset-y-0 rounded-full transition-[width,left] duration-700 ease-out" style={{ left: `${prev}%`, width: `${Math.min(100 - prev, pct)}%`, background: macroColors[m.k] }} />
                    </div>
                  </div>
                );
              })}
              <p className="flex items-center gap-3 px-2 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><i className="h-2 w-4 rounded-full bg-foreground/15" /> já consumido hoje</span><span className="inline-flex items-center gap-1"><i className="h-2 w-4 rounded-full bg-gradient-to-r from-rose-500 to-amber-400" /> esta porção</span></p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {/* Vitaminas e minerais */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2"><h4 className="flex items-center gap-2 text-sm font-bold"><Leaf size={16} className="text-emerald-600" /> Vitaminas, minerais e fibras</h4><span className="text-[11px] text-muted-foreground">% do valor diário</span></div>
            {rich.length > 0 && <p className="mt-2 flex flex-wrap gap-1.5">{rich.map((r) => <span key={r} className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Fonte de {r.toLowerCase()}</span>)}</p>}
            <ul className="mt-3 grid gap-2.5">
              {[{ k: "fiber", label: "Fibras", value: nut.fiber, unit: "g", pct: fiberPct }, ...micros].map((m, i) => (
                <li key={m.k} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-2 text-xs">
                  <span className="font-semibold">{m.label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-700 ease-out" style={{ width: `${m.pct}%`, transitionDelay: `${i * 60}ms` }} /></span>
                  <span className="text-right tabular-nums text-muted-foreground">{n(m.value, m.value < 10 ? 1 : 0)} {m.unit} · {n(m.pct)}%</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">Referência diária de adultos (Anvisa/IOM). Micronutrientes são aproximados.</p>
          </div>

          {/* Para a meta */}
          <div className="relative overflow-hidden rounded-2xl bg-[#071512] p-4 text-white">
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-emerald-400/20 blur-3xl" />
            <h4 className="relative flex items-center gap-2 text-sm font-bold"><Target size={16} className="text-emerald-300" /> Para a sua meta de hoje</h4>
            <div className="relative mt-3 grid grid-cols-2 gap-2">
              {(["protein", "kcal"] as const).map((k) => (
                <div key={k} className="rounded-xl bg-white/[.06] p-3">
                  <p className="text-[11px] text-white/60">{k === "protein" ? "Proteína que falta" : "Energia que falta"}</p>
                  <p className="text-xl font-extrabold tabular-nums">{n(left[k])} <span className="text-xs font-semibold text-white/50">{k === "protein" ? "g" : "kcal"}</span></p>
                  <p className="text-[11px] text-white/55">esta porção cobre {n(left[k] ? Math.min(100, ((k === "protein" ? nut.protein : nut.kcal) / left[k]) * 100) : 0)}%</p>
                </div>
              ))}
            </div>
            <p className="relative mt-3 text-sm text-white/85">
              {left.protein <= 0 ? "Você já alcançou a proteína de hoje. Prefira variar os alimentos."
                : toFillProtein ? <>Para completar a proteína só com <strong>{food.name.toLowerCase()}</strong>, seriam <strong>{n(toFillProtein)} g</strong> (≈ {n(toFillProtein / typicalPortion(food.id), 1)} porções).</>
                : `${food.name} tem pouca proteína. Combine com uma fonte como pirarucu, frango ou ovo.`}
            </p>
            <p className="relative mt-1 text-[11px] text-white/45">Meta: {n(target.protein)} g de proteína e {n(target.kcal)} kcal · já consumido hoje: {n(total.protein)} g e {n(total.kcal)} kcal.</p>
            <div className="relative mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void logNow()} disabled={busy} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-bold text-[#062019] transition hover:bg-emerald-50 active:scale-[.97] disabled:opacity-60">{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Registrar {n(grams)} g</button>
              <button type="button" onClick={() => setTray((t) => [...t, { id: food.id, name: food.name, grams, food }])} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/20 px-4 text-sm font-bold text-white transition hover:bg-white/10 active:scale-[.97]"><Plus size={15} /> Adicionar ao prato</button>
            </div>
            {notice && <p role="status" className={`relative mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${notice.ok ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-500/20 text-rose-100"}`}>{notice.text}</p>}
          </div>
        </div>

        {/* Comparação */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold">Compare com {groupMeta(food.group).label.toLowerCase()} <span className="font-normal text-muted-foreground">· por 100 g</span></h4>
            <div className="flex gap-1 rounded-xl bg-muted p-1" role="group" aria-label="Comparar por">
              {([["protein", "Proteína"], ["carbs", "Carboidrato"], ["fat", "Gordura"], ["kcal", "Calorias"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={compareBy === k} onClick={() => setCompareBy(k)} className={`h-7 rounded-lg px-2.5 text-[11px] font-semibold transition ${compareBy === k ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{l}</button>)}
            </div>
          </div>
          <ul className="mt-3 grid gap-1.5">
            {similar.items.map((f, i) => {
              const v = similar.val(f), on = f.id === food.id;
              const color = compareBy === "kcal" ? "#f97316" : macroColors[compareBy];
              return (
                <li key={f.id}>
                  <button type="button" onClick={() => setFoodId(f.id)} className={`group grid w-full grid-cols-[9rem_1fr_4rem] items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs transition hover:bg-muted/60 sm:grid-cols-[12rem_1fr_4rem] ${on ? "bg-muted/70" : ""}`}>
                    <span className={`truncate ${on ? "font-bold" : ""}`}>{f.name}</span>
                    <span className="h-3 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full transition-[width] duration-700 ease-out group-hover:brightness-110" style={{ width: `${(v / similar.max) * 100}%`, background: on ? color : `color-mix(in srgb, ${color} 45%, transparent)`, transitionDelay: `${i * 40}ms` }} /></span>
                    <span className="text-right font-semibold tabular-nums">{n(v, compareBy === "kcal" ? 0 : 1)}{compareBy === "kcal" ? "" : " g"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">Por 100 g de {food.name.toLowerCase()}: {n(per100.kcal)} kcal · proteína {n(per100.protein, 1)} g · carboidrato {n(per100.carbs, 1)} g · gordura {n(per100.fat, 1)} g. Toque em outro alimento para trocar.</p>
        </div>

        {/* Prato */}
        {tray.length > 0 && (
          <div className="nv-rise rounded-2xl border-2 border-primary/30 bg-primary/[.04] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold">Meu prato · {tray.length} {tray.length === 1 ? "alimento" : "alimentos"}</h4>
              <select value={mealName} onChange={(e) => setMealName(e.target.value)} aria-label="Refeição" className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
                {["Café da manhã", "Lanche da manhã", "Almoço", "Lanche da tarde", "Jantar", "Ceia"].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <ul className="mt-2 grid gap-1">
              {tray.map((t, i) => <li key={i} className="flex items-center gap-2 rounded-lg bg-card px-2 py-1.5 text-sm"><FoodBadge food={t.food} size={26} /><span className="min-w-0 flex-1 truncate">{t.name}</span><span className="tabular-nums text-muted-foreground">{n(t.grams)} g</span>
                <button type="button" aria-label={`Remover ${t.name}`} onClick={() => setTray((x) => x.filter((_, j) => j !== i))} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button></li>)}
            </ul>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm tabular-nums"><strong>{n(trayTotal.kcal)} kcal</strong> · <span style={{ color: macroColors.protein }}>P {n(trayTotal.protein, 1)} g</span> · <span style={{ color: macroColors.carbs }}>C {n(trayTotal.carbs, 1)} g</span> · <span style={{ color: macroColors.fat }}>G {n(trayTotal.fat, 1)} g</span></p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setTray([])} className="inline-flex h-10 items-center gap-1 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-muted"><X size={14} /> Limpar</button>
                <button type="button" onClick={() => void logTray()} disabled={busy} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:brightness-110 active:scale-[.97] disabled:opacity-60"><Check size={15} /> Registrar prato</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
