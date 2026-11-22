import { useMemo, useState, type ReactNode } from "react";
import { Check, Eraser, Info, Minus, Plus, Save, Search, X } from "lucide-react";
import { HowItWorks, drinkHowTo } from "./HowItWorks";
import { CareIntakeIcon } from "./CareIntakePicker";
import { FoodThumb, foodVisual } from "./FoodArt";
import { NutritionInfoCard } from "./MealSuggestions";
import { beverageKinds, type BeverageKind } from "@/lib/care-intake-categories";
import { drinkPresets, type DrinkPreset } from "@/lib/drink-presets";
import { checkIntake } from "@/lib/hydration-need";
import { measureUnit, parseFoodText, sumNutrients } from "@/lib/food-parser";
import { normalize } from "@/lib/food-search";

/** Cor de cada tipo de bebida (cabeçalho, abas e botão), no mesmo padrão das refeições. */
export const drinkTone: Record<BeverageKind, string> = {
  agua: "#0ea5e9",
  cha: "#84cc16",
  suco: "#f59e0b",
  cafe: "#a16207",
  energetico: "#ef4444",
  suplemento: "#8b5cf6",
  shake: "#ec4899",
  isotonico: "#14b8a6",
  vitamina: "#f97316",
  leite: "#6366f1",
  agua_coco: "#22a55a",
  refrigerante: "#f43f5e",
  outra: "#64748b",
};

const nf = (n: number, digits = 0) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

type Card = { key: string; label: string; text: string; ml: number; kind: BeverageKind };
const waterCards: Card[] = [
  { key: "agua:100", label: "Gole de água", text: "Água", ml: 100, kind: "agua" },
  { key: "agua:200", label: "Copo de água", text: "Água", ml: 200, kind: "agua" },
  { key: "agua:300", label: "Copo grande de água", text: "Água", ml: 300, kind: "agua" },
  { key: "agua:500", label: "Garrafinha de água", text: "Água", ml: 500, kind: "agua" },
];
const asCard = (p: DrinkPreset): Card => ({
  key: p.key,
  label: p.label,
  text: capital(p.text),
  ml: p.ml,
  kind: p.kind,
});
const allCards: Card[] = [...waterCards, ...drinkPresets.map(asCard)];

type Props = {
  kind: BeverageKind;
  onKind: (kind: BeverageKind) => void;
  description: string;
  onDescription: (value: string) => void;
  amount: string;
  onAmount: (value: string) => void;
  consumedAt: string;
  onConsumedAt: (value: string) => void;
  error: string;
  saving: boolean;
  onCancel: () => void;
  topSlot?: ReactNode;
};

/**
 * Registro de bebida no mesmo modelo do registro de refeição: abas de tipo (só sugestão),
 * cartões para tocar, busca livre em todas as bebidas e painel "Sua bebida" ao lado.
 */
export function DrinkBoard({
  kind,
  onKind,
  description,
  onDescription,
  amount,
  onAmount,
  consumedAt,
  onConsumedAt,
  error,
  saving,
  onCancel,
  topSlot,
}: Props) {
  const tone = drinkTone[kind];
  const category = beverageKinds.find((c) => c.value === kind)!;
  const isWater = kind === "agua";
  const [query, setQuery] = useState("");
  const [info, setInfo] = useState<Card | null>(null);

  const own = useMemo(() => allCards.filter((c) => c.kind === kind), [kind]);
  const q = normalize(query);
  const { found, suggestedKind } = useMemo(() => {
    if (q.length < 2) return { found: [] as Card[], suggestedKind: null as BeverageKind | null };
    const tokens = q.split(" ");
    const hits = allCards.filter((c) => {
      const hay = normalize(`${c.label} ${c.text}`).split(" ");
      return tokens.every((t) => hay.some((w) => w.startsWith(t)));
    });
    return { found: hits.slice(0, 36), suggestedKind: hits[0]?.kind ?? null };
  }, [q]);

  const ml = Math.max(0, Number(amount) || 0);
  const parsed = useMemo(
    () => (isWater ? [] : parseFoodText(description, ml || null)),
    [description, ml, isWater],
  );
  const total = useMemo(() => sumNutrients(parsed.map((f) => f.nutrients)), [parsed]);
  const check = checkIntake(ml);
  const picked = (c: Card) =>
    c.kind === kind && c.ml === ml && (isWater || c.text.toLowerCase() === description.trim().toLowerCase());

  const card = (item: Card, index: number, prefix: string) => {
    const on = picked(item);
    const shown = info?.key === item.key;
    const v = foodVisual(item.text, item.label);
    const tint = drinkTone[item.kind];
    return (
      <li
        key={`${prefix}-${item.key}`}
        className="nv-rise"
        style={{ animationDelay: `${Math.min(index, 12) * 18}ms` }}
      >
        <div
          className={"flex items-center border border-l-[3px] transition-colors duration-200 " + (on ? "border-border" : "border-border bg-card")}
          style={
            on
              ? { borderLeftColor: tint, background: `color-mix(in srgb, ${tint} 8%, var(--card))` }
              : undefined
          }
        >
          <button
            type="button"
            aria-pressed={on}
            aria-label={`Escolher ${item.label}`}
            onClick={() => {
              onKind(item.kind);
              onDescription(item.text);
              onAmount(String(item.ml));
            }}
            className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-2 pr-1 text-left active:scale-[.985]"
          >
            <FoodThumb text={item.text} label={item.label} visual={v} className="size-10" />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-[13px] font-semibold leading-tight">
                {item.label}
              </span>
              <span className="block text-[11px] tabular-nums text-muted-foreground">
                {item.ml} ml
              </span>
            </span>
          </button>
          {item.kind !== "agua" && (
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
          )}
          <span
            aria-hidden="true"
            className={
              "mr-2 grid size-5 shrink-0 place-items-center border transition-all duration-200 " +
              (on ? "nv-pop text-white" : "border-border text-transparent")
            }
            style={on ? { background: tint, borderColor: tint } : undefined}
          >
            <Check size={12} strokeWidth={3} />
          </span>
        </div>
      </li>
    );
  };

  const section = (title: string, hint: string, items: Card[], prefix: string) =>
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

  const others = useMemo(() => allCards.filter((c) => c.kind !== kind), [kind]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        {topSlot}
        <fieldset className="min-w-0 flex-1">
          <legend className="sr-only">Qual bebida?</legend>
          <div className="care-intake-choices flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {beverageKinds.map((c) => {
              const on = c.value === kind;
              const suggested = suggestedKind === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={on}
                  data-intake-kind={c.value}
                  data-intake-group="beverage"
                  title={c.hint}
                  onClick={() => {
                    onKind(c.value);
                    onDescription("");
                    onAmount(String(c.amount ?? 200));
                  }}
                  className={
                    "inline-flex h-8 shrink-0 items-center gap-1.5 border px-3 text-xs font-semibold transition duration-150 active:scale-95 " +
                    (on
                      ? "border-foreground bg-foreground text-background"
                      : suggested
                        ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/30"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground")
                  }
                >
                  <span className="size-2" style={{ background: drinkTone[c.value] }} />
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
                className="grid size-8 shrink-0 place-items-center text-white"
                style={{ background: tone }}
              >
                <CareIntakeIcon kind={kind} size={16} />
              </span>
              <div className="min-w-0 leading-tight">
                <h2 className="text-sm font-bold">{category.label}</h2>
                <p className="truncate text-[11px] text-muted-foreground">
                  {category.hint} · toque na bebida para escolher
                </p>
              </div>
              <label className="relative ml-auto block w-full max-w-[16rem]">
                <span className="sr-only">Buscar bebida</span>
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar bebida…"
                  className="h-9 w-full border border-border bg-background/60 pl-8 pr-2 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
          </div>

          {info && (
            <div className="mb-3">
              <NutritionInfoCard
                item={{ label: info.label, text: info.text }}
                onClose={() => setInfo(null)}
              />
            </div>
          )}

          <div className="grid gap-4">
            {q.length >= 2 ? (
              found.length ? (
                section(
                  `Resultados para “${query.trim()}”`,
                  `${found.length} bebida${found.length === 1 ? "" : "s"}`,
                  found,
                  "busca",
                )
              ) : (
                <p className="border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Nenhuma bebida da lista com esse nome. Escreva o nome no campo “Nome da bebida”
                  ao lado: o sistema calcula pelo que reconhecer.
                </p>
              )
            ) : (
              <>
                {section(
                  `Opções de ${category.label.toLowerCase()}`,
                  "toque para escolher",
                  own,
                  "tipo",
                )}
                {!own.length && (
                  <p className="border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Sem opções prontas para este tipo. Escreva o nome da bebida ao lado ou veja as
                    outras bebidas abaixo.
                  </p>
                )}
                {section("Outras bebidas", "de qualquer tipo", others, "outras")}
              </>
            )}
          </div>
        </div>

        <aside aria-label="Sua bebida" className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
          <div className="flex min-h-full flex-col gap-3 border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Sua bebida</h3>
              {description.trim() && !isWater && (
                <button
                  type="button"
                  onClick={() => {
                    onDescription("");
                    setInfo(null);
                  }}
                  className="inline-flex h-7 items-center gap-1 px-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95"
                >
                  <Eraser size={12} /> Limpar
                </button>
              )}
            </div>

            {!isWater && (
              <label className="block text-xs font-semibold">
                <span className="block">Nome da bebida</span>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={description}
                  onChange={(e) => onDescription(e.target.value)}
                  placeholder={category.example ?? "Descreva a bebida"}
                  className="field mt-1 block min-h-[38px] w-full text-sm"
                />
              </label>
            )}

            <div>
              <span className="block text-xs font-semibold">Quantidade</span>
              <div className="mt-1 flex items-center justify-center gap-3 bg-muted/40 p-2.5">
                <button
                  type="button"
                  aria-label="Menos 50 ml"
                  onClick={() => onAmount(String(Math.max(10, ml - 50)))}
                  className="grid size-10 place-items-center border border-border bg-card font-bold transition hover:bg-muted active:scale-90"
                >
                  <Minus size={16} />
                </button>
                <label className="flex items-baseline gap-1">
                  <span className="sr-only">Quantidade consumida em ml</span>
                  <input
                    type="number"
                    min={10}
                    max={1500}
                    step={10}
                    required
                    value={amount}
                    onChange={(e) => onAmount(e.target.value)}
                    className="w-24 bg-transparent text-center text-3xl font-extrabold tabular-nums outline-none"
                  />
                  <span className="text-base font-semibold text-muted-foreground">ml</span>
                </label>
                <button
                  type="button"
                  aria-label="Mais 50 ml"
                  onClick={() => onAmount(String(Math.min(1500, ml + 50)))}
                  className="grid size-10 place-items-center border border-border bg-card font-bold transition hover:bg-muted active:scale-90"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div aria-label="Volumes sugeridos" className="mt-2 grid grid-cols-4 gap-1.5">
                {[100, 200, 300, 500].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onAmount(String(value))}
                    aria-pressed={ml === value}
                    className={
                      "border px-2 py-1.5 text-xs font-bold transition " +
                      (ml === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted")
                    }
                  >
                    {value} ml
                  </button>
                ))}
              </div>
            </div>

            {check.message && (
              <p
                role="status"
                className={
                  "border p-2 text-xs " +
                  (check.level === "excess"
                    ? "border-destructive/40 bg-destructive/5 text-destructive"
                    : "border-amber-500/30 bg-amber-500/[.07]")
                }
              >
                {check.message}
              </p>
            )}

            {parsed.length > 0 ? (
              <div aria-live="polite" className="border border-border/70 bg-card/70 p-2.5">
                <ul className="grid gap-1">
                  {parsed.map((f, i) => (
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
                <p className="mt-2.5 flex items-baseline gap-1.5 border-t border-border/60 pt-2">
                  <strong className="text-2xl font-extrabold tabular-nums" style={{ color: tone }}>
                    {nf(Math.round(total.kcal))}
                  </strong>
                  <span className="text-[11px] font-semibold text-muted-foreground">kcal</span>
                </p>
                <ul className="mt-2 grid grid-cols-4 gap-px bg-border text-center">
                  {[
                    ["Proteínas", total.protein, "#f43f5e"],
                    ["Carboidratos", total.carbs, "#f59e0b"],
                    ["Gorduras", total.fat, "#8b5cf6"],
                    ["Fibras", total.fiber, "#22c55e"],
                  ].map(([label, value, color]) => (
                    <li key={label as string} className="bg-card py-1.5">
                      <strong
                        className="block text-sm tabular-nums"
                        style={{ color: color as string }}
                      >
                        {nf(value as number, 1)}
                        <span className="text-[10px] font-semibold text-muted-foreground"> g</span>
                      </strong>
                      <span className="block text-[10px] text-muted-foreground">
                        {label as string}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                  Cálculo automático pelo volume; valores aproximados.
                </p>
              </div>
            ) : (
              <p className="border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                {isWater
                  ? "Água não tem calorias. Escolha o volume e registre."
                  : "Escolha uma bebida ao lado ou escreva o nome acima: o cálculo aparece aqui."}
              </p>
            )}

            <HowItWorks>{drinkHowTo}</HowItWorks>

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
                className="border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive"
              >
                {error}
              </p>
            )}

            <div
              data-intake-actions
              className="sticky bottom-0 z-10 -mx-1 mt-auto grid grid-cols-[auto_1fr] gap-2 border-t border-border bg-card px-1 pb-1 pt-2.5"
            >
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
