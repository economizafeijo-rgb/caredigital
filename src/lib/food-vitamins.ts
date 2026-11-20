import { foodMicros } from "./food-parser";

/**
 * Guia educativo de vitaminas e minerais por alimento.
 * Destaques derivados dos valores aproximados por 100 g (TACO/TBCA/USDA)
 * e de referências conhecidas de cada grupo de alimentos.
 * Não substitui orientação de nutricionista ou médico.
 */
export type NutrientKey =
  | "A"
  | "C"
  | "D"
  | "E"
  | "K"
  | "B1"
  | "B2"
  | "B3"
  | "B6"
  | "B9"
  | "B12"
  | "calcio"
  | "ferro"
  | "potassio"
  | "magnesio"
  | "zinco"
  | "selenio";

export type NutrientInfo = {
  key: NutrientKey;
  name: string;
  kind: "Vitamina lipossolúvel" | "Vitamina hidrossolúvel" | "Mineral";
  benefit: string;
  tip: string;
};

export const nutrientGuide: Record<NutrientKey, NutrientInfo> = {
  A: {
    key: "A",
    name: "Vitamina A",
    kind: "Vitamina lipossolúvel",
    benefit: "Visão (principalmente no escuro), pele e defesa do organismo.",
    tip: "É melhor absorvida com um pouco de gordura, como um fio de azeite.",
  },
  C: {
    key: "C",
    name: "Vitamina C",
    kind: "Vitamina hidrossolúvel",
    benefit: "Antioxidante; apoia a imunidade, a cicatrização e a formação de colágeno.",
    tip: "Ajuda a absorver o ferro dos vegetais. Perde-se com calor: prefira a fruta crua ou o suco na hora.",
  },
  D: {
    key: "D",
    name: "Vitamina D",
    kind: "Vitamina lipossolúvel",
    benefit: "Ajuda a absorver o cálcio; importante para ossos, músculos e imunidade.",
    tip: "A principal fonte é o sol na pele; poucos alimentos têm quantidades grandes.",
  },
  E: {
    key: "E",
    name: "Vitamina E",
    kind: "Vitamina lipossolúvel",
    benefit: "Antioxidante que protege as células e a pele.",
    tip: "Aparece em castanhas, sementes, abacate e frutas oleosas da Amazônia.",
  },
  K: {
    key: "K",
    name: "Vitamina K",
    kind: "Vitamina lipossolúvel",
    benefit: "Essencial para a coagulação do sangue e para os ossos.",
    tip: "Quem usa anticoagulante (como varfarina) deve manter o consumo de folhas verdes estável e conversar com o médico.",
  },
  B1: {
    key: "B1",
    name: "Vitamina B1 (tiamina)",
    kind: "Vitamina hidrossolúvel",
    benefit: "Transforma os carboidratos em energia; apoia nervos e músculos.",
    tip: "Álcool em excesso reduz a tiamina no corpo.",
  },
  B2: {
    key: "B2",
    name: "Vitamina B2 (riboflavina)",
    kind: "Vitamina hidrossolúvel",
    benefit: "Produção de energia e saúde da pele, dos olhos e das mucosas.",
    tip: "Leite e ovos são boas fontes no dia a dia.",
  },
  B3: {
    key: "B3",
    name: "Vitamina B3 (niacina)",
    kind: "Vitamina hidrossolúvel",
    benefit: "Metabolismo energético, pele e sistema nervoso.",
    tip: "Carnes, peixes e amendoim são as fontes mais comuns.",
  },
  B6: {
    key: "B6",
    name: "Vitamina B6 (piridoxina)",
    kind: "Vitamina hidrossolúvel",
    benefit: "Metabolismo das proteínas, formação do sangue e neurotransmissores.",
    tip: "Banana, frango e batata-doce ajudam a completar o dia.",
  },
  B9: {
    key: "B9",
    name: "Vitamina B9 (folato)",
    kind: "Vitamina hidrossolúvel",
    benefit: "Formação de células e do sangue; essencial antes e no início da gestação.",
    tip: "No Brasil, as farinhas de trigo e milho são enriquecidas com ácido fólico.",
  },
  B12: {
    key: "B12",
    name: "Vitamina B12",
    kind: "Vitamina hidrossolúvel",
    benefit: "Formação do sangue e funcionamento dos nervos.",
    tip: "Existe quase só em alimentos de origem animal: atenção para vegetarianos e idosos.",
  },
  calcio: {
    key: "calcio",
    name: "Cálcio",
    kind: "Mineral",
    benefit: "Ossos e dentes fortes, contração muscular e coração.",
    tip: "Café e excesso de sal aumentam a perda; a vitamina D melhora a absorção.",
  },
  ferro: {
    key: "ferro",
    name: "Ferro",
    kind: "Mineral",
    benefit: "Leva oxigênio pelo sangue e previne a anemia.",
    tip: "Coma junto uma fonte de vitamina C e evite café ou leite na mesma refeição.",
  },
  potassio: {
    key: "potassio",
    name: "Potássio",
    kind: "Mineral",
    benefit: "Controle da pressão arterial, dos músculos e do ritmo do coração.",
    tip: "Quem tem doença renal deve seguir a orientação médica sobre o potássio.",
  },
  magnesio: {
    key: "magnesio",
    name: "Magnésio",
    kind: "Mineral",
    benefit: "Relaxamento muscular, sono, energia e controle do açúcar no sangue.",
    tip: "Folhas verdes, feijões, aveia, banana e castanhas são boas fontes.",
  },
  zinco: {
    key: "zinco",
    name: "Zinco",
    kind: "Mineral",
    benefit: "Imunidade, cicatrização, pele e paladar.",
    tip: "Carnes, ovos, feijões e sementes fornecem zinco.",
  },
  selenio: {
    key: "selenio",
    name: "Selênio",
    kind: "Mineral",
    benefit: "Antioxidante; importante para a tireoide e a imunidade.",
    tip: "1 a 2 castanhas-do-pará por dia já bastam; em excesso faz mal.",
  },
};

const G = (ids: string, keys: NutrientKey[]) => ids.split(" ").map((id) => [id, keys] as const);
/** Destaques de vitaminas do complexo B, E, K, D e minerais que a tabela de micronutrientes não cobre. */
const extra = new Map<string, NutrientKey[]>([
  ...G(
    "carne carne_moida carne_assada contrafile_grelhado carne_sol churrasco hamburguer_grelhado pacoca_carne_sol panelada",
    ["B12", "B3", "zinco", "ferro"],
  ),
  ...G("frango frango_grelhado frango_assado galinha_caipira", ["B3", "B6", "selenio"]),
  ...G("peixe tilapia pirarucu matrinxa jaraqui caldo_piranha", ["B12", "B3", "selenio"]),
  ...G("sardinha tambaqui", ["B12", "D", "B3"]),
  ...G("ovo ovo_frito omelete crepioca pao_com_ovo baixaria", ["B12", "B2", "D", "selenio"]),
  ...G(
    "leite leite_integral leite_po_integral leite_po_desnatado iogurte queijo_minas queijo_coalho queijo_mussarela queijo_prato requeijao cafe_leite_gado cafe_leite_po cafe_com_leite mingau_aveia_leite mingau_maisena cereal_com_leite achocolatado abacatada",
    ["B2", "B12", "calcio"],
  ),
  ...G("feijao feijao_preto feijao_corda lentilha ervilha grao_bico baiao_dois feijoada", [
    "B9",
    "ferro",
    "magnesio",
    "zinco",
  ]),
  ...G("aveia mingau_aveia mingau_aveia_leite", ["B1", "magnesio", "ferro", "zinco"]),
  ...G("amendoim pasta_amendoim", ["B3", "E", "magnesio", "B9"]),
  ...G("castanha_para", ["selenio", "E", "magnesio"]),
  ...G("abacate abacatada", ["E", "K", "B6", "B9", "potassio"]),
  ...G(
    "couve couve_crua espinafre agriao mostarda_folha rucula taioba cheiro_verde coentro alface almeirao chicoria acelga brocolis brocolis_cru jambu cebolinha",
    ["K", "B9", "magnesio"],
  ),
  ...G(
    "banana_prata banana_nanica banana_maca banana_comprida banana_pacova banana_ouro banana_cozida banana_frita mingau_banana",
    ["B6", "potassio", "magnesio"],
  ),
  ...G("batata_doce batata_doce_assada", ["A", "B6"]),
  ...G("buriti tucuma pupunha pequi", ["E", "A"]),
  ...G("acai acai_acucar", ["E"]),
  ...G("cereal_milho", ["ferro", "B1", "B2", "B3"]),
  ...G(
    "pao_frances pao_integral pao_massa_fina macarrao macarronada biscoito_salgado misto_quente sanduiche_natural cuscuz milho_cozido",
    ["B1", "B9", "ferro"],
  ),
  ...G("cupuacu camu_camu araca_boi suco_acerola mangaba suco_caju suco_laranja suco_goiaba suco_maracuja suco_abacaxi vitamina_mamao", ["C"]),
  ...G("leite_desnatado cafe_leite_desnatado leite_po_dissolvido vitamina_banana vitamina_mamao", ["B2", "B12", "calcio"]),
  ...G("presunto linguica calabresa salsicha bisteca_grelhada", ["B1", "B12"]),
  ...G("tomate pimentao pimentao_vermelho pimentao_amarelo", ["C", "A"]),
  ...G("cenoura cenoura_crua abobora", ["A"]),
  ...G("macaxeira macaxeira_assada mandioca_frita quibe_macaxeira tapioca", ["C"]),
]);

const THRESH = { C: 13.5, A: 120, calcio: 150, ferro: 2.1, potassio: 350 } as const;

/** Vitaminas e minerais em destaque no alimento (por 100 g). */
export function nutrientsInFood(id: string): NutrientInfo[] {
  const keys = new Set<NutrientKey>();
  const m = foodMicros[id];
  if (m) {
    if (m[0] >= THRESH.C) keys.add("C");
    if (m[1] >= THRESH.A) keys.add("A");
    if (m[2] >= THRESH.calcio) keys.add("calcio");
    if (m[3] >= THRESH.ferro) keys.add("ferro");
    if (m[4] >= THRESH.potassio) keys.add("potassio");
  }
  for (const k of extra.get(id) ?? []) {
    // Destaques "baixos" da tabela não devem ser contrariados pelos valores medidos.
    if (m && ((k === "C" && m[0] < 5) || (k === "A" && m[1] < 40))) continue;
    keys.add(k);
  }
  const order = Object.keys(nutrientGuide) as NutrientKey[];
  return order.filter((k) => keys.has(k)).map((k) => nutrientGuide[k]);
}

/** União dos destaques de vários alimentos (ex.: uma refeição completa), sem repetições. */
export function nutrientsInFoods(ids: string[]): NutrientInfo[] {
  const keys = new Set(ids.flatMap(id => nutrientsInFood(id).map(n => n.key)));
  return (Object.keys(nutrientGuide) as NutrientKey[]).filter(k => keys.has(k)).map(k => nutrientGuide[k]);
}
