import { nutrientsInFood } from "@/lib/food-vitamins";

/** Vitaminas e minerais em destaque no alimento, com tipo e benefício. */
export function FoodVitamins({
  foodId,
  tone = "light",
}: {
  foodId: string;
  tone?: "light" | "dark";
}) {
  const list = nutrientsInFood(foodId);
  const dark = tone === "dark";
  if (!list.length) return null;
  return (
    <section
      aria-label="Vitaminas e minerais"
      className={`rounded-xl border p-2.5 ${dark ? "border-white/10 bg-white/5" : "border-border bg-muted/30"}`}
    >
      <h5
        className={`text-[11px] font-bold uppercase tracking-wide ${dark ? "text-white/70" : "text-muted-foreground"}`}
      >
        Vitaminas e minerais em destaque
      </h5>
      <ul className="mt-1.5 grid gap-1">
        {list.map((n) => (
          <li key={n.key}>
            <details className="group rounded-lg">
              <summary
                className={`flex cursor-pointer list-none flex-wrap items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs ${dark ? "hover:bg-white/10" : "hover:bg-muted/60"}`}
              >
                <strong className="font-bold">{n.name}</strong>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${n.kind === "Mineral" ? "bg-sky-500/15 text-sky-600 dark:text-sky-300" : n.kind === "Vitamina lipossolúvel" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"} ${dark ? "!text-white/85" : ""}`}
                >
                  {n.kind}
                </span>
                <span
                  className={`w-full text-[11px] leading-snug ${dark ? "text-white/70" : "text-muted-foreground"}`}
                >
                  {n.benefit}
                </span>
              </summary>
              <p
                className={`px-1.5 pb-1 text-[11px] leading-snug ${dark ? "text-white/60" : "text-muted-foreground"}`}
              >
                Dica: {n.tip}
              </p>
            </details>
          </li>
        ))}
      </ul>
      <p className={`mt-1 text-[10px] ${dark ? "text-white/45" : "text-muted-foreground"}`}>
        Toque em um item para ver a dica. Lipossolúveis precisam de gordura para ser absorvidas;
        hidrossolúveis não ficam estocadas, então o consumo deve ser frequente.
      </p>
    </section>
  );
}
