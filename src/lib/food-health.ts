import { ingredientById, type Ingredient } from "./nutrition-catalog";

/**
 * Indicador educativo de frequência de consumo, inspirado no Guia Alimentar para a
 * População Brasileira: alimentos in natura e minimamente processados são a base;
 * fritos, embutidos, ultraprocessados e açúcar ficam para ocasiões. Não é prescrição.
 */
export type HealthLevel = "frequente" | "moderacao" | "ocasional";
export type HealthInfo = { level: HealthLevel; label: string; reason: string };
type FoodLike = Pick<Ingredient, "id" | "group" | "kcal" | "protein" | "carbs" | "fat" | "fiber"> & { flags?: Ingredient["flags"] | string[] };

export const healthLabels: Record<HealthLevel, string> = {
  frequente: "Pode ser frequente",
  moderacao: "Com moderação",
  ocasional: "De vez em quando",
};

/** Embutidos e carnes processadas (OMS/IARC), doces e bebidas açucaradas. */
const processedMeats = new Set(["calabresa", "salsicha", "linguica", "presunto", "x_tudo", "cachorro_quente", "misto_quente"]);
const sugars = new Set(["acucar", "acucar_gramixo", "refrigerante", "achocolatado"]);
/** Ajustes onde a regra numérica sozinha erraria. */
const overrides: Record<string, [HealthLevel, string]> = {
  azeite: ["moderacao", "Gordura boa, mas muito calórica: use em fio."],
  castanha_para: ["moderacao", "Rica em selênio e gordura boa; 2 a 3 unidades por dia bastam."],
  amendoim: ["moderacao", "Gordura boa e proteína, mas calórico: um punhado."],
  abacate: ["frequente", "Gordura boa, fibras e potássio."],
  ovo: ["frequente", "Proteína completa e barata; cozido é a melhor forma."],
  feijao: ["frequente", "Proteína vegetal e muita fibra: base do prato brasileiro."],
  feijao_preto: ["frequente", "Proteína vegetal e muita fibra: base do prato brasileiro."],
  lentilha: ["frequente", "Proteína vegetal e fibra."],
  arroz: ["frequente", "Com feijão, forma uma combinação completa."],
  pao_frances: ["moderacao", "Farinha refinada: o integral sacia mais."],
  tapioca: ["moderacao", "Quase só carboidrato; com ovo ou queijo sacia mais."],
  acai: ["frequente", "Polpa pura tem fibra e gordura boa; o problema é o xarope."],
  acai_acucar: ["ocasional", "O xarope de guaraná e os complementos somam muito açúcar."],
  tucuma: ["frequente", "Rico em vitamina A e gordura boa; porção pequena."],
  pequi: ["moderacao", "Rico em vitamina A, mas bem gorduroso."],
  coco: ["moderacao", "Gordura saturada; prefira porções pequenas."],
  tamarindo: ["moderacao", "Muito concentrado em açúcar natural."],
  farinha: ["moderacao", "Muito calórica em pouca quantidade."],
  farinha_agua: ["moderacao", "Muito calórica em pouca quantidade."],
  cafe: ["frequente", "Sem açúcar, até 3 a 4 xícaras por dia."],
  manteiga: ["moderacao", "Gordura saturada: pouca quantidade."],
  feijoada: ["moderacao", "Leva carnes gordas e embutidos; prefira a versão com mais feijão."],
  panelada: ["moderacao", "Gordura e sódio altos; porção pequena."],
  churrasco: ["moderacao", "Cortes gordos; prefira os magros e evite a parte queimada."],
  pizza: ["ocasional", "Massa refinada, queijo e embutidos: muito sódio e gordura."],
  sanduiche_natural: ["frequente", "Com pão integral, frango e salada, é um lanche completo."],
  queijo_coalho: ["moderacao", "Boa proteína, mas gordura e sódio altos."],
  palmito: ["moderacao", "Conserva rica em sódio."],
  pamonha: ["moderacao", "Milho nutritivo, mas a versão doce leva açúcar."],
  canjica: ["moderacao", "Leva açúcar e leite condensado ou coco: sobremesa."],
  mungunza: ["moderacao", "Adoçado e com leite de coco: porção pequena."],
  mingau_maisena: ["moderacao", "Amido refinado e açúcar: o de aveia sacia mais."],
  macarronada: ["moderacao", "Massa refinada: capriche no molho de tomate e na salada."],
  frango_assado: ["moderacao", "A pele concentra a gordura: retire antes de comer."],
  hamburguer_grelhado: ["moderacao", "Caseiro e grelhado é melhor; o industrializado tem mais sódio."],
  crepioca: ["frequente", "Ovo dá proteína e saciedade à tapioca."],
};

export function foodHealth(food: FoodLike): HealthInfo {
  const flags = new Set<string>((food.flags as string[] | undefined) ?? ingredientById.get(food.id)?.flags ?? []);
  const kcal = food.kcal ?? 0, fat = food.fat ?? 0, fiber = food.fiber ?? 0, protein = food.protein ?? 0, carbs = food.carbs ?? 0;
  const make = (level: HealthLevel, reason: string): HealthInfo => ({ level, label: healthLabels[level], reason });
  const o = overrides[food.id];
  if (o) return make(o[0], o[1]);
  if (sugars.has(food.id)) return make("ocasional", "Açúcar livre: prefira adoçar com frutas.");
  if (processedMeats.has(food.id)) return make("ocasional", "Embutido: muito sódio e conservantes.");
  if (flags.has("frito")) return make("ocasional", "Frito: absorve óleo e dobra as calorias.");
  if (flags.has("industrializado") && (fat >= 10 || (carbs >= 55 && fiber < 3))) return make("ocasional", "Ultraprocessado, com muita gordura ou carboidrato refinado.");
  if (food.group === "frutas" || food.group === "legumes") return make("frequente", fiber >= 3 ? "Fibras, vitaminas e minerais." : "Vitaminas, minerais e água.");
  if (food.group === "proteinas" && !flags.has("industrializado")) {
    if (fat <= 10) return make("frequente", "Proteína com pouca gordura.");
    return make("moderacao", "Proteína boa, mas com gordura alta.");
  }
  if (food.group === "cereais" && !flags.has("industrializado") && fat <= 5 && kcal <= 200) return make("frequente", fiber >= 2 ? "Energia com fibras." : "Energia de alimento pouco processado.");
  if (food.group === "bebidas" && !flags.has("industrializado") && kcal <= 30) return make("frequente", "Hidrata com poucas calorias.");
  if (protein >= 15 && fat <= 8) return make("frequente", "Boa fonte de proteína.");
  return make("moderacao", flags.has("industrializado") ? "Processado: confira o rótulo e a porção." : "Calórico ou gorduroso: atenção à porção.");
}

/** Trocas mais saudáveis do mesmo tipo de refeição (ids do catálogo). */
const swaps: Record<string, string[]> = {
  refrigerante: ["agua_coco", "suco_maracuja"], achocolatado: ["leite", "mingau_aveia_leite"],
  acucar: ["banana_prata", "mamão"], acucar_gramixo: ["banana_prata", "mamão"],
  calabresa: ["frango_grelhado", "ovo"], salsicha: ["frango_grelhado", "ovo"], linguica: ["frango_grelhado", "carne_moida"], presunto: ["frango", "queijo_minas"],
  batata_frita: ["batata_assada", "batata_doce_assada"], batata_doce_frita: ["batata_doce_assada"], mandioca_frita: ["macaxeira_assada", "macaxeira"],
  banana_frita: ["banana_cozida"], jaraqui: ["tambaqui", "pirarucu"], quibe_arroz: ["cuscuz", "baixaria"], ovo_frito: ["ovo"], omelete: ["ovo"],
  pizza: ["sanduiche_natural", "crepioca"], cachorro_quente: ["sanduiche_natural", "crepioca"], x_tudo: ["sanduiche_natural", "crepioca"],
  cheeseburger: ["sanduiche_natural", "crepioca"], hamburguer_sanduiche: ["sanduiche_natural"], misto_quente: ["sanduiche_natural", "crepioca"],
  acai_acucar: ["acai"], bolo_simples: ["banana_prata", "mingau_aveia_leite"], biscoito_salgado: ["tapioca", "pao_integral"], pao_frances: ["pao_integral", "cuscuz"],
  margarina: ["azeite"], canjica: ["milho_cozido"], mungunza: ["milho_cozido", "mingau_aveia_leite"], pamonha: ["milho_cozido"], macarronada: ["arroz", "feijao"], hamburguer_grelhado: ["contrafile_grelhado", "frango_grelhado"], cereal_milho: ["aveia", "mingau_aveia_leite"], mingau_maisena: ["mingau_aveia_leite"], frango_assado: ["frango_grelhado"],
  churrasco: ["contrafile_grelhado", "frango_grelhado"], bisteca_grelhada: ["contrafile_grelhado", "frango_grelhado"], tapioca: ["crepioca"], arroz: ["arroz_integral"],
  farofa: ["macaxeira"], feijoada: ["feijao", "feijao_preto"], panelada: ["carne_assada", "galinha_caipira"],
};
const groupFallback: Partial<Record<Ingredient["group"], string[]>> = {
  proteinas: ["frango_grelhado", "peixe"], cereais: ["batata_doce_assada", "cuscuz"], bebidas: ["agua_coco"], frutas: ["mamão", "banana_prata"],
};

/** Até duas sugestões mais saudáveis para um alimento de consumo ocasional ou moderado. */
export function healthierSwaps(food: FoodLike): Ingredient[] {
  const info = foodHealth(food);
  if (info.level === "frequente") return [];
  const ids = swaps[food.id] ?? (info.level === "ocasional" ? groupFallback[food.group as Ingredient["group"]] ?? [] : []);
  return ids.filter((id) => id !== food.id).map((id) => ingredientById.get(id)).filter((x): x is Ingredient => !!x).slice(0, 2);
}

export const healthDotClass: Record<HealthLevel, string> = {
  frequente: "bg-emerald-500",
  moderacao: "bg-amber-400",
  ocasional: "bg-rose-500",
};
