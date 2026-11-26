/**
 * Detecção automática de cafeína e lactose em qualquer registro (bebida, refeição, porção da biblioteca).
 * Valores médios educativos por 100 ml/g, a partir de Mayo Clinic, EFSA, FDA, Alberta Health,
 * NIDDK e tabelas de composição de alimentos. Não substituem rótulo nem orientação profissional.
 */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

type Rule = [RegExp, number, string];

/** mg de cafeína por 100 ml (ou 100 g). A primeira regra que combina vence; 0 = sem cafeína. */
const CAFFEINE_RULES: Rule[] = [
  [/camomila|erva.?doce|hortela|boldo|capim|gengibre|hibisco|cidreira/, 0, "Chá de ervas"],
  [/descafeinad/, 0.5, "Café descafeinado"],
  [/pre.?treino|pre-workout/, 66, "Pré-treino"],
  [/energetic|red ?bull|monster|\btnt\b/, 32, "Energético"],
  [/expresso|espresso/, 150, "Café expresso"],
  [/nescafe.*leite/, 15, "Nescafé com leite"],
  [/nescafe|cafe soluvel|cafe instantaneo/, 27, "Café solúvel"],
  [/cappuccino|capuccino|latte|macchiato|mochaccino/, 20, "Capuccino / latte"],
  [/cafe.*leite|leite.*cafe/, 20, "Café com leite"],
  [/\bcafe\b|coffee|cafezinho|\bcoado\b/, 40, "Café"],
  [/matcha/, 30, "Chá matcha"],
  [/cha verde/, 12, "Chá verde"],
  [/chimarrao|tereres?|\bmate\b|cha preto|cha mate|cha de mate/, 20, "Chá preto / mate"],
  [/guarana (em po|natural)/, 200, "Guaraná em pó"],
  [
    /sprite|fanta|guarana (antarctica|jesus)|limao|laranja.*refrigerante|refrigerante.*(laranja|uva|limao)/,
    0,
    "",
  ],
  [/coca|pepsi|\bcola\b|refrigerante/, 10, "Refrigerante tipo cola"],
  [/chocolate (amargo|meio.?amargo)|cacau 70|chocolate 70/, 45, "Chocolate amargo"],
  [/barra de chocolate|chocolate ao leite|bombom|chocolate em barra/, 20, "Chocolate"],
  [/achocolatad|nescau|toddy|ovomaltine|chocolate quente/, 2, "Achocolatado"],
  [/brigadeiro/, 5, "Brigadeiro"],
];

export type CaffeineHit = { mg: number; label: string };

/** Cafeína estimada de um item pelo nome e quantidade (ml ou g). Retorna null se não houver cafeína. */
export function detectCaffeine(
  text: string,
  amount: number,
  kind?: string | null,
): CaffeineHit | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const t = norm(text);
  for (const [re, per100, label] of CAFFEINE_RULES) {
    if (re.test(t)) {
      if (per100 <= 0.5 && label !== "Café descafeinado") return null;
      return { mg: Math.round((per100 * amount) / 100), label };
    }
  }
  // Tipo "café" sem nome reconhecível ainda é café.
  if (kind === "cafe") return { mg: Math.round((40 * amount) / 100), label: "Café" };
  return null;
}

/** g de lactose por 100 ml/g. A primeira regra que combina vence. */
const LACTOSE_RULES: Rule[] = [
  [
    /sem lactose|zero lactose|deslactos|delactos|lactose free|bebida (vegetal|de (soja|aveia|amendoa|coco|arroz))|leite (de )?(soja|amendoa|coco|aveia|arroz)/,
    0,
    "Sem lactose",
  ],
  [
    /parmesao|cheddar|gouda|provolone|suico|gruyere|emmental|grana|queijo (curado|maturado)/,
    0.1,
    "Queijo curado",
  ],
  [/pao de queijo/, 1.5, "Pão de queijo"],
  [/pizza/, 1, "Pizza"],
  [/misto.?quente/, 1.2, "Misto-quente"],
  [/nescafe.*leite/, 3.5, "Nescafé com leite"],
  [/cappuccino|capuccino|latte|macchiato/, 2.3, "Capuccino / latte"],
  [/cafe.*leite|leite.*cafe/, 2.4, "Café com leite"],
  [/nescau|achocolatad|toddy|ovomaltine|chocolate quente/, 4.2, "Leite com achocolatado"],
  [/vitamina|abacatada/, 3, "Vitamina com leite"],
  [/mingau/, 3.5, "Mingau com leite"],
  [/cereal.*leite|leite.*cereal/, 2.5, "Cereal com leite"],
  [/canjica|curau|mungunza/, 3, "Doce de milho com leite"],
  [/bolo de leite/, 3, "Bolo de leite"],
  [/leite condensado/, 12, "Leite condensado"],
  [/doce de leite/, 10, "Doce de leite"],
  [/brigadeiro/, 7, "Brigadeiro"],
  [/sorvete|gelato/, 5, "Sorvete"],
  [/chocolate ao leite|bombom/, 8, "Chocolate ao leite"],
  [/creme de leite|nata\b/, 3.5, "Creme de leite"],
  [/manteiga/, 0.6, "Manteiga"],
  [/kefir/, 3.6, "Kefir"],
  [/iogurte grego/, 3.5, "Iogurte grego"],
  [/iogurte|yogurt|coalhada|danone/, 4, "Iogurte"],
  [/ricota|ricotta/, 3.5, "Ricota"],
  [/cottage/, 3.2, "Queijo cottage"],
  [/requeij|cream cheese|queijo cremoso/, 3, "Requeijão / cremoso"],
  [/minas|frescal/, 3, "Queijo minas frescal"],
  [/coalho/, 1.5, "Queijo coalho"],
  [/mussarela|mucarela|mozzarela|mozarela/, 1.5, "Mussarela"],
  [/queijo prato|prato/, 0.5, "Queijo prato"],
  [/queijo|colonial/, 2, "Queijo"],
  [/leite (em )?po|leite ninho|ninho/, 4.5, "Leite em pó preparado"],
  [/leite/, 4.8, "Leite"],
];

export type LactoseHit = { g: number; label: string; free: boolean };

/** Lactose estimada (g) de um item pelo nome e quantidade (ml ou g). Null se não for laticínio. */
export function detectLactose(text: string, amount: number): LactoseHit | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const t = norm(text);
  for (const [re, per100, label] of LACTOSE_RULES) {
    if (re.test(t)) {
      // Leite em pó cru (não dissolvido) concentra a lactose em ~35 g por 100 g.
      const powder =
        /leite (ninho |integral |desnatado )*(em )?po( integral| desnatado)?$/.test(t) &&
        !/dissolvid|preparad/.test(t);
      const rate = powder ? 35 : per100;
      return {
        g: Math.round(((rate * amount) / 100) * 10) / 10,
        label: powder ? "Leite em pó" : label,
        free: per100 === 0,
      };
    }
  }
  return null;
}

/** Limiares educativos de lactose (g): NIDDK, revisão sistemática (Annals of Internal Medicine, 2010). */
export const LACTOSE_THRESHOLDS = {
  /** Até ~12 g (≈ 1 copo de leite) em uma dose costuma ser tolerado pela maioria. */
  perMealOk: 12,
  /** Acima disso, sintomas ficam mais frequentes. */
  perMealHigh: 24,
  /** Total diário geralmente tolerado quando fracionado. */
  dayOk: 18,
  dayHigh: 30,
  /** Dieta de baixa lactose. */
  lowDiet: 10,
} as const;
