import { ingredientById, portionNutrition, type Ingredient } from "./nutrition-catalog";

/**
 * Integra os registros em texto livre ("2 ovos e 150 g de arroz") ao catálogo nutricional.
 * Valores são estimativas educativas (TACO/TBCA), não análise laboratorial.
 */
export type Micros = {
  vitC: number;
  vitA: number;
  calcium: number;
  iron: number;
  potassium: number;
};
export type Nutrients = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
} & Micros;
export type ParsedFood = {
  id: string;
  name: string;
  grams: number;
  nutrients: Nutrients;
  estimatedPortion: boolean;
};

/** Micronutrientes aproximados por 100 g (vit. C mg, vit. A mcg RAE, cálcio mg, ferro mg, potássio mg). */
export const foodMicros: Record<string, [number, number, number, number, number]> = {
  suco_laranja: [50, 10, 11, 0.1, 180],
  suco_caju: [110, 5, 1, 0.1, 62],
  suco_abacaxi: [17, 2, 11, 0.15, 65],
  suco_manga: [32, 27, 4, 0.05, 69],
  suco_cupuacu: [12, 2, 6, 0.25, 165],
  suco_caja: [13, 15, 13, 0.15, 100],
  suco_melancia: [5, 25, 7, 0.2, 100],
  suco_maca: [1, 1, 1, 0.05, 38],
  limonada: [6, 0, 2, 0, 15],
  suco_caixinha: [0, 0, 3, 0.1, 25],
  cafe_leite_desnatado: [0, 25, 60, 0, 100],
  leite_desnatado: [1, 1, 120, 0.1, 150],
  leite_po_dissolvido: [1, 30, 115, 0.1, 170],
  vitamina_banana: [3, 25, 60, 0.2, 200],
  vitamina_mamao: [28, 45, 65, 0.1, 170],
  baiao_dois: [1, 5, 25, 1.2, 180],
  sopa_legumes: [5, 150, 15, 0.3, 150],
  quibe_macaxeira: [8, 2, 20, 0.8, 180],
  cafe_soluvel: [0, 0, 3, 0, 70],
  leite_integral: [1, 30, 123, 0.1, 133],
  leite_po_integral: [8, 250, 890, 0.5, 1100],
  leite_po_desnatado: [5, 0, 1360, 0.9, 1700],
  cereal_com_leite: [3, 100, 95, 1.5, 130],
  pasta_amendoim: [0, 0, 45, 1.9, 560],
  queijo_mussarela: [0, 180, 875, 0.3, 62],
  queijo_prato: [0, 250, 940, 0.3, 80],
  pao_massa_fina: [0, 10, 40, 1.5, 110],
  suco_acerola: [470, 19, 7, 0.1, 83],
  suco_graviola: [10, 0, 7, 0.3, 139],
  salada_frutas: [30, 30, 12, 0.3, 200],
  mangaba: [140, 30, 41, 2.8, 160],
  pitaia: [3, 0, 8, 0.7, 120],
  couve_crua: [96, 400, 131, 0.5, 403],
  cheiro_verde: [52, 400, 179, 3.2, 710],
  cebolinha: [30, 150, 80, 0.6, 250],
  coentro: [27, 340, 67, 1.8, 520],
  mostarda_folha: [39, 200, 68, 1, 300],
  acelga: [22, 0, 43, 0.3, 240],
  pimentao_vermelho: [158, 150, 6, 0.3, 210],
  pimentao_amarelo: [201, 10, 10, 0.4, 220],
  brocolis_cru: [34, 50, 86, 0.6, 320],
  feijao_corda: [1, 1, 17, 1.1, 310],
  grao_bico: [1, 1, 49, 2.9, 291],
  arroz: [0, 0, 4, 0.1, 15],
  arroz_integral: [0, 0, 5, 0.3, 75],
  feijao: [0, 0, 27, 1.3, 255],
  feijao_preto: [0, 0, 29, 1.5, 256],
  frango: [0, 6, 8, 0.4, 250],
  carne: [0, 0, 5, 2.4, 290],
  peixe: [0, 10, 20, 0.3, 300],
  tilapia: [0, 0, 10, 0.6, 350],
  sardinha: [0, 30, 438, 2, 400],
  ovo: [0, 140, 50, 1.2, 130],
  leite: [1, 50, 120, 0.1, 150],
  iogurte: [1, 20, 140, 0.1, 180],
  banana_prata: [21, 4, 8, 0.4, 358],
  banana_nanica: [6, 4, 3, 0.3, 376],
  banana_maca: [10, 4, 3, 0.2, 264],
  banana_comprida: [8, 50, 3, 0.5, 450],
  banana_pacova: [15, 40, 3, 0.4, 400],
  laranja: [57, 11, 35, 0.1, 163],
  acerola: [941, 38, 13, 0.2, 165],
  goiaba: [80, 31, 4, 0.2, 198],
  manga: [65, 54, 8, 0.1, 138],
  mamão: [82, 47, 22, 0.2, 126],
  maca: [2, 3, 2, 0.1, 75],
  melancia: [6, 28, 8, 0.2, 104],
  abacaxi: [35, 3, 22, 0.3, 131],
  uva: [2, 3, 9, 0.3, 162],
  abacate: [9, 7, 8, 0.2, 206],
  acai: [1, 20, 35, 0.4, 125],
  cenoura: [1, 850, 26, 0.1, 176],
  abobora: [3, 330, 12, 0.2, 140],
  brocolis: [42, 31, 51, 0.5, 120],
  couve: [77, 400, 177, 0.5, 315],
  espinafre: [6, 470, 112, 0.4, 220],
  tomate: [21, 42, 7, 0.2, 222],
  alface: [4, 110, 28, 0.4, 267],
  beterraba: [3, 2, 15, 0.2, 245],
  batata: [4, 0, 4, 0.2, 160],
  batata_doce: [12, 700, 17, 0.2, 148],
  macaxeira: [11, 1, 19, 0.1, 100],
  cuscuz: [0, 10, 2, 0.2, 30],
  aveia: [0, 0, 48, 4.4, 336],
  tapioca: [0, 0, 5, 0.1, 5],
  farinha: [0, 0, 65, 1.1, 340],
  cupuacu: [24, 3, 13, 0.5, 330],
  buriti: [21, 1700, 74, 2.6, 280],
  tucuma: [6, 900, 46, 0.6, 400],
  pupunha: [3, 220, 20, 0.7, 300],
  graviola: [21, 1, 14, 0.6, 278],
  tapereba: [26, 30, 26, 0.3, 200],
  jambu: [20, 100, 160, 4, 300],
  carne_sol: [0, 0, 10, 3, 300],
  galinha_caipira: [0, 20, 12, 1, 230],
  pacoca_carne_sol: [0, 0, 20, 3, 280],
  pamonha: [3, 10, 5, 0.4, 170],
  canjica: [1, 20, 60, 0.3, 140],
  mungunza: [0, 15, 55, 0.4, 120],
  banana_frita: [10, 45, 4, 0.6, 420],
  acai_acucar: [1, 20, 30, 0.3, 110],
  abacatada: [5, 15, 55, 0.2, 170],
  suco_goiaba: [40, 15, 3, 0.1, 95],
  mingau_aveia_leite: [1, 40, 105, 0.5, 170],
  mingau_maisena: [1, 40, 95, 0.1, 120],
  cereal_milho: [0, 0, 3, 1.2, 100],
  acucar_gramixo: [0, 0, 127, 8.3, 522],
  acucar: [0, 0, 4, 0.1, 6],
  pizza: [2, 60, 200, 1.2, 180],
  feijoada: [1, 10, 25, 1.3, 220],
  macarronada: [5, 40, 20, 1.1, 200],
  crepioca: [0, 100, 35, 0.9, 95],
  sopa_carne_legumes: [4, 120, 15, 0.6, 170],
  panelada: [0, 0, 40, 1.5, 60],
  churrasco: [0, 0, 10, 2.7, 320],
  carne_assada: [0, 0, 6, 3, 330],
  frango_assado: [0, 40, 12, 1.1, 240],
  calabresa: [0, 0, 10, 1, 250],
  salsicha: [0, 0, 10, 1.2, 180],
  abiu: [10, 0, 15, 0.3, 150],
  ameixa: [5, 15, 6, 0.1, 160],
  atemoia: [20, 0, 20, 0.3, 250],
  banana_ouro: [8, 4, 3, 0.3, 350],
  cajamanga: [27, 20, 15, 0.3, 190],
  caju: [219, 10, 1, 0.2, 124],
  caqui: [30, 80, 18, 0.1, 160],
  carambola: [60, 5, 5, 0.2, 133],
  figo: [1, 5, 27, 0.2, 174],
  jabuticaba: [16, 0, 8, 0.1, 130],
  jaca: [15, 5, 11, 0.4, 234],
  jambo: [4, 10, 10, 0.2, 120],
  kiwi: [71, 4, 24, 0.3, 269],
  limao: [38, 1, 51, 0.2, 128],
  mexerica: [112, 34, 17, 0.1, 125],
  tangerina: [48, 34, 13, 0.1, 131],
  morango: [64, 1, 11, 0.3, 184],
  nespera: [3, 76, 16, 0.3, 266],
  pequi: [9, 600, 32, 0.3, 300],
  pessego: [3, 16, 3, 0.2, 124],
  pinha: [36, 0, 24, 0.3, 250],
  pitanga: [25, 75, 18, 0.4, 113],
  roma: [8, 0, 10, 0.3, 230],
  tamarindo: [7, 2, 37, 0.6, 628],
  umbu: [24, 15, 12, 0.4, 200],
  laranja_lima: [44, 11, 30, 0.1, 140],
  camu_camu: [2000, 0, 20, 0.5, 80],
  araca_boi: [40, 30, 15, 0.3, 150],
  biriba: [20, 0, 25, 0.5, 200],
  inga: [10, 0, 20, 0.5, 150],
  sapoti: [15, 3, 21, 0.8, 193],
  agriao: [60, 230, 133, 3.1, 218],
  almeirao: [3, 250, 20, 0.7, 250],
  chicoria: [6, 250, 45, 0.5, 300],
  rucula: [15, 119, 160, 1.5, 369],
  taioba: [20, 300, 140, 1.2, 500],
  repolho: [19, 5, 35, 0.2, 150],
  couve_flor: [24, 1, 16, 0.3, 142],
  cenoura_crua: [5, 830, 23, 0.2, 315],
  cebola: [5, 0, 14, 0.2, 176],
  pimentao: [100, 18, 9, 0.4, 174],
  berinjela: [1, 2, 9, 0.2, 123],
  quiabo: [16, 28, 77, 0.3, 135],
  maxixe: [10, 5, 21, 0.4, 220],
  jilo: [7, 10, 20, 0.3, 210],
  nabo: [10, 0, 30, 0.2, 190],
  rabanete: [10, 0, 21, 0.3, 233],
  palmito: [6, 0, 58, 0.3, 180],
  mandioquinha: [17, 7, 12, 0.4, 260],
  cara: [5, 0, 10, 0.3, 350],
  legumes_grelhados: [15, 200, 25, 0.5, 250],
  batata_doce_assada: [20, 960, 38, 0.7, 475],
  batata_doce_frita: [15, 700, 40, 0.8, 500],
  batata_assada: [10, 1, 15, 1, 535],
  batata_frita: [10, 0, 15, 0.8, 580],
  macaxeira_assada: [11, 1, 19, 0.1, 100],
  inhame_assado: [7, 5, 15, 0.4, 600],
  frango_grelhado: [0, 6, 9, 0.4, 260],
  contrafile_grelhado: [0, 0, 5, 2.6, 330],
  bisteca_grelhada: [0, 0, 30, 0.9, 330],
  hamburguer_grelhado: [0, 0, 15, 2.4, 300],
  ovo_frito: [0, 150, 60, 1.8, 140],
  omelete: [0, 170, 55, 1.4, 120],
  sanduiche_natural: [5, 60, 90, 1.2, 200],
  misto_quente: [0, 60, 250, 1.3, 170],
  pao_com_ovo: [0, 80, 50, 1.6, 120],
  x_tudo: [3, 60, 100, 1.8, 220],
  cheeseburger: [1, 40, 120, 2.2, 210],
  hamburguer_sanduiche: [1, 10, 60, 2.3, 220],
  cachorro_quente: [3, 20, 50, 1.5, 180],
  lentilha: [1, 1, 16, 1.5, 220],
  suco_maracuja: [14, 30, 4, 0.2, 140],
  cafe: [0, 0, 3, 0, 50],
  amendoim: [0, 0, 39, 2.2, 650],
  castanha_para: [1, 0, 146, 2.3, 650],
};

/** Palavras-chave → alimento do catálogo. Ordem importa: termos mais específicos primeiro. */
const aliases: Array<[RegExp, string]> = [
  [/miojo|macarr[aã]o instant[aâ]neo|lámen|lamen|nissin/, "macarrao_instantaneo"],
  [/catchup|ketchup/, "ketchup"],
  [/maionese/, "maionese"],
  [/cebola (de |em )?palha|cebola frita( crocante)?|cebola crocante/, "cebola_palha"],
  [
    /pimentas? (da terra|de cheiro|malagueta|murupi|biquinho|dedo.de.mo[cç]a)|\bpimenta\b/,
    "pimenta_terra",
  ],
  [/caf[eé][ _]com[ _]leite (de gado|de vaca|fresco|da fazenda)/, "cafe_leite_gado"],
  [/caf[eé][ _]com[ _]leite desnatado/, "cafe_leite_desnatado"],
  [/leite desnatado/, "leite_desnatado"],
  [/leite em p[oó] (dissolvido|reconstitu[ií]do)|leite de p[oó]/, "leite_po_dissolvido"],
  [/vitamina de banana/, "vitamina_banana"],
  [/vitamina de mam[aã]o/, "vitamina_mamao"],
  [/suco( natural)? de laranja/, "suco_laranja"],
  [/suco( natural)? de caju/, "suco_caju"],
  [/suco( natural)? de abacaxi/, "suco_abacaxi"],
  [/suco( natural)? de manga/, "suco_manga"],
  [/suco( natural)? de cupua[cç]u/, "suco_cupuacu"],
  [/suco( natural)? de (tapereb[aá]|caj[aá])/, "suco_caja"],
  [/suco( natural)? de melancia/, "suco_melancia"],
  [/suco( natural)? de ma[cç][aã]/, "suco_maca"],
  [/limonada|suco( natural)? de lim[aã]o/, "limonada"],
  [/n[eé]ctar|suco (de )?(caixinha|industrializado|de pacote)/, "suco_caixinha"],
  [/caf[eé][ _]com[ _]leite em p[oó]/, "cafe_leite_po"],
  [/leite em p[oó] desnatado/, "leite_po_desnatado"],
  [/leite em p[oó]|leite ninho/, "leite_po_integral"],
  [/cereal_com_leite/, "cereal_com_leite"],
  [/leite integral|leite de (vaca|gado)/, "leite_integral"],
  [/nescaf[eé]|caf[eé] sol[uú]vel/, "cafe_soluvel"],
  [/bai[aã]o de dois/, "baiao_dois"],
  [/sopa de (legumes|verduras)/, "sopa_legumes"],
  [/quibe de (macaxeira|mandioca)/, "quibe_macaxeira"],
  [/pasta de amendoim|manteiga de amendoim/, "pasta_amendoim"],
  [/mu[sç]{1,2}arela|mozarela|mozzarella/, "queijo_mussarela"],
  [/queijo prato/, "queijo_prato"],
  [/p[aã]o (de )?massa fina|massa fina/, "pao_massa_fina"],
  [/suco( natural)? de acerola/, "suco_acerola"],
  [/suco( natural)? de graviola/, "suco_graviola"],
  [/salada de frutas?/, "salada_frutas"],
  [/mangaba/, "mangaba"],
  [/pitai?a|pitaya/, "pitaia"],
  [/couve crua/, "couve_crua"],
  [/cheiro.verde|salsinha|\bsalsa\b/, "cheiro_verde"],
  [/cebolinha/, "cebolinha"],
  [/coentro/, "coentro"],
  [/mostarda/, "mostarda_folha"],
  [/acelga/, "acelga"],
  [/piment[aã]o vermelho/, "pimentao_vermelho"],
  [/piment[aã]o amarelo/, "pimentao_amarelo"],
  [/br[oó]colis cru/, "brocolis_cru"],
  [/feij[aã]o.(de.corda|verde|fradinho|caupi)/, "feijao_corda"],
  [/gr[aã]o.de.bico/, "grao_bico"],
  [/sans?u[ií]che|sanduba/, "sanduiche_natural"],
  [/abiu/, "abiu"],
  [/ameixa/, "ameixa"],
  [/atem[oó]i?a/, "atemoia"],
  [/banana ouro|banana-ouro/, "banana_ouro"],
  [/caj[aá].?manga/, "cajamanga"],
  [/caju\b/, "caju"],
  [/caqui/, "caqui"],
  [/carambola/, "carambola"],
  [/figo/, "figo"],
  [/jabuticaba/, "jabuticaba"],
  [/\bjaca\b/, "jaca"],
  [/jambo/, "jambo"],
  [/kiwi/, "kiwi"],
  [/lim[aã]o/, "limao"],
  [/mexerica|bergamota/, "mexerica"],
  [/tangerina|ponc[aã]|pocan/, "tangerina"],
  [/morango/, "morango"],
  [/n[eê]spera/, "nespera"],
  [/pequi/, "pequi"],
  [/p[eê]ssego/, "pessego"],
  [/pinha|fruta.do.conde/, "pinha"],
  [/pitanga/, "pitanga"],
  [/rom[aã]( |$)/, "roma"],
  [/tamarindo/, "tamarindo"],
  [/umbu|imbu/, "umbu"],
  [/laranja.?lima/, "laranja_lima"],
  [/camu.?camu/, "camu_camu"],
  [/ara[cç][aá].?boi/, "araca_boi"],
  [/birib[aá]/, "biriba"],
  [/\bing[aá]( |$)/, "inga"],
  [/sapoti/, "sapoti"],
  [/agri[aã]o/, "agriao"],
  [/almeir[aã]o/, "almeirao"],
  [/chic[oó]ria|escarola/, "chicoria"],
  [/r[uú]cula/, "rucula"],
  [/taioba/, "taioba"],
  [/repolho/, "repolho"],
  [/couve.?flor/, "couve_flor"],
  [/cenoura (crua|ralada)|salada de cenoura/, "cenoura_crua"],
  [/cebola/, "cebola"],
  [/piment[aã]o/, "pimentao"],
  [/berinjela/, "berinjela"],
  [/quiabo/, "quiabo"],
  [/maxixe/, "maxixe"],
  [/jil[oó]/, "jilo"],
  [/\bnabo/, "nabo"],
  [/rabanete/, "rabanete"],
  [/palmito/, "palmito"],
  [/mandioquinha|batata.?baroa|batata.?salsa/, "mandioquinha"],
  [/^car[aá]( |$)|car[aá] cozido/, "cara"],
  [
    /legumes (grelhados|assados|na brasa)|(abobrinha|berinjela|piment[aã]o) (grelhad|assad)[oa]/,
    "legumes_grelhados",
  ],
  [/batata.?doce (assada|grelhada|na brasa|no forno|na airfryer)/, "batata_doce_assada"],
  [/batata.?doce frita/, "batata_doce_frita"],
  [/batata (inglesa )?(assada|grelhada|r[uú]stica|no forno|na airfryer)/, "batata_assada"],
  [/batata (inglesa )?frita|batatas fritas/, "batata_frita"],
  [/(macaxeira|mandioca|aipim) (assad|grelhad)[ao]/, "macaxeira_assada"],
  [/inhame (assado|grelhado)/, "inhame_assado"],
  [/frango grelhado|fil[eé] de frango|peito de frango( grelhado)?/, "frango_grelhado"],
  [/\bbife|contra.?fil[eé]|carne grelhada|alcatra grelhada/, "contrafile_grelhado"],
  [/bisteca|costeleta de porco|lombo de porco/, "bisteca_grelhada"],
  [/hamb[uú]rguer (grelhado|caseiro|na chapa)|carne de hamb[uú]rguer/, "hamburguer_grelhado"],
  [/ovos? fritos?/, "ovo_frito"],
  [/omelete|ovos? mexidos?/, "omelete"],
  [
    /sandu[ií]che natural|sanduba natural|sandu[ií]che de frango|sandu[ií]che|sanduba/,
    "sanduiche_natural",
  ],
  [/misto( quente| frio)?\b|queijo quente/, "misto_quente"],
  [/p[aã]o_com_ovo/, "pao_com_ovo"],
  [/x.?tudo/, "x_tudo"],
  [/x.?(burguer|burger|salada|bacon|egg)|cheese.?burg/, "cheeseburger"],
  [/hamb[uú]rguer/, "hamburguer_sanduiche"],
  [/cachorro.quente|hot.?dog/, "cachorro_quente"],
  [/(macaxeira|mandioca|aipim) frita/, "mandioca_frita"],
  [/farofa/, "farofa"],
  [/cuscuz/, "cuscuz"],
  [/quibe/, "quibe_arroz"],
  [/feij[aã]o[- ]preto/, "feijao_preto"],
  [/suco( natural)? de goiaba/, "suco_goiaba"],
  [/carne( bovina)? assada/, "carne_assada"],
  [/banana[- ]ma[cç][aã]/, "banana_maca"],
  [/banana[- ]nanica/, "banana_nanica"],
  [/banana[- ]pacov[aã]/, "banana_pacova"],
  [/farinha de (mandioca|macaxeira)/, "farinha"],
  [/ma[cç][aã]( |$)/, "maca"],
  [/\bpera\b|\bpêra\b/, "pera"],
  [/(?<!suco de )maracuj[aá]/, "maracuja"],
  [/inhame/, "inhame"],
  [/chuchu/, "chuchu"],
  [/abobrinha/, "abobrinha"],
  [/vagem/, "vagem"],
  [/pepino/, "pepino"],
  [/mel[aã]o/, "melao"],
  [/ervilha/, "ervilha"],
  [/^coco|coco (fresco|ralado|seco)/, "coco"],
  [/\bch[aá]( |$)|camomila|erva.doce|capim.santo/, "cha_camomila"],
  [/granola/, "granola"],
  [/neston/, "neston"],
  [/mucilon/, "mucilon"],
  [/pamonha/, "pamonha"],
  [/canjica|curau/, "canjica"],
  [/mungunz[aá]|munguz[aá]|chá de burro/, "mungunza"],
  [/bananas?(-| )?(comprida |da terra |prata |nanica )?fritas?/, "banana_frita"],
  [/a[cç]a[ií] (na tigela|no copo|com xarope|ado[cç]ado|com guaran[aá])/, "acai_acucar"],
  [/abacatada|vitamina de abacate|abacate batido/, "abacatada"],
  [/suco de goiaba/, "suco_goiaba"],
  [/mingau de aveia/, "mingau_aveia_leite"],
  [/mingau de (maisena|maizena|amido)/, "mingau_maisena"],
  [/cereal|sucrilhos|corn ?flakes|flocos de milho/, "cereal_milho"],
  [/gramix[oó]|a[cç][uú]car (macaco|mascavo|preto)|rapadura/, "acucar_gramixo"],
  [/pizza/, "pizza"],
  [/feijoada/, "feijoada"],
  [/macarronada|macarr[aã]o (ao|à|a) bolonhesa|espaguete (ao|à|a) bolonhesa/, "macarronada"],
  [/crepioca/, "crepioca"],
  [/sopa/, "sopa_carne_legumes"],
  [/panelada|dobradinha|bucho/, "panelada"],
  [/churrasco|picanha|espetinho|costela/, "churrasco"],
  [/carne assada|assado de panela|lagarto/, "carne_assada"],
  [/frango assado|galeto/, "frango_assado"],
  [/arroz integral/, "arroz_integral"],
  [/arroz/, "arroz"],
  [/feij[aã]o preto/, "feijao_preto"],
  [/feij[aã]o/, "feijao"],
  [/caf[eé][ _]com[ _]leite (de gado|de vaca|fresco|da fazenda)/, "cafe_leite_gado"],
  [/caf[eé][ _]com[ _]leite em p[oó]|leite em p[oó]|leite ninho/, "cafe_leite_po"],
  [/caf[eé][ _]com[ _]leite|pingado/, "cafe_com_leite"],
  [/achocolatado|nescau|toddy|chocolate quente/, "achocolatado"],
  [/p[aã]o integral|p[aã]o de forma/, "pao_integral"],
  [/p[aã]o|p[aã]ozinho|cacetinho/, "pao_frances"],
  [/manteiga/, "manteiga"],
  [/margarina/, "margarina"],
  [/queijo coalho|queijo assado/, "queijo_coalho"],
  [/requeij[aã]o/, "requeijao"],
  [/queijo|mu[cç]arela|mussarela/, "queijo_minas"],
  [/presunto|peito de peru/, "presunto"],
  [/bolo/, "bolo_simples"],
  [/biscoito|bolacha/, "biscoito_salgado"],
  [/macarr[aã]o|espaguete|massa/, "macarrao"],
  [/baixaria/, "baixaria"],
  [/carne mo[ií]da/, "carne_moida"],
  [/calabresa/, "calabresa"],
  [/salsicha/, "salsicha"],
  [/lingui[cç]a/, "linguica"],
  [/pirarucu/, "pirarucu"],
  [/tambaqui/, "tambaqui"],
  [/banana cozida|banana comprida cozida/, "banana_cozida"],
  [/mingau de banana/, "mingau_banana"],
  [/[aá]gua de coco/, "agua_coco"],
  [/refrigerante|refri\b|coca/, "refrigerante"],
  [/cupua[cç]u/, "cupuacu"],
  [/buriti/, "buriti"],
  [/tucum[aã]/, "tucuma"],
  [/pupunha/, "pupunha"],
  [/graviola/, "graviola"],
  [/bacuri/, "bacuri"],
  [/tapereb[aá]|caj[aá]/, "tapereba"],
  [/tacac[aá]/, "tacaca"],
  [/jambu/, "jambu"],
  [/caldo de piranha|piranha/, "caldo_piranha"],
  [/galinha caipira/, "galinha_caipira"],
  [/pa[cç]oca de carne/, "pacoca_carne_sol"],
  [/carne de sol|carne seca|charque/, "carne_sol"],
  [/matrinx[aã]/, "matrinxa"],
  [/jaraqui/, "jaraqui"],
  [/beiju/, "beiju"],
  [/chib[eé]/, "chibe"],
  [/farinha d.?[aá]gua|farinha de cruzeiro/, "farinha_agua"],
  [/milho/, "milho_cozido"],
  [/quibe/, "quibe_arroz"],
  [/frango|galinha/, "frango"],
  [/til[aá]pia/, "tilapia"],
  [/sardinha/, "sardinha"],
  [/peixe/, "peixe"],
  [/carne|bife|patinho|alcatra/, "carne"],
  [/ovos?\b/, "ovo"],
  [/iogurte/, "iogurte"],
  [/leite/, "leite"],
  [/caf[eé]/, "cafe"],
  [/suco de maracuj[aá]|suco/, "suco_maracuja"],
  [/banana nanica/, "banana_nanica"],
  [/banana ma[cç][aã]/, "banana_maca"],
  [/banana comprida|banana da terra/, "banana_comprida"],
  [/banana/, "banana_prata"],
  [/laranja/, "laranja"],
  [/acerola/, "acerola"],
  [/goiaba/, "goiaba"],
  [/manga/, "manga"],
  [/mam[aã]o/, "mamão"],
  [/ma[cç][aã]\b/, "maca"],
  [/melancia/, "melancia"],
  [/abacaxi/, "abacaxi"],
  [/uva/, "uva"],
  [/abacate/, "abacate"],
  [/a[cç]a[ií]/, "acai"],
  [/cenoura/, "cenoura"],
  [/ab[oó]bora/, "abobora"],
  [/br[oó]colis/, "brocolis"],
  [/couve/, "couve"],
  [/espinafre/, "espinafre"],
  [/tomate/, "tomate"],
  [/alface|salada/, "alface"],
  [/beterraba/, "beterraba"],
  [/batata doce|batata-doce/, "batata_doce"],
  [/batata/, "batata"],
  [/macaxeira|mandioca|aipim/, "macaxeira"],
  [/cuscuz/, "cuscuz"],
  [/mingau/, "mingau_aveia"],
  [/aveia/, "aveia"],
  [/tapioca/, "tapioca"],
  [/a[cç][uú]car/, "acucar"],
  [/farofa/, "farofa"],
  [/farinha/, "farinha"],
  [/lentilha/, "lentilha"],
  [/amendoim/, "amendoim"],
  [/castanha/, "castanha_para"],
  [/azeite/, "azeite"],
];

/** Porção padrão em gramas/ml quando o usuário não informa a quantidade. */
const defaultPortion: Record<string, number> = {
  pimenta_terra: 5,
  cebola_palha: 10,
  macarrao_instantaneo: 270,
  ketchup: 15,
  maionese: 15,
  suco_laranja: 250,
  suco_caju: 250,
  suco_abacaxi: 250,
  suco_manga: 250,
  suco_cupuacu: 250,
  suco_caja: 250,
  suco_melancia: 250,
  suco_maca: 250,
  limonada: 250,
  suco_caixinha: 250,
  cafe_leite_desnatado: 200,
  leite_desnatado: 200,
  leite_po_dissolvido: 200,
  vitamina_banana: 300,
  vitamina_mamao: 300,
  baiao_dois: 200,
  sopa_legumes: 300,
  quibe_macaxeira: 80,
  cafe_soluvel: 150,
  leite_integral: 200,
  leite_po_integral: 26,
  leite_po_desnatado: 26,
  cereal_com_leite: 230,
  pasta_amendoim: 15,
  queijo_mussarela: 30,
  queijo_prato: 30,
  pao_massa_fina: 50,
  suco_acerola: 250,
  suco_graviola: 250,
  salada_frutas: 150,
  mangaba: 80,
  pitaia: 150,
  couve_crua: 40,
  cheiro_verde: 5,
  cebolinha: 5,
  coentro: 5,
  mostarda_folha: 40,
  acelga: 40,
  pimentao_vermelho: 30,
  pimentao_amarelo: 30,
  brocolis_cru: 60,
  feijao_corda: 100,
  grao_bico: 100,
  arroz: 120,
  arroz_integral: 120,
  feijao: 100,
  feijao_preto: 100,
  frango: 120,
  carne: 120,
  peixe: 120,
  tilapia: 120,
  sardinha: 80,
  ovo: 50,
  iogurte: 170,
  leite: 200,
  cafe: 100,
  suco_maracuja: 250,
  banana_prata: 80,
  banana_nanica: 100,
  banana_maca: 70,
  banana_comprida: 150,
  laranja: 150,
  acerola: 100,
  goiaba: 150,
  manga: 150,
  mamão: 150,
  maca: 130,
  melancia: 200,
  abacaxi: 100,
  uva: 100,
  abacate: 100,
  acai: 200,
  pao_frances: 50,
  pao_integral: 50,
  manteiga: 10,
  margarina: 10,
  queijo_coalho: 40,
  queijo_minas: 30,
  requeijao: 15,
  presunto: 30,
  cafe_com_leite: 200,
  achocolatado: 200,
  bolo_simples: 60,
  biscoito_salgado: 30,
  macarrao: 150,
  carne_moida: 100,
  linguica: 60,
  cafe_leite_gado: 200,
  cafe_leite_po: 200,
  agua_coco: 300,
  refrigerante: 350,
  pirarucu: 120,
  tambaqui: 120,
  baixaria: 250,
  banana_cozida: 120,
  cupuacu: 100,
  buriti: 50,
  tucuma: 50,
  pupunha: 100,
  graviola: 100,
  bacuri: 80,
  tapereba: 100,
  jambu: 30,
  tacaca: 400,
  caldo_piranha: 300,
  galinha_caipira: 120,
  carne_sol: 100,
  pacoca_carne_sol: 80,
  matrinxa: 120,
  jaraqui: 120,
  mingau_banana: 250,
  beiju: 50,
  chibe: 250,
  farinha_agua: 30,
  milho_cozido: 100,
  quibe_arroz: 80,
  pamonha: 150,
  canjica: 150,
  mungunza: 250,
  banana_frita: 100,
  acai_acucar: 300,
  abacatada: 250,
  suco_goiaba: 250,
  mingau_aveia_leite: 250,
  mingau_maisena: 250,
  cereal_milho: 30,
  acucar_gramixo: 15,
  acucar: 10,
  pizza: 110,
  feijoada: 250,
  macarronada: 250,
  crepioca: 90,
  sopa_carne_legumes: 350,
  panelada: 300,
  churrasco: 150,
  carne_assada: 120,
  frango_assado: 150,
  calabresa: 60,
  salsicha: 50,
  abiu: 100,
  ameixa: 70,
  atemoia: 150,
  banana_ouro: 40,
  cajamanga: 100,
  caju: 100,
  caqui: 110,
  carambola: 100,
  figo: 50,
  jabuticaba: 80,
  jaca: 100,
  jambo: 100,
  kiwi: 75,
  limao: 60,
  mexerica: 130,
  tangerina: 140,
  morango: 120,
  nespera: 60,
  pequi: 50,
  pessego: 100,
  pinha: 130,
  pitanga: 60,
  roma: 100,
  tamarindo: 30,
  umbu: 70,
  laranja_lima: 150,
  camu_camu: 50,
  araca_boi: 100,
  biriba: 120,
  inga: 50,
  sapoti: 100,
  agriao: 30,
  almeirao: 40,
  chicoria: 40,
  rucula: 30,
  taioba: 50,
  repolho: 50,
  couve_flor: 80,
  cenoura_crua: 50,
  cebola: 30,
  pimentao: 30,
  berinjela: 80,
  quiabo: 80,
  maxixe: 60,
  jilo: 60,
  nabo: 50,
  rabanete: 40,
  palmito: 50,
  mandioquinha: 130,
  cara: 130,
  legumes_grelhados: 120,
  batata_doce_assada: 130,
  batata_doce_frita: 100,
  batata_assada: 130,
  batata_frita: 100,
  macaxeira_assada: 150,
  inhame_assado: 130,
  frango_grelhado: 120,
  contrafile_grelhado: 120,
  bisteca_grelhada: 120,
  hamburguer_grelhado: 90,
  ovo_frito: 50,
  omelete: 100,
  sanduiche_natural: 150,
  misto_quente: 120,
  pao_com_ovo: 100,
  x_tudo: 300,
  cheeseburger: 160,
  hamburguer_sanduiche: 150,
  cachorro_quente: 150,
  alface: 40,
  tomate: 60,
  cuscuz: 150,
  tapioca: 80,
  macaxeira: 150,
  batata: 130,
  batata_doce: 130,
  aveia: 30,
  farofa: 30,
  azeite: 8,
  castanha_para: 10,
  amendoim: 30,
};
const unitGrams: Array<[RegExp, number]> = [
  [/colher(es)? de sopa/, 25],
  [/colher(es)?/, 15],
  [/concha(s)?/, 100],
  [/fatia(s)?/, 30],
  [/x[ií]cara(s)?/, 160],
  [/copo(s)?/, 200],
  [/prato(s)?/, 300],
  [/por[cç][aã]o|por[cç][oõ]es/, 0],
  [/unidade(s)?/, 0],
];
const numberWords: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  três: 3,
  quatro: 4,
  cinco: 5,
  meio: 0.5,
  meia: 0.5,
};

const emptyNutrients = (): Nutrients => ({
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  vitC: 0,
  vitA: 0,
  calcium: 0,
  iron: 0,
  potassium: 0,
});
export function nutrientsFor(item: Ingredient, grams: number): Nutrients {
  const macros = portionNutrition(item, grams);
  const m = foodMicros[item.id] ?? [0, 0, 0, 0, 0];
  const f = grams / 100;
  return {
    kcal: macros.kcal ?? 0,
    protein: macros.protein ?? 0,
    carbs: macros.carbs ?? 0,
    fat: macros.fat ?? 0,
    fiber: macros.fiber ?? 0,
    vitC: m[0] * f,
    vitA: m[1] * f,
    calcium: m[2] * f,
    iron: m[3] * f,
    potassium: m[4] * f,
  };
}

/** Reconhece alimentos e quantidades em um texto livre. `liquidMl` é usado quando o registro é de um líquido. */
export function parseFoodText(text: string, liquidMl?: number | null): ParsedFood[] {
  // Preparos que levam "com" no nome não devem ser separados em dois alimentos.
  const source = text
    .toLowerCase()
    .normalize("NFC")
    .replace(/nescaf[eé] com leite em p[oó]/g, "café com leite em pó")
    .replace(/nescaf[eé] com leite desnatado/g, "café com leite desnatado")
    .replace(/nescaf[eé] com leite/g, "café com leite")
    .replace(/caf[eé] com leite/g, "café_com_leite")
    .replace(/(mingau de [a-zà-ú]+) com leite/g, "$1")
    .replace(
      /(cereal|sucrilhos|flocos de milho|corn ?flakes)( de milho)? com leite/g,
      "cereal_com_leite",
    )
    .replace(/tapioca com ovos?/g, "crepioca")
    .replace(/p[aã]o com ovos?/g, "pão_com_ovo")
    .replace(/sopa de carne com legumes/g, "sopa de carne")
    .replace(/macarr[aã]o com (molho e )?carne mo[ií]da/g, "macarronada");
  const segments = source
    .split(/,|;|\+|\be\b|\bcom\b/)
    .map((part) => part.trim())
    .filter(Boolean);
  const found: ParsedFood[] = [];
  for (const segment of segments) {
    const alias = aliases.find(([pattern]) => pattern.test(segment));
    if (!alias) continue;
    const dissolved: Record<string, string> = { leite_po_integral: "leite_po_dissolvido" };
    const item = ingredientById.get(liquidMl ? (dissolved[alias[1]] ?? alias[1]) : alias[1]);
    if (!item) continue;
    let grams: number | null = null;
    const explicit = segment.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gramas?|ml|l|litros?)\b/);
    if (explicit) {
      const value = Number(explicit[1].replace(",", "."));
      grams = /kg|^l$|litro/.test(explicit[2]) ? value * 1000 : value;
    } else {
      const countMatch = segment.match(
        /(\d+(?:[.,]\d+)?)|\b(um|uma|dois|duas|tr[eê]s|quatro|cinco|meio|meia)\b/,
      );
      const count = countMatch
        ? countMatch[1]
          ? Number(countMatch[1].replace(",", "."))
          : (numberWords[countMatch[2]] ?? 1)
        : 1;
      const unit = unitGrams.find(([pattern]) => pattern.test(segment));
      const slice = item.id === "pizza" && /fatia/.test(segment);
      // Açúcar: colher de sopa ≈ 12 g; colher de chá ≈ 5 g.
      const sugarSpoon =
        /^acucar/.test(item.id) && /colher/.test(segment) ? (/sopa/.test(segment) ? 12 : 5) : 0;
      const base = slice
        ? 110
        : sugarSpoon
          ? sugarSpoon
          : unit && unit[1] > 0
            ? unit[1]
            : (defaultPortion[item.id] ?? 100);
      grams = count * base;
    }
    if (liquidMl && !explicit && segments.length === 1) grams = liquidMl;
    if (!grams || grams <= 0 || grams > 3000) continue;
    found.push({
      id: item.id,
      name: item.name,
      grams: Math.round(grams),
      nutrients: nutrientsFor(item, grams),
      estimatedPortion: !explicit,
    });
  }
  if (!found.length && liquidMl && /leite|suco|caf[eé]/.test(source)) {
    const alias = aliases.find(([pattern]) => pattern.test(source));
    const item = alias && ingredientById.get(alias[1]);
    if (item)
      found.push({
        id: item.id,
        name: item.name,
        grams: liquidMl,
        nutrients: nutrientsFor(item, liquidMl),
        estimatedPortion: false,
      });
  }
  return found;
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  return list.reduce((total, item) => {
    (Object.keys(total) as (keyof Nutrients)[]).forEach((key) => {
      total[key] += item[key];
    });
    return total;
  }, emptyNutrients());
}

/** Referências diárias adultas (IOM/ANVISA, aproximadas) para micronutrientes. */
export const microTargets: Record<keyof Micros, { label: string; unit: string; target: number }> = {
  vitC: { label: "Vitamina C", unit: "mg", target: 90 },
  vitA: { label: "Vitamina A", unit: "mcg", target: 800 },
  calcium: { label: "Cálcio", unit: "mg", target: 1000 },
  iron: { label: "Ferro", unit: "mg", target: 14 },
  potassium: { label: "Potássio", unit: "mg", target: 3500 },
};

/** Metas por objetivo quando o perfil ainda não tem metas individuais. */
export function goalTargets(objective: string | null | undefined, weightKg: number | null) {
  const w = weightKg && weightKg >= 30 && weightKg <= 250 ? weightKg : 70;
  const kcalPerKg =
    objective === "emagrecimento"
      ? 25
      : objective === "ganho_peso"
        ? 35
        : objective === "hipertrofia"
          ? 33
          : 30;
  const proteinPerKg =
    objective === "hipertrofia"
      ? 1.6
      : objective === "emagrecimento"
        ? 1.4
        : objective === "ganho_peso"
          ? 1.4
          : 1.0; // ISSN 2017 / RDA
  const kcal = Math.round((w * kcalPerKg) / 50) * 50;
  const protein = Math.round(w * proteinPerKg);
  const fat = Math.round((kcal * 0.28) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat, fiber: 25 };
}

export function goalAdvice(
  objective: string | null | undefined,
  total: Nutrients,
  target: ReturnType<typeof goalTargets>,
): string {
  const proteinGap = target.protein - total.protein;
  const kcalGap = target.kcal - total.kcal;
  if (objective === "emagrecimento")
    return kcalGap < 0
      ? "Você passou da meta calórica de hoje. Prefira legumes, saladas e proteínas magras no restante do dia."
      : proteinGap > 20
        ? `Faltam ~${Math.round(proteinGap)} g de proteína: priorize frango, peixe, ovos ou iogurte para manter a saciedade.`
        : "Ótimo equilíbrio para o emagrecimento. Mantenha a hidratação e as fibras.";
  if (objective === "hipertrofia")
    return proteinGap > 0
      ? `Faltam ~${Math.round(proteinGap)} g de proteína para a hipertrofia. Distribua entre as próximas refeições.`
      : "Meta de proteína atingida! Garanta carboidratos em torno do treino.";
  if (objective === "ganho_peso")
    return kcalGap > 300
      ? `Faltam ~${Math.round(kcalGap)} kcal. Inclua lanches calóricos e nutritivos: abacate, castanhas, aveia, banana.`
      : "Você está próximo da meta calórica para ganho de peso.";
  return Math.abs(kcalGap) < 250
    ? "Consumo equilibrado para a manutenção do peso."
    : kcalGap > 0
      ? `Ainda há ~${Math.round(kcalGap)} kcal disponíveis no dia.`
      : "Consumo acima do necessário para manter o peso.";
}

/** Porção usual (g ou ml) de um alimento, usada como "1 unidade/porção" na calculadora. */
export const typicalPortion = (id: string) => defaultPortion[id] ?? 100;

const liquidIds = new Set(["leite", "caldo_piranha", "tacaca", "iogurte", "sopa_carne_legumes"]);
/** Líquidos são medidos em ml (densidade ≈ 1 g/ml); sólidos em g. */
export function isLiquid(id: string): boolean {
  return liquidIds.has(id) || ingredientById.get(id)?.group === "bebidas";
}
export const measureUnit = (id: string) => (isLiquid(id) ? "ml" : "g");
