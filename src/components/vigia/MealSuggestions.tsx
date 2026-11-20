import { useState } from "react";
import { Check, Info, Plus, X } from "lucide-react";
import { measureUnit, microTargets, parseFoodText, sumNutrients } from "@/lib/food-parser";
import { FoodVitamins } from "./FoodVitamins";

export type Suggestion = { label: string; text: string };
const nf = (n: number, digits = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });

/** Informações nutricionais de uma sugestão: macros, vitaminas e minerais. */
export function NutritionInfoCard({ item, onClose }: { item: Suggestion; onClose: () => void }) {
  const foods = parseFoodText(item.text);
  const total = sumNutrients(foods.map((f) => f.nutrients));
  const macros: [string, string, string][] = [
    ["Calorias", String(Math.round(total.kcal)), "kcal"],
    ["Proteínas", nf(total.protein), "g"],
    ["Carboidratos", nf(total.carbs), "g"],
    ["Gorduras", nf(total.fat), "g"],
    ["Fibras", nf(total.fiber), "g"],
  ];
  return (
    <section
      aria-label={`Informações nutricionais: ${item.label}`}
      className="nv-rise min-w-0 rounded-xl border border-primary/25 bg-primary/[.05] p-3 text-xs"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-bold">{item.label}</h4>
          {foods.length > 0 && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {foods
                .map((f) => `${f.name.split(",")[0]} ${f.grams} ${measureUnit(f.id)}`)
                .join(" · ")}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Fechar informações"
          onClick={onClose}
          className="grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-card"
        >
          <X size={14} />
        </button>
      </div>
      {foods.length === 0 ? (
        <p className="mt-2 text-muted-foreground">
          Ainda não temos os valores nutricionais deste item.
        </p>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-5 gap-1 text-center">
            {macros.map(([label, value, unit]) => (
              <span key={label} className="min-w-0 rounded-lg bg-card px-1 py-1.5">
                <strong className="block text-[13px] tabular-nums">
                  {value}
                  <span className="text-[10px] font-semibold text-muted-foreground"> {unit}</span>
                </strong>
                <span className="block truncate text-[10px] text-muted-foreground">{label}</span>
              </span>
            ))}
          </div>
          <ul className="mt-2 grid gap-1" aria-label="Vitaminas e minerais na porção">
            {(Object.keys(microTargets) as (keyof typeof microTargets)[]).map((key) => {
              const meta = microTargets[key],
                value = total[key],
                pct = Math.min(100, Math.round((value / meta.target) * 100));
              return (
                <li key={key} className="grid grid-cols-[6.2rem_1fr_auto] items-center gap-2">
                  <span className="truncate font-semibold">{meta.label}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {nf(value, value < 10 ? 1 : 0)} {meta.unit}{" "}
                    <span className="text-[10px]">
                      ({Math.round((value / meta.target) * 100)}%)
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-2">
            <FoodVitamins foodIds={foods.map((f) => f.id)} />
          </div>
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            Porção estimada pela medida usual. Valores aproximados (TACO, IBGE, TBCA) e percentuais
            sobre a referência diária de um adulto; não substituem a orientação de nutricionista.
          </p>
        </>
      )}
    </section>
  );
}

type Props = {
  title: string;
  hint?: string;
  items: Suggestion[];
  description: string;
  onChange: (next: string) => void;
  tone?: "emerald" | "sky";
};

/** Sugestões tocáveis (adicionam ou removem da descrição) com o ícone (i) de informações nutricionais. */
export function MealSuggestions({
  title,
  hint = "toque para adicionar ou remover",
  items,
  description,
  onChange,
  tone = "emerald",
}: Props) {
  const [info, setInfo] = useState<string | null>(null);
  const colors =
    tone === "sky"
      ? {
          on: "border-sky-500 bg-sky-500 text-white",
          off: "border-border bg-card hover:border-sky-500/50 hover:bg-sky-500/[.06]",
          plus: "text-sky-600",
        }
      : {
          on: "border-emerald-500 bg-emerald-500 text-white",
          off: "border-border bg-card hover:border-emerald-500/50 hover:bg-emerald-500/[.06]",
          plus: "text-emerald-600",
        };
  const isOn = (text: string) => description.toLowerCase().includes(text.toLowerCase());
  const toggle = (text: string) => {
    if (isOn(text)) {
      const idx = description.toLowerCase().indexOf(text.toLowerCase());
      const rest = (description.slice(0, idx) + description.slice(idx + text.length))
        .split(/\s*,\s*/)
        .map((part) => part.trim())
        .filter(Boolean);
      onChange(rest.join(", "));
    } else
      onChange(description.trim() ? `${description.trim().replace(/,\s*$/, "")}, ${text}` : text);
  };
  const open = items.find((item) => item.label === info);
  if (!items.length) return null;
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold">
        {title} <span className="font-normal text-muted-foreground">· {hint}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((item) => {
          const on = isOn(item.text),
            shown = info === item.label;
          return (
            <span
              key={item.label}
              className={`inline-flex h-8 items-stretch overflow-hidden rounded-full border text-[11px] font-semibold transition ${on ? colors.on : colors.off}`}
            >
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(item.text)}
                className="inline-flex items-center gap-1 pl-3 pr-2 active:scale-95"
              >
                {on ? <Check size={13} /> : <Plus size={13} className={colors.plus} />}
                {item.label}
              </button>
              <button
                type="button"
                aria-label={`Informações nutricionais de ${item.label}`}
                aria-expanded={shown}
                title="Informações nutricionais"
                onClick={() => setInfo(shown ? null : item.label)}
                className={`grid w-7 place-items-center border-l ${on ? "border-white/30 hover:bg-white/15" : "border-border hover:bg-muted"} ${shown ? "bg-primary text-primary-foreground" : ""}`}
              >
                <Info size={14} />
              </button>
            </span>
          );
        })}
      </div>
      {open && (
        <div className="mt-2">
          <NutritionInfoCard item={open} onClose={() => setInfo(null)} />
        </div>
      )}
    </div>
  );
}
