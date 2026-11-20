/**
 * Guia de nutrientes: referências gerais para adultos saudáveis e por objetivo.
 * Bases: DRIs (Institute of Medicine / National Academies), OMS, posicionamentos da ACSM e da
 * ISSN. É educativo: não substitui avaliação de nutricionista ou médico.
 */
export type GuideGoalKey =
  | "manutencao"
  | "emagrecer"
  | "hipertrofia"
  | "ganho_peso"
  | "condicionamento"
  | "gestacao"
  | "amamentacao"
  | "crescimento";

export type GuideGoal = {
  key: GuideGoalKey;
  label: string;
  /** % da energia: proteína, carboidrato, gordura (somam 100, dentro das faixas AMDR). */
  split: [number, number, number];
  /** g de proteína por kg de peso por dia. */
  proteinKg: [number, number];
  summary: string;
  /** O que fazer com cada macronutriente neste objetivo. */
  actions: { protein: string; carbs: string; fat: string; micro: string };
  /** Nutrientes que pedem mais atenção (ids de micronutrientes). */
  focus: string[];
  care: string;
};

export const amdr = {
  protein: [10, 35],
  carbs: [45, 65],
  fat: [20, 35],
} as const;

export const guideGoals: GuideGoal[] = [
  {
    key: "manutencao",
    label: "Manter o peso e a saúde",
    split: [18, 52, 30],
    proteinKg: [0.8, 1.2],
    summary: "Prato variado, com comida de verdade na maior parte das refeições.",
    actions: {
      protein:
        "Uma fonte de proteína em cada refeição: ovos, feijão, frango, peixe, leite ou iogurte.",
      carbs:
        "Prefira arroz, mandioca, batata-doce, milho, aveia e frutas. Escolha integrais quando puder.",
      fat: "Azeite, castanhas, abacate e peixes. Frituras e embutidos, só de vez em quando.",
      micro:
        "Variar as cores do prato (verdes, laranjas, vermelhos) cobre a maior parte das necessidades.",
    },
    focus: ["calcio", "potassio", "vitd"],
    care: "As faixas são médias para adultos saudáveis. A quantidade total de energia depende de idade, sexo e atividade.",
  },
  {
    key: "emagrecer",
    label: "Perder gordura",
    split: [25, 45, 30],
    proteinKg: [1.2, 1.6],
    summary:
      "Déficit moderado de energia mantendo a proteína alta para preservar músculo e dar saciedade.",
    actions: {
      protein:
        "Aumente a proteína em todas as refeições. Ela dá mais saciedade e protege a massa muscular no déficit.",
      carbs:
        "Mantenha, mas dê preferência a versões com fibra: feijão, aveia, legumes, frutas inteiras.",
      fat: "Controle o óleo de cozinha e os molhos; a gordura tem 9 kcal por grama, mais que o dobro dos outros.",
      micro:
        "Dietas com pouca energia deixam passar ferro, cálcio e vitaminas do complexo B: mantenha variedade.",
    },
    focus: ["ferro", "calcio", "magnesio"],
    care: "Evite cortes extremos. A faixa de proteína no déficit é uma referência prática; o mínimo do RDA é 0,8 g/kg. Acompanhamento profissional é o ideal.",
  },
  {
    key: "hipertrofia",
    label: "Ganhar massa muscular",
    split: [22, 53, 25],
    proteinKg: [1.4, 2.0],
    summary: "Pequeno excedente de energia, proteína bem distribuída e treino de força regular.",
    actions: {
      protein:
        "Distribua a proteína ao longo do dia, a cada 3 a 4 horas, com cerca de 0,25 g/kg (20 a 40 g) por refeição. A ISSN considera 1,4 a 2,0 g/kg por dia suficiente para a maioria de quem treina.",
      carbs: "É o combustível do treino. Inclua uma fonte antes e depois do exercício.",
      fat: "Não corte: a gordura ajuda nos hormônios e na energia. Prefira as insaturadas.",
      micro: "Magnésio, zinco e vitamina D participam da função muscular e da recuperação.",
    },
    focus: ["magnesio", "zinco", "vitd"],
    care: "Sem treino de força, mais proteína não vira músculo. Suplementos só complementam a comida.",
  },
  {
    key: "ganho_peso",
    label: "Ganhar peso com saúde",
    split: [18, 52, 30],
    proteinKg: [1.2, 1.6],
    summary:
      "Mais energia por refeição e mais refeições no dia, sem depender só de ultraprocessados.",
    actions: {
      protein:
        "Inclua proteína em todas as refeições e nos lanches: ovos, leite, queijo, carnes, pasta de amendoim.",
      carbs:
        "Aumente as porções de arroz, macarrão, tubérculos, pães e frutas. Faça 5 a 6 refeições.",
      fat: "Gorduras boas elevam as calorias sem aumentar muito o volume: azeite, abacate, castanhas.",
      micro: "Se o apetite é baixo, escolha alimentos densos em nutrientes.",
    },
    focus: ["ferro", "zinco", "b12"],
    care: "Perda de peso sem causa conhecida ou apetite muito baixo merecem avaliação médica.",
  },
  {
    key: "condicionamento",
    label: "Condicionamento e resistência",
    split: [17, 58, 25],
    proteinKg: [1.2, 2.0],
    summary:
      "Carboidrato em primeiro plano para sustentar o treino, com hidratação e sais minerais em dia.",
    actions: {
      protein:
        "De 1,2 a 2,0 g/kg por dia é a faixa citada pela ACSM para quem treina, distribuída nas refeições.",
      carbs:
        "A necessidade varia de 3 a 12 g/kg por dia conforme o treino: em geral 5 a 7 g/kg para cerca de 1 hora por dia e 6 a 10 g/kg para 1 a 3 horas.",
      fat: "Moderada. Evite gordura em excesso logo antes do treino: digere devagar.",
      micro:
        "Ferro, sódio, potássio e magnésio se perdem com suor e esforço. Reponha com comida e água.",
    },
    focus: ["ferro", "sodio", "potassio"],
    care: "Em esforços de mais de 1 hora, líquidos e carboidrato durante o treino fazem diferença.",
  },
  {
    key: "gestacao",
    label: "Gestação",
    split: [18, 52, 30],
    proteinKg: [1.1, 1.1],
    summary:
      "Mais nutrientes, não só mais calorias. A necessidade de ferro, folato e iodo cresce bastante.",
    actions: {
      protein:
        "O RDA das DRIs é 1,1 g/kg por dia (cerca de 25 g a mais que fora da gestação). OMS e EFSA preveem aumento gradual, maior no 2º e 3º trimestres.",
      carbs:
        "Pelo menos 175 g por dia como referência. Prefira integrais e frutas; evite pular refeições.",
      fat: "Inclua peixes de baixo teor de mercúrio, como sardinha, para ômega 3 (DHA).",
      micro:
        "Folato (600 µg), ferro (27 mg), iodo (220 µg), cálcio e colina são prioridades. Siga a prescrição do pré-natal.",
    },
    focus: ["folato", "ferro", "iodo", "calcio"],
    care: "Suplementos, ervas e restrições alimentares devem ser combinados com obstetra ou nutricionista. Evite álcool.",
  },
  {
    key: "amamentacao",
    label: "Amamentação",
    split: [18, 52, 30],
    proteinKg: [1.3, 1.3],
    summary:
      "A produção de leite aumenta a necessidade de energia, proteína, líquidos e alguns micronutrientes.",
    actions: {
      protein: "O RDA das DRIs é 1,3 g/kg por dia (cerca de 71 g/dia para a mulher de referência).",
      carbs: "Referência de 210 g por dia. Refeições regulares e lanches evitam longos jejuns.",
      fat: "Peixes e oleaginosas contribuem com ômega 3 para o leite.",
      micro:
        "Iodo (290 µg), vitamina A, B12, colina e cálcio são mais exigidos. Beba água ao longo do dia.",
    },
    focus: ["iodo", "b12", "calcio"],
    care: "Dietas muito restritivas reduzem a qualidade nutricional. Converse com a equipe de saúde antes de fazer cortes.",
  },
  {
    key: "crescimento",
    label: "Crescimento (criança e adolescente)",
    split: [16, 54, 30],
    proteinKg: [0.85, 1.0],
    summary:
      "A fase pede energia suficiente e muito cálcio, ferro e vitamina D para ossos e desenvolvimento.",
    actions: {
      protein: "Referência de 0,85 a 0,95 g/kg por dia, de acordo com a faixa de idade.",
      carbs:
        "Energia para brincar, estudar e crescer: refeições completas e lanches com frutas, tubérculos e cereais.",
      fat: "Não restrinja gordura em crianças pequenas sem orientação; ela é necessária para o desenvolvimento.",
      micro: "Cálcio (1.300 mg dos 9 aos 18 anos), ferro e vitamina D sustentam ossos e sangue.",
    },
    focus: ["calcio", "ferro", "vitd"],
    care: "Dietas de emagrecimento não se aplicam a crianças. Qualquer ajuste deve vir do pediatra ou nutricionista.",
  },
];

export type MicroId =
  | "calcio"
  | "ferro"
  | "magnesio"
  | "zinco"
  | "potassio"
  | "sodio"
  | "iodo"
  | "vita"
  | "vitc"
  | "vitd"
  | "b12"
  | "folato";

export type Micro = {
  id: MicroId;
  kind: "mineral" | "vitamina";
  name: string;
  ref: string;
  role: string;
  sources: string;
  note?: string;
};

export const micros: Micro[] = [
  {
    id: "calcio",
    kind: "mineral",
    name: "Cálcio",
    ref: "1.000 mg/dia",
    role: "Ossos, dentes, contração muscular e coagulação.",
    sources: "Leite e derivados, couve, brócolis, sardinha com osso, tofu.",
    note: "Absorção melhora com vitamina D.",
  },
  {
    id: "ferro",
    kind: "mineral",
    name: "Ferro",
    ref: "8 mg (homens) · 18 mg (mulheres 19–50)",
    role: "Transporta oxigênio no sangue e dá energia.",
    sources: "Carnes, fígado, feijão, lentilha, folhas escuras.",
    note: "Vitamina C junto da refeição aumenta a absorção do ferro vegetal.",
  },
  {
    id: "magnesio",
    kind: "mineral",
    name: "Magnésio",
    ref: "400–420 mg (H) · 310–320 mg (M)",
    role: "Músculos, nervos, energia e sono.",
    sources: "Castanhas, sementes, aveia, feijão, folhas verdes.",
  },
  {
    id: "zinco",
    kind: "mineral",
    name: "Zinco",
    ref: "11 mg (H) · 8 mg (M)",
    role: "Imunidade, cicatrização e síntese de proteínas.",
    sources: "Carnes, ovos, feijão, sementes de abóbora, castanhas.",
  },
  {
    id: "potassio",
    kind: "mineral",
    name: "Potássio",
    ref: "3.400 mg (H) · 2.600 mg (M)",
    role: "Equilíbrio de líquidos, pressão arterial e músculos.",
    sources: "Banana, feijão, batata, abacate, coco, folhas.",
    note: "Quem tem doença renal deve seguir orientação médica.",
  },
  {
    id: "sodio",
    kind: "mineral",
    name: "Sódio",
    ref: "Limite OMS: menos de 2.000 mg/dia (5 g de sal)",
    role: "Equilíbrio de líquidos e nervos. O excesso eleva a pressão.",
    sources: "Sal de cozinha e, sobretudo, industrializados, embutidos e temperos prontos.",
  },
  {
    id: "iodo",
    kind: "mineral",
    name: "Iodo",
    ref: "150 µg/dia",
    role: "Hormônios da tireoide.",
    sources: "Sal iodado, peixes, ovos, laticínios.",
  },
  {
    id: "vita",
    kind: "vitamina",
    name: "Vitamina A",
    ref: "900 µg (H) · 700 µg (M)",
    role: "Visão, pele e imunidade.",
    sources: "Cenoura, abóbora, batata-doce, manga, fígado, ovos.",
  },
  {
    id: "vitc",
    kind: "vitamina",
    name: "Vitamina C",
    ref: "90 mg (H) · 75 mg (M)",
    role: "Colágeno, imunidade e absorção de ferro.",
    sources: "Acerola, laranja, goiaba, limão, pimentão, brócolis.",
    note: "Perde-se com cozimento longo.",
  },
  {
    id: "vitd",
    kind: "vitamina",
    name: "Vitamina D",
    ref: "15 µg (600 UI)/dia",
    role: "Fixa o cálcio nos ossos e apoia a imunidade.",
    sources: "Sol (a maior parte), peixes gordos, ovos, alimentos fortificados.",
    note: "Dose de suplemento só com orientação, pois o excesso faz mal.",
  },
  {
    id: "b12",
    kind: "vitamina",
    name: "Vitamina B12",
    ref: "2,4 µg/dia",
    role: "Sangue e sistema nervoso.",
    sources: "Carnes, peixes, ovos, laticínios. Não existe em alimentos vegetais.",
    note: "Quem não come produtos animais precisa suplementar com orientação.",
  },
  {
    id: "folato",
    kind: "vitamina",
    name: "Folato (B9)",
    ref: "400 µg/dia · 600 µg na gestação",
    role: "Formação de células e do tubo neural do bebê.",
    sources: "Feijão, lentilha, folhas verdes escuras, laranja, brócolis.",
  },
];

export const macroInfo = {
  protein: {
    name: "Proteínas",
    kcal: 4,
    role: "Constroem e reparam músculos, pele, enzimas e defesas. Também dão saciedade.",
    sources: "Ovos, carnes, peixes, leite e derivados, feijão, lentilha, grão-de-bico, soja.",
    tip: "A referência mínima para adultos é 0,8 g/kg por dia. Quem treina ou quer perder gordura costuma precisar de mais.",
  },
  carbs: {
    name: "Carboidratos",
    kcal: 4,
    role: "Principal fonte de energia do corpo e do cérebro. As fibras ajudam o intestino e a saciedade.",
    sources: "Arroz, mandioca, batata, milho, aveia, pães, frutas, feijão.",
    tip: "Prefira os pouco refinados (integrais, tubérculos, frutas) e modere o açúcar adicionado: a OMS sugere menos de 10% da energia.",
  },
  fat: {
    name: "Gorduras",
    kcal: 9,
    role: "Reserva de energia, absorção das vitaminas A, D, E e K, hormônios e membranas das células.",
    sources:
      "Azeite, abacate, castanhas, sementes, peixes, ovos. Saturadas em carnes gordas e laticínios integrais.",
    tip: "Troque saturadas por insaturadas e mantenha as saturadas abaixo de 10% da energia (OMS).",
  },
} as const;
