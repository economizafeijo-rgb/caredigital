/**
 * Ficha de cada alimento do timer: o que é, o que ele oferece e a dica de preparo.
 * Texto educativo geral; os valores variam com a variedade, o corte e o modo de preparo.
 */
export type CookInfo = { kind: string; benefit: string; prep: string };

export const cookInfo: Record<string, CookInfo> = {
  nescafe_leite_lata: {
    kind: "Bebida instantânea de café com leite",
    benefit:
      "Cada porção de 20 g (2 colheres de sopa) tem 84 kcal, 2,3 g de proteína e 11 g de açúcares, dos quais 7,8 g adicionados (rótulo Nestlé). Conta cafeína e açúcar no dia.",
    prep: "Rótulo: coloque 2 colheres de sopa (20 g) em uma xícara, acrescente 100 ml de água quente a 85 °C e mexa bem.",
  },
  ovo_cozido: {
    kind: "Proteína de origem animal",
    benefit:
      "Proteína completa, com colina, vitamina B12 e selênio. Dá saciedade com poucas calorias.",
    prep: "Comece na água fria ou fervente e conte o tempo depois de ferver. Esfrie em água gelada para descascar com facilidade.",
  },
  ovo_frito: {
    kind: "Proteína de origem animal",
    benefit: "Mesmos nutrientes do ovo cozido; a gordura do óleo soma calorias.",
    prep: "Use pouca gordura em frigideira antiaderente bem aquecida. Fogo médio evita a borda queimada.",
  },
  omelete: {
    kind: "Proteína de origem animal",
    benefit: "Boa base para incluir legumes e verduras, que somam fibras e vitaminas.",
    prep: "Bata os ovos e cozinhe em fogo baixo a médio, tampando um pouco para firmar o centro.",
  },
  batata_doce: {
    kind: "Raiz (carboidrato complexo)",
    benefit:
      "Carboidrato de energia duradoura, com fibras e betacaroteno (vitamina A) nas variedades alaranjadas.",
    prep: "Cozida com casca mantém mais nutrientes. Na pressão leva menos tempo; o ponto é quando o garfo entra sem resistência.",
  },
  macaxeira: {
    kind: "Raiz (carboidrato)",
    benefit: "Fonte de energia, com potássio e vitamina C. Sem glúten.",
    prep: "Cozinhe bem até desmanchar de leve. Descarte a água do cozimento e retire a fibra central.",
  },
  inhame: {
    kind: "Raiz (carboidrato)",
    benefit: "Energia com fibras, potássio e vitaminas do complexo B.",
    prep: "Cozinhe sempre, nunca coma cru. Descasque com luvas se a pele coçar.",
  },
  batata: {
    kind: "Tubérculo (carboidrato)",
    benefit:
      "Energia com potássio e vitamina C. Fica mais saciante cozida e fria (amido resistente).",
    prep: "Comece na água fria para cozinhar por igual. Cozida ou assada tem menos gordura que frita.",
  },
  banana_terra: {
    kind: "Fruta de cozinha (carboidrato)",
    benefit: "Energia, potássio e fibras. Muito usada antes de treinar.",
    prep: "Cozida ou assada com casca fica macia sem gordura. Madura é mais doce.",
  },
  banana_prata: {
    kind: "Fruta",
    benefit: "Potássio, vitamina B6 e energia rápida.",
    prep: "Cozida ou assada fica macia e mais doce. Cozinhar com casca ajuda a manter o formato.",
  },
  mingau_aveia: {
    kind: "Cereal integral",
    benefit: "Fibra solúvel (betaglucana) que ajuda no colesterol e na saciedade.",
    prep: "Mexa em fogo baixo para não grudar. Leite ou bebida vegetal dá mais cremosidade; ajuste o líquido ao gosto.",
  },
  mingau_maisena: {
    kind: "Amido de milho",
    benefit: "Energia de fácil digestão. Pobre em fibras: combine com fruta.",
    prep: "Dissolva o amido no líquido frio antes de levar ao fogo e mexa sem parar até engrossar.",
  },
  canjica: {
    kind: "Cereal (milho)",
    benefit: "Energia com fibras e algumas vitaminas do complexo B.",
    prep: "Deixe de molho antes e cozinhe até os grãos ficarem macios. Na pressão economiza tempo.",
  },
  cuscuz: {
    kind: "Cereal (milho)",
    benefit: "Carboidrato de preparo rápido, com pouca gordura. Combine com ovo ou proteína.",
    prep: "Hidrate a farinha, não aperte e cozinhe no vapor. O vapor, não a água, faz o ponto.",
  },
  tapioca: {
    kind: "Goma de mandioca (carboidrato)",
    benefit: "Energia leve, sem glúten. Pouca proteína e fibra, então recheie.",
    prep: "Frigideira quente e seca. Espalhe a goma hidratada e vire quando soltar.",
  },
  crepioca: {
    kind: "Ovo e tapioca",
    benefit: "Une proteína do ovo e carboidrato da goma em uma só refeição.",
    prep: "Misture ovo e goma, cozinhe em fogo baixo a médio e vire com cuidado.",
  },
  arroz: {
    kind: "Cereal (carboidrato)",
    benefit:
      "Principal fonte de energia na mesa brasileira. O integral tem mais fibras e magnésio.",
    prep: "Refogue, junte a água e baixe o fogo tampado. O integral demora mais.",
  },
  feijao: {
    kind: "Leguminosa",
    benefit:
      "Proteína vegetal, fibras, ferro, folato e zinco. Com arroz forma uma combinação completa.",
    prep: "Deixe de molho e descarte a água para reduzir o desconforto intestinal. Na pressão fica macio mais rápido.",
  },
  feijao_corda: {
    kind: "Leguminosa",
    benefit: "Proteína vegetal, fibras, ferro e folato.",
    prep: "Cozinhe até amaciar, com ou sem molho. O molho antes de cozinhar encurta o tempo.",
  },
  lentilha: {
    kind: "Leguminosa",
    benefit: "Muito ferro e proteína vegetal, com fibras. Não exige muito tempo.",
    prep: "Lave e cozinhe sem molho. Retire a espuma. Vitamina C na refeição melhora o ferro.",
  },
  macarrao: {
    kind: "Massa (carboidrato)",
    benefit: "Energia rápida. Integral traz mais fibras.",
    prep: "Água fervente e salgada, conte o tempo do pacote e prove um minuto antes. Al dente tem digestão mais lenta.",
  },
  frango: {
    kind: "Carne branca (proteína)",
    benefit: "Proteína magra, com niacina e vitamina B6. Sem pele tem menos gordura.",
    prep: "Cozinhe por completo: sem parte rosada e com suco claro. Peito seca se passar do ponto.",
  },
  carne_moida: {
    kind: "Carne vermelha (proteína)",
    benefit: "Proteína, ferro heme (bem absorvido) e zinco.",
    prep: "Cozinhe bem, sem parte rosada por dentro. Frigideira quente sem lotar para dourar.",
  },
  carne_panela: {
    kind: "Carne vermelha (proteína)",
    benefit: "Proteína, ferro e zinco. Cortes magros têm menos gordura.",
    prep: "Cozimento longo e úmido amacia os cortes duros. Na pressão fica mais rápido.",
  },
  peixe: {
    kind: "Pescado (proteína)",
    benefit: "Proteína leve. Peixes gordos, como sardinha e salmão, trazem ômega 3.",
    prep: "Cozinha rápido, então não deixe passar. Está pronto quando a carne se desfaz em lascas.",
  },
  sopa: {
    kind: "Prato de legumes e caldo",
    benefit: "Hidrata e junta vários vegetais. Boa para aumentar fibras e vitaminas.",
    prep: "Comece pelos legumes mais duros. Adicione folhas no final para manter cor e nutrientes.",
  },
  cenoura: {
    kind: "Legume (raiz)",
    benefit: "Betacaroteno, que o corpo converte em vitamina A. A gordura ajuda a absorver.",
    prep: "Cozinhar rápido preserva os nutrientes. Pique em tamanhos parecidos para cozinhar por igual.",
  },
  brocolis: {
    kind: "Legume (crucífera)",
    benefit: "Vitamina C, vitamina K, folato e fibras.",
    prep: "No vapor por poucos minutos, ainda firme e verde-vivo. Cozimento longo tira cor e vitamina C.",
  },
  couve_flor: {
    kind: "Legume (crucífera)",
    benefit: "Vitamina C, vitamina K e fibras, com poucas calorias.",
    prep: "Em buquês, no vapor ou na água, até o garfo entrar com leve resistência.",
  },
  vagem: {
    kind: "Legume verde",
    benefit: "Fibras, vitamina K e folato, com poucas calorias.",
    prep: "Cozinhe pouco, até ficar macia e verde brilhante. Água gelada depois fixa a cor.",
  },
  chuchu: {
    kind: "Legume",
    benefit: "Muita água e poucas calorias, com um pouco de fibra e potássio.",
    prep: "Cozinha rápido e solta água. Tempere no final.",
  },
  abobora: {
    kind: "Legume (fruto)",
    benefit: "Betacaroteno, potássio e fibras. A cor alaranjada indica carotenoides.",
    prep: "Cozinhe em pedaços iguais, no vapor ou na pressão, até amaciar.",
  },
  beterraba: {
    kind: "Raiz",
    benefit: "Folato, potássio e nitratos naturais. Mancha tudo: cuidado com as roupas.",
    prep: "Cozinhe com casca para manter a cor e os nutrientes; descasque depois de morna.",
  },
  milho: {
    kind: "Cereal em espiga",
    benefit: "Energia com fibras e carotenoides (luteína e zeaxantina).",
    prep: "Cozido na água ou na pressão até os grãos ficarem macios. Sal só no final.",
  },
};
