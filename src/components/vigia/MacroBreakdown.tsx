import { useState } from "react";

export const MACRO_COLORS = { protein: "#f43f5e", carbs: "#f59e0b", fat: "#8b5cf6" } as const;
const META = [
  { k: "protein", name: "Proteínas", short: "P", kcalPerG: 4 },
  { k: "carbs", name: "Carboidratos", short: "C", kcalPerG: 4 },
  { k: "fat", name: "Gorduras", short: "G", kcalPerG: 9 },
] as const;

type Props = {
  protein: number;
  carbs: number;
  fat: number;
  /** "full": barra + 3 linhas detalhadas. "inline": só barra fina e chips (cabe em linhas de lista). */
  variant?: "full" | "inline";
  decimals?: number;
  className?: string;
};

const fmt = (v: number, d: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: d });

/**
 * Macronutrientes em formato legível e interativo: barra proporcional às calorias de cada macro
 * (4 kcal/g proteína e carboidrato, 9 kcal/g gordura). Passar o mouse ou focar destaca o macro
 * e mostra gramas, calorias e porcentagem.
 */
export function MacroBreakdown({
  protein,
  carbs,
  fat,
  variant = "full",
  decimals = 0,
  className = "",
}: Props) {
  const [hot, setHot] = useState<string | null>(null);
  const values = { protein, carbs, fat } as const;
  const kcal = META.map((m) => values[m.k] * m.kcalPerG);
  const total = kcal.reduce((a, b) => a + b, 0);
  const pct = (i: number) => (total > 0 ? (kcal[i] / total) * 100 : 0);

  const bar = (
    <div
      className={`flex w-full gap-px overflow-hidden bg-black/10 ${variant === "full" ? "h-2" : "h-1.5"}`}
      role="img"
      aria-label={`Proteínas ${Math.round(pct(0))}%, carboidratos ${Math.round(pct(1))}%, gorduras ${Math.round(pct(2))}% das calorias`}
    >
      {META.map((m, i) => (
        <span
          key={m.k}
          onPointerEnter={() => setHot(m.k)}
          onPointerLeave={() => setHot(null)}
          className="h-full transition-[opacity,flex-grow] duration-300"
          style={{
            flexGrow: Math.max(pct(i), total > 0 ? 2 : 1),
            flexBasis: 0,
            background: MACRO_COLORS[m.k],
            opacity: hot && hot !== m.k ? 0.35 : 1,
          }}
        />
      ))}
    </div>
  );

  if (variant === "inline") {
    return (
      <div className={`grid gap-1 ${className}`}>
        {bar}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-semibold tabular-nums">
          {META.map((m) => (
            <span key={m.k} className="inline-flex items-center gap-1" title={m.name}>
              <i className="size-1.5" style={{ background: MACRO_COLORS[m.k] }} />
              <span className="text-muted-foreground">{m.short}</span> {fmt(values[m.k], decimals)}{" "}
              g
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`grid gap-1.5 ${className}`}>
      {bar}
      <ul className="grid gap-0.5">
        {META.map((m, i) => (
          <li
            key={m.k}
            tabIndex={0}
            onPointerEnter={() => setHot(m.k)}
            onPointerLeave={() => setHot(null)}
            onFocus={() => setHot(m.k)}
            onBlur={() => setHot(null)}
            className="grid cursor-default grid-cols-[auto_1fr_auto_auto] items-center gap-x-2 px-1.5 py-1 text-xs outline-none transition-colors"
            style={{
              background: hot === m.k ? `${MACRO_COLORS[m.k]}1f` : "transparent",
              boxShadow: hot === m.k ? `inset 2px 0 0 ${MACRO_COLORS[m.k]}` : "none",
            }}
          >
            <i className="size-2" style={{ background: MACRO_COLORS[m.k] }} />
            <span className="font-semibold">{m.name}</span>
            <span className="tabular-nums text-muted-foreground">{fmt(kcal[i], 0)} kcal</span>
            <span className="w-24 text-right tabular-nums">
              <b>{fmt(values[m.k], decimals)} g</b>{" "}
              <span className="text-muted-foreground">· {Math.round(pct(i))}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
