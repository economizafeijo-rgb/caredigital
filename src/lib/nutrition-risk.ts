/**
 * Limites de saúde do dia: sódio, açúcar livre e gordura.
 * Sódio: OMS recomenda menos de 2.000 mg/dia (≈ 5 g de sal). Açúcares livres: OMS recomenda
 * menos de 10% das calorias do dia (idealmente 5%). Gordura: meta do perfil (por objetivo).
 * Os valores por alimento são estimativas por 100 g baseadas em TACO/TBCA e rótulos médios, com o
 * sal de cozinha usual (≈ 0,5%) nos preparos caseiros. Sal de mesa, molhos e temperos extras não
 * entram, a menos que o usuário os registre.
 */
export type RiskKey = "sodium" | "sugar" | "fat";
export type RiskLevel = "ok" | "near" | "over" | "severe";

/** Sódio (mg) por 100 g do alimento como é consumido. */
export const sodiumPer100: Record<string, number> = {
  pao_frances: 648,
  pao_integral: 506,
  pao_massa_fina: 500,
  pao_com_ovo: 450,
  pao_queijo: 600,
  manteiga: 579,
  margarina: 650,
  queijo_coalho: 800,
  queijo_minas: 346,
  queijo_mussarela: 581,
  queijo_prato: 580,
  queijo_regional: 500,
  requeijao: 540,
  presunto: 1100,
  linguica: 1100,
  calabresa: 1500,
  salsicha: 1100,
  carne_sol: 1000,
  pacoca_carne_sol: 700,
  feijoada: 450,
  feijoada_jaba: 600,
  feijoada_lata: 500,
  panelada: 400,
  pizza: 600,
  hamburguer_sanduiche: 600,
  cheeseburger: 700,
  x_tudo: 650,
  cachorro_quente: 800,
  misto_quente: 800,
  biscoito_salgado: 850,
  macarrao_instantaneo: 500,
  ketchup: 900,
  maionese: 650,
  cebola_palha: 500,
  sardinha_lata: 400,
  pastel: 600,
  farofa: 900,
  baixaria: 400,
  caldo_piranha: 350,
  tacaca: 300,
  sopa_carne_legumes: 250,
  sopa_legumes: 250,
  peixe_frito: 300,
  frango_molho: 350,
  frango_assado: 300,
  churrasco: 350,
  carne_assada: 300,
  macarronada: 350,
  baiao_dois: 350,
  palmito: 560,
  cereal_milho: 600,
  cereal_com_leite: 250,
  quibe_macaxeira: 350,
  quibe_arroz: 300,
  sanduiche_natural: 350,
  arroz: 200,
  arroz_integral: 200,
  feijao: 250,
  feijao_preto: 250,
  feijao_corda: 250,
  lentilha: 200,
  grao_bico: 200,
  macarrao: 200,
  carne: 280,
  frango: 280,
  frango_cozido: 280,
  frango_coxa: 280,
  frango_grelhado: 300,
  contrafile_grelhado: 300,
  bisteca_grelhada: 330,
  hamburguer_grelhado: 330,
  ovo: 140,
  ovo_frito: 200,
  omelete: 250,
  peixe: 250,
  tilapia: 250,
  pirarucu: 250,
  tambaqui: 250,
  matrinxa: 250,
  jaraqui: 400,
  galinha_caipira: 300,
  carne_moida: 330,
  cuscuz: 150,
  couve: 250,
  jambu: 150,
  sardinha: 300,
  mandioca_frita: 150,
  batata_frita: 250,
  banana_frita: 5,
  banana_verde_frita: 5,
  tapioca: 5,
  beiju: 50,
  leite: 50,
  leite_integral: 50,
  achocolatado: 60,
  nescau_leite_pronto: 51,
  nescafe_leite_lata: 29,
  ninho_integral_preparado: 49,
  quinari_zero: 17,
  cafe_leite_po: 45,
  biscoito_doce: 290,
  biscoito_recheado: 190,
  pamonha: 150,
  mungunza: 80,
};
const SODIUM_DEFAULT = 15;

/**
 * Açúcar livre/adicionado (g) por 100 g. Açúcar natural de fruta inteira e de leite não conta;
 * já os sucos (mesmo naturais), o mel e os xaropes contam como açúcar livre (OMS), por isso
 * `juiceFreeSugar` soma os carboidratos dos sucos.
 */
export const sugarPer100: Record<string, number> = {
  acucar: 100,
  acucar_gramixo: 95,
  refrigerante: 10.6,
  suco_caixinha: 10,
  achocolatado: 8,
  nescau_leite_pronto: 7,
  nescafe_leite_lata: 7.1,
  refrigerante_laranja: 11,
  suco_uva: 14,
  caldo_cana: 18,
  biscoito_doce: 18,
  biscoito_recheado: 35,
  barra_chocolate: 45,
  chocolate_leite: 52,
  chocolate_meio_amargo: 30,
  leite_condensado: 55,
  doce_leite: 55,
  goiabada: 70,
  pe_moleque: 45,
  brigadeiro: 50,
  doce_coco: 60,
  sorvete: 20,
  bolo_simples: 25,
  bolo_milho: 22,
  bolo_cenoura: 28,
  bolo_leite: 26,
  granola: 20,
  neston: 20,
  mucilon: 8,
  cereal_milho: 8,
  cereal_com_leite: 5,
  acai_acucar: 14,
  abacatada: 10,
  vitamina_banana: 5,
  vitamina_mamao: 5,
  mingau_maisena: 6,
  mingau_aveia_leite: 3,
  mingau_banana: 3,
  canjica: 9,
  pamonha: 7,
  mungunza: 10,
  ketchup: 22,
  pizza: 3,
  pao_massa_fina: 6,
  pao_frances: 1,
  pasta_amendoim: 3,
};

/**
 * Açúcares naturais (g por 100 g) de alimentos comuns, somados ao total consumido. Valores do USDA
 * FoodData Central: arroz branco cozido 0,08; feijão pinto 0,54; leite em pó integral 38,42 (lactose).
 * Café com leite em pó: estimativa de 12 g de leite em pó por 100 g de bebida (2 colheres de sopa em
 * 200 ml, como no catálogo) × 38,42 = 4,6 g, coerente com os 4,5 g/100 ml do rótulo do Nescafé com leite.
 */
export const naturalSugarPer100: Record<string, number> = {
  arroz: 0.08,
  feijao: 0.54,
  leite_po_integral: 38.42,
  cafe_leite_po: 4.6,
};

/** Parcela dos carboidratos de um suco natural que a OMS conta como açúcar livre. */
const JUICE_FREE_SHARE = 0.9;
const isNaturalJuice = (id: string) => /^suco_/.test(id) && !(id in sugarPer100);

/** Perigos por alimento, em linguagem simples (aparecem junto do alerta). */
export const foodHazard: Record<string, string> = {
  presunto:
    "Carne processada: sódio alto e nitrito. A OMS associa ao câncer colorretal; consuma pouco.",
  linguica: "Carne processada: sódio e gordura altos; a OMS associa ao câncer colorretal.",
  calabresa: "Carne processada e defumada: sódio muito alto; a OMS associa ao câncer colorretal.",
  salsicha: "Carne processada: sódio e conservantes; a OMS associa ao câncer colorretal.",
  carne_sol: "Carne curada: sódio muito alto; modere, sobretudo com pressão alta.",
  macarrao_instantaneo: "Um pacote pode ter quase o limite diário de sódio; evite com frequência.",
  refrigerante: "Bebida açucarada: uma lata já traz cerca de metade do limite ideal de açúcar.",
  suco_caixinha:
    "Suco de caixinha tem açúcar adicionado; prefira a fruta ou o suco natural sem açúcar.",
  leite_condensado: "Quase 55% de açúcar: poucas colheres já passam do ideal do dia.",
  doce_leite: "Açúcar concentrado: uma colher de sopa é uma boa porção.",
  brigadeiro: "Muito açúcar do leite condensado: 1 a 2 unidades já bastam.",
  doce_coco: "Açúcar e gordura saturada do coco: prefira um pedaço pequeno.",
  pastel: "Frito e com massa refinada: gordura e sódio altos.",
  batata_frita: "Fritura em óleo: gordura e sódio; prefira assada.",
  peixe_frito: "Fritura: mais gordura; prefira assado ou cozido.",
  ketchup: "Sódio e açúcar escondidos: use pouco.",
  feijoada_lata: "Enlatados concentram sódio; prefira feijão cozido em casa.",
  cebola_palha: "Cebola frita industrializada: sódio e gordura; use pouco.",
};

export type RiskInfo = {
  key: RiskKey;
  label: string;
  unit: string;
  value: number;
  limit: number;
  pct: number;
  level: RiskLevel;
  left: number;
  /** Alimentos que mais contribuíram (valor na unidade do risco). */
  culprits: { id: string; name: string; amount: number }[];
};

export const levelOf = (pct: number): RiskLevel =>
  pct >= 1.3 ? "severe" : pct >= 1 ? "over" : pct >= 0.8 ? "near" : "ok";
export const levelRank: Record<RiskLevel, number> = { ok: 0, near: 1, over: 2, severe: 3 };

type FoodLike = {
  id: string;
  name: string;
  grams: number;
  nutrients: { fat: number; carbs?: number };
};
type EntryLike = {
  foods: FoodLike[];
  direct?: { fat: number } | null;
  /** Porção da biblioteca alimentar: só traz o id e a quantidade, sem a lista de alimentos. */
  foodId?: string;
  grams?: number;
  foodName?: string;
};

export function evaluateRisks(
  entries: EntryLike[],
  target: { kcal: number; fat: number },
): RiskInfo[] {
  const agg = {
    sodium: new Map<string, { name: string; amount: number }>(),
    sugar: new Map<string, { name: string; amount: number }>(),
    fat: new Map<string, { name: string; amount: number }>(),
  };
  const add = (k: RiskKey, id: string, name: string, v: number) => {
    if (v <= 0) return;
    const cur = agg[k].get(id) ?? { name, amount: 0 };
    cur.amount += v;
    agg[k].set(id, cur);
  };
  let fatDirect = 0;
  for (const e of entries) {
    if (e.direct) fatDirect += e.direct.fat;
    // Porções da biblioteca entram com sódio e açúcar pelo id e pela quantidade registrada.
    if (e.foodId && e.grams && e.grams > 0) {
      const short = (e.foodName ?? e.foodId).split(",")[0].split("(")[0].trim();
      add("sodium", e.foodId, short, ((sodiumPer100[e.foodId] ?? SODIUM_DEFAULT) * e.grams) / 100);
      add(
        "sugar",
        e.foodId,
        short,
        ((sugarPer100[e.foodId] ?? naturalSugarPer100[e.foodId] ?? 0) * e.grams) / 100,
      );
    }
    for (const f of e.foods) {
      const short = f.name.split(",")[0].split("(")[0].trim();
      add("sodium", f.id, short, ((sodiumPer100[f.id] ?? SODIUM_DEFAULT) * f.grams) / 100);
      const sugar = isNaturalJuice(f.id)
        ? (f.nutrients.carbs ?? 0) * JUICE_FREE_SHARE
        : ((sugarPer100[f.id] ?? naturalSugarPer100[f.id] ?? 0) * f.grams) / 100;
      add("sugar", f.id, short, sugar);
      add("fat", f.id, short, f.nutrients.fat);
    }
  }
  const sum = (m: Map<string, { amount: number }>) =>
    [...m.values()].reduce((a, b) => a + b.amount, 0);
  const defs: Array<{ key: RiskKey; label: string; unit: string; limit: number; extra?: number }> =
    [
      { key: "sodium", label: "Sódio", unit: "mg", limit: 2000 },
      {
        key: "sugar",
        label: "Açúcar livre",
        unit: "g",
        limit: Math.max(25, Math.round((target.kcal * 0.1) / 4)),
      },
      {
        key: "fat",
        label: "Gordura",
        unit: "g",
        limit: Math.max(20, target.fat),
        extra: fatDirect,
      },
    ];
  return defs.map((d) => {
    const value = sum(agg[d.key]) + (d.extra ?? 0);
    const pct = d.limit > 0 ? value / d.limit : 0;
    return {
      key: d.key,
      label: d.label,
      unit: d.unit,
      value,
      limit: d.limit,
      pct,
      level: levelOf(pct),
      left: d.limit - value,
      culprits: [...agg[d.key].entries()]
        .map(([id, v]) => ({ id, name: v.name, amount: v.amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3),
    };
  });
}

/** Alimentos do dia com aviso de perigo próprio (carne processada, bebida açucarada…). */
export function hazardsFor(entries: EntryLike[]) {
  const seen = new Map<string, { id: string; name: string; text: string }>();
  for (const e of entries)
    for (const f of e.foods) {
      const text = foodHazard[f.id];
      if (text && !seen.has(f.id))
        seen.set(f.id, { id: f.id, name: f.name.split(",")[0].split("(")[0].trim(), text });
    }
  return [...seen.values()];
}

export const levelText: Record<RiskLevel, string> = {
  ok: "Dentro do limite",
  near: "Perto do limite",
  over: "Limite excedido",
  severe: "Muito acima do limite",
};
/** Tons claros para TEXTO sobre fundo escuro (contraste mínimo 4,5:1); levelColor serve para barras e ícones. */
export const levelInk: Record<RiskLevel, string> = {
  ok: "#6ee7b7",
  near: "#fcd34d",
  over: "#fda4af",
  severe: "#ffb4b4",
};

export const levelColor: Record<RiskLevel, string> = {
  ok: "#10b981",
  near: "#f59e0b",
  over: "#f43f5e",
  severe: "#dc2626",
};
