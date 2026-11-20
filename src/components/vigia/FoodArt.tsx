import { GlyphShape } from "./CookingScene";
import type { Glyph } from "@/lib/cooking-times";

/** Ilustrações discretas dos alimentos. Sem foto disponível, usa um prato genérico. */
export type ArtGlyph =
  Glyph | "apple" | "leaf" | "bread" | "cheese" | "bowl" | "cake" | "chili" | "plate";
export type FoodVisual = { glyph: ArtGlyph; color: string; generic: boolean };

const norm = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const rules: [RegExp, ArtGlyph, string][] = [
  [/banana/, "banana", "#f4c430"],
  [
    /mamao|manga|laranja|mexerica|tangerina|caju|cajamanga|pessego|nespera|abacaxi|pequi|umbu/,
    "apple",
    "#f59e2b",
  ],
  [/maca\b|morango|melancia|tomate|acerola|goiaba|pitanga|roma|cereja|pitaia/, "apple", "#e5484d"],
  [/uva|acai|jabuticaba|ameixa|figo|jambo|camu/, "apple", "#7c4dab"],
  [
    /kiwi|limao|pera|abacate|graviola|ata|pinha|biriba|ingá|inga|sapoti|cupuacu|fruta/,
    "apple",
    "#7fb83a",
  ],
  [/ovo.*frito|frito.*ovo/, "fried", "#f5c542"],
  [/omelete|ovo mexido|ovos mexidos/, "omelet", "#f2b632"],
  [/ovo/, "egg", "#f5c542"],
  [/tapioca|crepioca|beiju|panqueca|torrada|biscoito|bolacha|cream cracker/, "disc", "#ecd6a2"],
  [/pao|sanduiche|sanduba|hamburguer|x-?tudo|misto|cachorro|hot ?dog|baixaria/, "bread", "#d9a15b"],
  [/queijo|mussarela|coalho|requeijao|ricota|iogurte/, "cheese", "#f3d36b"],
  [/presunto|peito de peru|mortadela|salsicha|linguica|bacon/, "meat", "#e59a9a"],
  [
    /peixe|pirarucu|tambaqui|tilapia|atun|atum|sardinha|salmao|pintado|surubim|filhote|camarao/,
    "fish",
    "#e6c8b0",
  ],
  [/frango|galinha|coxa|sobrecoxa|peru/, "meat", "#e4b48a"],
  [
    /carne|bife|contrafile|alcatra|patinho|picanha|costela|bisteca|porco|lombo|paçoca|pacoca|sol|moida|figado/,
    "meat",
    "#a85a3c",
  ],
  [/macaxeira|mandioca|aipim|inhame|cara\b|batata|mandioquinha/, "tuber", "#e2a95a"],
  [/cenoura|beterraba/, "tuber", "#f08a24"],
  [/brocolis|couve.?flor/, "floret", "#3f9a4a"],
  [
    /vagem|quiabo|jilo|maxixe|pepino|abobrinha|chuchu|abobora|jerimum|berinjela|pimentao|legume|palmito|nabo|rabanete/,
    "chunks",
    "#6bb04a",
  ],
  [
    /alface|salada|couve|chicoria|escarola|rucula|agriao|almeirao|espinafre|acelga|repolho|taioba|mostarda|cheiro|coentro|cebolinha|folha|verdura/,
    "leaf",
    "#4caf50",
  ],
  [/cebola/, "chunks", "#d9b4e0"],
  [/pimenta/, "chili", "#d6342c"],
  [/milho|pamonha|canjica|mungunza|curau/, "corn", "#f4c430"],
  [/macarr|espaguete|lasanha|massa\b|miojo|nhoque/, "pasta", "#f1d98a"],
  [/sopa|caldo|mingau|papa|creme|vitamina|acai na tigela|cereal|aveia|granola/, "bowl", "#e9a35b"],
  [
    /arroz|feijao|farofa|cuscuz|lentilha|grao|ervilha|farinha|baiao|paçoca|castanha|amendoim|pasta de/,
    "grain",
    "#d9b26f",
  ],
  [
    /bolo|pudim|doce|gelatina|sorvete|brigadeiro|chocolate|sobremesa|torta|mousse|pave|cocada|paçoca/,
    "cake",
    "#e87aa6",
  ],
];

/** Acha o alimento citado primeiro: "Tapioca com queijo" é uma tapioca, não um queijo. */
function earliest(haystack: string): FoodVisual | null {
  let best: { at: number; visual: FoodVisual } | null = null;
  for (const [re, glyph, color] of rules) {
    const at = haystack.search(re);
    if (at >= 0 && (!best || at < best.at)) best = { at, visual: { glyph, color, generic: false } };
  }
  return best?.visual ?? null;
}

export function foodVisual(text: string, label = ""): FoodVisual {
  return (
    (label && earliest(norm(label))) ||
    earliest(norm(text)) || { glyph: "plate", color: "#7f93a0", generic: true }
  );
}

function Extra({ glyph, color }: { glyph: ArtGlyph; color: string }) {
  const dark = `color-mix(in srgb, ${color} 62%, #000)`;
  const light = `color-mix(in srgb, ${color} 55%, #fff)`;
  switch (glyph) {
    case "apple":
      return (
        <g>
          <path
            d="M0-14c-6-6-22-4-22 12 0 16 10 26 22 26s22-10 22-26c0-16-16-18-22-12z"
            fill={color}
            stroke={dark}
            strokeWidth="1.2"
          />
          <path
            d="M0-14c0-6 2-10 7-12"
            fill="none"
            stroke="#5a8f3a"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <ellipse
            cx="-9"
            cy="-3"
            rx="4"
            ry="7"
            fill={light}
            opacity=".55"
            transform="rotate(20 -9 -3)"
          />
        </g>
      );
    case "leaf":
      return (
        <g>
          <path
            d="M-24 14C-24-8-6-24 22-22 24 6 8 24-24 14z"
            fill={color}
            stroke={dark}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M-22 14C-6 4 6-6 18-18"
            fill="none"
            stroke={light}
            strokeWidth="2"
            strokeLinecap="round"
            opacity=".8"
          />
        </g>
      );
    case "bread":
      return (
        <g>
          <path
            d="M-24 4c-4-14 8-22 24-22s28 8 24 22c0 6-4 8-8 8v10h-32V12c-4 0-8-2-8-8z"
            fill={color}
            stroke={dark}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M-10-8c6-3 14-3 20 0"
            fill="none"
            stroke={light}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity=".7"
          />
        </g>
      );
    case "cheese":
      return (
        <g>
          <path
            d="M-26 12V-4l52-14v30z"
            fill={color}
            stroke={dark}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <circle cx="-6" cy="2" r="3.5" fill={dark} opacity=".35" />
          <circle cx="10" cy="-4" r="2.6" fill={dark} opacity=".35" />
          <circle cx="14" cy="6" r="2.2" fill={dark} opacity=".35" />
        </g>
      );
    case "bowl":
      return (
        <g>
          <path
            d="M-26-2h52c0 18-10 28-26 28S-26 16-26-2z"
            fill="#f3efe6"
            stroke="#d6cfbf"
            strokeWidth="1.2"
          />
          <ellipse cx="0" cy="-2" rx="26" ry="6" fill={color} stroke={dark} strokeWidth="1" />
          <path
            d="M-8-12c-4-5 4-7 0-12M6-12c-4-5 4-7 0-12"
            fill="none"
            stroke="#fff"
            strokeOpacity=".5"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      );
    case "cake":
      return (
        <g>
          <path
            d="M-22 6h44v14h-44z"
            fill={color}
            stroke={dark}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M-22 6c0-12 8-16 22-16s22 4 22 16z"
            fill={light}
            stroke={dark}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <circle cx="0" cy="-14" r="4" fill="#d6342c" />
        </g>
      );
    case "chili":
      return (
        <g>
          <path
            d="M-22-2c8-10 26-8 34 4 6 8 12 16 12 20-14 2-30-2-40-14-4-4-8-8-6-10z"
            fill={color}
            stroke={dark}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M-22-2c-2-8 0-12 4-14"
            fill="none"
            stroke="#4d8a37"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      );
    default:
      return (
        <g>
          <circle r="25" fill="#e8eef1" stroke="#c4ced3" strokeWidth="1.5" />
          <circle r="16" fill="#f7fafb" stroke="#d3dce0" strokeWidth="1" />
          <path
            d="M-33-14v28M-36-14v10a3 3 0 0 0 6 0v-10M33-14c-5 4-5 14 0 18v10"
            fill="none"
            stroke="#9fb0b8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      );
  }
}

const own = new Set<ArtGlyph>([
  "apple",
  "leaf",
  "bread",
  "cheese",
  "bowl",
  "cake",
  "chili",
  "plate",
]);

/** Miniatura do alimento: ilustração discreta sobre fundo suave da cor do alimento. */
export function FoodThumb({
  text,
  label,
  className = "size-14",
  visual,
}: {
  text: string;
  label?: string;
  className?: string;
  visual?: FoodVisual;
}) {
  const v = visual ?? foodVisual(text, label);
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-xl ${className}`}
      style={{
        background: `radial-gradient(circle at 30% 25%, color-mix(in srgb, ${v.color} 30%, var(--card)), color-mix(in srgb, ${v.color} 9%, var(--card)))`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${v.color} 32%, transparent)`,
        opacity: v.generic ? 0.85 : 1,
      }}
    >
      <svg
        viewBox="-34 -34 68 68"
        className="size-[82%]"
        aria-hidden="true"
        style={{ filter: "drop-shadow(0 2px 2px rgb(0 0 0 / .25))" }}
      >
        {own.has(v.glyph) ? (
          <Extra glyph={v.glyph} color={v.color} />
        ) : (
          <GlyphShape glyph={v.glyph as Glyph} color={v.color} />
        )}
      </svg>
    </span>
  );
}
