import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Eraser, Info, Save, Search, X } from "lucide-react";
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
        style={{ animationDelay: `${Math.min(index, 14) * 25}ms` }}
      >
        <div
          className={
            "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lg " +
            (on ? "shadow-md" : "border-border")
          }
          style={on ? { borderColor: tone, boxShadow: `0 8px 22px -10px ${tone}` } : undefined}
        >
          <button
            type="button"
            aria-pressed={on}
            aria-label={`${on ? "Remover" : "Adicionar"} ${item.label}`}
            onClick={() => toggle(item.text)}
            className="flex flex-1 flex-col items-center gap-2 p-3 text-center active:scale-[.98]"
          >
            <FoodThumb
              text={item.text}
              label={item.label}
              visual={v}
              className="size-16 transition-transform duration-300 group-hover:scale-110"
            />
            <span className="text-sm font-bold leading-tight">{item.label}</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {s.kcal > 0 ? `${s.kcal} kcal · ${s.grams} g` : "porção usual"}
            </span>
          </button>
          <span
            aria-hidden="true"
            className={
              "pointer-events-none absolute left-2 top-2 grid size-6 place-items-center rounded-full text-white shadow transition-all duration-200 " +
              (on ? "nv-pop scale-100 opacity-100" : "scale-75 opacity-0")
            }
            style={{ background: tone }}
          >
            <Check size={14} />
          </span>
          <button
            type="button"
            aria-label={`Informações nutricionais de ${item.label}`}
            aria-expanded={shown}
            title="Informações nutricionais"
            onClick={() => setInfo(shown ? null : item)}
            className={
              "absolute right-2 top-2 grid size-7 place-items-center rounded-full border text-muted-foreground transition hover:text-foreground " +
              (shown
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card/90")
            }
          >
            <Info size={14} />
          </button>
        </div>
      </li>
    );
  };

  const section = (title: string, hint: string, items: Item[], prefix: string) =>
    items.length ? (
      <section aria-label={title}>
        <h3 className="flex flex-wrap items-baseline gap-2 text-sm font-bold">
          <span className="h-4 w-1 rounded-full" style={{ background: tone }} />
          {title} <span className="text-xs font-normal text-muted-foreground">{hint}</span>
        </h3>
        <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(8.6rem,1fr))] gap-2.5">
          {items.map((item, i) => card(item, i, prefix))}
        </ul>
      </section>
    ) : null;

  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[13.5rem_minmax(0,1fr)_minmax(0,23rem)] lg:overflow-hidden">
      {/* Setores: tipo de refeição */}
      <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
        {topSlot}
        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-xs font-bold">Qual refeição?</legend>
          <div className="care-intake-choices flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
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
                  onClick={() => onKind(c.value)}
                  className={
                    "group relative flex min-w-[8.5rem] shrink-0 items-center gap-2.5 overflow-hidden rounded-2xl border p-2 text-left transition duration-200 active:scale-[.97] lg:min-w-0 " +
                    (on
                      ? "scale-[1.02] text-white shadow-lg"
                      : "border-border bg-card hover:-translate-y-0.5 hover:shadow-md")
                  }
                  style={
                    on
                      ? {
                          background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 62%, #000))`,
                          borderColor: color,
                          boxShadow: `0 10px 24px -12px ${color}`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-xl text-white shadow-inner"
                    style={{
                      background: on
                        ? "rgb(255 255 255 / .22)"
                        : `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 65%, #000))`,
                    }}
                  >
                    <CareIntakeIcon kind={c.value} size={18} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-[13px] leading-tight">{c.label}</strong>
                    <span
                      className={
                        "block truncate text-[10px] " +
                        (on ? "text-white/80" : "text-muted-foreground")
                      }
                    >
                      {c.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {/* Escolha dos alimentos */}
      <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
        <div
          className="rounded-2xl p-3 text-white"
          style={{
            background: `linear-gradient(120deg, ${tone}, color-mix(in srgb, ${tone} 55%, #000))`,
          }}
        >
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-white/20 shadow-inner">
              <CareIntakeIcon kind={kind} size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold leading-tight">{category.label}</h2>
              <p className="text-xs text-white/80">
                {category.hint} · toque nos alimentos para montar o prato
              </p>
            </div>
          </div>
          <label className="relative mt-3 block">
            <span className="sr-only">Buscar alimento</span>
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar alimento: frango, tomate, pimenta…"
              className="h-11 w-full rounded-xl border-0 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-white/70"
            />
          </label>
        </div>

        {info && (
          <div className="mt-3">
            <NutritionInfoCard item={info} onClose={() => setInfo(null)} />
          </div>
        )}

        <div className="mt-4 grid gap-5">
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
                Nenhum alimento com esse nome. Descreva no campo “O que você comeu?”.
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

      {/* Prato e registro */}
      <aside aria-label="Seu prato" className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
        <div
          className="flex min-h-full flex-col gap-3 rounded-2xl border bg-card p-3"
          style={{ borderColor: `color-mix(in srgb, ${tone} 45%, var(--border))` }}
        >
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
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-semibold hover:bg-muted active:scale-95"
              >
                <Eraser size={13} /> Limpar
              </button>
            )}
          </div>

          <label className="block text-xs font-semibold">
            <span className="block">O que você comeu?</span>
            <textarea
              rows={3}
              required
              maxLength={1000}
              value={description}
              onChange={(e) => onDescription(e.target.value)}
              placeholder={category.example}
              className="field mt-1.5 block min-h-[76px] w-full resize-y"
            />
          </label>

          {foods.length > 0 ? (
            <div
              aria-live="polite"
              className="rounded-xl p-3"
              style={{
                background: `color-mix(in srgb, ${tone} 10%, var(--card))`,
                boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tone} 28%, transparent)`,
              }}
            >
              <ul className="grid gap-1.5">
                {foods.map((f, i) => (
                  <li key={`${f.id}-${i}`} className="nv-rise flex items-center gap-2 text-xs">
                    <FoodThumb text={f.name} className="size-9" />
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {f.name.split(",")[0]}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {nf(f.grams)} {measureUnit(f.id)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-baseline gap-1.5">
                <strong className="text-3xl font-extrabold tabular-nums" style={{ color: tone }}>
                  {nf(kcal)}
                </strong>
                <span className="text-xs font-semibold text-muted-foreground">kcal no prato</span>
              </p>
              <ul className="mt-2 grid gap-1.5">
                {macros.map((m) => (
                  <li
                    key={m.label}
                    className="grid grid-cols-[5.4rem_1fr_auto] items-center gap-2 text-[11px]"
                  >
                    <span className="font-semibold">{m.label}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <span
                        className="block h-full rounded-full transition-[width] duration-700"
                        style={{
                          width: `${Math.round((m.value / macroMax) * 100)}%`,
                          background: m.color,
                        }}
                      />
                    </span>
                    <span className="tabular-nums text-muted-foreground">{nf(m.value, 1)} g</span>
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

          <label className="block text-xs font-semibold">
            <span className="block">Quantidade ou porção (opcional)</span>
            <input
              type="text"
              className="field mt-1.5 block min-h-[44px] w-full"
              maxLength={100}
              value={portion}
              onChange={(e) => onPortion(e.target.value)}
              placeholder="Ex.: 1 unidade, 100 g, 1 prato"
            />
          </label>

          <div className="min-w-0 rounded-xl border border-border/70 bg-card/80 p-3">
            <label className="block min-w-0 text-xs font-semibold">
              Data e hora do consumo · horário do Acre (UTC−5)
              <input
                type="datetime-local"
                required
                value={consumedAt}
                onChange={(e) => onConsumedAt(e.target.value)}
                className="field care-intake-datetime mt-1 block w-full min-w-0"
                style={{ boxSizing: "border-box" }}
              />
            </label>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Já vem com o horário atual. Altere só se foi em outro momento.
            </p>
          </div>

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
              className="nv-btn nv-btn-ghost px-4"
            >
              <X size={16} /> Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="nv-btn"
              style={{ ["--btn" as string]: tone }}
            >
              <Save size={17} /> {saving ? "Salvando..." : "Registrar agora"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
