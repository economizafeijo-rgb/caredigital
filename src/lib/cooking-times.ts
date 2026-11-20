import { ingredientById, portionNutrition } from "./nutrition-catalog";

/**
 * Tempos de preparo de referência para a cozinha de casa (panela comum, panela de pressão,
 * frigideira). Variam com o tamanho do pedaço, o fogão e a altitude: confira o ponto com um garfo.
 * Não são uma tabela oficial de composição de alimentos.
 */
export type CookGroup = "ovos" | "raizes" | "manha" | "graos" | "proteinas" | "legumes";
export type Glyph =
  | "egg"
  | "fried"
  | "omelet"
  | "disc"
  | "tuber"
  | "banana"
  | "liquid"
  | "grain"
  | "chunks"
  | "floret"
  | "sticks"
  | "corn"
  | "meat"
  | "fish"
  | "pasta";
export type Vessel = "panela" | "frigideira";

export const cookGroups: { key: CookGroup; label: string; color: string }[] = [
  { key: "ovos", label: "Ovos", color: "#f5c542" },
  { key: "raizes", label: "Raízes e bananas", color: "#e8833a" },
  { key: "manha", label: "Café da manhã", color: "#e6caa0" },
  { key: "graos", label: "Grãos e massas", color: "#d9b26f" },
  { key: "proteinas", label: "Carnes e peixes", color: "#d98a6a" },
  { key: "legumes", label: "Legumes e sopas", color: "#5aa84a" },
];

export type CookPreset = {
  key: string;
  label: string;
  minutes: number;
  from: string;
  note?: string;
};
export type CookQty = {
  unit: [string, string];
  min: number;
  max: number;
  def: number;
  quick?: number[];
  /** Gramas de cada unidade, para estimar as calorias pelo catálogo nutricional. */
  gramsEach?: number;
  catalogId?: string;
  hint?: (n: number, preset: string) => string;
};
export type CookFood = {
  id: string;
  name: string;
  group: CookGroup;
  glyph: Glyph;
  color: string;
  vessel: Vessel;
  presets: CookPreset[];
  defaultPreset: string;
  qty?: CookQty;
  steps: string[];
  after?: string;
  keywords?: string;
};

const BOIL = "a água ferver";
const PRESS = "a panela de pressão começar a chiar";
const HEAT = "a frigideira esquentar";
const START = "colocar no fogo";
const STEAM = "sair vapor da panela";

const nfmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
export const plural = (n: number, [one, many]: [string, string]) => (n === 1 ? one : many);
const p = (
  key: string,
  label: string,
  minutes: number,
  from: string,
  note?: string,
): CookPreset => ({ key, label, minutes, from, note });

export const cookFoods: CookFood[] = [
  {
    id: "ovo_cozido",
    name: "Ovo cozido",
    group: "ovos",
    glyph: "egg",
    color: "#f5c542",
    vessel: "panela",
    defaultPreset: "duro",
    keywords: "ovos cozidos",
    presets: [
      p("mole", "Gema mole", 6, BOIL, "Clara firme e gema líquida."),
      p("cremoso", "Gema cremosa", 8, BOIL, "Gema macia, quase firme."),
      p("duro", "Gema dura", 11, BOIL, "Ponto firme, bom para saladas e lanches."),
    ],
    qty: {
      unit: ["ovo", "ovos"],
      min: 1,
      max: 24,
      def: 2,
      quick: [1, 2, 4, 6, 12],
      gramsEach: 50,
      catalogId: "ovo",
      hint: (n) =>
        n >= 7
          ? "Com muitos ovos, use uma panela grande com a água cobrindo todos e conte o tempo quando ela voltar a ferver."
          : "O tempo é o mesmo para 1 ou para vários ovos, desde que a água cubra todos.",
    },
    steps: [
      "Ferva água suficiente para cobrir os ovos.",
      "Baixe os ovos com uma colher, sem deixar cair.",
      "Inicie o timer e mantenha fervura leve.",
      "Ao terminar, passe os ovos para água gelada por 2 minutos.",
    ],
    after: "A água gelada para o cozimento e facilita descascar.",
  },
  {
    id: "ovo_frito",
    name: "Ovo frito",
    group: "ovos",
    glyph: "fried",
    color: "#f5c542",
    vessel: "frigideira",
    defaultPreset: "media",
    keywords: "ovos fritos",
    presets: [
      p("mole", "Gema mole", 2, HEAT),
      p("media", "Gema média", 3, HEAT),
      p("firme", "Gema firme", 4, HEAT, "Vire com cuidado na metade do tempo."),
    ],
    qty: {
      unit: ["ovo", "ovos"],
      min: 1,
      max: 6,
      def: 2,
      quick: [1, 2, 3, 4],
      gramsEach: 50,
      catalogId: "ovo_frito",
      hint: () => "Use pouca gordura e fogo médio para a clara não queimar.",
    },
    steps: [
      "Aqueça a frigideira com um fio de óleo.",
      "Quebre os ovos sem estourar as gemas.",
      "Inicie o timer em fogo médio.",
      "Retire e escorra em papel toalha.",
    ],
  },
  {
    id: "omelete",
    name: "Omelete",
    group: "ovos",
    glyph: "omelet",
    color: "#f2b632",
    vessel: "frigideira",
    defaultPreset: "macia",
    keywords: "ovo mexido",
    presets: [p("macia", "Omelete macia", 3, HEAT), p("firme", "Bem passada", 5, HEAT)],
    qty: {
      unit: ["ovo", "ovos"],
      min: 1,
      max: 6,
      def: 2,
      quick: [1, 2, 3, 4],
      gramsEach: 50,
      catalogId: "omelete",
    },
    steps: [
      "Bata os ovos com uma pitada de sal.",
      "Aqueça a frigideira antiaderente.",
      "Despeje os ovos e inicie o timer em fogo baixo.",
      "Dobre ao meio quando a superfície firmar.",
    ],
  },
  {
    id: "batata_doce",
    name: "Batata-doce",
    group: "raizes",
    glyph: "tuber",
    color: "#e8833a",
    vessel: "panela",
    defaultPreset: "pedacos",
    keywords: "batata doce",
    presets: [
      p("pedacos", "Em pedaços (panela comum)", 15, BOIL, "Pedaços de 3 cm."),
      p("inteira", "Inteira média (panela comum)", 30, BOIL),
      p("pressao", "Panela de pressão (pedaços)", 10, PRESS),
      p("micro", "Micro-ondas (furada)", 7, START, "Vire na metade do tempo."),
    ],
    qty: {
      unit: ["batata média", "batatas médias"],
      min: 1,
      max: 8,
      def: 2,
      quick: [1, 2, 3, 4],
      gramsEach: 150,
      catalogId: "batata_doce",
      hint: (n) =>
        n > 1
          ? "Escolha batatas de tamanho parecido para cozinharem juntas."
          : "Fure com um garfo: se entrar sem resistência, está pronta.",
    },
    steps: [
      "Lave bem e, se quiser, descasque.",
      "Cubra com água fria na panela.",
      "Inicie o timer quando a água ferver.",
      "Teste com um garfo antes de escorrer.",
    ],
  },
  {
    id: "macaxeira",
    name: "Macaxeira (mandioca)",
    group: "raizes",
    glyph: "tuber",
    color: "#e9d8b4",
    vessel: "panela",
    defaultPreset: "comum",
    keywords: "mandioca aipim",
    presets: [
      p("comum", "Panela comum (pedaços)", 25, BOIL),
      p("pressao", "Panela de pressão", 12, PRESS),
    ],
    qty: {
      unit: ["porção (150 g)", "porções (150 g)"],
      min: 1,
      max: 8,
      def: 2,
      quick: [1, 2, 3, 4],
      gramsEach: 150,
      catalogId: "macaxeira",
      hint: () =>
        "Corte em pedaços e retire o fio central. Está pronta quando se desmancha ao garfo.",
    },
    steps: [
      "Descasque e corte em pedaços.",
      "Cubra com água e uma pitada de sal.",
      "Inicie o timer quando a água ferver.",
      "Escorra e retire o fio do meio.",
    ],
  },
  {
    id: "inhame",
    name: "Inhame",
    group: "raizes",
    glyph: "tuber",
    color: "#d8c29a",
    vessel: "panela",
    defaultPreset: "comum",
    presets: [p("comum", "Panela comum", 25, BOIL), p("pressao", "Panela de pressão", 12, PRESS)],
    qty: {
      unit: ["porção (150 g)", "porções (150 g)"],
      min: 1,
      max: 8,
      def: 1,
      gramsEach: 150,
      catalogId: "inhame",
    },
    steps: [
      "Descasque com luvas se a casca irritar a pele.",
      "Cubra com água fria.",
      "Inicie o timer quando a água ferver.",
      "Teste com um garfo.",
    ],
  },
  {
    id: "batata",
    name: "Batata inglesa",
    group: "raizes",
    glyph: "tuber",
    color: "#e7c97a",
    vessel: "panela",
    defaultPreset: "pedacos",
    presets: [
      p("pedacos", "Em pedaços", 18, BOIL),
      p("inteira", "Inteira média", 30, BOIL),
      p("pressao", "Panela de pressão (pedaços)", 8, PRESS),
    ],
    qty: {
      unit: ["batata", "batatas"],
      min: 1,
      max: 10,
      def: 2,
      quick: [1, 2, 4],
      gramsEach: 130,
      catalogId: "batata",
    },
    steps: [
      "Lave e corte em pedaços iguais.",
      "Cubra com água fria e sal.",
      "Inicie o timer quando a água ferver.",
      "Teste com um garfo.",
    ],
  },
  {
    id: "banana_terra",
    name: "Banana-da-terra cozida",
    group: "raizes",
    glyph: "banana",
    color: "#f1c232",
    vessel: "panela",
    defaultPreset: "casca",
    keywords: "banana comprida pacovã",
    presets: [
      p("casca", "Com casca", 18, BOIL, "Corte a casca no comprimento para descascar depois."),
      p("pedacos", "Descascada, em pedaços", 10, BOIL),
    ],
    qty: {
      unit: ["banana", "bananas"],
      min: 1,
      max: 8,
      def: 2,
      quick: [1, 2, 3, 4],
      gramsEach: 120,
      catalogId: "banana_cozida",
    },
    steps: [
      "Lave as bananas e faça um corte na casca.",
      "Cubra com água.",
      "Inicie o timer quando a água ferver.",
      "Escorra e descasque ainda quente.",
    ],
  },
  {
    id: "banana_prata",
    name: "Banana-prata cozida",
    group: "raizes",
    glyph: "banana",
    color: "#f7d34a",
    vessel: "panela",
    defaultPreset: "casca",
    keywords: "banana cozida",
    presets: [p("casca", "Com casca", 9, BOIL), p("rodelas", "Em rodelas", 5, BOIL)],
    qty: { unit: ["banana", "bananas"], min: 1, max: 8, def: 2, quick: [1, 2, 3] },
    steps: [
      "Lave as bananas e corte as pontas.",
      "Cubra com água.",
      "Inicie o timer quando a água ferver.",
      "Escorra e sirva morna.",
    ],
  },
  {
    id: "mingau_aveia",
    name: "Mingau de aveia",
    group: "manha",
    glyph: "liquid",
    color: "#e6caa0",
    vessel: "panela",
    defaultPreset: "finos",
    keywords: "aveia",
    presets: [
      p("finos", "Aveia em flocos finos", 4, START, "Mexa sempre."),
      p("grossos", "Aveia em flocos grossos", 7, START, "Mexa sempre."),
    ],
    qty: {
      unit: ["porção (200 ml)", "porções (200 ml)"],
      min: 1,
      max: 6,
      def: 1,
      quick: [1, 2, 3],
      gramsEach: 250,
      catalogId: "mingau_aveia_leite",
      hint: (n) => `${n * 200} ml de leite (ou água) e ${n * 2} colheres (sopa) de aveia.`,
    },
    steps: [
      "Misture o leite e a aveia na panela fria.",
      "Leve ao fogo médio e inicie o timer.",
      "Mexa sem parar até engrossar.",
      "Sirva morno.",
    ],
  },
  {
    id: "mingau_maisena",
    name: "Mingau de maisena",
    group: "manha",
    glyph: "liquid",
    color: "#f3e2b3",
    vessel: "panela",
    defaultPreset: "ponto",
    keywords: "maizena",
    presets: [p("ponto", "No ponto", 5, START), p("cremoso", "Bem cremoso", 8, START)],
    qty: {
      unit: ["porção (200 ml)", "porções (200 ml)"],
      min: 1,
      max: 6,
      def: 1,
      quick: [1, 2, 3],
      gramsEach: 250,
      catalogId: "mingau_maisena",
      hint: (n) =>
        `${n * 200} ml de leite e ${n} ${plural(n, ["colher", "colheres"])} (sopa) de maisena, dissolvida no leite frio.`,
    },
    steps: [
      "Dissolva a maisena no leite frio.",
      "Leve ao fogo médio e inicie o timer.",
      "Mexa sempre para não empelotar.",
      "Retire quando cobrir as costas da colher.",
    ],
  },
  {
    id: "canjica",
    name: "Canjica / mungunzá",
    group: "manha",
    glyph: "grain",
    color: "#f4ecd2",
    vessel: "panela",
    defaultPreset: "pressao",
    keywords: "milho branco mungunza",
    presets: [
      p(
        "pressao",
        "Panela de pressão (milho de molho)",
        35,
        PRESS,
        "Deixe o milho de molho por 8 horas.",
      ),
      p("comum", "Panela comum (milho de molho)", 90, BOIL),
    ],
    qty: {
      unit: ["xícara de milho", "xícaras de milho"],
      min: 1,
      max: 6,
      def: 1,
      hint: (n) => `${n} ${plural(n, ["xícara", "xícaras"])} de milho e cerca de ${n * 4} de água.`,
    },
    steps: [
      "Deixe o milho de molho na véspera.",
      "Escorra e cubra com água nova.",
      "Inicie o timer conforme o método.",
      "Acrescente leite, açúcar e coco no final.",
    ],
  },
  {
    id: "cuscuz",
    name: "Cuscuz de milho",
    group: "manha",
    glyph: "grain",
    color: "#f2c94c",
    vessel: "panela",
    defaultPreset: "vapor",
    keywords: "flocão",
    presets: [p("vapor", "Cuscuzeira ou vapor", 10, STEAM)],
    qty: {
      unit: ["xícara de flocão", "xícaras de flocão"],
      min: 1,
      max: 6,
      def: 2,
      quick: [1, 2, 3],
      hint: (n) =>
        `${n} ${plural(n, ["xícara", "xícaras"])} de flocão, ${nfmt(n / 2)} de água e uma pitada de sal. Hidrate e deixe descansar 5 minutos antes.`,
    },
    steps: [
      "Misture o flocão com a água e o sal.",
      "Deixe hidratar por 5 minutos.",
      "Monte na cuscuzeira e aguarde sair vapor.",
      "Inicie o timer.",
    ],
  },
  {
    id: "tapioca",
    name: "Tapioca",
    group: "manha",
    glyph: "disc",
    color: "#f5f1e6",
    vessel: "frigideira",
    defaultPreset: "simples",
    keywords: "goma beiju",
    presets: [p("simples", "Goma hidratada", 2, HEAT, "Cerca de 1 minuto de cada lado.")],
    qty: {
      unit: ["tapioca", "tapiocas"],
      min: 1,
      max: 6,
      def: 1,
      quick: [1, 2, 3],
      gramsEach: 80,
      catalogId: "tapioca",
      hint: () => "Peneire a goma sobre a frigideira quente, sem untar.",
    },
    steps: [
      "Aqueça a frigideira antiaderente.",
      "Espalhe a goma peneirada em camada uniforme.",
      "Inicie o timer em fogo médio.",
      "Recheie e dobre ao final.",
    ],
  },
  {
    id: "crepioca",
    name: "Crepioca",
    group: "manha",
    glyph: "disc",
    color: "#efd9a8",
    vessel: "frigideira",
    defaultPreset: "ponto",
    presets: [p("ponto", "No ponto", 4, HEAT, "Cerca de 2 minutos de cada lado.")],
    qty: {
      unit: ["crepioca", "crepiocas"],
      min: 1,
      max: 4,
      def: 1,
      gramsEach: 90,
      catalogId: "crepioca",
    },
    steps: [
      "Misture 1 ovo com 2 colheres (sopa) de goma.",
      "Aqueça a frigideira antiaderente.",
      "Despeje a massa e inicie o timer.",
      "Vire quando soltar do fundo.",
    ],
  },
  {
    id: "arroz",
    name: "Arroz",
    group: "graos",
    glyph: "grain",
    color: "#f6f3ea",
    vessel: "panela",
    defaultPreset: "branco",
    keywords: "arroz branco integral",
    presets: [
      p("branco", "Arroz branco", 18, BOIL, "Fogo baixo e panela tampada. Descanse 5 minutos."),
      p("parboilizado", "Arroz parboilizado", 22, BOIL),
      p("integral", "Arroz integral", 40, BOIL, "Fogo baixo e panela tampada."),
    ],
    qty: {
      unit: ["xícara de arroz", "xícaras de arroz"],
      min: 1,
      max: 8,
      def: 1,
      quick: [1, 2, 3, 4],
      hint: (n, preset) =>
        `${n} ${plural(n, ["xícara", "xícaras"])} de arroz e ${nfmt(n * (preset === "integral" ? 2.5 : 2))} de água.`,
    },
    steps: [
      "Refogue o arroz lavado com um pouco de óleo e alho.",
      "Acrescente a água quente e o sal.",
      "Quando ferver, baixe o fogo, tampe e inicie o timer.",
      "Desligue e deixe descansar 5 minutos tampado.",
    ],
  },
  {
    id: "feijao",
    name: "Feijão carioca",
    group: "graos",
    glyph: "grain",
    color: "#8a4b2a",
    vessel: "panela",
    defaultPreset: "pressao_molho",
    keywords: "feijao",
    presets: [
      p(
        "pressao_molho",
        "Panela de pressão (de molho)",
        25,
        PRESS,
        "Deixe de molho por 8 horas e troque a água.",
      ),
      p("pressao", "Panela de pressão (sem molho)", 40, PRESS),
      p("comum", "Panela comum (de molho)", 75, BOIL),
    ],
    qty: {
      unit: ["xícara de feijão", "xícaras de feijão"],
      min: 1,
      max: 8,
      def: 2,
      quick: [1, 2, 3, 4],
      hint: (n) =>
        `${n} ${plural(n, ["xícara", "xícaras"])} de feijão e cerca de ${n * 3} de água.`,
    },
    steps: [
      "Escolha e lave o feijão (de molho, escorra a água).",
      "Cubra com água nova.",
      "Inicie o timer no ponto do método escolhido.",
      "Desligue o fogo e só abra a panela quando sair toda a pressão.",
    ],
  },
  {
    id: "feijao_corda",
    name: "Feijão-de-corda (feijão-verde)",
    group: "graos",
    glyph: "grain",
    color: "#c9a86a",
    vessel: "panela",
    defaultPreset: "pressao",
    keywords: "feijão verde",
    presets: [p("pressao", "Panela de pressão", 18, PRESS), p("comum", "Panela comum", 40, BOIL)],
    qty: {
      unit: ["xícara de feijão", "xícaras de feijão"],
      min: 1,
      max: 8,
      def: 2,
      hint: (n) =>
        `${n} ${plural(n, ["xícara", "xícaras"])} de feijão e cerca de ${n * 3} de água.`,
    },
    steps: [
      "Lave o feijão.",
      "Cubra com água.",
      "Inicie o timer no ponto do método.",
      "Confira se está macio antes de temperar.",
    ],
  },
  {
    id: "lentilha",
    name: "Lentilha",
    group: "graos",
    glyph: "grain",
    color: "#a3703a",
    vessel: "panela",
    defaultPreset: "comum",
    presets: [p("comum", "Panela comum", 22, BOIL), p("pressao", "Panela de pressão", 10, PRESS)],
    qty: {
      unit: ["xícara", "xícaras"],
      min: 1,
      max: 6,
      def: 1,
      hint: (n) => `${n} ${plural(n, ["xícara", "xícaras"])} de lentilha e ${n * 3} de água.`,
    },
    steps: [
      "Lave a lentilha e retire as impurezas.",
      "Cubra com água.",
      "Inicie o timer quando a água ferver.",
      "Tempere depois de cozida.",
    ],
  },
  {
    id: "macarrao",
    name: "Macarrão",
    group: "graos",
    glyph: "pasta",
    color: "#f1d98a",
    vessel: "panela",
    defaultPreset: "ponto",
    keywords: "espaguete massa",
    presets: [p("aldente", "Al dente", 8, BOIL), p("ponto", "No ponto", 10, BOIL)],
    qty: {
      unit: ["porção (100 g)", "porções (100 g)"],
      min: 1,
      max: 8,
      def: 2,
      quick: [1, 2, 3, 4],
      hint: (n) =>
        `${n * 100} g de macarrão em ${n} ${plural(n, ["litro", "litros"])} de água com sal. Siga a embalagem se o tempo for diferente.`,
    },
    steps: [
      "Ferva a água com sal.",
      "Coloque o macarrão e mexa.",
      "Inicie o timer.",
      "Escorra e use um pouco da água do cozimento no molho.",
    ],
  },
  {
    id: "frango",
    name: "Peito de frango cozido",
    group: "proteinas",
    glyph: "meat",
    color: "#efd3b0",
    vessel: "panela",
    defaultPreset: "pedacos",
    keywords: "frango galinha coxa",
    presets: [
      p("pedacos", "Peito em pedaços", 15, BOIL),
      p("inteiro", "Peito inteiro", 22, BOIL),
      p("coxa", "Coxa e sobrecoxa", 30, BOIL),
      p("pressao", "Panela de pressão (pedaços)", 12, PRESS),
    ],
    qty: {
      unit: ["peito (120 g)", "peitos (120 g)"],
      min: 1,
      max: 8,
      def: 2,
      gramsEach: 120,
      catalogId: "frango",
      hint: () => "O centro deve estar branco, sem partes rosadas, e o suco da carne claro.",
    },
    steps: [
      "Tempere o frango.",
      "Cubra com água fervendo.",
      "Inicie o timer em fogo médio.",
      "Corte o centro de um pedaço para conferir.",
    ],
  },
  {
    id: "carne_moida",
    name: "Carne moída refogada",
    group: "proteinas",
    glyph: "meat",
    color: "#8b4a2b",
    vessel: "panela",
    defaultPreset: "refogada",
    presets: [
      p("refogada", "Refogada", 12, HEAT, "Mexa de vez em quando."),
      p("molho", "Com molho", 20, HEAT),
    ],
    qty: {
      unit: ["porção (100 g)", "porções (100 g)"],
      min: 1,
      max: 8,
      def: 2,
      gramsEach: 100,
      catalogId: "carne_moida",
    },
    steps: [
      "Aqueça a panela com um fio de óleo.",
      "Acrescente a carne e inicie o timer.",
      "Desmanche os caroços com a colher.",
      "Tempere e finalize quando secar o líquido.",
    ],
  },
  {
    id: "carne_panela",
    name: "Carne de panela (cubos)",
    group: "proteinas",
    glyph: "meat",
    color: "#9a4f30",
    vessel: "panela",
    defaultPreset: "pressao",
    presets: [p("pressao", "Panela de pressão", 35, PRESS), p("comum", "Panela comum", 90, BOIL)],
    steps: [
      "Doure a carne em cubos.",
      "Cubra com água e tempere.",
      "Inicie o timer no ponto do método.",
      "Confira se a carne desfia com facilidade.",
    ],
  },
  {
    id: "peixe",
    name: "Peixe cozido",
    group: "proteinas",
    glyph: "fish",
    color: "#e6c8b0",
    vessel: "panela",
    defaultPreset: "filé",
    keywords: "tambaqui tilápia pirarucu",
    presets: [p("filé", "Filé ou posta fina", 10, BOIL), p("posta", "Posta grossa", 15, BOIL)],
    steps: [
      "Tempere o peixe com limão e sal.",
      "Coloque no caldo já fervendo.",
      "Inicie o timer em fogo médio.",
      "Retire quando a carne se soltar em lascas.",
    ],
  },
  {
    id: "sopa",
    name: "Sopa de legumes",
    group: "legumes",
    glyph: "liquid",
    color: "#e9853d",
    vessel: "panela",
    defaultPreset: "comum",
    keywords: "caldo",
    presets: [p("comum", "Panela comum", 35, BOIL), p("pressao", "Panela de pressão", 12, PRESS)],
    qty: {
      unit: ["prato (300 ml)", "pratos (300 ml)"],
      min: 1,
      max: 6,
      def: 2,
      gramsEach: 300,
      catalogId: "sopa_legumes",
      hint: (n) => `Cerca de ${n * 350} ml de água para ${n} ${plural(n, ["prato", "pratos"])}.`,
    },
    steps: [
      "Corte os legumes em cubos.",
      "Cubra com água e tempere.",
      "Inicie o timer no ponto do método.",
      "Confira se os legumes estão macios.",
    ],
  },
  {
    id: "cenoura",
    name: "Cenoura",
    group: "legumes",
    glyph: "chunks",
    color: "#f08a24",
    vessel: "panela",
    defaultPreset: "rodelas",
    presets: [p("rodelas", "Em rodelas", 8, BOIL), p("inteira", "Inteira", 20, BOIL)],
    qty: { unit: ["cenoura", "cenouras"], min: 1, max: 8, def: 2 },
    steps: [
      "Lave e descasque.",
      "Corte em rodelas iguais.",
      "Inicie o timer quando a água ferver.",
      "Escorra e passe em água fria se for usar depois.",
    ],
  },
  {
    id: "brocolis",
    name: "Brócolis",
    group: "legumes",
    glyph: "floret",
    color: "#3f9a4a",
    vessel: "panela",
    defaultPreset: "aldente",
    presets: [
      p("aldente", "Ao dente", 4, BOIL, "Verde-vivo e crocante."),
      p("macio", "Macio", 7, BOIL),
    ],
    steps: [
      "Separe em buquês e lave.",
      "Coloque na água fervendo com sal.",
      "Inicie o timer.",
      "Escorra e passe em água gelada para manter a cor.",
    ],
  },
  {
    id: "couve_flor",
    name: "Couve-flor",
    group: "legumes",
    glyph: "floret",
    color: "#efece0",
    vessel: "panela",
    defaultPreset: "aldente",
    presets: [p("aldente", "Ao dente", 6, BOIL), p("macia", "Macia", 9, BOIL)],
    steps: [
      "Separe em buquês e lave.",
      "Coloque na água fervendo.",
      "Inicie o timer.",
      "Escorra bem.",
    ],
  },
  {
    id: "vagem",
    name: "Vagem",
    group: "legumes",
    glyph: "sticks",
    color: "#5aa84a",
    vessel: "panela",
    defaultPreset: "aldente",
    presets: [p("aldente", "Ao dente", 6, BOIL), p("macia", "Macia", 10, BOIL)],
    steps: [
      "Retire as pontas e lave.",
      "Coloque na água fervendo com sal.",
      "Inicie o timer.",
      "Escorra e passe em água fria.",
    ],
  },
  {
    id: "chuchu",
    name: "Chuchu",
    group: "legumes",
    glyph: "chunks",
    color: "#a6d17a",
    vessel: "panela",
    defaultPreset: "cubos",
    presets: [p("cubos", "Em cubos", 10, BOIL)],
    steps: [
      "Descasque e corte em cubos.",
      "Coloque na água fervendo.",
      "Inicie o timer.",
      "Escorra e tempere.",
    ],
  },
  {
    id: "abobora",
    name: "Abóbora",
    group: "legumes",
    glyph: "chunks",
    color: "#f2a03d",
    vessel: "panela",
    defaultPreset: "cubos",
    keywords: "jerimum",
    presets: [p("cubos", "Em cubos", 12, BOIL), p("pressao", "Panela de pressão", 4, PRESS)],
    steps: [
      "Descasque e corte em cubos.",
      "Cubra com água.",
      "Inicie o timer no ponto do método.",
      "Escorra e amasse, se quiser purê.",
    ],
  },
  {
    id: "beterraba",
    name: "Beterraba",
    group: "legumes",
    glyph: "chunks",
    color: "#a2234f",
    vessel: "panela",
    defaultPreset: "pressao",
    presets: [
      p("pressao", "Panela de pressão (inteira)", 20, PRESS),
      p("comum", "Panela comum (inteira)", 40, BOIL),
    ],
    steps: [
      "Lave sem cortar nem descascar.",
      "Cubra com água.",
      "Inicie o timer no ponto do método.",
      "Descasque depois de morna.",
    ],
  },
  {
    id: "milho",
    name: "Milho verde (espiga)",
    group: "legumes",
    glyph: "corn",
    color: "#f4c430",
    vessel: "panela",
    defaultPreset: "comum",
    keywords: "espiga",
    presets: [p("comum", "Panela comum", 20, BOIL), p("pressao", "Panela de pressão", 10, PRESS)],
    qty: { unit: ["espiga", "espigas"], min: 1, max: 8, def: 2, quick: [1, 2, 3, 4] },
    steps: [
      "Retire as palhas e os cabelos.",
      "Cubra com água.",
      "Inicie o timer no ponto do método.",
      "Sirva morno.",
    ],
  },
];

export const cookFoodById = new Map(cookFoods.map((f) => [f.id, f]));
export const presetOf = (food: CookFood, key: string) =>
  food.presets.find((x) => x.key === key) ??
  food.presets.find((x) => x.key === food.defaultPreset) ??
  food.presets[0];

export const norm = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
export const matchesCookFood = (food: CookFood, query: string) => {
  const q = norm(query.trim());
  return !q || norm(`${food.name} ${food.keywords ?? ""}`).includes(q);
};

/** Calorias e proteína estimadas para a quantidade escolhida, pelo catálogo nutricional. */
export function qtyNutrition(food: CookFood, qty: number) {
  const cfg = food.qty;
  if (!cfg?.catalogId || !cfg.gramsEach) return null;
  const item = ingredientById.get(cfg.catalogId);
  if (!item) return null;
  const n = portionNutrition(item, qty * cfg.gramsEach);
  return n.kcal === null
    ? null
    : { kcal: Math.round(n.kcal), protein: n.protein ?? 0, grams: qty * cfg.gramsEach };
}

/** "1 h 05 min", "8 min" ou "2 min 30 s". */
export function formatDuration(minutes: number) {
  const total = Math.round(minutes * 60),
    h = Math.floor(total / 3600),
    m = Math.floor((total % 3600) / 60),
    s = total % 60;
  if (h) return `${h} h${m ? ` ${String(m).padStart(2, "0")} min` : ""}`;
  return s ? `${m} min ${s} s` : `${m} min`;
}

/** Relógio "mm:ss" ou "h:mm:ss". */
export function formatClock(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds)),
    h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
