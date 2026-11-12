import { ingredientById, portionNutrition, type Ingredient } from "./nutrition-catalog";

/**
 * Integra os registros em texto livre ("2 ovos e 150 g de arroz") ao catálogo nutricional.
 * Valores são estimativas educativas (TACO/TBCA), não análise laboratorial.
 */
export type Micros = { vitC: number; vitA: number; calcium: number; iron: number; potassium: number };
export type Nutrients = { kcal: number; protein: number; carbs: number; fat: number; fiber: number } & Micros;
export type ParsedFood = { id: string; name: string; grams: number; nutrients: Nutrients; estimatedPortion: boolean };

/** Micronutrientes aproximados por 100 g (vit. C mg, vit. A mcg RAE, cálcio mg, ferro mg, potássio mg). */
const micros: Record<string, [number, number, number, number, number]> = {
  arroz: [0, 0, 4, .1, 15], arroz_integral: [0, 0, 5, .3, 75], feijao: [0, 0, 27, 1.3, 255], feijao_preto: [0, 0, 29, 1.5, 256],
  frango: [0, 6, 8, .4, 250], carne: [0, 0, 5, 2.4, 290], peixe: [0, 10, 20, .3, 300], tilapia: [0, 0, 10, .6, 350], sardinha: [0, 30, 438, 2, 400],
  ovo: [0, 140, 50, 1.2, 130], leite: [1, 50, 120, .1, 150], iogurte: [1, 20, 140, .1, 180],
  banana_prata: [21, 4, 8, .4, 358], banana_nanica: [6, 4, 3, .3, 376], banana_maca: [10, 4, 3, .2, 264], banana_comprida: [8, 50, 3, .5, 450], banana_pacova: [15, 40, 3, .4, 400],
  laranja: [57, 11, 35, .1, 163], acerola: [941, 38, 13, .2, 165], goiaba: [80, 31, 4, .2, 198], manga: [65, 54, 8, .1, 138], mamão: [82, 47, 22, .2, 126],
  maca: [2, 3, 2, .1, 75], melancia: [6, 28, 8, .2, 104], abacaxi: [35, 3, 22, .3, 131], uva: [2, 3, 9, .3, 162], abacate: [9, 7, 8, .2, 206], acai: [1, 20, 35, .4, 125],
  cenoura: [1, 850, 26, .1, 176], abobora: [3, 330, 12, .2, 140], brocolis: [42, 31, 51, .5, 120], couve: [77, 400, 177, .5, 315], espinafre: [6, 470, 112, .4, 220],
  tomate: [21, 42, 7, .2, 222], alface: [4, 110, 28, .4, 267], beterraba: [3, 2, 15, .2, 245], batata: [4, 0, 4, .2, 160], batata_doce: [12, 700, 17, .2, 148],
  macaxeira: [11, 1, 19, .1, 100], cuscuz: [0, 10, 2, .2, 30], aveia: [0, 0, 48, 4.4, 336], tapioca: [0, 0, 5, .1, 5], farinha: [0, 0, 65, 1.1, 340],
  lentilha: [1, 1, 16, 1.5, 220], suco_maracuja: [14, 30, 4, .2, 140], cafe: [0, 0, 3, 0, 50], amendoim: [0, 0, 39, 2.2, 650], castanha_para: [1, 0, 146, 2.3, 650],
};

/** Palavras-chave → alimento do catálogo. Ordem importa: termos mais específicos primeiro. */
const aliases: Array<[RegExp, string]> = [
  [/arroz integral/, "arroz_integral"], [/arroz/, "arroz"], [/feij[aã]o preto/, "feijao_preto"], [/feij[aã]o/, "feijao"],
  [/frango|galinha/, "frango"], [/til[aá]pia/, "tilapia"], [/sardinha/, "sardinha"], [/peixe/, "peixe"], [/carne|bife|patinho|alcatra/, "carne"],
  [/ovos?\b/, "ovo"], [/iogurte/, "iogurte"], [/leite/, "leite"], [/caf[eé]/, "cafe"], [/suco de maracuj[aá]|suco/, "suco_maracuja"],
  [/banana nanica/, "banana_nanica"], [/banana ma[cç][aã]/, "banana_maca"], [/banana comprida|banana da terra/, "banana_comprida"], [/banana/, "banana_prata"],
  [/laranja/, "laranja"], [/acerola/, "acerola"], [/goiaba/, "goiaba"], [/manga/, "manga"], [/mam[aã]o/, "mamão"], [/ma[cç][aã]\b/, "maca"],
  [/melancia/, "melancia"], [/abacaxi/, "abacaxi"], [/uva/, "uva"], [/abacate/, "abacate"], [/a[cç]a[ií]/, "acai"],
  [/cenoura/, "cenoura"], [/ab[oó]bora/, "abobora"], [/br[oó]colis/, "brocolis"], [/couve/, "couve"], [/espinafre/, "espinafre"],
  [/tomate/, "tomate"], [/alface|salada/, "alface"], [/beterraba/, "beterraba"], [/batata doce|batata-doce/, "batata_doce"], [/batata/, "batata"],
  [/macaxeira|mandioca|aipim/, "macaxeira"], [/cuscuz/, "cuscuz"], [/mingau/, "mingau_aveia"], [/aveia/, "aveia"], [/tapioca/, "tapioca"],
  [/farofa/, "farofa"], [/farinha/, "farinha"], [/lentilha/, "lentilha"], [/amendoim/, "amendoim"], [/castanha/, "castanha_para"], [/azeite/, "azeite"],
];

/** Porção padrão em gramas/ml quando o usuário não informa a quantidade. */
const defaultPortion: Record<string, number> = {
  arroz: 120, arroz_integral: 120, feijao: 100, feijao_preto: 100, frango: 120, carne: 120, peixe: 120, tilapia: 120, sardinha: 80,
  ovo: 50, iogurte: 170, leite: 200, cafe: 100, suco_maracuja: 250, banana_prata: 80, banana_nanica: 100, banana_maca: 70, banana_comprida: 150,
  laranja: 150, acerola: 100, goiaba: 150, manga: 150, mamão: 150, maca: 130, melancia: 200, abacaxi: 100, uva: 100, abacate: 100, acai: 200,
  alface: 40, tomate: 60, cuscuz: 150, tapioca: 80, macaxeira: 150, batata: 130, batata_doce: 130, aveia: 30, farofa: 30, azeite: 8, castanha_para: 10, amendoim: 30,
};
const unitGrams: Array<[RegExp, number]> = [
  [/colher(es)? de sopa/, 25], [/colher(es)?/, 15], [/concha(s)?/, 100], [/fatia(s)?/, 30], [/x[ií]cara(s)?/, 160], [/copo(s)?/, 200],
  [/prato(s)?/, 300], [/por[cç][aã]o|por[cç][oõ]es/, 0], [/unidade(s)?/, 0],
];
const numberWords: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3, quatro: 4, cinco: 5, meio: .5, meia: .5 };

const emptyNutrients = (): Nutrients => ({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, vitC: 0, vitA: 0, calcium: 0, iron: 0, potassium: 0 });
export function nutrientsFor(item: Ingredient, grams: number): Nutrients {
  const macros = portionNutrition(item, grams);
  const m = micros[item.id] ?? [0, 0, 0, 0, 0];
  const f = grams / 100;
  return { kcal: macros.kcal ?? 0, protein: macros.protein ?? 0, carbs: macros.carbs ?? 0, fat: macros.fat ?? 0, fiber: macros.fiber ?? 0,
    vitC: m[0] * f, vitA: m[1] * f, calcium: m[2] * f, iron: m[3] * f, potassium: m[4] * f };
}

/** Reconhece alimentos e quantidades em um texto livre. `liquidMl` é usado quando o registro é de um líquido. */
export function parseFoodText(text: string, liquidMl?: number | null): ParsedFood[] {
  const source = text.toLowerCase().normalize("NFC");
  const segments = source.split(/,|;|\+|\be\b|\bcom\b/).map(part => part.trim()).filter(Boolean);
  const found: ParsedFood[] = [];
  for (const segment of segments) {
    const alias = aliases.find(([pattern]) => pattern.test(segment));
    if (!alias) continue;
    const item = ingredientById.get(alias[1]);
    if (!item) continue;
    let grams: number | null = null;
    const explicit = segment.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gramas?|ml|l|litros?)\b/);
    if (explicit) {
      const value = Number(explicit[1].replace(",", "."));
      grams = /kg|^l$|litro/.test(explicit[2]) ? value * 1000 : value;
    } else {
      const countMatch = segment.match(/(\d+(?:[.,]\d+)?)|\b(um|uma|dois|duas|tr[eê]s|quatro|cinco|meio|meia)\b/);
      const count = countMatch ? (countMatch[1] ? Number(countMatch[1].replace(",", ".")) : numberWords[countMatch[2]] ?? 1) : 1;
      const unit = unitGrams.find(([pattern]) => pattern.test(segment));
      const base = unit && unit[1] > 0 ? unit[1] : defaultPortion[item.id] ?? 100;
      grams = count * base;
    }
    if (liquidMl && !explicit && segments.length === 1) grams = liquidMl;
    if (!grams || grams <= 0 || grams > 3000) continue;
    found.push({ id: item.id, name: item.name, grams: Math.round(grams), nutrients: nutrientsFor(item, grams), estimatedPortion: !explicit });
  }
  if (!found.length && liquidMl && /leite|suco|caf[eé]/.test(source)) {
    const alias = aliases.find(([pattern]) => pattern.test(source));
    const item = alias && ingredientById.get(alias[1]);
    if (item) found.push({ id: item.id, name: item.name, grams: liquidMl, nutrients: nutrientsFor(item, liquidMl), estimatedPortion: false });
  }
  return found;
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  return list.reduce((total, item) => {
    (Object.keys(total) as (keyof Nutrients)[]).forEach(key => { total[key] += item[key]; });
    return total;
  }, emptyNutrients());
}

/** Referências diárias adultas (IOM/ANVISA, aproximadas) para micronutrientes. */
export const microTargets: Record<keyof Micros, { label: string; unit: string; target: number }> = {
  vitC: { label: "Vitamina C", unit: "mg", target: 90 }, vitA: { label: "Vitamina A", unit: "mcg", target: 800 },
  calcium: { label: "Cálcio", unit: "mg", target: 1000 }, iron: { label: "Ferro", unit: "mg", target: 14 }, potassium: { label: "Potássio", unit: "mg", target: 3500 },
};

/** Metas por objetivo quando o perfil ainda não tem metas individuais. */
export function goalTargets(objective: string | null | undefined, weightKg: number | null) {
  const w = weightKg && weightKg >= 30 && weightKg <= 250 ? weightKg : 70;
  const kcalPerKg = objective === "emagrecimento" ? 25 : objective === "ganho_peso" ? 35 : objective === "hipertrofia" ? 33 : 30;
  const proteinPerKg = objective === "hipertrofia" ? 1.8 : objective === "emagrecimento" ? 1.6 : objective === "ganho_peso" ? 1.4 : 1.0;
  const kcal = Math.round(w * kcalPerKg / 50) * 50;
  const protein = Math.round(w * proteinPerKg);
  const fat = Math.round(kcal * .28 / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat, fiber: 25 };
}

export function goalAdvice(objective: string | null | undefined, total: Nutrients, target: ReturnType<typeof goalTargets>): string {
  const proteinGap = target.protein - total.protein;
  const kcalGap = target.kcal - total.kcal;
  if (objective === "emagrecimento") return kcalGap < 0 ? "Você passou da meta calórica de hoje. Prefira legumes, saladas e proteínas magras no restante do dia."
    : proteinGap > 20 ? `Faltam ~${Math.round(proteinGap)} g de proteína: priorize frango, peixe, ovos ou iogurte para manter a saciedade.` : "Ótimo equilíbrio para o emagrecimento. Mantenha a hidratação e as fibras.";
  if (objective === "hipertrofia") return proteinGap > 0 ? `Faltam ~${Math.round(proteinGap)} g de proteína para a hipertrofia. Distribua entre as próximas refeições.` : "Meta de proteína atingida! Garanta carboidratos em torno do treino.";
  if (objective === "ganho_peso") return kcalGap > 300 ? `Faltam ~${Math.round(kcalGap)} kcal. Inclua lanches calóricos e nutritivos: abacate, castanhas, aveia, banana.` : "Você está próximo da meta calórica para ganho de peso.";
  return Math.abs(kcalGap) < 250 ? "Consumo equilibrado para a manutenção do peso." : kcalGap > 0 ? `Ainda há ~${Math.round(kcalGap)} kcal disponíveis no dia.` : "Consumo acima do necessário para manter o peso.";
}
