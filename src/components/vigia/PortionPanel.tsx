import { useMemo, useState } from "react";
import { Calculator, Check, Minus, Plus, Utensils } from "lucide-react";
import { HealthHint } from "@/components/vigia/FoodHealthHint";
import { isLiquid, typicalPortion } from "@/lib/food-parser";

export type PortionFood = {
  id: string;
  name: string;
  food_group: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  provenance: string | null;
  note: string | null;
};

type U = { key: string; label: string; short: string; base: number; step: number };
const num = (v: unknown) => Number(v) || 0;
const fmt = (v: number, d = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });
const MAX = 2000;

/** Líquido (ml) ou sólido (g): usa o cadastro do alimento e, se faltar, o grupo/nome. */
export function foodIsLiquid(f: PortionFood) {
  return (
    isLiquid(f.id) ||
    /bebida|l[ií]quid|suco|leite|caldo|sopa|ch[aá]\b|caf[eé]|[aá]gua|iogurte l/i.test(
      `${f.food_group} ${f.name}`,
    )
  );
}

/** Medidas que fazem sentido para o tipo de alimento (conversões aproximadas, em g ou ml). */
function unitsFor(f: PortionFood): U[] {
  if (foodIsLiquid(f))
    return [
      { key: "base", label: "Mililitros", short: "ml", base: 1, step: 50 },
      { key: "copo", label: "Copo (200 ml)", short: "copo", base: 200, step: 1 },
      { key: "xicara", label: "Xícara (240 ml)", short: "xícara", base: 240, step: 1 },
      { key: "colher", label: "Colher de sopa (15 ml)", short: "colher", base: 15, step: 1 },
    ];
  const p = typicalPortion(f.id);
  const list: U[] = [
    { key: "base", label: "Gramas", short: "g", base: 1, step: 10 },
    { key: "porcao", label: `Porção usual (${p} g)`, short: "porção", base: p, step: 0.5 },
    { key: "colher", label: "Colher de sopa (≈25 g)", short: "colher", base: 25, step: 1 },
    { key: "concha", label: "Concha (≈100 g)", short: "concha", base: 100, step: 1 },
    { key: "fatia", label: "Fatia (≈30 g)", short: "fatia", base: 30, step: 1 },
  ];
  return list;
}

const NUTRIENTS = [
  { key: "protein_g", label: "Proteínas", unit: "g", ref: 50 },
  { key: "carbs_g", label: "Carboidratos", unit: "g", ref: 260 },
  { key: "fat_g", label: "Gorduras", unit: "g", ref: 70 },
  { key: "fiber_g", label: "Fibras", unit: "g", ref: 25 },
  { key: "kcal", label: "Calorias", unit: "kcal", ref: 2000 },
] as const;
type NKey = (typeof NUTRIENTS)[number]["key"];
const step = (g: number) => (g >= 500 ? 100 : g >= 100 ? 25 : g >= 20 ? 5 : 1);
const presetsFor = (unit: string) =>
  unit === "g"
    ? [10, 20, 30, 50]
    : unit === "kcal"
      ? [100, 200, 300, 500]
      : unit === "mg"
        ? [50, 100, 500, 1000]
        : [10, 25, 50, 100];

export function PortionPanel({
  food,
  foods,
  amount,
  setAmount,
  onPick,
  canRegister,
  saving,
  feedback,
  onRegister,
}: {
  food: PortionFood;
  foods: PortionFood[];
  /** Quantidade em g (sólidos) ou ml (líquidos). */
  amount: number;
  setAmount: (v: number) => void;
  onPick: (id: string) => void;
  canRegister: boolean;
  saving: boolean;
  feedback: string;
  onRegister: () => void;
}) {
  const units = useMemo(() => unitsFor(food), [food]);
  const [unitKey, setUnitKey] = useState("base");
  const [draft, setDraft] = useState<string | null>(null);
  const [need, setNeed] = useState<NKey>("protein_g");
  const [target, setTarget] = useState("30");

  const unit = units.find((u) => u.key === unitKey) ?? units[0];
  const base = foodIsLiquid(food) ? "ml" : "g";
  const qty = amount / unit.base;
  const factor = amount / 100;
  const valid = amount > 0 && amount <= MAX;

  const setQty = (q: number) =>
    setAmount(Math.min(MAX, Math.max(0, Math.round(q * unit.base * 10) / 10)));
  const nut = NUTRIENTS.find((x) => x.key === need) ?? NUTRIENTS[0];
  const per100 = num(food[need]);
  const goal = Math.max(0, Number(target.replace(",", ".")) || 0);
  const required = per100 > 0 ? (goal / per100) * 100 : null; // em g/ml
  const unrealistic = required !== null && required > 1000;
  const provided = per100 * factor;

  const better = useMemo(
    () =>
      foods
        .filter(
          (f) =>
            f.id !== food.id && foodIsLiquid(f) === foodIsLiquid(food) && num(f[need]) > per100 * 2,
        )
        .sort((a, b) => num(b[need]) - num(a[need]))
        .slice(0, 3),
    [foods, food, need, per100],
  );

  return (
    <div className="grid content-start gap-3">
      <article className="border border-border bg-card p-4 shadow-sm">
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Utensils size={16} className="text-primary" /> Composição da porção
            </h2>
            <h3 className="mt-1 truncate text-xl font-bold">{food.name}</h3>
            <p className="text-[11px] text-muted-foreground">
              Referência: {fmt(num(food.kcal), 0)} kcal por 100 {base} ·{" "}
              {food.provenance || "fonte não especificada"}
            </p>
          </div>
          <span className="shrink-0 border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            {foodIsLiquid(food) ? "Líquido" : "Sólido"}
          </span>
        </header>

        <div className="mb-3">
          <HealthHint
            food={{
              id: food.id,
              group: food.food_group as never,
              kcal: num(food.kcal),
              protein: num(food.protein_g),
              carbs: num(food.carbs_g),
              fat: num(food.fat_g),
              fiber: num(food.fiber_g),
            }}
            onPick={(id) => foods.some((x) => x.id === id) && onPick(id)}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="text-xs font-bold">
            Medir por
            <select
              className="field mt-1 w-full"
              value={unit.key}
              onChange={(e) => {
                setDraft(null);
                setUnitKey(e.target.value);
              }}
            >
              {units.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
          <div className="text-xs font-bold">
            Quantidade
            <div className="mt-1 flex">
              <button
                type="button"
                aria-label="Diminuir"
                onClick={() => {
                  setDraft(null);
                  setQty(Math.max(0, qty - unit.step));
                }}
                className="grid h-10 w-10 place-items-center border border-border hover:bg-muted"
              >
                <Minus size={14} />
              </button>
              <input
                inputMode="decimal"
                value={draft ?? fmt(qty, 1)}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setQty(Number(e.target.value.replace(",", ".")) || 0);
                }}
                onBlur={() => setDraft(null)}
                onFocus={(e) => e.currentTarget.select()}
                className="field h-10 w-24 text-center"
                aria-label={`Quantidade em ${unit.short}`}
              />
              <button
                type="button"
                aria-label="Aumentar"
                onClick={() => {
                  setDraft(null);
                  setQty(qty + unit.step);
                }}
                className="grid h-10 w-10 place-items-center border border-border hover:bg-muted"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
        <p
          className={`mt-1.5 text-xs ${valid ? "text-muted-foreground" : "font-semibold text-red-500"}`}
        >
          {valid ? `Equivale a ${fmt(amount, 0)} ${base}` : `Informe entre 1 e ${MAX} ${base}.`}
        </p>
        <input
          type="range"
          min={0}
          max={600}
          step={5}
          value={Math.min(600, amount)}
          onChange={(e) => {
            setDraft(null);
            setAmount(Number(e.target.value));
          }}
          aria-label={`Ajustar em ${base}`}
          className="mt-2 w-full accent-[var(--primary)]"
        />

        <ul className="mt-3 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
          {NUTRIENTS.map((v) => {
            const val = num(food[v.key]) * factor;
            return (
              <li key={v.key} className="bg-card p-3">
                <p className="text-[11px] text-muted-foreground">{v.label}</p>
                <strong className="text-lg tabular-nums">
                  {fmt(val)} <span className="text-xs font-semibold">{v.unit}</span>
                </strong>
                <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
                  <span
                    className="block h-full bg-primary transition-[width] duration-500"
                    style={{ width: `${Math.min(100, (val / v.ref) * 100)}%` }}
                  />
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {fmt((val / v.ref) * 100, 0)}% de {v.ref} {v.unit}/dia
                </span>
              </li>
            );
          })}
        </ul>

        {canRegister && (
          <button
            type="button"
            onClick={onRegister}
            disabled={saving || !valid}
            className="mt-3 w-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Registrando..." : `Registrar ${fmt(amount, 0)} ${base} no histórico`}
          </button>
        )}
        {feedback && (
          <p role="status" className="mt-2 text-xs">
            {feedback}
          </p>
        )}
        {food.note && <p className="mt-2 text-[11px] text-muted-foreground">{food.note}</p>}
      </article>

      <article className="border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <Calculator size={16} className="text-primary" /> Quanto preciso comer?
        </h2>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Escolha o nutriente e a meta. O NextVita calcula quanto de {food.name} você precisa comer.
        </p>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="text-xs font-bold">
            1. O que você quer obter?
            <select
              className="field mt-1 w-full"
              value={need}
              onChange={(e) => setNeed(e.target.value as NKey)}
            >
              {NUTRIENTS.map((x) => (
                <option key={x.key} value={x.key}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <div className="text-xs font-bold">
            2. Quanto? ({nut.unit})
            <div className="mt-1 flex h-10 items-stretch border border-border bg-surface">
              <button
                type="button"
                aria-label="Diminuir a meta"
                onClick={() => setTarget(String(Math.max(0, goal - step(goal))))}
                className="grid w-9 place-items-center text-muted-foreground hover:bg-muted"
              >
                <Minus size={14} />
              </button>
              <input
                inputMode="decimal"
                aria-label={`Meta de ${nut.label.toLowerCase()} em ${nut.unit}`}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                className="w-16 bg-transparent text-center text-sm font-bold tabular-nums outline-none"
              />
              <button
                type="button"
                aria-label="Aumentar a meta"
                onClick={() => setTarget(String(goal + step(goal)))}
                className="grid w-9 place-items-center text-muted-foreground hover:bg-muted"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {presetsFor(nut.unit).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setTarget(String(v))}
              aria-pressed={goal === v}
              className={`h-6 border px-2 text-[11px] font-bold tabular-nums transition ${goal === v ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              {v} {nut.unit}
            </button>
          ))}
        </div>

        <div
          className={`mt-3 border p-3 ${unrealistic ? "border-amber-400/50 bg-amber-400/10" : "border-primary/30 bg-primary/10"}`}
        >
          {required === null || goal === 0 ? (
            <p className="text-sm text-muted-foreground">
              {goal === 0
                ? "Informe a meta para calcular."
                : `${food.name} não contém ${nut.label.toLowerCase()} nos dados cadastrados.`}
            </p>
          ) : (
            <>
              <p className="text-[11px] font-semibold text-muted-foreground">
                3. Você precisa comer
              </p>
              <p className="mt-0.5 flex flex-wrap items-baseline gap-x-3">
                <strong className="text-3xl font-extrabold tabular-nums text-primary">
                  {fmt(required, 0)} {base}
                </strong>
                {unit.base !== 1 && (
                  <span className="text-sm font-semibold text-muted-foreground">
                    ≈ {fmt(required / unit.base)} {unit.short}
                    {required / unit.base >= 2 && unit.short === "porção" ? "ões" : ""}
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm">
                {fmt(required, 0)} {base} de {food.name} entregam{" "}
                <b>
                  {fmt(goal)} {nut.unit}
                </b>{" "}
                de {nut.label.toLowerCase()}.
              </p>
              <div className="mt-2 border border-border bg-black/10 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                <div>
                  Em 100 {base} há {fmt(per100)} {nut.unit}
                </div>
                <div>
                  {fmt(goal)} ÷ {fmt(per100)} × 100 ={" "}
                  <b className="text-foreground">
                    {fmt(required, 0)} {base}
                  </b>
                </div>
              </div>
              {valid && (
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      Sua porção atual ({fmt(amount, 0)} {base}) entrega
                    </span>
                    <b className="tabular-nums">
                      {fmt(provided)} {nut.unit} · {fmt(goal > 0 ? (provided / goal) * 100 : 0, 0)}%
                      da meta
                    </b>
                  </div>
                  <div className="relative mt-1 h-2 bg-black/15">
                    <i
                      className="absolute inset-y-0 left-0 transition-[width] duration-500"
                      style={{
                        width: `${Math.min(100, goal > 0 ? (provided / goal) * 100 : 0)}%`,
                        background: provided > goal * 1.1 ? "#f59e0b" : "#10b981",
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {Math.abs(provided - goal) <= goal * 0.03
                      ? "A porção atual já atende a meta."
                      : provided > goal
                        ? `Está ${fmt(provided - goal)} ${nut.unit} acima da meta.`
                        : `Faltam ${fmt(goal - provided)} ${nut.unit} para a meta.`}
                  </p>
                </div>
              )}
              {unrealistic && (
                <p className="mt-2 text-xs font-semibold text-amber-300">
                  É uma quantidade irreal para uma refeição: {food.name} não é boa fonte desse
                  nutriente.
                </p>
              )}
              <button
                type="button"
                disabled={required > MAX}
                onClick={() => {
                  setDraft(null);
                  setAmount(Math.round(required * 10) / 10);
                }}
                className="mt-3 inline-flex h-9 items-center gap-1.5 border border-primary/50 px-3 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-40"
              >
                <Check size={13} /> Usar esta quantidade na porção
              </button>
            </>
          )}
          {unrealistic && better.length > 0 && (
            <div className="mt-3 border-t border-border pt-2">
              <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                Fontes melhores de {nut.label.toLowerCase()}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {better.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onPick(b.id)}
                    className="border border-border px-2 py-1 text-[11px] font-semibold hover:bg-muted"
                  >
                    {b.name} · {fmt(num(b[need]))} {nut.unit}/100
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
