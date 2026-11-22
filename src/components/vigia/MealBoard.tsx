import { useMemo, useState, type ReactNode } from "react";
import { Check, Info, Search } from "lucide-react";
import { HowItWorks, foodHowTo } from "./HowItWorks";
import { CareIntakeIcon } from "./CareIntakePicker";
import { FoodThumb, foodVisual } from "./FoodArt";
import { NutritionInfoCard } from "./MealSuggestions";
import { PlateBuilder, PlateRows } from "./PlateBuilder";
import { KindRail, NutritionSummary, SidePanel } from "./IntakeParts";
import { foodKinds, mealCombos, typicalFoods, type FoodKind } from "@/lib/care-intake-categories";
import { measureUnit, parseFoodText, sumNutrients } from "@/lib/food-parser";
import { foodsForKind, isRegionalFood, searchFoods } from "@/lib/food-search";

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
  /** Edição em aberto no outro grupo (ex.: refeição montada enquanto escolhe bebida). */
  overview?: ReactNode;
  /** Totais do registro inteiro (alimentos + bebida), quando há itens nos dois grupos. */
  totals?: { kcal: number; protein: number; carbs: number; fat: number; fiber: number };
  registerNote?: string;
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
  overview,
  totals,
  registerNote,
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
  // Frutas: mostra todas as do catálogo (inclusive regionais), não só as mais comuns.
  const typical = useMemo(
    () => (kind === "fruta" ? foodsForKind("fruta") : stripLiquids(typicalFoods[kind] ?? [])),
    [kind],
  );
  const q = query.trim();
  const search = useMemo(() => searchFoods(q), [q]);
  const found = search.items;
  // A categoria é só uma sugestão: destaca a mais provável, sem limitar a busca.
  const suggestedKind = q.length >= 2 ? search.suggestedKind : null;

  // Texto livre: o que foi digitado é reconhecido pelo leitor de alimentos, mesmo fora das categorias.
  const typed = useMemo(() => (q.length >= 2 ? parseFoodText(q) : []), [q]);
  const addTyped = () => {
    if (!typed.length || isOn(q)) return;
    toggle(q);
    setQuery("");
  };

  const foods = useMemo(() => parseFoodText(`${portion} ${description}`), [portion, description]);
  const total = useMemo(() => sumNutrients(foods.map((f) => f.nutrients)), [foods]);

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
            "group relative flex h-full items-center border border-l-[3px] transition duration-150 hover:bg-muted/50 " +
            (on ? "border-border" : "border-border bg-card")
          }
          style={
            on
              ? { borderLeftColor: tone, background: `color-mix(in srgb, ${tone} 8%, var(--card))` }
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
              {isRegionalFood(item.text) && (
                <span className="mt-0.5 inline-block rounded-sm bg-emerald-600/15 px-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  Regional
                </span>
              )}
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
              "mr-1 grid size-6 shrink-0 place-items-center text-muted-foreground transition hover:bg-muted hover:text-foreground " +
              (shown ? "!bg-primary !text-primary-foreground" : "")
            }
          >
            <Info size={13} />
          </button>
          <span
            aria-hidden="true"
            className={
              "mr-2 grid size-5 shrink-0 place-items-center border transition-all duration-200 " +
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

  const counts = useMemo(
    () => Object.fromEntries(foodKinds.map((c) => [c.value, foodsForKind(c.value).length])),
    [],
  );
  const plateCount = description.split(/\s*,\s*/).filter((p) => p.trim()).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[10.5rem_minmax(0,1fr)_24rem] lg:overflow-hidden">
      <KindRail
        legend="Qual refeição?"
        group="food"
        items={foodKinds.map((c) => ({
          value: c.value,
          label: c.label,
          hint: c.hint,
          color: mealTone[c.value],
          count: counts[c.value],
        }))}
        active={kind}
        suggested={suggestedKind}
        onPick={(value) => onKind(value as FoodKind)}
        topSlot={topSlot}
      />

      <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
        <div className="sticky top-0 z-10 -mt-px bg-card/95 pb-2 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="grid size-9 shrink-0 place-items-center text-white"
              style={{ background: tone }}
            >
              <CareIntakeIcon kind={kind} size={18} />
            </span>
            <div className="min-w-0 leading-tight">
              <h2 className="text-sm font-bold">{category.label}</h2>
              <p className="truncate text-[11px] text-muted-foreground">
                {category.hint} · toque nos alimentos para montar o prato
              </p>
            </div>
            <label className="relative ml-auto block w-full min-w-[12rem] max-w-[18rem] flex-1">
              <span className="sr-only">Buscar alimento</span>
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTyped();
                  }
                }}
                placeholder="Digite um alimento (Enter adiciona)…"
                className="h-9 w-full border border-border bg-background/60 pl-8 pr-2 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
          {q.length >= 2 && typed.length > 0 && (
            <button
              type="button"
              onClick={addTyped}
              className="flex items-center justify-between gap-2 border border-primary/40 bg-primary/10 px-3 py-2 text-left text-xs font-semibold hover:bg-primary/15 active:scale-[.99]"
            >
              <span>
                Adicionar “{q}” ao prato
                <span className="ml-1 font-normal text-muted-foreground">
                  · reconhecido como {typed.map((f) => f.name.split(",")[0]).join(" + ")}
                </span>
              </span>
              <Check size={14} />
            </button>
          )}
          {q.length >= 2 ? (
            found.length ? (
              section(
                `Resultados para “${query.trim()}”`,
                `${found.length} alimento${found.length === 1 ? "" : "s"}`,
                found,
                "busca",
              )
            ) : (
              <p className="border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nenhum alimento com esse nome. Descreva no campo “O que você comeu?”. Para bebidas,
                use a aba Bebidas.
              </p>
            )
          ) : (
            <>
              {section("Refeições prontas", "combinações comuns", combos, "combo")}
              {section(
                kind === "fruta"
                  ? "Todas as frutas"
                  : `Alimentos típicos de ${category.label.toLowerCase()}`,
                "toque para adicionar ou remover",
                typical,
                "tipico",
              )}
            </>
          )}
        </div>
      </div>

      <SidePanel
        label="Seu prato"
        title="Seu prato"
        count={plateCount}
        tone={tone}
        pinned={overview}
        registerNote={registerNote}
        summary={
          totals || foods.length > 0 ? (
            <NutritionSummary
              kcal={(totals ?? total).kcal}
              protein={(totals ?? total).protein}
              carbs={(totals ?? total).carbs}
              fat={(totals ?? total).fat}
              fiber={(totals ?? total).fiber}
              tone={tone}
              caption={totals ? "kcal no registro" : "kcal no prato"}
              note="Cálculo automático com porções usuais; valores aproximados."
            />
          ) : undefined
        }
        onClear={
          description.trim()
            ? () => {
                onDescription("");
                onPortion("");
                setInfo(null);
              }
            : undefined
        }
        consumedAt={consumedAt}
        onConsumedAt={onConsumedAt}
        error={error}
        saving={saving}
        onCancel={onCancel}
      >
        <PlateBuilder description={description} onDescription={onDescription} tone={tone} />

        <label className="block text-xs font-semibold">
          <span className="block">O que você comeu?</span>
          <textarea
            rows={2}
            required
            maxLength={1000}
            value={description}
            onChange={(e) => onDescription(e.target.value)}
            placeholder={category.example}
            className="field mt-1 block min-h-[54px] w-full resize-y text-sm"
          />
        </label>

        {foods.length > 0 ? (
          <>
            <div className="border border-border/70 bg-card/70 p-2.5">
              <PlateRows
                description={description}
                onDescription={onDescription}
                fallback={
                  <ul className="grid gap-1">
                    {foods.map((f, i) => (
                      <li key={`${f.id}-${i}`} className="flex items-center gap-2 text-xs">
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
                }
              />
            </div>
          </>
        ) : (
          <p className="border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            O prato está vazio. Escolha alimentos ao lado ou escreva acima: o cálculo aparece aqui.
          </p>
        )}

        {/* Com alimentos reconhecidos, a quantidade já é editada em cada linha: o campo seria redundante. */}
        {foods.length === 0 && (
        <label className="block text-xs font-semibold">
          <span className="block">Quantidade ou porção (opcional)</span>
          <input
            type="text"
            className="field mt-1 block min-h-[36px] w-full text-sm"
            maxLength={100}
            value={portion}
            onChange={(e) => onPortion(e.target.value)}
            placeholder="Ex.: 1 unidade, 100 g, 1 prato"
          />
        </label>
        )}

        <HowItWorks>{foodHowTo}</HowItWorks>
      </SidePanel>
    </div>
  );
}
