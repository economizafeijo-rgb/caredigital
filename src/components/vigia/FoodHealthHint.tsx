import { Sparkles } from "lucide-react";
import { foodHealth, healthDotClass, healthierSwaps } from "@/lib/food-health";
import type { Ingredient } from "@/lib/nutrition-catalog";

type FoodLike = Parameters<typeof foodHealth>[0];

/** Ponto colorido discreto: verde (pode ser frequente), âmbar (moderação), rosa (de vez em quando). */
export function HealthDot({ food, className = "" }: { food: FoodLike; className?: string }) {
  const h = foodHealth(food);
  return (
    <span className={`inline-block size-2 shrink-0 rounded-full ${healthDotClass[h.level]} ${className}`} title={`${h.label}: ${h.reason}`}>
      <span className="sr-only">{h.label}</span>
    </span>
  );
}

/** Indicação curta + até duas trocas mais saudáveis. `onPick` torna as trocas clicáveis. */
export function HealthHint({ food, onPick, tone = "light" }: { food: FoodLike; onPick?: (id: string) => void; tone?: "light" | "dark" }) {
  const h = foodHealth(food);
  const alt = healthierSwaps(food);
  const muted = tone === "dark" ? "text-white/70" : "text-muted-foreground";
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-snug ${muted}`}>
      <span className="inline-flex items-center gap-1.5">
        <span className={`size-2 rounded-full ${healthDotClass[h.level]}`} aria-hidden />
        <strong className={tone === "dark" ? "font-semibold text-white" : "font-semibold text-foreground"}>{h.label}</strong>
        <span>· {h.reason}</span>
      </span>
      {alt.length > 0 && (
        <span className="inline-flex flex-wrap items-center gap-1">
          <Sparkles size={11} aria-hidden className="text-emerald-500" />
          Troca melhor:
          {alt.map((a: Ingredient) =>
            onPick ? (
              <button key={a.id} type="button" onClick={() => onPick(a.id)}
                className={`rounded-full px-1.5 py-0.5 font-semibold underline-offset-2 hover:underline ${tone === "dark" ? "bg-white/12 text-emerald-200" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
                {a.name}
              </button>
            ) : (
              <span key={a.id} className={`rounded-full px-1.5 py-0.5 font-semibold ${tone === "dark" ? "bg-white/12 text-emerald-200" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>{a.name}</span>
            ),
          )}
        </span>
      )}
    </div>
  );
}
