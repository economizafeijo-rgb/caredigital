import type { ReactNode } from "react";
import { Eraser, Save, X } from "lucide-react";
import { CareIntakeIcon } from "./CareIntakePicker";
import { useCountUp } from "@/lib/use-count-up";

const nf = (n: number, digits = 0) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });

export type RailItem = {
  value: string;
  label: string;
  hint?: string;
  color: string;
  count?: number;
};

/**
 * Seletor de categoria: coluna lateral no computador e fileira rolável no celular.
 * As categorias são só sugestões — a busca nunca fica presa a elas.
 */
export function KindRail({
  legend,
  group,
  items,
  active,
  suggested,
  onPick,
  topSlot,
}: {
  legend: string;
  group: "food" | "beverage";
  items: RailItem[];
  active: string;
  suggested: string | null;
  onPick: (value: string) => void;
  topSlot?: ReactNode;
}) {
  return (
    <nav
      aria-label={legend}
      className="flex min-w-0 flex-col gap-2 lg:min-h-0 lg:w-full lg:overflow-y-auto lg:border lg:border-border lg:bg-muted/20 lg:p-2"
    >
      {topSlot}
      <fieldset className="min-w-0">
        <legend className="sr-only">{legend}</legend>
        <div className="care-intake-choices flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-col lg:overflow-x-hidden lg:pb-0">
          {items.map((c) => {
            const on = c.value === active;
            const isSuggested = suggested === c.value && !on;
            return (
              <button
                key={c.value}
                type="button"
                aria-pressed={on}
                data-intake-kind={c.value}
                data-intake-group={group}
                title={isSuggested ? `${c.hint ?? c.label} · sugerida para esta busca` : c.hint}
                onClick={() => onPick(c.value)}
                className={
                  "group/rail relative inline-flex h-9 shrink-0 items-center gap-2 border px-2.5 text-left text-xs font-semibold transition duration-150 active:scale-[.97] lg:w-full " +
                  (on
                    ? "border-transparent text-white shadow-sm"
                    : isSuggested
                      ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/30"
                      : "border-border/70 bg-card text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground")
                }
                style={on ? { background: c.color } : undefined}
              >
                <span
                  aria-hidden="true"
                  className="grid size-5 shrink-0 place-items-center"
                  style={on ? undefined : { color: c.color }}
                >
                  <CareIntakeIcon kind={c.value} size={15} />
                </span>
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                {c.count ? (
                  <span
                    aria-hidden="true"
                    className={
                      "hidden shrink-0 text-[10px] font-bold tabular-nums lg:inline " +
                      (on ? "text-white/80" : "text-muted-foreground/70")
                    }
                  >
                    {c.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </fieldset>
    </nav>
  );
}

/** Resumo compacto sempre visível: calorias à esquerda e os quatro nutrientes em grade 2×2. */
export function NutritionSummary({
  kcal,
  protein,
  carbs,
  fat,
  fiber,
  tone,
  caption,
  note,
}: {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  tone: string;
  caption: string;
  note: string;
}) {
  const shown = useCountUp(Math.round(kcal));
  const rows = [
    { label: "Proteínas", value: protein, color: "#f43f5e" },
    { label: "Carboidratos", value: carbs, color: "#f59e0b" },
    { label: "Gorduras", value: fat, color: "#8b5cf6" },
    { label: "Fibras", value: fiber, color: "#22c55e" },
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div aria-live="polite" title={note} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
      <p className="leading-none">
        <strong className="block text-3xl font-extrabold tabular-nums" style={{ color: tone }}>
          {nf(shown)}
        </strong>
        <span className="mt-1 block text-[10px] font-semibold text-muted-foreground">{caption}</span>
      </p>
      <ul className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="min-w-0">
            <p className="flex items-baseline justify-between gap-1 text-[10px] text-muted-foreground">
              <span className="truncate">{r.label}</span>
              <strong className="shrink-0 tabular-nums text-foreground">{nf(r.value, 1)} g</strong>
            </p>
            <span className="mt-0.5 block h-1 overflow-hidden bg-muted">
              <span
                className="block h-full transition-[width] duration-500 ease-out"
                style={{ width: `${Math.round((r.value / max) * 100)}%`, background: r.color }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Painel lateral que cabe na janela: cabeçalho e rodapé fixos; só o miolo rola, se precisar.
 * O rodapé guarda data/hora, erro e os botões — sempre visíveis.
 */
export function SidePanel({
  label,
  title,
  count,
  onClear,
  tone,
  summary,
  pinned,
  children,
  consumedAt,
  onConsumedAt,
  error,
  saving,
  onCancel,
  registerNote,
}: {
  label: string;
  title: string;
  count?: number;
  onClear?: () => void;
  tone: string;
  summary?: ReactNode;
  pinned?: ReactNode;
  children: ReactNode;
  consumedAt: string;
  onConsumedAt: (value: string) => void;
  error: string;
  saving: boolean;
  onCancel: () => void;
  registerNote?: string;
}) {
  return (
    <aside
      aria-label={label}
      className="flex min-w-0 flex-col border border-border bg-card lg:min-h-0"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          {title}
          {count ? (
            <span
              className="grid h-5 min-w-5 place-items-center px-1 text-[11px] font-bold text-white"
              style={{ background: tone }}
            >
              {count}
            </span>
          ) : null}
        </h3>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-7 items-center gap-1 px-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95"
          >
            <Eraser size={12} /> Limpar
          </button>
        )}
      </header>
      {pinned}
      {summary && <div className="border-b border-border bg-muted/20 px-3 py-2.5">{summary}</div>}
      <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-3 p-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overflow-x-hidden">
        {children}
      </div>
      <footer className="sticky bottom-0 z-10 grid gap-2 border-t border-border bg-card p-3" data-intake-actions>
        <label className="grid min-w-0 grid-cols-[auto_1fr] items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          Quando · Acre (UTC−5)
          <input
            type="datetime-local"
            required
            value={consumedAt}
            onChange={(e) => onConsumedAt(e.target.value)}
            className="field care-intake-datetime block h-9 w-full min-w-0 text-xs text-foreground"
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
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button type="button" disabled={saving} onClick={onCancel} className="nv-btn nv-btn-ghost px-3.5">
            <X size={14} /> Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="nv-btn"
            style={{ ["--btn" as string]: tone }}
          >
            <Save size={15} /> {saving ? "Salvando..." : "Registrar agora"}
            {!saving && registerNote ? <span className="text-[11px] font-semibold opacity-80">· {registerNote}</span> : null}
          </button>
        </div>
      </footer>
    </aside>
  );
}

export type OverviewItem = {
  key: string;
  group: "food" | "beverage";
  name: string;
  detail: string;
  kcal: number;
};

/**
 * Resumo consolidado do registro em andamento: TUDO o que já foi escolhido (alimentos e bebida),
 * visível em qualquer aba. Tocar num item leva de volta ao grupo dele para continuar editando.
 */
export function RecordOverview({
  items,
  active,
  onOpen,
  totals,
  mealType,
}: {
  items: OverviewItem[];
  active: "food" | "beverage";
  onOpen: (group: "food" | "beverage") => void;
  totals?: { protein: number; carbs: number; fat: number; fiber: number };
  /** Qual refeição é esta (café, almoço…): obrigatório para registrar os alimentos. */
  mealType?: {
    value: string;
    options: { value: string; label: string }[];
    suggested: boolean;
    onChange: (value: string) => void;
  };
}) {
  if (!items.length) return null;
  const kcal = items.reduce((sum, i) => sum + i.kcal, 0);
  const foodKcal = items.filter((i) => i.group === "food").reduce((sum, i) => sum + i.kcal, 0);
  const drinkKcal = kcal - foodKcal;
  const hasBoth = items.some((i) => i.group === "food") && items.some((i) => i.group === "beverage");
  return (
    <section
      aria-label="Resumo do registro"
      className="border-b border-amber-400/30 border-l-[3px] border-l-amber-400 bg-amber-400/[.07]"
    >
      {mealType && (
        <div className="px-3 pt-2" role="group" aria-label="Tipo da refeição">
          <p className="text-[10px] font-bold text-amber-300">
            Qual refeição é esta?
            {mealType.suggested && (
              <span className="ml-1 font-normal text-muted-foreground">
                (sugerido pelo horário — toque para mudar)
              </span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {mealType.options.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={o.value === mealType.value}
                onClick={() => mealType.onChange(o.value)}
                className={
                  "h-6 border px-2 text-[11px] font-semibold transition active:scale-95 " +
                  (o.value === mealType.value
                    ? "border-amber-300 bg-amber-300 text-slate-900"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground")
                }
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="px-3 pt-2 text-[10px] font-bold text-amber-300">
        Tudo o que entra neste registro · {items.length} {items.length === 1 ? "item" : "itens"}
        <span className="ml-1 font-normal text-muted-foreground">(kcal por item)</span>
      </p>
      <ul className="grid max-h-[7.5rem] grid-cols-[minmax(0,1fr)] overflow-y-auto px-1.5 py-1">
        {items.map((item) => (
          <li key={item.key} className="min-w-0">
            <button
              type="button"
              onClick={() => onOpen(item.group)}
              aria-current={item.group === active ? "true" : undefined}
              title={item.group === active ? "Em edição agora" : "Toque para voltar e editar"}
              className={
                "flex w-full min-w-0 items-center gap-2 border-l-2 px-1.5 py-1 text-left text-xs transition hover:bg-amber-400/10 " +
                (item.group === active ? "border-l-amber-300 bg-white/[.06]" : "border-l-transparent")
              }
            >
              <span
                aria-hidden="true"
                className={
                  "w-11 shrink-0 text-center text-[9px] font-bold " +
                  (item.group === "food" ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300")
                }
              >
                {item.group === "food" ? "Prato" : "Bebida"}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span>
              <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">{item.detail}</span>
              <span className="w-10 shrink-0 text-right tabular-nums text-[11px] font-bold">
                {nf(item.kcal)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mx-1.5 mb-1.5 border-t border-amber-400/30 px-1.5 pt-1.5">
        {hasBoth && (
          <p className="flex justify-between text-[10px] text-muted-foreground">
            <span>Alimentos</span>
            <span className="tabular-nums">{nf(foodKcal)} kcal</span>
          </p>
        )}
        {hasBoth && (
          <p className="flex justify-between text-[10px] text-muted-foreground">
            <span>Bebidas</span>
            <span className="tabular-nums">{nf(drinkKcal)} kcal</span>
          </p>
        )}
        <p className="mt-0.5 flex items-baseline justify-between gap-2">
          <strong className="text-xs">Soma do registro</strong>
          <strong className="text-base tabular-nums text-amber-300">{nf(kcal)} kcal</strong>
        </p>
        {totals && (
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] tabular-nums text-muted-foreground">
            <span>Prot. <b className="text-foreground">{nf(totals.protein, 1)} g</b></span>
            <span>Carb. <b className="text-foreground">{nf(totals.carbs, 1)} g</b></span>
            <span>Gord. <b className="text-foreground">{nf(totals.fat, 1)} g</b></span>
            <span>Fibras <b className="text-foreground">{nf(totals.fiber, 1)} g</b></span>
          </p>
        )}
      </div>
    </section>
  );
}

/** Cabeçalho da área de edição: deixa claro QUAL item está sendo editado agora (separado do resumo). */
export function EditingHeader({ title, tone }: { title: string; tone: string }) {
  return (
    <div className="border-l-[3px] pl-2 leading-tight" style={{ borderColor: tone }}>
      <span className="block text-[10px] font-bold text-muted-foreground">Editando agora</span>
      <strong className="block truncate text-sm">{title}</strong>
    </div>
  );
}
