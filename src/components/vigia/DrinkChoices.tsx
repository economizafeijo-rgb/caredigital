import { useState } from "react";
import { Check, Info } from "lucide-react";
import { drinkGroups, drinkPresetFor, drinkPresets, type DrinkPreset } from "@/lib/drink-presets";
import type { BeverageKind } from "@/lib/care-intake-categories";
import { NutritionInfoCard } from "./MealSuggestions";

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

type Props = {
  kind: string;
  description: string;
  kindLabel: string;
  onPick: (preset: DrinkPreset) => void;
};

/** Bebidas para tocar e escolher: as do tipo atual e, com "Ver todas", as de qualquer tipo. */
export function DrinkChoices({ kind, description, kindLabel, onPick }: Props) {
  const own = drinkPresets.filter((item) => item.kind === (kind as BeverageKind));
  const [showAll, setShowAll] = useState(false);
  const [infoKey, setInfoKey] = useState<string | null>(null);
  const selected = drinkPresetFor(kind, description)?.key ?? null;
  const expanded = showAll || own.length === 0;
  const info = drinkPresets.find((item) => item.key === infoKey) ?? null;

  const chip = (item: DrinkPreset) => {
    const on = item.key === selected;
    return (
      <span key={item.key} className="inline-flex max-w-full items-stretch">
        <button
          type="button"
          aria-pressed={on}
          onClick={() => onPick({ ...item, text: capital(item.text) })}
          className={
            "inline-flex min-h-9 min-w-0 items-center gap-1 rounded-l-full border border-r-0 px-3 text-xs font-semibold transition active:scale-95 " +
            (on
              ? "border-sky-500 bg-sky-500/15 text-sky-800 dark:text-sky-200"
              : "border-border bg-card hover:bg-muted")
          }
        >
          {on && <Check size={13} className="shrink-0" />}
          <span className="truncate">{item.label}</span>
        </button>
        <button
          type="button"
          aria-label={`Informações nutricionais: ${item.label}`}
          aria-expanded={infoKey === item.key}
          onClick={() => setInfoKey((current) => (current === item.key ? null : item.key))}
          className={
            "grid min-h-9 w-9 place-items-center rounded-r-full border text-muted-foreground transition hover:text-foreground " +
            (infoKey === item.key
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card")
          }
        >
          <Info size={14} />
        </button>
      </span>
    );
  };

  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-card/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold">
          {expanded ? "Todas as bebidas" : `Opções de ${kindLabel.toLowerCase()}`}
        </p>
        {own.length > 0 && (
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((value) => !value)}
            className="h-8 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted"
          >
            {showAll ? "Só do tipo escolhido" : "Ver todas as bebidas"}
          </button>
        )}
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Toque para escolher · (i) mostra os nutrientes
      </p>
      {expanded ? (
        <div className="mt-2 grid gap-2">
          {drinkGroups.map((group) => (
            <div key={group}>
              <p className="text-[11px] font-semibold text-muted-foreground">{group}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {drinkPresets.filter((item) => item.group === group).map(chip)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">{own.map(chip)}</div>
      )}
      {info && (
        <div className="mt-3">
          <NutritionInfoCard
            item={{ label: info.label, text: info.text }}
            onClose={() => setInfoKey(null)}
          />
        </div>
      )}
    </div>
  );
}
