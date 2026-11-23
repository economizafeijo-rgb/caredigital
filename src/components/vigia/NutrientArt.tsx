export type NutrientKind = "protein" | "carbs" | "fat" | "sodium" | "sugar";

/** Cor de identidade de cada nutriente (a cor do nível de risco fica na barra e no selo). */
export const NUTRIENT_COLOR: Record<NutrientKind, string> = {
  protein: "#f43f5e",
  carbs: "#f59e0b",
  fat: "#8b5cf6",
  sodium: "#06b6d4",
  sugar: "#ec4899",
};

/** Texto claro da mesma família, legível sobre fundo escuro. */
export const NUTRIENT_INK: Record<NutrientKind, string> = {
  protein: "#fda4af",
  carbs: "#fcd34d",
  fat: "#c4b5fd",
  sodium: "#67e8f9",
  sugar: "#f9a8d4",
};

/** Ilustração própria de cada nutriente, desenhada para caber no canto do cartão. */
export function NutrientArt({ kind, className = "" }: { kind: NutrientKind; className?: string }) {
  const c = NUTRIENT_COLOR[kind];
  const ink = NUTRIENT_INK[kind];
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ filter: `drop-shadow(0 4px 8px ${c}66)` }}
    >
      {kind === "protein" && (
        <g>
          <path d="M34 34 52 52" stroke="#f8fafc" strokeWidth="8" strokeLinecap="round" />
          <circle cx="52" cy="58" r="5" fill="#f8fafc" />
          <circle cx="58" cy="52" r="5" fill="#f8fafc" />
          <path
            d="M8 24C8 12 17 5 29 6c13 1 22 11 20 23-1 8-7 13-14 14-7 1-12-1-17-5C13 34 8 30 8 24z"
            fill={c}
          />
          <path
            d="M16 22c1-5 5-9 11-9"
            stroke="#fff"
            strokeOpacity=".55"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M32 30c3 0 6 2 7 5"
            stroke="#000"
            strokeOpacity=".18"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      )}
      {kind === "carbs" && (
        <g>
          <path d="M32 60V20" stroke={ink} strokeWidth="3" strokeLinecap="round" />
          {[
            [24, 44, -35],
            [40, 44, 35],
            [23, 33, -35],
            [41, 33, 35],
            [25, 22, -35],
            [39, 22, 35],
          ].map(([x, y, r]) => (
            <ellipse
              key={`${x}${y}`}
              cx={x}
              cy={y}
              rx="4.5"
              ry="8"
              transform={`rotate(${r} ${x} ${y})`}
              fill={c}
            />
          ))}
          <ellipse cx="32" cy="12" rx="4.5" ry="8.5" fill={c} />
          <path
            d="M31 8c-1 3-1 6 0 9"
            stroke="#fff"
            strokeOpacity=".5"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      )}
      {kind === "fat" && (
        <g>
          <path d="M32 6C22 20 14 29 14 40a18 18 0 0 0 36 0C50 29 42 20 32 6z" fill={c} />
          <path
            d="M23 38c0 6 3 10 8 11"
            stroke="#fff"
            strokeOpacity=".6"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M50 14c-3 5-5 8-5 11a5 5 0 0 0 10 0c0-3-2-6-5-11z" fill={ink} />
        </g>
      )}
      {kind === "sodium" && (
        <g>
          <rect x="17" y="24" width="30" height="34" rx="8" fill="#f1f5f9" />
          <rect x="17" y="40" width="30" height="10" fill={c} fillOpacity=".9" />
          <path d="M19 24c0-10 6-17 13-17s13 7 13 17z" fill={c} />
          {[
            [26, 17],
            [32, 13],
            [38, 17],
            [32, 20],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="1.8" fill="#0f172a" fillOpacity=".55" />
          ))}
          <circle cx="55" cy="22" r="2" fill={ink} />
          <circle cx="51" cy="12" r="1.6" fill={ink} />
          <circle cx="58" cy="32" r="1.6" fill={ink} />
        </g>
      )}
      {kind === "sugar" && (
        <g>
          <path d="M8 34 24 26 40 34 24 42z" fill="#fff" />
          <path d="M8 34v14l16 8V42z" fill={ink} />
          <path d="M40 34v14l-16 8V42z" fill={c} />
          <path d="M32 18 46 11 60 18 46 25z" fill="#fff" />
          <path d="M32 18v12l14 7V25z" fill={ink} />
          <path d="M60 18v12l-14 7V25z" fill={c} />
          <path
            d="M54 44l1.8 4.2L60 50l-4.2 1.8L54 56l-1.8-4.2L48 50l4.2-1.8z"
            fill="#fff"
            fillOpacity=".9"
          />
        </g>
      )}
    </svg>
  );
}
