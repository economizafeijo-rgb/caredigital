import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Minus, Plus, Search, Trash2, UtensilsCrossed, X } from "lucide-react";
import { FoodThumb } from "./FoodArt";
import {
  isLiquid,
  measureUnit,
  nutrientsFor,
  parseFoodText,
  typicalPortion,
} from "@/lib/food-parser";
import { ingredientById, ingredients } from "@/lib/nutrition-catalog";

const nf = (n: number, d = 0) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });
const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pieces = (d: string) => d.split(/\s*,\s*/).filter(Boolean);

/** Alimentos do catálogo que o leitor de texto reconhece com o mesmo nome. */
let cache: { id: string; label: string }[] | null = null;
function catalog() {
  if (cache) return cache;
  cache = ingredients
    .filter((i) => i.group !== "bebidas")
    .map((i) => ({
      id: i.id,
      label: i.name
        .split(",")[0]
        .replace(/\s*\(.*$/, "")
        .trim(),
    }))
    .filter(({ id, label }) => {
      const p = parseFoodText(label);
      return p.length === 1 && p[0].id === id;
    })
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  return cache;
}

type Unit = { key: string; label: string; base: number; step: number };
function unitsFor(id: string): Unit[] {
  const base = measureUnit(id);
  if (isLiquid(id))
    return [
      { key: "b", label: "ml", base: 1, step: 50 },
      { key: "copo", label: "copo (200 ml)", base: 200, step: 1 },
      { key: "xic", label: "xícara (240 ml)", base: 240, step: 1 },
    ];
  const p = typicalPortion(id);
  return [
    { key: "b", label: base === "g" ? "gramas" : base, base: 1, step: 10 },
    { key: "p", label: `porção usual (${p} g)`, base: p, step: 0.5 },
    { key: "c", label: "colher de sopa (≈25 g)", base: 25, step: 1 },
    { key: "conc", label: "concha (≈100 g)", base: 100, step: 1 },
    { key: "f", label: "fatia (≈30 g)", base: 30, step: 1 },
  ];
}

export function PlateBuilder({
  description,
  onDescription,
  tone,
}: {
  description: string;
  onDescription: (v: string) => void;
  tone: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pick, setPick] = useState<{ id: string; label: string } | null>(null);
  const [unitKey, setUnitKey] = useState("b");
  const [qty, setQty] = useState("");

  const q = norm(query.trim());
  const found = useMemo(
    () =>
      q.length < 2
        ? []
        : catalog()
            .filter((i) => norm(i.label).includes(q))
            .slice(0, 6),
    [q],
  );
  const item = pick ? ingredientById.get(pick.id) : null;
  const units = pick ? unitsFor(pick.id) : [];
  const unit = units.find((u) => u.key === unitKey) ?? units[0];
  const amount = unit ? (Number(qty.replace(",", ".")) || 0) * unit.base : 0;
  const est = item && amount > 0 ? nutrientsFor(item, amount) : null;
  const valid = amount >= 1 && amount <= 5000;

  function choose(i: { id: string; label: string }) {
    setPick(i);
    setUnitKey("b");
    setQty(String(typicalPortion(i.id)));
    setQuery("");
  }
  function add() {
    if (!pick || !valid) return;
    const text = `${pick.label} ${Math.round(amount * 10) / 10} ${measureUnit(pick.id)}`;
    onDescription(
      description.trim() ? `${description.trim().replace(/,\s*$/, "")}, ${text}` : text,
    );
    setPick(null);
    setQty("");
  }

  return (
    <section
      aria-label="Personalizar meu prato"
      className="border bg-card"
      style={{ borderColor: `${tone}55` }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span
          className="grid size-8 shrink-0 place-items-center"
          style={{ background: `${tone}22`, color: tone }}
        >
          <UtensilsCrossed size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Personalizar meu prato</span>
          <span className="block text-[11px] text-muted-foreground">
            Escolha o alimento, informe o peso ou a quantidade e veja a estimativa.
          </span>
        </span>
        <span className="text-lg leading-none text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="grid gap-3 border-t border-border px-3 py-3">
          {!pick ? (
            <div>
              <label className="relative block">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar alimento: arroz, feijoada de jabá, tapioca…"
                  aria-label="Buscar alimento"
                  className="field h-10 w-full pl-8 text-sm"
                />
              </label>
              {q.length >= 2 && found.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Nenhum alimento encontrado. Escreva em “O que você comeu?” com o peso, como “bolo
                  caseiro 80 g”, e o sistema estima.
                </p>
              )}
              {found.length > 0 && (
                <ul className="mt-1 border border-border">
                  {found.map((f) => {
                    const it = ingredientById.get(f.id);
                    return (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => choose(f)}
                          className="flex w-full items-center gap-2 border-b border-border px-2.5 py-2 text-left last:border-b-0 hover:bg-muted"
                        >
                          <FoodThumb text={f.label} className="size-7" />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {f.label}
                          </span>
                          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                            {nf(it?.kcal ?? 0)} kcal/100 {measureUnit(f.id)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="grid gap-2.5">
              <div className="flex items-center gap-2">
                <FoodThumb text={pick.label} className="size-9" />
                <strong className="min-w-0 flex-1 truncate text-sm">{pick.label}</strong>
                <button
                  type="button"
                  onClick={() => setPick(null)}
                  aria-label="Trocar alimento"
                  className="grid size-8 place-items-center text-muted-foreground hover:bg-muted"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <label className="text-xs font-semibold">
                  Medir por
                  <select
                    className="field mt-1 h-10 w-full text-sm"
                    value={unit.key}
                    onChange={(e) => {
                      const next = units.find((u) => u.key === e.target.value) ?? units[0];
                      setQty(String(Math.round((amount / next.base) * 10) / 10 || 1));
                      setUnitKey(next.key);
                    }}
                  >
                    {units.map((u) => (
                      <option key={u.key} value={u.key}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="text-xs font-semibold">
                  Quantidade
                  <div className="mt-1 flex">
                    <button
                      type="button"
                      aria-label="Diminuir"
                      onClick={() =>
                        setQty(
                          String(Math.max(0, (Number(qty.replace(",", ".")) || 0) - unit.step)),
                        )
                      }
                      className="grid h-10 w-9 place-items-center border border-border hover:bg-muted"
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      inputMode="decimal"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label="Quantidade"
                      className="field h-10 w-20 text-center tabular-nums"
                    />
                    <button
                      type="button"
                      aria-label="Aumentar"
                      onClick={() =>
                        setQty(String((Number(qty.replace(",", ".")) || 0) + unit.step))
                      }
                      className="grid h-10 w-9 place-items-center border border-border hover:bg-muted"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border border-dashed border-border px-3 py-2 text-xs">
                {est ? (
                  <>
                    <span className="text-muted-foreground">
                      {nf(amount)} {measureUnit(pick.id)}
                    </span>
                    <span className="font-semibold tabular-nums">
                      <b style={{ color: tone }}>{nf(est.kcal)} kcal</b> · P {nf(est.protein, 1)} ·
                      C {nf(est.carbs, 1)} · G {nf(est.fat, 1)}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Informe a quantidade.</span>
                )}
              </div>
              <button
                type="button"
                onClick={add}
                disabled={!valid}
                className="nv-btn justify-center disabled:opacity-50"
                style={{ ["--btn" as string]: tone }}
              >
                <Plus size={15} /> Adicionar ao prato
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Campo de quantidade que aplica a edição em tempo real, sem perder o foco ao digitar. */
function GramsInput({
  grams,
  label,
  onCommit,
}: {
  grams: number;
  label: string;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(Math.round(grams)));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(Math.round(grams)));
  }, [grams]);
  return (
    <input
      inputMode="decimal"
      value={text}
      aria-label={label}
      onChange={(e) => {
        setText(e.target.value);
        const v = Number(e.target.value.replace(",", "."));
        if (v > 0 && Math.round(v) !== Math.round(grams)) onCommit(v);
      }}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onBlur={() => {
        focused.current = false;
        setText(String(Math.round(grams)));
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
      className="field h-7 w-14 px-1 text-center tabular-nums"
    />
  );
}

const clampGrams = (g: number) => Math.round(Math.max(1, Math.min(5000, g)) * 10) / 10;
type Parsed = ReturnType<typeof parseFoodText>[number];
/** Texto com quantidade explícita que o leitor lê de volta como o MESMO alimento (ou null). */
export function explicit(food: Parsed, g: number): string | null {
  const name = food.name.split(",")[0];
  const plain = name.replace(/\s*\(.*?\)/g, "").trim();
  const words = plain.split(/\s+/);
  // Do nome completo até palavras soltas: o primeiro que o leitor reconhece como o mesmo alimento vale.
  const candidates = [
    ...new Set([
      name,
      plain,
      plain.replace(/ de galinha/i, ""),
      ...words.map((_, i) => words.slice(0, words.length - i).join(" ")),
      ...words.map((_, i) => words.slice(i).join(" ")),
      ...words,
      ...words.flatMap((w) => w.split("-")),
    ]),
  ];
  for (const c of candidates) {
    const text = `${c} ${clampGrams(g)} ${measureUnit(food.id)}`;
    const back = parseFoodText(text);
    if (back.length === 1 && back[0].id === food.id) return text;
  }
  return null;
}

/**
 * Linhas editáveis do prato: TODOS os alimentos reconhecidos na descrição, em tempo real.
 * Um trecho que vira vários alimentos (ex.: "mixto de carnes assadas") ganha uma linha por alimento;
 * ao editar uma delas, o trecho é reescrito com as quantidades explícitas.
 */
export function PlateRows({
  description,
  onDescription,
  fallback = null,
}: {
  description: string;
  onDescription: (v: string) => void;
  fallback?: ReactNode;
}) {
  const parts = pieces(description);
  const rows = parts.flatMap((text, idx) => {
    const foods = parseFoodText(text);
    return foods.map((f, j) => ({ idx, j, f, foods }));
  });
  if (rows.length === 0) return <>{fallback}</>;

  const rewrite = (idx: number, next: string | null) => {
    const copy = [...parts];
    if (next === null) copy.splice(idx, 1);
    else copy[idx] = next;
    onDescription(copy.join(", "));
  };
  // Reescreve o trecho inteiro com quantidades explícitas, trocando só o alimento editado.
  const edit = (idx: number, j: number, foods: Parsed[], g: number) => {
    const next = foods.map((food, k) => explicit(food, k === j ? g : food.grams));
    // Se algum alimento não puder ser escrito de forma legível, mantém o trecho como está.
    if (next.every((t): t is string => t !== null)) rewrite(idx, next.join(", "));
  };
  const remove = (idx: number, j: number, foods: Parsed[]) => {
    if (foods.length === 1) return rewrite(idx, null);
    const rest = foods.filter((_, k) => k !== j).map((food) => explicit(food, food.grams));
    if (rest.every((t): t is string => t !== null)) rewrite(idx, rest.join(", "));
  };

  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
      {rows.map(({ idx, j, f, foods }) => {
        const name = f.name.split(",")[0];
        return (
          <li key={`${idx}-${j}-${f.id}`} className="flex min-w-0 items-center gap-1.5 text-xs">
            <FoodThumb text={f.name} className="size-7 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{name}</span>
              <span className="block tabular-nums text-[10px] text-muted-foreground">
                {nf(f.nutrients.kcal)} kcal
              </span>
            </span>
            <button
              type="button"
              aria-label={`Diminuir ${name}`}
              onClick={() => edit(idx, j, foods, f.grams - 10)}
              className="grid size-7 shrink-0 place-items-center border border-border hover:bg-muted"
            >
              <Minus size={12} />
            </button>
            <GramsInput
              grams={f.grams}
              label={`Quantidade de ${name}`}
              onCommit={(v) => edit(idx, j, foods, v)}
            />
            <button
              type="button"
              aria-label={`Aumentar ${name}`}
              onClick={() => edit(idx, j, foods, f.grams + 10)}
              className="grid size-7 shrink-0 place-items-center border border-border hover:bg-muted"
            >
              <Plus size={12} />
            </button>
            <span className="w-4 shrink-0 text-[10px] text-muted-foreground">
              {measureUnit(f.id)}
            </span>
            <button
              type="button"
              aria-label={`Remover ${name}`}
              onClick={() => remove(idx, j, foods)}
              className="grid size-7 shrink-0 place-items-center text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Trash2 size={13} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
