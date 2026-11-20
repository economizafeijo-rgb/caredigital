import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Eraser, Info, Save, Search, X } from "lucide-react";
import { HowItWorks, foodHowTo } from "./HowItWorks";
import { CareIntakeIcon } from "./CareIntakePicker";
import { FoodThumb, foodVisual } from "./FoodArt";
import { NutritionInfoCard } from "./MealSuggestions";
import { foodKinds, mealCombos, typicalFoods, type FoodKind } from "@/lib/care-intake-categories";
import { measureUnit, parseFoodText, sumNutrients } from "@/lib/food-parser";
import { ingredients } from "@/lib/nutrition-catalog";

/** Cor de cada tipo de refeição, usada nos setores, no cabeçalho e no prato. */
export const mealTone: Record<FoodKind, string> = {
  fruta: "#22a55a",
  cafe_manha: "#f59e0b",
  almoco: "#10b981",
  jantar: "#6366f1",
  lanche: "#f43f5e",
  ceia: "#8b5cf6",
  refeicao: "#14b8a6",
  salada: "#84cc16",
  sopa: "#f97316",
  sobremesa: "#ec4899",
};

type Item = { label: string; text: string };
const nf = (n: number, digits = 0) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const norm = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Alimentos e líquidos não se misturam: bebidas têm a sua própria área.
 * Trechos servidos em copo/xícara/caneca são líquidos (o açaí é tratado como alimento).
 */
const liquidSegment =
  /^(\d+([.,]\d+)?\s+)?(copos?|x[ií]caras?|canecas?|garrafas?)\s+(de\s+)?(?!a[cç]a[ií])/i;
const liquidLabel =
  /^(caf[eé]( preto)?|leite( morno)?|suco|ch[aá]|[aá]gua|refrigerante|nescau|achocolatado|vitamina|limonada|isot[oô]nico|energ[eé]tico)\b/i;
const comboLabels: Record<string, string> = {
  "Cuscuz com ovo e café com leite": "Cuscuz com ovo",
  "Tapioca com queijo e suco de acerola": "Tapioca com queijo",
  "Pão com ovo e Nescau": "Pão com ovo",
  "Café acreano reforçado": "Baixaria com banana cozida",
  "Sanduíche natural e suco de maracujá": "Sanduíche natural",
  "Baião de dois com salada": "Baião de dois com salada",
  "Leite morno com maçã": "Maçã",
  "Chá com biscoito": "Biscoitos",
};
const stripLiquids = (items: Item[]): Item[] => {
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const item of items) {
    const parts = item.text.split(/\s*,\s*/);
    const food = parts.filter((part) => !liquidSegment.test(part));
    if (!food.length || (food.length === parts.length && liquidLabel.test(item.label.trim())))
      continue;
    const changed = food.length !== parts.length;
    const next = {
      label: changed ? (comboLabels[item.label] ?? food.join(" e ")) : item.label,
      text: food.join(", "),
    };
    if (seen.has(next.text)) continue;
    seen.add(next.text);
    out.push(next);
  }
  return out;
};

const stats = new Map<string, { kcal: number; grams: number }>();
function statsOf(text: string) {
  let hit = stats.get(text);
  if (!hit) {
    const foods = parseFoodText(text);
    hit = {
      kcal: Math.round(sumNutrients(foods.map((f) => f.nutrients)).kcal),
      grams: Math.round(foods.reduce((s, f) => s + f.grams, 0)),
    };
    stats.set(text, hit);
  }
  return hit;
}

let catalogCache: Item[] | null = null;
/** Alimentos do catálogo que o leitor reconhece pelo nome (para a busca). */
function catalogItems(): Item[] {
  if (catalogCache) return catalogCache;
  catalogCache = ingredients
    .filter((item) => item.group !== "bebidas")
    .map((item) => ({
      id: item.id,
      label: item.name
        .split(",")[0]
        .replace(/\s*\(.*$/, "")
        .trim(),
    }))
    .filter(({ id, label }) => {
      const parsed = parseFoodText(label);
      return parsed.length === 1 && parsed[0].id === id;
    })
    .map(({ label }) => ({ label, text: label }));
  return catalogCache;
}

function useCountUp(target: number) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (typeof requestAnimationFrame === "undefined") {
      setValue(target);
      from.current = target;
      return;
    }
    const start = performance.now(),
      begin = from.current;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 450),
        eased = 1 - Math.pow(1 - p, 3);
      const current = begin + (target - begin) * eased;
      from.current = current;
      setValue(current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

type Props = {
  kind: FoodKind;
  onKind: (kind: FoodKind) => void;
  description: string;
  onDescription: (value: string) => void;
  portion: string;
  onPortion: (value: string) => void;
  consumedAt: string;
  onConsumedAt: (value: string) => void;
  error: string;
  saving: boolean;
  onCancel: () => void;
  topSlot?: ReactNode;
};

export function MealBoard({
  kind,
  onKind,
  description,
  onDescription,
  portion,
  onPortion,
  consumedAt,
  onConsumedAt,
  error,
  saving,
  onCancel,
  topSlot,
}: Props) {
  const tone = mealTone[kind];
  const category = foodKinds.find((c) => c.value === kind)!;
  const [query, setQuery] = useState("");
  const [info, setInfo] = useState<Item | null>(null);

  const isOn = (text: string) => description.toLowerCase().includes(text.toLowerCase());
  const toggle = (text: string) => {
    if (isOn(text)) {
      const idx = description.toLowerCase().indexOf(text.toLowerCase());
      const rest = (description.slice(0, idx) + description.slice(idx + text.length))
        .split(/\s*,\s*/)
        .map((p) => p.trim())
        .filter(Boolean);
      onDescription(rest.join(", "));
    } else
      onDescription(
        description.trim() ? `${description.trim().replace(/,\s*$/, "")}, ${text}` : text,
      );
  };

  const combos = useMemo(() => stripLiquids(mealCombos[kind] ?? []), [kind]);
  const typical = useMemo(() => stripLiquids(typicalFoods[kind] ?? []), [kind]);
  const q = norm(query.trim());
  const found = useMemo(
    () =>
      q.length < 2
        ? []
        : catalogItems()
            .filter((i) => norm(i.label).includes(q))
            .slice(0, 36),
    [q],
  );

  const foods = useMemo(() => parseFoodText(`${portion} ${description}`), [portion, description]);
  const total = useMemo(() => sumNutrients(foods.map((f) => f.nutrients)), [foods]);
  const kcal = useCountUp(Math.round(total.kcal));
  const macros = [
    { label: "Proteínas", value: total.protein, color: "#f43f5e" },
    { label: "Carboidratos", value: total.carbs, color: "#f59e0b" },
    { label: "Gorduras", value: total.fat, color: "#8b5cf6" },
    { label: "Fibras", value: total.fiber, color: "#22c55e" },
  ];
  const macroMax = Math.max(1, ...macros.map((m) => m.value));

  const card = (item: Item, index: number, prefix: string) => {
    const on = isOn(item.text),
      shown = info?.label === item.label,
      s = statsOf(item.text),
      v = foodVisual(item.text, item.label);
    return (
      <li
        key={`${prefix}-${item.label}`}
        className="nv-rise"
        style={{ animationDelay: `${Math.min(index, 14) * 20}ms` }}
      >
        <div
          className={
            "group relative flex h-full items-center rounded-xl border transition duration-150 hover:bg-muted/50 " +
            (on ? "" : "border-border/70 bg-card/60")
          }
          style={
            on
              ? { borderColor: tone, background: `color-mix(in srgb, ${tone} 12%, var(--card))` }
              : undefined
          }
        >
          <button
            type="button"
            aria-pressed={on}
            aria-label={`${on ? "Remover" : "Adicionar"} ${item.label}`}
            onClick={() => toggle(item.text)}
            className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-2 pr-1 text-left active:scale-[.985]"
          >
            <FoodThumb text={item.text} label={item.label} visual={v} className="size-10" />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-[13px] font-semibold leading-tight">
                {item.label}
              </span>
              <span className="block text-[11px] tabular-nums text-muted-foreground">
                {s.kcal > 0 ? `${s.kcal} kcal · ${s.grams} g` : "porção usual"}
              </span>
            </span>
          </button>
          <button
            type="button"
            aria-label={`Informações nutricionais de ${item.label}`}
            aria-expanded={shown}
            title="Informações nutricionais"
            onClick={() => setInfo(shown ? null : item)}
            className={
              "mr-1 grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground " +
              (shown ? "!bg-primary !text-primary-foreground" : "")
            }
          >
            <Info size={13} />
          </button>
          <span
            aria-hidden="true"
            className={
              "mr-2 grid size-5 shrink-0 place-items-center rounded-full border transition-all duration-200 " +
              (on ? "nv-pop text-white" : "border-border text-transparent")
            }
            style={on ? { background: tone, borderColor: tone } : undefined}
          >
            <Check size={12} strokeWidth={3} />
          </span>
        </div>
      </li>
    );
  };

  const section = (title: string, hint: string, items: Item[], prefix: string) =>
    items.length ? (
      <section aria-label={title}>
        <h3 className="flex flex-wrap items-baseline gap-2 text-[13px] font-bold">
          {title} <span className="text-[11px] font-normal text-muted-foreground">{hint}</span>
        </h3>
        <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(13.5rem,1fr))] gap-2">
          {items.map((item, i) => card(item, i, prefix))}
        </ul>
      </section>
    ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        {topSlot}
        <fieldset className="min-w-0 flex-1">
          <legend className="sr-only">Qual refeição?</legend>
          <div className="care-intake-choices flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {foodKinds.map((c) => {
              const on = c.value === kind,
                color = mealTone[c.value];
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={on}
                  data-intake-kind={c.value}
                  data-intake-group="food"
                  title={c.hint}
                  onClick={() => onKind(c.value)}
                  className={
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition duration-150 active:scale-95 " +
                    (on
                      ? "text-white shadow-md"
                      : "border-border/70 bg-card/60 text-muted-foreground hover:text-foreground")
                  }
                  style={
                    on
                      ? {
                          background: color,
                          borderColor: color,
                          boxShadow: `0 6px 16px -8px ${color}`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ background: on ? "#fff" : color }}
                  />
                  {c.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_21rem] lg:overflow-hidden">
        <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <div className="sticky top-0 z-10 -mt-px bg-card/95 pb-2 backdrop-blur">
            <div className="flex items-center gap-2.5">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-lg text-white"
                style={{ background: tone }}
              >
                <CareIntakeIcon kind={kind} size={16} />
              </span>
              <div className="min-w-0 leading-tight">
                <h2 className="text-sm font-bold">{category.label}</h2>
                <p className="truncate text-[11px] text-muted-foreground">
                  {category.hint} · toque nos alimentos para montar o prato
                </p>
              </div>
              <label className="relative ml-auto block w-full max-w-[16rem]">
                <span className="sr-only">Buscar alimento</span>
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar alimento…"
                  className="h-9 w-full rounded-lg border border-border bg-background/60 pl-8 pr-2 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
          </div>

          {info && (
            <div className="mb-3">
              <NutritionInfoCard item={info} onClose={() => setInfo(null)} />
            </div>
          )}

          <div className="grid gap-4">
            {q.length >= 2 ? (
              found.length ? (
                section(
                  `Resultados para “${query.trim()}”`,
                  `${found.length} alimento${found.length === 1 ? "" : "s"}`,
                  found,
                  "busca",
                )
              ) : (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Nenhum alimento com esse nome. Descreva no campo “O que você comeu?”. Para
                  bebidas, use a aba Bebidas.
                </p>
              )
            ) : (
              <>
                {section("Refeições prontas", "combinações comuns", combos, "combo")}
                {section(
                  `Alimentos típicos de ${category.label.toLowerCase()}`,
                  "toque para adicionar ou remover",
                  typical,
                  "tipico",
                )}
              </>
            )}
          </div>
        </div>

        <aside aria-label="Seu prato" className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
          <div className="flex min-h-full flex-col gap-3 rounded-2xl border border-border/80 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Seu prato</h3>
              {description.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    onDescription("");
                    onPortion("");
                    setInfo(null);
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>

            <label className="block text-xs font-semibold">
              <span className="block">O que você comeu?</span>
              <textarea
                rows={2}
                required
                maxLength={1000}
                value={description}
                onChange={(e) => onDescription(e.target.value)}
                placeholder={category.example}
                className="field mt-1 block min-h-[60px] w-full resize-y text-sm"
              />
            </label>

            {foods.length > 0 ? (
              <div
                aria-live="polite"
                className="rounded-xl border border-border/70 bg-card/70 p-2.5"
              >
                <ul className="grid gap-1">
                  {foods.map((f, i) => (
                    <li key={`${f.id}-${i}`} className="nv-rise flex items-center gap-2 text-xs">
                      <FoodThumb text={f.name} className="size-7" />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {f.name.split(",")[0]}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {nf(f.grams)} {measureUnit(f.id)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 flex items-baseline gap-1.5 border-t border-border/60 pt-2">
                  <strong className="text-2xl font-extrabold tabular-nums" style={{ color: tone }}>
                    {nf(kcal)}
                  </strong>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    kcal no prato
                  </span>
                </p>
                <ul className="mt-1.5 grid gap-1">
                  {macros.map((m) => (
                    <li
                      key={m.label}
                      className="grid grid-cols-[4.6rem_1fr_auto] items-center gap-2 text-[11px]"
                    >
                      <span className="text-muted-foreground">{m.label}</span>
                      <span
                        className="h-1.5 overflow-hidden rounded-full bg-muted"
                        aria-hidden="true"
                      >
                        <span
                          className="block h-full rounded-full transition-[width] duration-700"
                          style={{
                            width: `${Math.round((m.value / macroMax) * 100)}%`,
                            background: m.color,
                          }}
                        />
                      </span>
                      <span className="tabular-nums">{nf(m.value, 1)} g</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                  Cálculo automático com porções usuais; valores aproximados.
                </p>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                O prato está vazio. Escolha alimentos ao lado ou escreva acima: o cálculo aparece
                aqui.
              </p>
            )}

            <HowItWorks>{foodHowTo}</HowItWorks>

            <label className="block text-xs font-semibold">
              <span className="block">Quantidade ou porção (opcional)</span>
              <input
                type="text"
                className="field mt-1 block min-h-[38px] w-full text-sm"
                maxLength={100}
                value={portion}
                onChange={(e) => onPortion(e.target.value)}
                placeholder="Ex.: 1 unidade, 100 g, 1 prato"
              />
            </label>

            <label className="block min-w-0 text-xs font-semibold">
              Data e hora · horário do Acre (UTC−5)
              <input
                type="datetime-local"
                required
                value={consumedAt}
                onChange={(e) => onConsumedAt(e.target.value)}
                className="field care-intake-datetime mt-1 block w-full min-w-0 text-sm"
                style={{ boxSizing: "border-box" }}
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive"
              >
                {error}
              </p>
            )}

            <div className="mt-auto grid grid-cols-[auto_1fr] gap-2 pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={onCancel}
                className="nv-btn nv-btn-ghost px-3.5"
              >
                <X size={14} /> Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="nv-btn"
                style={{ ["--btn" as string]: tone }}
              >
                <Save size={15} /> {saving ? "Salvando..." : "Registrar agora"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
