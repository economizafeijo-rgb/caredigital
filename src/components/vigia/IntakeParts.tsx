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

/** Calorias grandes + barras proporcionais dos quatro nutrientes. */
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
    <div aria-live="polite" className="border border-border/70 bg-card/70 p-2.5">
      <p className="flex items-baseline gap-1.5">
        <strong className="text-3xl font-extrabold leading-none tabular-nums" style={{ color: tone }}>
          {nf(shown)}
        </strong>
        <span className="text-[11px] font-semibold text-muted-foreground">{caption}</span>
      </p>
      <ul className="mt-2.5 grid gap-1.5">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[5.2rem_1fr_3.2rem] items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="h-1.5 overflow-hidden bg-muted">
              <span
                className="block h-full transition-[width] duration-500 ease-out"
                style={{ width: `${Math.round((r.value / max) * 100)}%`, background: r.color }}
              />
            </span>
            <strong className="text-right tabular-nums">{nf(r.value, 1)} g</strong>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-muted-foreground">{note}</p>
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
  children,
  consumedAt,
  onConsumedAt,
  error,
  saving,
  onCancel,
}: {
  label: string;
  title: string;
  count?: number;
  onClear?: () => void;
  tone: string;
  children: ReactNode;
  consumedAt: string;
  onConsumedAt: (value: string) => void;
  error: string;
  saving: boolean;
  onCancel: () => void;
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
      <div className="grid content-start gap-3 p-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
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
          </button>
        </div>
      </footer>
    </aside>
  );
}
