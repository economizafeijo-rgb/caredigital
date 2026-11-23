/** Categories are persisted as distinct values in Supabase. Other beverages do not
 * increase the water-only goal; foods do not mark scheduled meals completed. */
export const foodKinds = [
  {
    value: "fruta",
    label: "Frutas",
    example: "Ex.: banana, mamão, maçã",
    hint: "Uma fruta ou porção de frutas",
  },
  {
    value: "cafe_manha",
    label: "Café da manhã",
    example: "Ex.: mingau de aveia, banana e ovo",
    hint: "Refeição da manhã",
  },
  {
    value: "almoco",
    label: "Almoço",
    example: "Ex.: arroz, carne cozida e macaxeira (100 g cada)",
    hint: "Refeição principal",
  },
  {
    value: "jantar",
    label: "Jantar",
    example: "Ex.: sopa de legumes com frango",
    hint: "Refeição da noite",
  },
  {
    value: "lanche",
    label: "Lanche",
    example: "Ex.: sanduíche, banana ou tapioca",
    hint: "Entre as refeições",
  },
  {
    value: "ceia",
    label: "Ceia",
    example: "Ex.: fruta ou mingau leve",
    hint: "Pequena refeição noturna",
  },
  {
    value: "refeicao",
    label: "Refeição completa",
    example: "Ex.: prato com arroz, feijão, carne e legumes",
    hint: "Outro tipo de refeição",
  },
  {
    value: "salada",
    label: "Salada / legumes",
    example: "Ex.: salada de folhas e legumes cozidos",
    hint: "Vegetais consumidos",
  },
  {
    value: "sopa",
    label: "Sopa / caldo",
    example: "Ex.: sopa de legumes com batata",
    hint: "Sopas e caldos",
  },
  {
    value: "sobremesa",
    label: "Sobremesa",
    example: "Ex.: gelatina, pudim ou doce",
    hint: "Sobremesas consumidas",
  },
] as const;

export const beverageKinds = [
  {
    value: "agua",
    label: "Água",
    example: "Água",
    hint: "Conta para a meta de líquidos",
    amount: 200,
  },
  {
    value: "cha",
    label: "Chá",
    example: "Ex.: chá de camomila",
    hint: "Infusão ou chá preparado",
    amount: 200,
  },
  {
    value: "suco",
    label: "Suco",
    example: "Ex.: suco natural de maçã",
    hint: "Suco natural ou industrializado",
    amount: 200,
  },
  {
    value: "cafe",
    label: "Café",
    example: "Ex.: café coado",
    hint: "Café, expresso ou com leite",
    amount: 100,
  },
  {
    value: "energetico",
    label: "Energético",
    example: "Ex.: energético em lata",
    hint: "Bebida energética",
    amount: 250,
  },
  {
    value: "suplemento",
    label: "Suplemento líquido",
    example: "Ex.: suplemento nutricional pronto",
    hint: "Suplemento consumido como líquido",
    amount: 200,
  },
  {
    value: "shake",
    label: "Shake",
    example: "Ex.: shake de proteína com banana",
    hint: "Batida proteica ou shake",
    amount: 300,
  },
  {
    value: "isotonico",
    label: "Isotônico",
    example: "Ex.: bebida esportiva",
    hint: "Isotônico ou bebida eletrolítica",
    amount: 500,
  },
  {
    value: "vitamina",
    label: "Vitamina / smoothie",
    example: "Ex.: vitamina de mamão e aveia",
    hint: "Frutas batidas e smoothies",
    amount: 250,
  },
  {
    value: "leite",
    label: "Leite / derivado",
    example: "Ex.: leite sem lactose",
    hint: "Leite ou bebida semelhante",
    amount: 200,
  },
  {
    value: "agua_coco",
    label: "Água de coco",
    example: "Água de coco natural",
    hint: "Conta para a hidratação diária",
    amount: 250,
  },
  {
    value: "refrigerante",
    label: "Refrigerante",
    example: "Ex.: refrigerante sem açúcar",
    hint: "Bebida gaseificada",
    amount: 250,
  },
  {
    value: "outra",
    label: "Outra bebida",
    example: "Descreva a bebida que tomou",
    hint: "Outra opção não listada",
    amount: 200,
  },
] as const;

export type FoodKind = (typeof foodKinds)[number]["value"];
export type BeverageKind = (typeof beverageKinds)[number]["value"];
export type IntakeKind = FoodKind | BeverageKind;
const foodSet = new Set<string>(foodKinds.map((c) => c.value));
const beverageSet = new Set<string>(beverageKinds.map((c) => c.value));
export const isFoodKind = (kind: string): kind is FoodKind => foodSet.has(kind);
export const isBeverageKind = (kind: string): kind is BeverageKind => beverageSet.has(kind);
export const foodCategory = (kind: string) => foodKinds.find((c) => c.value === kind);
export const beverageCategory = (kind: string) => beverageKinds.find((c) => c.value === kind);
export const intakeCategory = (kind: string) => foodCategory(kind) || beverageCategory(kind);

/** Alimentos típicos de cada refeição (inclui pratos do Acre). O texto entra na descrição e é calculado pelo leitor de alimentos. */
export const typicalFoods: Record<FoodKind, { label: string; text: string }[]> = {
  cafe_manha: [
    { label: "Café preto", text: "1 xícara de café" },
    { label: "Café com leite", text: "1 xícara de café com leite" },
    { label: "Pão francês", text: "1 pão francês" },
    { label: "Pão com manteiga", text: "1 pão francês com manteiga" },
    { label: "Tapioca", text: "1 tapioca" },
    { label: "Cuscuz", text: "1 prato de cuscuz" },
    { label: "Baixaria", text: "1 prato de baixaria" },
    { label: "Ovo cozido", text: "2 ovos cozidos" },
    { label: "Queijo coalho", text: "1 fatia de queijo coalho" },
    { label: "Banana cozida", text: "1 banana cozida" },
    { label: "Macaxeira", text: "1 porção de macaxeira" },
    { label: "Mamão", text: "1 fatia de mamão" },
    { label: "Mingau de aveia", text: "1 prato de mingau de aveia" },
    { label: "Iogurte", text: "1 iogurte" },
    { label: "Leite", text: "1 copo de leite" },
    { label: "Pão massa fina", text: "1 pão massa fina" },
    { label: "Queijo mussarela", text: "2 fatias de queijo mussarela" },
    { label: "Presunto", text: "2 fatias de presunto" },
    { label: "Cereal com leite", text: "1 tigela de cereal com leite" },
    { label: "Mingau de maisena", text: "1 prato de mingau de maisena" },
    { label: "Pasta de amendoim", text: "1 colher de sopa de pasta de amendoim" },
    { label: "Cuscuz com ovos", text: "1 prato de cuscuz, 2 ovos" },
    { label: "Cream cracker", text: "30 g de bolacha cream cracker" },
    { label: "Manteiga", text: "10 g de manteiga" },
    { label: "Maionese", text: "15 g de maionese" },
  ],
  almoco: [
    { label: "Cozido de carne com legumes", text: "cozido de carne" },
    { label: "Carne assada", text: "120 g de carne assada" },
    { label: "Mixto de carnes assadas", text: "mixto de carnes assadas" },
    { label: "Arroz", text: "4 colheres de sopa de arroz" },
    { label: "Feijão", text: "1 concha de feijão" },
    { label: "Frango", text: "1 filé de frango" },
    { label: "Frango cozido", text: "1 porção de frango cozido" },
    { label: "Frango ao molho", text: "1 porção de frango ao molho" },
    { label: "Carne", text: "1 bife de carne" },
    { label: "Carne moída", text: "3 colheres de sopa de carne moída" },
    { label: "Pirarucu", text: "1 posta de pirarucu" },
    { label: "Tambaqui", text: "1 posta de tambaqui" },
    { label: "Macaxeira", text: "1 porção de macaxeira" },
    { label: "Farofa", text: "2 colheres de sopa de farofa" },
    { label: "Macarrão", text: "1 porção de macarrão" },
    { label: "Feijoada", text: "1 prato de feijoada" },
    { label: "Feijoada de jabá", text: "1 prato de feijoada de jabá" },
    { label: "Feijoada enlatada", text: "1 prato de feijoada enlatada" },
    { label: "Sardinha em lata", text: "1 lata de sardinha em lata" },
    { label: "Peixe cozido", text: "1 filé de peixe cozido" },
    { label: "Peixe frito", text: "1 filé de peixe frito" },
    { label: "Salada", text: "1 prato de salada" },
    { label: "Legumes", text: "cenoura e abobrinha" },
    { label: "Suco", text: "1 copo de suco" },
    { label: "Miojo", text: "1 pacote de miojo" },
    { label: "Baixaria", text: "1 prato de baixaria" },
    { label: "Cuscuz com ovos", text: "1 prato de cuscuz, 2 ovos" },
    { label: "Maionese", text: "15 g de maionese" },
    { label: "Ketchup", text: "15 g de ketchup" },
    { label: "Manteiga", text: "10 g de manteiga" },
  ],
  jantar: [
    { label: "Sopa de legumes", text: "1 prato de sopa de legumes" },
    { label: "Carne assada", text: "120 g de carne assada" },
    { label: "Mixto de carnes assadas", text: "mixto de carnes assadas" },
    { label: "Arroz", text: "3 colheres de sopa de arroz" },
    { label: "Feijão", text: "1 concha de feijão" },
    { label: "Frango", text: "1 filé de frango" },
    { label: "Frango cozido", text: "1 porção de frango cozido" },
    { label: "Frango ao molho", text: "1 porção de frango ao molho" },
    { label: "Peixe cozido", text: "1 filé de peixe cozido" },
    { label: "Peixe frito", text: "1 filé de peixe frito" },
    { label: "Sardinha em lata", text: "1 lata de sardinha em lata" },
    { label: "Macarrão", text: "1 porção de macarrão" },
    { label: "Feijoada", text: "1 prato de feijoada" },
    { label: "Ovo", text: "2 ovos" },
    { label: "Cuscuz", text: "1 prato de cuscuz" },
    { label: "Tapioca", text: "1 tapioca" },
    { label: "Salada", text: "1 prato de salada" },
    { label: "Café com leite", text: "1 xícara de café com leite" },
    { label: "Miojo", text: "1 pacote de miojo" },
    { label: "Baixaria", text: "1 prato de baixaria" },
    { label: "Cuscuz com ovos", text: "1 prato de cuscuz, 2 ovos" },
    { label: "Maionese", text: "15 g de maionese" },
    { label: "Ketchup", text: "15 g de ketchup" },
    { label: "Manteiga", text: "10 g de manteiga" },
  ],
  lanche: [
    { label: "Abacatada", text: "1 copo de abacatada" },
    { label: "Barra de chocolate", text: "barra de chocolate" },
    { label: "Fruta", text: "1 banana" },
    { label: "Pão com queijo", text: "1 pão francês com queijo" },
    { label: "Iogurte", text: "1 iogurte" },
    { label: "Iogurte grego", text: "1 pote de iogurte grego" },
    { label: "Pão de queijo", text: "3 pães de queijo" },
    { label: "Pastel", text: "1 pastel" },
    { label: "Bolo de milho", text: "1 fatia de bolo de milho" },
    { label: "Bolo de cenoura", text: "1 fatia de bolo de cenoura" },
    { label: "Bolo de leite", text: "1 fatia de bolo de leite" },
    { label: "Queijo da região", text: "1 fatia de queijo da região" },
    { label: "Biscoito", text: "6 biscoitos" },
    { label: "Bolo", text: "1 fatia de bolo" },
    { label: "Castanha", text: "3 castanhas-do-pará" },
    { label: "Açaí", text: "1 copo de açaí" },
    { label: "Tapioca", text: "1 tapioca" },
    { label: "Café com leite", text: "1 xícara de café com leite" },
    { label: "Achocolatado", text: "1 copo de achocolatado" },
    { label: "Miojo", text: "1 pacote de miojo" },
    { label: "Cream cracker", text: "30 g de bolacha cream cracker" },
    { label: "Cuscuz com ovos", text: "1 prato de cuscuz, 2 ovos" },
    { label: "Manteiga", text: "10 g de manteiga" },
    { label: "Maionese", text: "15 g de maionese" },
    { label: "Ketchup", text: "15 g de ketchup" },
  ],
  ceia: [
    { label: "Leite morno", text: "1 copo de leite" },
    { label: "Iogurte", text: "1 iogurte" },
    { label: "Fruta", text: "1 maçã" },
    { label: "Mingau de aveia", text: "1 prato de mingau de aveia" },
    { label: "Chá", text: "1 xícara de chá" },
    { label: "Castanha", text: "3 castanhas-do-pará" },
    { label: "Cream cracker", text: "20 g de bolacha cream cracker" },
    { label: "Manteiga", text: "5 g de manteiga" },
  ],
  fruta: [
    { label: "Banana", text: "1 banana" },
    { label: "Mamão", text: "1 fatia de mamão" },
    { label: "Maçã", text: "1 maçã" },
    { label: "Laranja", text: "1 laranja" },
    { label: "Limão", text: "1 limão" },
    { label: "Abacaxi", text: "1 fatia de abacaxi" },
    { label: "Melancia", text: "1 fatia de melancia" },
    { label: "Manga", text: "1 manga" },
    { label: "Goiaba", text: "1 goiaba" },
    { label: "Açaí", text: "1 copo de açaí" },
    { label: "Uva", text: "1 cacho de uva" },
  ],
  refeicao: [
    { label: "Arroz", text: "4 colheres de sopa de arroz" },
    { label: "Feijão", text: "1 concha de feijão" },
    { label: "Frango", text: "1 filé de frango" },
    { label: "Frango cozido", text: "1 porção de frango cozido" },
    { label: "Frango ao molho", text: "1 porção de frango ao molho" },
    { label: "Carne", text: "1 bife de carne" },
    { label: "Peixe cozido", text: "1 filé de peixe cozido" },
    { label: "Peixe frito", text: "1 filé de peixe frito" },
    { label: "Sardinha em lata", text: "1 lata de sardinha em lata" },
    { label: "Macarrão", text: "1 porção de macarrão" },
    { label: "Feijoada", text: "1 prato de feijoada" },
    { label: "Macaxeira", text: "1 porção de macaxeira" },
    { label: "Salada", text: "1 prato de salada" },
  ],
  salada: [
    { label: "Alface", text: "alface" },
    { label: "Tomate", text: "1 tomate" },
    { label: "Cenoura", text: "1 cenoura" },
    { label: "Pepino", text: "pepino" },
    { label: "Beterraba", text: "beterraba" },
    { label: "Brócolis", text: "brócolis" },
    { label: "Azeite", text: "1 colher de azeite" },
  ],
  sopa: [
    { label: "Sopa de legumes", text: "1 prato de sopa de legumes" },
    { label: "Caldo de frango", text: "1 prato de caldo de frango" },
    { label: "Sopa de feijão", text: "1 prato de feijão" },
    { label: "Pão", text: "1 pão francês" },
  ],
  sobremesa: [
    { label: "Fruta", text: "1 fatia de mamão" },
    { label: "Sorvete", text: "2 bolas de sorvete" },
    { label: "Goiabada", text: "1 fatia de goiabada" },
    { label: "Doce de leite", text: "1 colher de sopa de doce de leite" },
    { label: "Pé de moleque", text: "1 pé de moleque" },
    { label: "Brigadeiro", text: "1 brigadeiro" },
    { label: "Doce de coco", text: "1 pedaço de doce de coco" },
    { label: "Bolo", text: "1 fatia de bolo" },
    { label: "Açaí", text: "1 copo de açaí" },
    { label: "Iogurte", text: "1 iogurte" },
  ],
};

/** Refeições prontas sugeridas por tipo de refeição (vários alimentos); entram na descrição e no cálculo. */
export const mealCombos: Partial<Record<FoodKind, { label: string; text: string }[]>> = {
  cafe_manha: [
    {
      label: "Cuscuz com ovo e café com leite",
      text: "1 prato de cuscuz, 2 ovos cozidos, 1 xícara de café com leite",
    },
    {
      label: "Tapioca com queijo e suco de acerola",
      text: "1 tapioca, 2 fatias de queijo mussarela, 1 copo de suco de acerola",
    },
    { label: "Mingau de aveia com banana", text: "1 prato de mingau de aveia, 1 banana" },
    { label: "Pão com ovo e Nescau", text: "1 pão com ovo, 1 copo de nescau" },
    {
      label: "Café acreano reforçado",
      text: "1 prato de baixaria, 1 xícara de café com leite de gado, 1 banana cozida",
    },
  ],
  lanche: [
    {
      label: "Sanduíche natural e suco de maracujá",
      text: "1 sanduíche natural, 1 copo de suco de maracujá",
    },
    {
      label: "Pão massa fina com queijo e presunto",
      text: "1 pão massa fina, 2 fatias de queijo mussarela, 2 fatias de presunto",
    },
    {
      label: "Iogurte com aveia e banana",
      text: "1 iogurte, 2 colheres de sopa de aveia, 1 banana",
    },
    { label: "Cereal com leite", text: "1 tigela de cereal com leite" },
  ],
  almoco: [
    {
      label: "Prato brasileiro com frango",
      text: "4 colheres de sopa de arroz, 1 concha de feijão, 1 filé de frango, 1 prato de salada",
    },
    {
      label: "Baião de dois com salada",
      text: "1 prato de baião de dois, 1 prato de salada, 1 copo de suco de graviola",
    },
    {
      label: "Tambaqui com macaxeira",
      text: "1 posta de tambaqui, 1 porção de macaxeira, 1 prato de salada",
    },
    { label: "Macarronada com salada", text: "1 prato de macarronada, 1 prato de salada" },
  ],
  jantar: [
    { label: "Sopa de legumes com pão", text: "1 prato de sopa de legumes, 1 pão francês" },
    { label: "Cuscuz com ovo", text: "1 prato de cuscuz, 2 ovos" },
    {
      label: "Frango, arroz e legumes",
      text: "1 filé de frango, 3 colheres de sopa de arroz, cenoura e abobrinha",
    },
    { label: "Tapioca com queijo", text: "1 tapioca, 1 fatia de queijo mussarela" },
  ],
  ceia: [
    { label: "Leite morno com maçã", text: "1 copo de leite, 1 maçã" },
    { label: "Mingau de maisena leve", text: "1 prato de mingau de maisena" },
    { label: "Iogurte com castanhas", text: "1 iogurte, 3 castanhas-do-pará" },
    { label: "Chá com biscoito", text: "1 xícara de chá, 4 biscoitos" },
  ],
};

const drinkSet = (...items: [string, string][]) => items.map(([label, text]) => ({ label, text }));
const juices = drinkSet(
  ["Suco de laranja natural", "1 copo de suco de laranja"],
  ["Suco de limão", "1 copo de suco de limão"],
  ["Suco de cupuaçu", "1 copo de suco de cupuaçu"],
  ["Suco de acerola", "1 copo de suco de acerola"],
  ["Suco de maracujá", "1 copo de suco de maracujá"],
  ["Suco de taperebá", "1 copo de suco de taperebá"],
  ["Suco de goiaba", "1 copo de suco de goiaba"],
  ["Suco de graviola", "1 copo de suco de graviola"],
  ["Suco de caju", "1 copo de suco de caju"],
);
/** Bebidas que costumam acompanhar cada refeição; entram na mesma descrição e no cálculo. */
export const typicalDrinks: Record<FoodKind, { label: string; text: string }[]> = {
  cafe_manha: [
    ...drinkSet(
      ["Café preto", "1 xícara de café"],
      ["Café com leite", "1 xícara de café com leite"],
      ["Café com leite de gado", "1 xícara de café com leite de gado"],
      ["Café com leite em pó", "1 xícara de café com leite em pó"],
      ["Leite", "1 copo de leite"],
      ["Achocolatado", "1 copo de achocolatado"],
      ["Chá", "1 xícara de chá"],
    ),
    ...juices.slice(0, 3),
  ],
  almoco: [
    ...juices,
    ...drinkSet(
      ["Água de coco", "1 copo de água de coco"],
      ["Refrigerante", "1 copo de refrigerante"],
    ),
  ],
  jantar: [
    ...juices.slice(0, 4),
    ...drinkSet(["Café com leite", "1 xícara de café com leite"], ["Chá", "1 xícara de chá"]),
  ],
  lanche: [
    ...drinkSet(
      ["Café com leite", "1 xícara de café com leite"],
      ["Café com leite de gado", "1 xícara de café com leite de gado"],
      ["Café com leite em pó", "1 xícara de café com leite em pó"],
      ["Achocolatado", "1 copo de achocolatado"],
      ["Vitamina de banana", "1 copo de vitamina de banana"],
      ["Abacatada", "1 copo de abacatada"],
      ["Iogurte líquido", "1 copo de iogurte"],
    ),
    ...juices.slice(0, 3),
  ],
  ceia: drinkSet(
    ["Leite morno", "1 copo de leite"],
    ["Chá", "1 xícara de chá"],
    ["Café com leite", "1 xícara de café com leite"],
    ["Café com leite de gado", "1 xícara de café com leite de gado"],
  ),
  fruta: juices.slice(0, 3),
  refeicao: [...juices.slice(0, 4), ...drinkSet(["Refrigerante", "1 copo de refrigerante"])],
  salada: juices.slice(0, 2),
  sopa: drinkSet(["Suco de laranja", "1 copo de suco de laranja"], ["Chá", "1 xícara de chá"]),
  sobremesa: drinkSet(
    ["Café preto", "1 xícara de café"],
    ["Café com leite", "1 xícara de café com leite"],
  ),
};

const coffeeExtras = drinkSet(
  ["Café com leite desnatado", "1 xícara de café com leite desnatado"],
  ["Café com leite em pó", "1 xícara de café com leite em pó"],
  ["Nescafé", "1 xícara de nescafé"],
  ["Nescau", "1 copo de nescau"],
  ["Leite em pó dissolvido", "1 copo de leite em pó dissolvido"],
);
for (const kind of ["cafe_manha", "lanche", "ceia", "jantar", "sobremesa"] as FoodKind[]) {
  const seen = new Set<string>();
  typicalDrinks[kind] = [...typicalDrinks[kind], ...coffeeExtras].filter(
    (item) => !seen.has(item.label) && !!seen.add(item.label),
  );
}
