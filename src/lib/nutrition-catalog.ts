/**
 * Catálogo editorial NextVita: alimentos regionais do Brasil e estimativas nutricionais.
 * Valores arredondados por 100 g de parte comestível, de preparos especificados.
 * Referência principal para consulta e validação: TBCA/USP (https://www.tbca.net.br/).
 * Não equivalem a laudo laboratorial, nem a uma integração direta em tempo real.
 * Produtos de marca variam por rótulo: seus macros NÃO são calculados aqui.
 */
export type Goal="equilibrio"|"emagrecimento"|"ganho_peso"|"hipertrofia";
export type MealTime="cafe"|"almoco"|"jantar"|"lanche";
export type Ingredient={
 id:string;name:string;group:"frutas"|"cereais"|"proteinas"|"legumes"|"bebidas";
 /** Valores por 100 g de parte comestível na forma de preparo descrita. */
 protein:number|null;carbs:number|null;fat:number|null;fiber:number|null;kcal:number|null;note?:string;
 provenance?: "TACO"|"IBGE"|"estimativa"|"rotulo";
 flags?:Array<"acido"|"gorduroso"|"cafeina"|"picante"|"frito"|"laticinio"|"fermentavel"|"industrializado">;
};
export const nutritionSources=[
 {title:"Tabela Brasileira de Composição de Alimentos (TBCA/USP)",url:"https://www.tbca.net.br/"},
 {title:"TACO — Núcleo de Estudos e Pesquisas em Alimentação, UNICAMP (2011)",url:"https://www.unicesumar.edu.br/biblioteca/wp-content/uploads/sites/50/2018/08/Tabela-Brasileira-de-Composicao-de-Alimentos.pdf"},
 {title:"Guia Alimentar para a População Brasileira (Ministério da Saúde)",url:"https://www.gov.br/saude/pt-br/composicao/saps/promocao-da-saude/guias-alimentares/guias-alimentares"},
 {title:"NIDDK — Alimentação na gastrite",url:"https://www.niddk.nih.gov/health-information/digestive-diseases/gastritis-gastropathy/eating-diet-nutrition"},
 {title:"NHS — Gastrite: orientações de cuidado",url:"https://www.nhs.uk/conditions/gastritis/"},
 {title:"ISSN — Proteína e exercício",url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/"},
] as const;
const baseIngredients:Omit<Ingredient,"carbs"|"fat"|"fiber">[]=[
 {id:"banana_prata",name:"Banana-prata crua",group:"frutas",protein:1.3,kcal:98},
 {id:"banana_maca",name:"Banana-maçã crua",group:"frutas",protein:1.8,kcal:87},
 {id:"banana_comprida",name:"Banana-comprida (banana-da-terra) cozida",group:"frutas",protein:1.3,kcal:116,note:"Cozida, não frita."},
 {id:"mamão",name:"Mamão",group:"frutas",protein:.5,kcal:43},
 {id:"maca",name:"Maçã sem casca",group:"frutas",protein:.3,kcal:56},
 {id:"pera",name:"Pera",group:"frutas",protein:.4,kcal:57},
 {id:"melancia",name:"Melancia",group:"frutas",protein:.9,kcal:33},
 {id:"acai",name:"Açaí, polpa sem adição de açúcar",group:"frutas",protein:.8,kcal:58,note:"Açaí adoçado, xarope e complementos alteram muito a composição.",flags:["gorduroso"]},
 {id:"maracuja",name:"Maracujá, polpa",group:"frutas",protein:2.2,kcal:68,flags:["acido"],note:"Fruta ácida: pode aumentar desconforto em algumas pessoas."},
 {id:"abacaxi",name:"Abacaxi",group:"frutas",protein:.9,kcal:48,flags:["acido"]},
 {id:"laranja",name:"Laranja",group:"frutas",protein:1,kcal:46,flags:["acido"]},
 {id:"macaxeira",name:"Macaxeira/mandioca cozida",group:"cereais",protein:.6,kcal:125},
 {id:"cuscuz",name:"Cuscuz de milho cozido",group:"cereais",protein:2.2,kcal:113},
 {id:"aveia",name:"Aveia em flocos seca",group:"cereais",protein:16.9,kcal:394},
 {id:"arroz",name:"Arroz branco cozido",group:"cereais",protein:2.5,kcal:128},
 {id:"arroz_integral",name:"Arroz integral cozido",group:"cereais",protein:2.6,kcal:124},
 {id:"batata",name:"Batata inglesa cozida",group:"cereais",protein:1.8,kcal:52},
 {id:"batata_doce",name:"Batata-doce cozida",group:"cereais",protein:.6,kcal:77},
 {id:"inhame",name:"Inhame cozido",group:"cereais",protein:1.5,kcal:97},
 {id:"tapioca",name:"Tapioca pronta, sem recheio",group:"cereais",protein:.1,kcal:224},
 {id:"farinha",name:"Farinha de mandioca",group:"cereais",protein:1.6,kcal:365,note:"Pode ser seca/áspera; considerar tolerância e porção."},
 {id:"granola",name:"Granola industrializada",group:"cereais",protein:null,kcal:null,flags:["industrializado"],note:"Verificar composição e açúcar no rótulo da marca."},
 {id:"neston",name:"Neston (cereal industrializado)",group:"cereais",protein:null,kcal:null,flags:["industrializado"],note:"Consultar rótulo específico: açúcar, ingredientes e proteína variam."},
 {id:"mucilon",name:"Mucilon (cereal industrializado)",group:"cereais",protein:null,kcal:null,flags:["industrializado"],note:"Produto de fórmula variável; conferir rótulo e faixa etária."},
 {id:"frango",name:"Peito de frango cozido sem pele",group:"proteinas",protein:31.5,kcal:163},
 {id:"ovo",name:"Ovo de galinha cozido",group:"proteinas",protein:12.6,kcal:146},
 {id:"peixe",name:"Peixe magro cozido",group:"proteinas",protein:24,kcal:130,note:"Valores variam por espécie."},
 {id:"carne",name:"Carne bovina magra cozida",group:"proteinas",protein:28,kcal:190},
 {id:"iogurte",name:"Iogurte natural sem açúcar",group:"proteinas",protein:3.6,kcal:61,flags:["laticinio"],note:"Lactose/gordura e tolerância variam por produto."},
 {id:"leite",name:"Leite semidesnatado",group:"proteinas",protein:3.2,kcal:46,flags:["laticinio"]},
 {id:"feijao",name:"Feijão carioca cozido",group:"proteinas",protein:4.8,kcal:76,flags:["fermentavel"],note:"Pode causar gases; testar pequenas porções, se tolerado."},
 {id:"lentilha",name:"Lentilha cozida",group:"proteinas",protein:6.3,kcal:93,flags:["fermentavel"]},
 {id:"cenoura",name:"Cenoura cozida",group:"legumes",protein:.8,kcal:30},
 {id:"abobora",name:"Abóbora cozida",group:"legumes",protein:.7,kcal:48},
 {id:"chuchu",name:"Chuchu cozido",group:"legumes",protein:.4,kcal:19},
 {id:"abobrinha",name:"Abobrinha cozida",group:"legumes",protein:1.1,kcal:22},
 {id:"vagem",name:"Vagem cozida",group:"legumes",protein:1.8,kcal:35},
 {id:"beterraba",name:"Beterraba cozida",group:"legumes",protein:1.3,kcal:32},
 {id:"brocolis",name:"Brócolis cozido",group:"legumes",protein:2.1,kcal:25,flags:["fermentavel"]},
 {id:"couve",name:"Couve refogada com pouca gordura",group:"legumes",protein:2.7,kcal:55,flags:["fermentavel"]},
 {id:"espinafre",name:"Espinafre cozido",group:"legumes",protein:2.9,kcal:23},
 {id:"alface",name:"Alface crua",group:"legumes",protein:1.3,kcal:15},
 {id:"tomate",name:"Tomate cru",group:"legumes",protein:1.1,kcal:15,flags:["acido"]},
 {id:"pepino",name:"Pepino cru",group:"legumes",protein:.9,kcal:10},
 {id:"suco_maracuja",name:"Suco natural de maracujá sem açúcar",group:"bebidas",protein:.3,kcal:27,flags:["acido"]},
 {id:"cha_camomila",name:"Chá de camomila sem açúcar",group:"bebidas",protein:0,kcal:1},
 {id:"cafe",name:"Café coado sem açúcar",group:"bebidas",protein:.1,kcal:1,flags:["cafeina"]},
 {id:"banana_nanica",name:"Banana-nanica crua",group:"frutas",protein:1.4,kcal:92,provenance:"TACO"},
 {id:"banana_pacova",name:"Banana-pacovã crua",group:"frutas",protein:1.2,kcal:78,provenance:"TACO"},
 {id:"manga",name:"Manga madura crua",group:"frutas",protein:.5,kcal:60},
 {id:"goiaba",name:"Goiaba madura crua",group:"frutas",protein:.9,kcal:54},
 {id:"acerola",name:"Acerola crua",group:"frutas",protein:.9,kcal:33,provenance:"TACO"},
 {id:"melao",name:"Melão cru",group:"frutas",protein:.7,kcal:29},
 {id:"uva",name:"Uva crua",group:"frutas",protein:.7,kcal:69},
 {id:"abacate",name:"Abacate cru",group:"frutas",protein:1.2,kcal:96,provenance:"TACO",flags:["gorduroso"]},
 {id:"mandioca_frita",name:"Macaxeira/mandioca frita",group:"cereais",protein:1.4,kcal:300,provenance:"TACO",flags:["frito","gorduroso"]},
 {id:"farofa",name:"Farofa de mandioca temperada",group:"cereais",protein:2.1,kcal:406,provenance:"TACO",flags:["gorduroso"]},
 {id:"feijao_preto",name:"Feijão-preto cozido",group:"proteinas",protein:4.5,kcal:77,flags:["fermentavel"]},
 {id:"ervilha",name:"Ervilha cozida",group:"proteinas",protein:5.4,kcal:81,flags:["fermentavel"]},
 {id:"tilapia",name:"Filé de tilápia grelhado",group:"proteinas",protein:26,kcal:128},
 {id:"sardinha",name:"Sardinha assada",group:"proteinas",protein:29,kcal:164},
 {id:"mingau_aveia",name:"Mingau de aveia feito com água",group:"cereais",protein:2.5,kcal:72,note:"Estimativa para receita simples sem açúcar."},
 {id:"amendoim",name:"Amendoim torrado sem sal",group:"proteinas",protein:26,kcal:588,flags:["gorduroso"]},
 {id:"castanha_para",name:"Castanha-do-pará crua",group:"proteinas",protein:14,kcal:656,flags:["gorduroso"]},
 {id:"azeite",name:"Azeite de oliva",group:"cereais",protein:0,kcal:884,flags:["gorduroso"]},
 {id:"coco",name:"Coco fresco",group:"frutas",protein:3,kcal:354,flags:["gorduroso"]},
 {id:"pao_frances",name:"Pão francês",group:"cereais",protein:8,kcal:300,provenance:"TACO",flags:["industrializado"]},
 {id:"pao_integral",name:"Pão de forma integral",group:"cereais",protein:9.4,kcal:253,provenance:"TACO",flags:["industrializado"]},
 {id:"manteiga",name:"Manteiga com sal",group:"cereais",protein:.4,kcal:726,provenance:"TACO",flags:["gorduroso","laticinio"]},
 {id:"margarina",name:"Margarina com sal",group:"cereais",protein:0,kcal:596,provenance:"TACO",flags:["gorduroso","industrializado"]},
 {id:"queijo_coalho",name:"Queijo coalho",group:"proteinas",protein:21,kcal:300,flags:["gorduroso","laticinio"]},
 {id:"queijo_minas",name:"Queijo minas frescal",group:"proteinas",protein:17.4,kcal:264,provenance:"TACO",flags:["laticinio"]},
 {id:"requeijao",name:"Requeijão cremoso",group:"proteinas",protein:9.6,kcal:257,provenance:"TACO",flags:["gorduroso","laticinio"]},
 {id:"presunto",name:"Presunto cozido",group:"proteinas",protein:14.3,kcal:94,provenance:"TACO",flags:["industrializado"]},
 {id:"cafe_com_leite",name:"Café com leite (meio a meio)",group:"bebidas",protein:1.6,kcal:32,flags:["cafeina","laticinio"],note:"Estimativa para café coado com leite integral, sem açúcar."},
 {id:"achocolatado",name:"Leite com achocolatado",group:"bebidas",protein:3,kcal:85,flags:["laticinio","industrializado"]},
 {id:"bolo_simples",name:"Bolo simples caseiro",group:"cereais",protein:6.2,kcal:311,flags:["industrializado"]},
 {id:"biscoito_salgado",name:"Biscoito salgado tipo cream cracker",group:"cereais",protein:10.1,kcal:432,provenance:"TACO",flags:["industrializado"]},
 {id:"macarrao",name:"Macarrão cozido",group:"cereais",protein:3.4,kcal:102,provenance:"TACO"},
 {id:"carne_moida",name:"Carne moída refogada",group:"proteinas",protein:26.7,kcal:212,provenance:"TACO",flags:["gorduroso"]},
 {id:"linguica",name:"Linguiça de porco grelhada",group:"proteinas",protein:23,kcal:296,flags:["gorduroso","industrializado"]},
 {id:"pirarucu",name:"Pirarucu assado",group:"proteinas",protein:26,kcal:120},
 {id:"tambaqui",name:"Tambaqui assado",group:"proteinas",protein:22,kcal:180,flags:["gorduroso"]},
 {id:"baixaria",name:"Baixaria acreana (cuscuz, carne moída e ovo)",group:"cereais",protein:9,kcal:180,note:"Estimativa para a receita tradicional do Acre."},
 {id:"banana_cozida",name:"Banana comprida cozida",group:"frutas",protein:1.2,kcal:123},
 {id:"cupuacu",name:"Cupuaçu (polpa)",group:"frutas",protein:1.2,kcal:49,provenance:"TACO"},
 {id:"buriti",name:"Buriti (polpa)",group:"frutas",protein:3,kcal:145,flags:["gorduroso"],note:"Estimativa editorial; varia com a maturação."},
 {id:"tucuma",name:"Tucumã (polpa)",group:"frutas",protein:3.5,kcal:262,flags:["gorduroso"],note:"Estimativa editorial."},
 {id:"pupunha",name:"Pupunha cozida",group:"cereais",protein:2.5,kcal:164,note:"Estimativa editorial."},
 {id:"graviola",name:"Graviola (polpa)",group:"frutas",protein:.8,kcal:62,provenance:"TACO"},
 {id:"bacuri",name:"Bacuri (polpa)",group:"frutas",protein:1.9,kcal:105,note:"Estimativa editorial."},
 {id:"tapereba",name:"Taperebá / cajá (polpa)",group:"frutas",protein:.8,kcal:46,provenance:"TACO"},
 {id:"jambu",name:"Jambu refogado",group:"legumes",protein:2,kcal:32,note:"Estimativa editorial."},
 {id:"tacaca",name:"Tacacá (caldo com tucupi, goma e jambu)",group:"cereais",protein:4,kcal:70,flags:["picante"],note:"Estimativa por 100 g da cuia."},
 {id:"caldo_piranha",name:"Caldo de piranha",group:"proteinas",protein:8,kcal:60,note:"Estimativa editorial."},
 {id:"galinha_caipira",name:"Galinha caipira cozida",group:"proteinas",protein:27,kcal:200,flags:["gorduroso"]},
 {id:"carne_sol",name:"Carne de sol cozida",group:"proteinas",protein:26,kcal:280,flags:["gorduroso"]},
 {id:"pacoca_carne_sol",name:"Paçoca de carne de sol com farinha",group:"proteinas",protein:22,kcal:350,flags:["gorduroso"],note:"Estimativa para a receita tradicional."},
 {id:"matrinxa",name:"Matrinxã assado",group:"proteinas",protein:24,kcal:170,flags:["gorduroso"]},
 {id:"jaraqui",name:"Jaraqui frito",group:"proteinas",protein:22,kcal:230,flags:["frito","gorduroso"]},
 {id:"mingau_banana",name:"Mingau de banana com leite",group:"cereais",protein:3,kcal:110},
 {id:"beiju",name:"Beiju de tapioca",group:"cereais",protein:.5,kcal:330,note:"Estimativa para beiju seco."},
 {id:"chibe",name:"Chibé (farinha d'água com água)",group:"cereais",protein:.6,kcal:120,note:"Estimativa editorial."},
 {id:"farinha_agua",name:"Farinha d'água de Cruzeiro do Sul",group:"cereais",protein:1.6,kcal:360},
 {id:"milho_cozido",name:"Milho verde cozido",group:"cereais",protein:3.4,kcal:96},
 {id:"cafe_leite_gado",name:"Café com leite de gado (leite fresco)",group:"bebidas",protein:1.7,kcal:35,flags:["cafeina","laticinio"],note:"Estimativa: café coado meio a meio com leite integral fresco (~4% de gordura), sem açúcar."},
 {id:"cafe_leite_po",name:"Café com leite em pó",group:"bebidas",protein:3,kcal:62,flags:["cafeina","laticinio","industrializado"],note:"Estimativa: 2 colheres de sopa (24 g) de leite em pó integral em 200 ml de café, sem açúcar."},
 {id:"agua_coco",name:"Água de coco",group:"bebidas",protein:0,kcal:22,provenance:"TACO"},
 {id:"refrigerante",name:"Refrigerante tipo cola",group:"bebidas",protein:0,kcal:41,provenance:"TACO",flags:["industrializado","cafeina"]},
 {id:"quibe_arroz",name:"Quibe acreano de arroz",group:"cereais",protein:7,kcal:240,flags:["frito","gorduroso"],note:"Estimativa para a receita frita tradicional."},
 {id:"abiu",name:"Abiu",group:"frutas",protein:.8,kcal:62,provenance:"TACO"},
 {id:"ameixa",name:"Ameixa crua",group:"frutas",protein:.8,kcal:53,provenance:"TACO"},
 {id:"atemoia",name:"Atemoia",group:"frutas",protein:1,kcal:97,provenance:"TACO"},
 {id:"banana_ouro",name:"Banana-ouro crua",group:"frutas",protein:1.5,kcal:112,provenance:"TACO"},
 {id:"cajamanga",name:"Cajá-manga",group:"frutas",protein:1.3,kcal:46,provenance:"TACO",flags:["acido"]},
 {id:"caju",name:"Caju (fruta)",group:"frutas",protein:1,kcal:43,provenance:"TACO",flags:["acido"],note:"Rico em vitamina C."},
 {id:"caqui",name:"Caqui",group:"frutas",protein:.4,kcal:71,provenance:"TACO"},
 {id:"carambola",name:"Carambola",group:"frutas",protein:.9,kcal:46,provenance:"TACO",flags:["acido"],note:"Pessoas com doença renal devem evitar carambola."},
 {id:"figo",name:"Figo cru",group:"frutas",protein:1,kcal:41,provenance:"TACO"},
 {id:"jabuticaba",name:"Jabuticaba",group:"frutas",protein:.6,kcal:58,provenance:"TACO"},
 {id:"jaca",name:"Jaca",group:"frutas",protein:1.4,kcal:88,provenance:"TACO"},
 {id:"jambo",name:"Jambo",group:"frutas",protein:.9,kcal:27,provenance:"TACO"},
 {id:"kiwi",name:"Kiwi",group:"frutas",protein:1.3,kcal:51,provenance:"TACO",flags:["acido"]},
 {id:"limao",name:"Limão-taiti",group:"frutas",protein:.9,kcal:32,provenance:"TACO",flags:["acido"]},
 {id:"mexerica",name:"Mexerica",group:"frutas",protein:.7,kcal:37,provenance:"TACO",flags:["acido"]},
 {id:"tangerina",name:"Tangerina-poncã",group:"frutas",protein:.8,kcal:38,provenance:"TACO",flags:["acido"]},
 {id:"morango",name:"Morango",group:"frutas",protein:.9,kcal:30,provenance:"TACO",flags:["acido"]},
 {id:"nespera",name:"Nêspera",group:"frutas",protein:.3,kcal:43,provenance:"TACO"},
 {id:"pequi",name:"Pequi",group:"frutas",protein:2.3,kcal:205,provenance:"TACO",flags:["gorduroso"]},
 {id:"pessego",name:"Pêssego",group:"frutas",protein:.8,kcal:36,provenance:"TACO"},
 {id:"pinha",name:"Pinha / fruta-do-conde",group:"frutas",protein:1.5,kcal:88,provenance:"TACO"},
 {id:"pitanga",name:"Pitanga",group:"frutas",protein:.9,kcal:41,provenance:"TACO",flags:["acido"]},
 {id:"roma",name:"Romã",group:"frutas",protein:.4,kcal:56,provenance:"TACO"},
 {id:"tamarindo",name:"Tamarindo",group:"frutas",protein:3.2,kcal:276,provenance:"TACO",flags:["acido"]},
 {id:"umbu",name:"Umbu",group:"frutas",protein:.8,kcal:37,provenance:"TACO",flags:["acido"]},
 {id:"laranja_lima",name:"Laranja-lima",group:"frutas",protein:1.1,kcal:46,provenance:"TACO",note:"Menos ácida que outras laranjas."},
 {id:"camu_camu",name:"Camu-camu",group:"frutas",protein:.5,kcal:24,flags:["acido"],note:"Estimativa de estudos regionais; a vitamina C varia muito (de cerca de 800 mg a vários gramas por 100 g)."},
 {id:"araca_boi",name:"Araçá-boi",group:"frutas",protein:.6,kcal:30,flags:["acido"],note:"Estimativa de estudos regionais (INPA/Embrapa)."},
 {id:"biriba",name:"Biribá",group:"frutas",protein:1.6,kcal:80,note:"Estimativa de estudos regionais."},
 {id:"inga",name:"Ingá (polpa)",group:"frutas",protein:1,kcal:60,note:"Estimativa de estudos regionais."},
 {id:"sapoti",name:"Sapoti",group:"frutas",protein:.4,kcal:83,note:"Estimativa baseada na tabela do USDA."},
 {id:"agriao",name:"Agrião cru",group:"legumes",protein:2.7,kcal:17,provenance:"TACO"},
 {id:"almeirao",name:"Almeirão cru",group:"legumes",protein:1.8,kcal:18,provenance:"TACO"},
 {id:"chicoria",name:"Chicória crua",group:"legumes",protein:1.1,kcal:14,provenance:"TACO"},
 {id:"rucula",name:"Rúcula crua",group:"legumes",protein:2.6,kcal:25,note:"Estimativa baseada na tabela do USDA."},
 {id:"taioba",name:"Taioba crua",group:"legumes",protein:2.9,kcal:34,provenance:"TACO",note:"Consumir sempre cozida ou refogada."},
 {id:"repolho",name:"Repolho cru",group:"legumes",protein:.9,kcal:17,provenance:"TACO",flags:["fermentavel"]},
 {id:"couve_flor",name:"Couve-flor cozida",group:"legumes",protein:1.2,kcal:19,provenance:"TACO",flags:["fermentavel"]},
 {id:"cenoura_crua",name:"Cenoura crua ralada",group:"legumes",protein:1.3,kcal:34,provenance:"TACO"},
 {id:"cebola",name:"Cebola crua",group:"legumes",protein:1.7,kcal:39,provenance:"TACO",flags:["fermentavel"]},
 {id:"pimentao",name:"Pimentão verde cru",group:"legumes",protein:1.1,kcal:21,provenance:"TACO"},
 {id:"berinjela",name:"Berinjela cozida",group:"legumes",protein:.7,kcal:19,provenance:"TACO"},
 {id:"quiabo",name:"Quiabo cozido",group:"legumes",protein:1.9,kcal:22,provenance:"IBGE",note:"Fibra estimada."},
 {id:"maxixe",name:"Maxixe",group:"legumes",protein:1.4,kcal:14,provenance:"TACO"},
 {id:"jilo",name:"Jiló",group:"legumes",protein:1.4,kcal:27,provenance:"TACO"},
 {id:"nabo",name:"Nabo cru",group:"legumes",protein:1.2,kcal:18,provenance:"TACO"},
 {id:"rabanete",name:"Rabanete cru",group:"legumes",protein:1.4,kcal:14,provenance:"TACO"},
 {id:"palmito",name:"Palmito em conserva",group:"legumes",protein:1.8,kcal:23,provenance:"TACO",flags:["industrializado"],note:"Conserva tem bastante sódio; o palmito de pupunha fresco é melhor."},
 {id:"mandioquinha",name:"Mandioquinha (batata-baroa) cozida",group:"cereais",protein:.9,kcal:80,provenance:"TACO"},
 {id:"cara",name:"Cará cozido",group:"cereais",protein:1.5,kcal:78,provenance:"TACO"},
 {id:"legumes_grelhados",name:"Legumes grelhados ou assados (abobrinha, berinjela, pimentão)",group:"legumes",protein:2.7,kcal:92,note:"Estimativa com fio de azeite."},
 {id:"batata_doce_assada",name:"Batata-doce assada",group:"cereais",protein:2,kcal:90,provenance:"IBGE",note:"Fibra estimada. Assada ou grelhada sem óleo."},
 {id:"batata_doce_frita",name:"Batata-doce frita",group:"cereais",protein:4.4,kcal:351,provenance:"IBGE",flags:["frito", "gorduroso"],note:"Fibra estimada."},
 {id:"batata_assada",name:"Batata inglesa assada ou grelhada",group:"cereais",protein:1.7,kcal:86,provenance:"IBGE",note:"Fibra estimada."},
 {id:"batata_frita",name:"Batata frita",group:"cereais",protein:5,kcal:267,provenance:"TACO",flags:["frito", "gorduroso"]},
 {id:"macaxeira_assada",name:"Macaxeira assada",group:"cereais",protein:.6,kcal:125,provenance:"IBGE"},
 {id:"inhame_assado",name:"Inhame assado",group:"cereais",protein:2,kcal:90,provenance:"IBGE",note:"Fibra estimada."},
 {id:"frango_grelhado",name:"Peito de frango grelhado sem pele",group:"proteinas",protein:32,kcal:159,provenance:"TACO"},
 {id:"contrafile_grelhado",name:"Bife grelhado (contrafilé sem gordura)",group:"proteinas",protein:35.9,kcal:194,provenance:"TACO",note:"Com a gordura aparente, quase o triplo de gordura."},
 {id:"bisteca_grelhada",name:"Bisteca de porco grelhada",group:"proteinas",protein:28.9,kcal:275,flags:["gorduroso"],note:"Valores publicados pelo Nutritotal a partir de tabelas brasileiras."},
 {id:"hamburguer_grelhado",name:"Hambúrguer bovino grelhado (só a carne)",group:"proteinas",protein:26.6,kcal:214,provenance:"IBGE",flags:["industrializado"]},
 {id:"ovo_frito",name:"Ovo frito",group:"proteinas",protein:13.7,kcal:223,provenance:"IBGE",flags:["frito", "gorduroso"]},
 {id:"omelete",name:"Omelete / ovo mexido",group:"proteinas",protein:11,kcal:242,provenance:"IBGE",flags:["gorduroso"],note:"Feito com óleo ou manteiga; na frigideira antiaderente sem gordura, fica perto do ovo cozido."},
 {id:"sanduiche_natural",name:"Sanduíche natural",group:"cereais",protein:11.2,kcal:246,provenance:"IBGE",note:"Fibra estimada. Com pão integral e frango, fica mais nutritivo."},
 {id:"misto_quente",name:"Misto-quente (pão, presunto e queijo)",group:"cereais",protein:16.3,kcal:265,provenance:"IBGE",flags:["industrializado", "laticinio"],note:"Fibra estimada."},
 {id:"pao_com_ovo",name:"Pão com ovo",group:"cereais",protein:10.8,kcal:261,provenance:"IBGE",note:"Fibra estimada."},
 {id:"x_tudo",name:"X-tudo",group:"cereais",protein:13.5,kcal:267,flags:["gorduroso", "industrializado", "frito"],note:"Estimativa: 1 unidade ≈ 300 g, cerca de 800 kcal."},
 {id:"cheeseburger",name:"X-burguer / cheeseburger",group:"cereais",protein:14.2,kcal:280,provenance:"IBGE",flags:["gorduroso", "industrializado"],note:"Fibra estimada."},
 {id:"hamburguer_sanduiche",name:"Hambúrguer (sanduíche)",group:"cereais",protein:13.1,kcal:267,provenance:"IBGE",flags:["industrializado"],note:"Fibra estimada."},
 {id:"cachorro_quente",name:"Cachorro-quente",group:"cereais",protein:8.7,kcal:272,provenance:"IBGE",flags:["gorduroso", "industrializado"],note:"Fibra estimada."},
 {id:"pamonha",name:"Pamonha de milho verde (doce)",group:"cereais",protein:2.6,kcal:171,note:"Estimativa por 100 g; 1 pamonha tem cerca de 150 g. Salgada com queijo tem mais gordura e proteína."},
 {id:"canjica",name:"Canjica de milho verde (curau)",group:"cereais",protein:2.8,kcal:140,flags:["laticinio"],note:"Creme de milho verde com leite, açúcar e coco."},
 {id:"mungunza",name:"Mungunzá (milho branco com leite)",group:"cereais",protein:2.6,kcal:130,flags:["laticinio"],note:"Estimativa com leite e leite de coco, adoçado."},
 {id:"banana_frita",name:"Banana comprida (da terra) frita",group:"frutas",protein:1.5,kcal:230,flags:["frito", "gorduroso"],note:"Frita em óleo; absorve gordura conforme o tempo de fritura."},
 {id:"acai_acucar",name:"Açaí com xarope de guaraná (na tigela)",group:"frutas",protein:.7,kcal:110,provenance:"TACO",flags:["gorduroso"],note:"Granola, leite condensado, farinha e frutas aumentam as calorias."},
 {id:"abacatada",name:"Abacatada (abacate batido com leite e açúcar)",group:"bebidas",protein:2,kcal:96,flags:["gorduroso", "laticinio"],note:"Estimativa: metade abacate, metade leite integral, 5% de açúcar."},
 {id:"suco_goiaba",name:"Suco natural de goiaba sem açúcar",group:"bebidas",protein:.3,kcal:25,note:"Com açúcar, registre o açúcar à parte (1 colher de sopa ≈ 12 g, 46 kcal)."},
 {id:"mingau_aveia_leite",name:"Mingau de aveia com leite",group:"cereais",protein:4.4,kcal:110,flags:["laticinio"],note:"Estimativa: leite integral, aveia e um pouco de açúcar."},
 {id:"mingau_maisena",name:"Mingau de maisena com leite",group:"cereais",protein:2.7,kcal:108,flags:["laticinio"],note:"Estimativa: leite integral, amido de milho e açúcar."},
 {id:"cereal_milho",name:"Cereal matinal de milho (flocos)",group:"cereais",protein:7.3,kcal:370,provenance:"TACO",flags:["industrializado"],note:"Versões açucaradas ou de chocolate variam: confira o rótulo."},
 {id:"acucar_gramixo",name:"Açúcar mascavo / gramixó (açúcar macaco)",group:"cereais",protein:.8,kcal:369,provenance:"TACO",note:"Gramixó: açúcar artesanal da cana, semelhante ao mascavo; ainda é açúcar."},
 {id:"acucar",name:"Açúcar refinado",group:"cereais",protein:0,kcal:387,provenance:"TACO",flags:["industrializado"]},
 {id:"pizza",name:"Pizza de mussarela",group:"cereais",protein:11,kcal:270,flags:["gorduroso", "laticinio", "industrializado"],note:"Estimativa por 100 g; 1 fatia média ≈ 110 g. Calabresa e bordas recheadas somam mais gordura."},
 {id:"feijoada",name:"Feijoada",group:"proteinas",protein:8.7,kcal:117,provenance:"TACO",flags:["gorduroso", "fermentavel"],note:"Receita com carnes de porco e embutidos."},
 {id:"macarronada",name:"Macarronada (macarrão com molho e carne moída)",group:"cereais",protein:7.5,kcal:150,flags:["acido"],note:"Estimativa para a receita caseira."},
 {id:"crepioca",name:"Crepioca (tapioca com ovo)",group:"cereais",protein:8.8,kcal:200,note:"Estimativa: 2 colheres de goma de tapioca e 1 ovo; 1 unidade ≈ 90 g."},
 {id:"sopa_carne_legumes",name:"Sopa de carne com legumes",group:"legumes",protein:4.5,kcal:55,note:"Estimativa para sopa caseira com batata, cenoura e carne."},
 {id:"panelada",name:"Panelada (bucho e mocotó cozidos)",group:"proteinas",protein:14,kcal:140,flags:["gorduroso"],note:"Estimativa para a receita tradicional."},
 {id:"churrasco",name:"Churrasco de carne bovina (com gordura)",group:"proteinas",protein:27,kcal:250,flags:["gorduroso"],note:"Picanha e costela têm mais gordura que maminha e alcatra."},
 {id:"carne_assada",name:"Carne bovina assada",group:"proteinas",protein:32,kcal:220},
 {id:"frango_assado",name:"Frango assado com pele (peito)",group:"proteinas",protein:33.4,kcal:212,provenance:"TACO",note:"Coxa e sobrecoxa têm mais gordura. Sem a pele, a gordura cai bastante."},
 {id:"calabresa",name:"Linguiça calabresa defumada",group:"proteinas",protein:15,kcal:300,flags:["gorduroso", "industrializado"],note:"Embutido rico em sódio; varia por marca."},
 {id:"salsicha",name:"Salsicha",group:"proteinas",protein:12,kcal:244,flags:["gorduroso", "industrializado"],note:"Embutido rico em sódio; 1 unidade ≈ 50 g."},
];
/** Alimentos típicos do Acre e da Amazônia, destacados na calculadora. */
export const regionalFoodIds=new Set(["acai","cupuacu","buriti","tucuma","pupunha","graviola","bacuri","tapereba","jambu","tacaca","caldo_piranha","galinha_caipira","carne_sol","pacoca_carne_sol","matrinxa","jaraqui","mingau_banana","beiju","chibe","farinha_agua","milho_cozido","quibe_arroz","pirarucu","tambaqui","baixaria","macaxeira","banana_comprida","banana_pacova","banana_cozida","castanha_para","farinha","farofa","tapioca","queijo_coalho","cuscuz","pamonha","canjica","mungunza","banana_frita","abacatada","acucar_gramixo","panelada","crepioca","acai_acucar","camu_camu","araca_boi","biriba","inga","abiu","sapoti","jambo","maxixe","cara"]);
/* Referências TACO/UNICAMP (quando a preparação coincide) e estimativas
   editoriais TBCA/USDA para os demais. Valores podem variar conforme receita,
   marca, estágio de maturação e método de cocção. NÃO extrapolar rótulos. */
const macroMap:Record<string,[number|null,number|null,number|null,Ingredient["provenance"]?]> = {
 banana_prata:[26,.1,2,"TACO"],banana_maca:[22.3,.1,2.6,"TACO"],
 banana_comprida:[30,.2,1.5],mamão:[10,.1,1.8],maca:[15,.2,1.3],
 pera:[15,.1,3.1],melancia:[7.5,.2,.4],acai:[6.2,3.9,2.6,"TACO"],
 maracuja:[12.3,.7,1.1],abacaxi:[12.3,.1,1,"TACO"],
 laranja:[11.5,.2,.8],macaxeira:[30.1,.3,1.6,"TACO"],
 cuscuz:[25.3,.7,2.1],aveia:[66.6,6.9,9.1],
 arroz:[28.1,.2,1.6],arroz_integral:[25.8,1,2.7],
 batata:[11.9,0,1.3],batata_doce:[18.4,.1,2.2],
 inhame:[23,.2,1.7],tapioca:[54,0,.2],farinha:[89,.3,6.3],
 granola:[null,null,null,"rotulo"],neston:[null,null,null,"rotulo"],
 mucilon:[null,null,null,"rotulo"],frango:[0,3.2,0,"TACO"],
 ovo:[.6,9.5,0],peixe:[0,2.5,0],carne:[0,8,0],
 iogurte:[4.7,3.3,0],leite:[4.8,1.7,0],
 feijao:[13.6,.5,8],lentilha:[16.3,.5,7.9],
 cenoura:[6.7,.2,2.6],abobora:[10,.2,2],
 chuchu:[4.8,.1,1.3],abobrinha:[4,.2,1],
 vagem:[7,.1,3],beterraba:[7.2,.1,1.9],
 brocolis:[4.4,.5,3.4],couve:[6.1,2,3],
 espinafre:[3.7,.3,2.4],alface:[2.9,.1,1.3],
 tomate:[3.1,.2,1.2,"TACO"],pepino:[2,.1,1.1,"TACO"],
 suco_maracuja:[6,.1,.2],cha_camomila:[0,0,0],cafe:[.3,0,0],
 banana_nanica:[23.8,.1,1.9,"TACO"],banana_pacova:[20.3,.1,2,"TACO"],
 manga:[15,.2,1.6],goiaba:[13,.4,5.4],acerola:[8,.2,1.5,"TACO"],
 melao:[7.5,.1,.3],uva:[18,.2,.9],abacate:[6,8.4,6.3,"TACO"],
 mandioca_frita:[50.3,11.2,1.9,"TACO"],farofa:[80.3,9.1,7.8,"TACO"],
 feijao_preto:[14,.5,8.4],ervilha:[14.5,.4,5],
 tilapia:[0,2.5,0],sardinha:[0,4.7,0],
 mingau_aveia:[12,1.6,1.2],amendoim:[20,49,9],
 castanha_para:[12,66,7.5],azeite:[0,100,0],coco:[15,33,9],
 pao_frances:[58.6,3.1,2.3,"TACO"],pao_integral:[49.9,3.7,6.9,"TACO"],manteiga:[.1,82.4,0,"TACO"],margarina:[0,67.4,0,"TACO"],
 queijo_coalho:[2,23,0],queijo_minas:[3.2,20.2,0,"TACO"],requeijao:[2.4,23.4,0,"TACO"],presunto:[2.1,2.7,0,"TACO"],
 cafe_com_leite:[2.5,1.6,0],achocolatado:[13,2.5,.5],bolo_simples:[51,9,1],biscoito_salgado:[68.7,14.4,2.5,"TACO"],
 macarrao:[19.9,1.2,1.5,"TACO"],carne_moida:[0,10.9,0,"TACO"],linguica:[0,22,0],pirarucu:[0,1.5,0],tambaqui:[0,10,0],
 cafe_leite_gado:[2.4,2,0],cafe_leite_po:[4.8,3.2,0],agua_coco:[5.3,0,.1,"TACO"],refrigerante:[10.4,0,0,"TACO"],
 baixaria:[22,6,1.5],banana_cozida:[31,.1,2],
 cupuacu:[10.4,.9,3.1,"TACO"],buriti:[22,9,7],tucuma:[26,19,12],pupunha:[29,4.8,3.4],graviola:[15.8,.2,1.9,"TACO"],bacuri:[23,1.9,2],"tapereba":[11.6,.3,1,"TACO"],
 jambu:[6,.5,2],tacaca:[12,1,.5],caldo_piranha:[3,2,0],galinha_caipira:[0,10,0],carne_sol:[0,17,0],pacoca_carne_sol:[25,16,3],
 matrinxa:[0,8,0],jaraqui:[4,14,0],mingau_banana:[19,2.5,1],beiju:[81,.3,.5],chibe:[29,.1,1.5],farinha_agua:[87,.4,6],milho_cozido:[19,1.2,2.5],quibe_arroz:[30,10,1],
 abiu:[14.9,.7,1.7,"TACO"],ameixa:[13.9,0,2.4,"TACO"],atemoia:[25.3,.3,2.1,"TACO"],banana_ouro:[29.3,.2,2,"TACO"],cajamanga:[11.4,0,2.6,"TACO"],caju:[10.3,.3,1.7,"TACO"],caqui:[19.3,.1,6.5,"TACO"],carambola:[11.5,.2,2,"TACO"],figo:[10.2,.2,1.8,"TACO"],jabuticaba:[15.3,.1,2.3,"TACO"],jaca:[22.5,.3,2.4,"TACO"],jambo:[6.5,.1,5.1,"TACO"],kiwi:[11.5,.6,2.7,"TACO"],limao:[11.1,.1,1.2,"TACO"],mexerica:[9.3,.1,2.7,"TACO"],tangerina:[9.6,.1,.9,"TACO"],morango:[6.8,.3,1.7,"TACO"],nespera:[11.5,0,3,"TACO"],pequi:[13,18,19,"TACO"],pessego:[9.3,0,1.4,"TACO"],pinha:[22.4,.3,3.4,"TACO"],pitanga:[10.2,.2,3.2,"TACO"],roma:[15.1,0,.4,"TACO"],tamarindo:[72.5,.5,6.4,"TACO"],umbu:[9.4,0,2,"TACO"],laranja_lima:[11.5,.1,1.8,"TACO"],camu_camu:[5.9,.2,1.1],araca_boi:[7,.2,2],biriba:[19,.3,1.4],inga:[15,.1,1.2],sapoti:[20,1.1,5.3],agriao:[2.3,.2,2.1,"TACO"],almeirao:[3.3,.2,2.6,"TACO"],chicoria:[2.9,.1,2.2,"TACO"],rucula:[3.7,.7,1.6],taioba:[5.4,.9,4.5,"TACO"],repolho:[3.9,.1,1.9,"TACO"],couve_flor:[3.9,.3,2.1,"TACO"],cenoura_crua:[7.7,.2,3.2,"TACO"],cebola:[8.9,.1,2.2,"TACO"],pimentao:[4.9,.2,2.6,"TACO"],berinjela:[4.5,.1,2.5,"TACO"],quiabo:[4.5,.2,2.5,"IBGE"],maxixe:[2.7,.1,2.2,"TACO"],jilo:[6.2,.2,4.8,"TACO"],nabo:[4.1,.1,2.6,"TACO"],rabanete:[2.7,.1,2.2,"TACO"],palmito:[4.3,.4,3.2,"TACO"],mandioquinha:[18.9,.2,1.8,"TACO"],cara:[18.9,.1,2.6,"TACO"],legumes_grelhados:[12.5,3.6,2.5],batata_doce_assada:[20.7,.2,3,"IBGE"],batata_doce_frita:[56.9,12.6,3.5,"IBGE"],batata_assada:[20,.1,1.8,"IBGE"],batata_frita:[35.6,13.1,8.1,"TACO"],macaxeira_assada:[30.1,.3,1.6,"IBGE"],inhame_assado:[20.7,.2,2,"IBGE"],frango_grelhado:[0,2.5,0,"TACO"],contrafile_grelhado:[0,4.5,0,"TACO"],bisteca_grelhada:[0,17.4,0],hamburguer_grelhado:[0,11.1,0,"IBGE"],ovo_frito:[1.2,17.7,0,"IBGE"],omelete:[1,21.3,0,"IBGE"],sanduiche_natural:[25.6,10.8,2,"IBGE"],misto_quente:[18.3,13.8,1.2,"IBGE"],pao_com_ovo:[29.9,10.4,1.5,"IBGE"],x_tudo:[15.1,16.7,1.2],cheeseburger:[28.7,11.8,1.3,"IBGE"],hamburguer_sanduiche:[32.4,9.2,1.5,"IBGE"],cachorro_quente:[24.8,15.2,1.5,"IBGE"],
 pamonha:[30.7,4.8,2.4],canjica:[26,3,1.2],mungunza:[22,3.6,1.2],banana_frita:[36,9,2.3],acai_acucar:[21.5,3.7,1.7,"TACO"],abacatada:[10,5.4,3],suco_goiaba:[6,.1,1.5],mingau_aveia_leite:[15.8,3.3,.9],mingau_maisena:[18.5,2.5,.1],cereal_milho:[80.8,1.6,5.3,"TACO"],acucar_gramixo:[94.5,.1,0,"TACO"],acucar:[99.5,0,0,"TACO"],pizza:[30,11.5,1.6],feijoada:[11.6,6.5,5.1,"TACO"],macarronada:[19,4.8,1.4],crepioca:[26,6.7,.2],sopa_carne_legumes:[5.5,1.6,1],panelada:[2,8.5,.3],churrasco:[0,15.5,0],carne_assada:[0,10,0],frango_assado:[0,7.6,0,"TACO"],calabresa:[1.5,26,0],salsicha:[4,20,0],
};
export const ingredients:Ingredient[]=baseIngredients.map(food=>{
 const n=macroMap[food.id];
 if(!n)throw new Error("Faltam macronutrientes para "+food.id);
 return {...food,carbs:n[0],fat:n[1],fiber:n[2],provenance:n[3]??food.provenance??"estimativa"};
});
export type FoodMacro="protein"|"carbs"|"fat"|"kcal";
export const foodMacroLabels:Record<FoodMacro,string>={protein:"Proteína",carbs:"Carboidratos",fat:"Gorduras",kcal:"Calorias"};
export const portionNutrition=(item:Ingredient,grams:number)=>{
 const factor=Number.isFinite(grams)&&grams>=0&&grams<=5000?grams/100:NaN;
 const scale=(v:number|null)=>v===null||!Number.isFinite(factor)?null:Math.round(v*factor*10)/10;
 return {protein:scale(item.protein),carbs:scale(item.carbs),fat:scale(item.fat),
   fiber:scale(item.fiber),kcal:scale(item.kcal)};
};
export const gramsForMacro=(item:Ingredient,macro:FoodMacro,remaining:number)=>{
 const per100=item[macro];
 if(per100===null||!Number.isFinite(per100)||per100<=0||!Number.isFinite(remaining)||remaining<0)return null;
 return Math.ceil(remaining/per100*100/5)*5;
};
export type Recipe={id:string;title:string;slot:MealTime;minutes:number;ingredients:Array<[string,number]>;steps:string[];
 goals:Goal[];tags:string[];description:string};
const R=(id:string,title:string,slot:MealTime,minutes:number,items:Array<[string,number]>,steps:string[],goals:Goal[],tags:string[],description:string):Recipe=>({id,title,slot,minutes,ingredients:items,steps,goals,tags,description});
const all:Goal[]=["equilibrio","emagrecimento","ganho_peso","hipertrofia"];
export const recipes:Recipe[]=[
 R("cuscuz_ovo","Cuscuz com ovos cozidos","cafe",15,[["cuscuz",130],["ovo",100]],["Cozinhe o cuscuz no vapor.","Cozinhe os ovos e sirva com o cuscuz."],all,["regional","sem fritura"],"Café regional com proteína."),
 R("mingau_banana","Mingau de aveia com banana-prata","cafe",12,[["aveia",40],["banana_prata",90]],["Cozinhe aveia com água até ficar cremosa.","Acrescente banana madura amassada; sirva morno."],all,["sem leite","macio"],"Opção simples; ajuste fibras à tolerância."),
 R("ovo_macaxeira","Ovo cozido com macaxeira","cafe",20,[["ovo",100],["macaxeira",140]],["Cozinhe a mandioca até ficar macia.","Sirva com ovos cozidos, sem fritura."],all,["regional"],"Fonte de energia com proteína."),
 R("mamao_aveia","Mamão com aveia","cafe",5,[["mamão",160],["aveia",25]],["Corte o mamão maduro.","Polvilhe a aveia e ajuste a porção conforme tolerância."],all,["frutas"],"Café da manhã prático."),
 R("frango_arroz_abobora","Frango cozido com arroz e abóbora","almoco",30,[["frango",140],["arroz",130],["abobora",140]],["Cozinhe e desfie o frango sem pele.","Sirva com arroz e abóbora cozida; tempere suavemente."],all,["proteico","cozido"],"Prato simples com ingredientes comuns."),
 R("frango_macaxeira","Peito de frango com macaxeira e chuchu","almoco",30,[["frango",150],["macaxeira",160],["chuchu",120]],["Cozinhe o frango e desfie.","Sirva com macaxeira bem cozida e chuchu."],all,["regional","proteico"],"Almoço completo sem fritura."),
 R("peixe_batata","Peixe cozido com batata e cenoura","almoco",25,[["peixe",150],["batata",180],["cenoura",120]],["Cozinhe o peixe com pouco sal e ervas suaves.","Cozinhe batata e cenoura e sirva."],all,["leve","proteico"],"Refeição de textura macia."),
 R("carne_arroz_vagem","Carne magra, arroz e vagem","almoco",30,[["carne",130],["arroz",120],["vagem",130]],["Cozinhe a carne até ficar macia.","Sirva com arroz e vagem cozida."],all,["proteico"],"Alternativa ao frango."),
 R("feijao_arroz_frango","Arroz, feijão e frango","almoco",30,[["arroz",120],["feijao",110],["frango",110]],["Prepare arroz e feijão cozidos.","Sirva com frango cozido ou grelhado sem excesso de óleo."],all,["tradicional","leguminosas"],"Pode precisar de adaptação se feijão causar gases."),
 R("sopa_frango","Sopa suave de frango e legumes","jantar",30,[["frango",120],["batata",140],["cenoura",100],["chuchu",100]],["Cozinhe os vegetais em água até amaciar.","Acrescente frango cozido desfiado e aqueça sem pimenta."],all,["macio","leve"],"Jantar de preparo fácil e suave."),
 R("jantar_cuscuz_frango","Cuscuz com frango e abobrinha","jantar",20,[["cuscuz",130],["frango",130],["abobrinha",120]],["Cozinhe o cuscuz no vapor.","Misture frango desfiado e abobrinha cozida."],all,["regional","proteico"],"Prato simples para o jantar."),
 R("jantar_peixe_arroz","Arroz com peixe e abóbora","jantar",25,[["arroz",120],["peixe",140],["abobora",120]],["Cozinhe o peixe e a abóbora.","Sirva com arroz morno."],all,["leve"],"Alternativa de jantar."),
 R("frango_batata_doce","Frango desfiado com batata-doce","jantar",25,[["frango",140],["batata_doce",180],["vagem",100]],["Cozinhe batata-doce e vagem.","Sirva com frango desfiado sem molho ácido."],all,["proteico"],"Para variar a fonte de carboidratos."),
 R("banana_ovo","Banana-maçã e ovo cozido","lanche",12,[["banana_maca",100],["ovo",50]],["Descasque a banana.","Sirva com ovo cozido."],all,["frutas","proteico"],"Lanche sem produto industrializado."),
 R("maca_frango","Macaxeira com frango desfiado","lanche",20,[["macaxeira",100],["frango",75]],["Cozinhe macaxeira até ficar macia.","Acrescente frango desfiado."],all,["regional","proteico"],"Lanche salgado caseiro."),
 R("pera_iogurte","Pera com iogurte natural","lanche",5,[["pera",120],["iogurte",170]],["Corte a pera madura.","Sirva com iogurte, apenas se tolerar laticínios."],all,["fruta","lactose"],"Atenção à tolerância ao leite."),
 R("banana_aveia","Banana-prata com aveia","lanche",5,[["banana_prata",120],["aveia",20]],["Amasse a banana madura.","Misture aveia aos poucos, se tolerada."],all,["regional"],"Lanche rápido."),
 R("mamao_ovo","Mamão com ovos cozidos","lanche",15,[["mamão",170],["ovo",100]],["Corte o mamão.","Sirva com ovos bem cozidos."],all,["proteico"],"Combinação simples de frutas e proteína."),
 R("acai_banana","Açaí puro com banana e aveia","lanche",5,[["acai",140],["banana_prata",80],["aveia",25]],["Use polpa sem xarope ou açúcar.","Misture banana e aveia."],["ganho_peso","hipertrofia","equilibrio"],["açaí","mais energético"],"Pode ser pesado para quem tem desconforto digestivo."),
 R("suco_ovo_cuscuz","Cuscuz, ovo e suco de maracujá","cafe",15,[["cuscuz",110],["ovo",100],["suco_maracuja",200]],["Cozinhe cuscuz e ovos.","Prepare suco natural sem açúcar."],["equilibrio","ganho_peso","hipertrofia"],["regional","ácido"],"Evitar caso sucos ácidos provoquem sintomas."),
];
export const ingredientById=new Map(ingredients.map(item=>[item.id,item]));
export const recipeTotals=(recipe:Recipe)=>{
 let protein=0,carbs=0,fat=0,fiber=0,kcal=0,unverified=false;
 for(const [id,g] of recipe.ingredients){
  const item=ingredientById.get(id);
  if(!item||item.protein===null||item.kcal===null){unverified=true;continue;}
  const n=portionNutrition(item,g);
  protein+=n.protein??0;carbs+=n.carbs??0;fat+=n.fat??0;fiber+=n.fiber??0;kcal+=n.kcal??0;
  if(n.carbs===null||n.fat===null)unverified=true;
 }
 return {protein:Math.round(protein*10)/10,carbs:Math.round(carbs*10)/10,
  fat:Math.round(fat*10)/10,fiber:Math.round(fiber*10)/10,kcal:Math.round(kcal),unverified};
};
export const triggerNames={
 acido:"ácidos",gorduroso:"mais gordurosos",cafeina:"cafeína",picante:"pimenta",
 frito:"fritura",laticinio:"laticínios",fermentavel:"fermentáveis",industrializado:"industrializados"
};
export type Trigger=keyof typeof triggerNames;
export const recipeTriggers=(recipe:Recipe):Trigger[]=>Array.from(new Set(recipe.ingredients.flatMap(([id])=>ingredientById.get(id)?.flags??[])));
/** Gastrite: não é uma dieta curativa. Excluir apenas gatilhos usuais/relatados. */
export function recipeFits(recipe:Recipe,goal:Goal,stomachSensitive:boolean,avoided:string[]):boolean{
 if(!recipe.goals.includes(goal))return false;
 if(recipe.ingredients.some(([id])=>avoided.includes(id)))return false;
 if(stomachSensitive && recipeTriggers(recipe).some(flag=>["acido","gorduroso","cafeina","picante","frito"].includes(flag)))return false;
 return true;
}
/** Faixas educativas para adultos sem doença renal ou outra restrição proteica. */
export const proteinRange=(weight:number,goal:Goal)=>{
 const ranges:Record<Goal,[number,number]>={
   equilibrio:[.8,1],emagrecimento:[1.2,1.6],ganho_peso:[1.2,1.6],hipertrofia:[1.4,2]
 };
 const [low,high]=ranges[goal];
 if(!Number.isFinite(weight)||weight<30||weight>300)return null;
 return {low:Math.round(weight*low),high:Math.round(weight*high),perKg:[low,high] as const};
};
export const mealSlots=[{id:"cafe",label:"Café da manhã"},{id:"almoco",label:"Almoço"},{id:"jantar",label:"Jantar"},{id:"lanche",label:"Lanche"}] as const;
/** Plano rotativo apenas ilustrativo: não fixa calorias nem substitui prescrição. */
export function menuForDay(dayIndex:number,allRecipes:Recipe[],rotation=0,goal:Goal="equilibrio"){
 return mealSlots.map((slot,slotIndex)=>{
  const options=allRecipes.filter(r=>r.slot===slot.id);
  // Ordena pelo objetivo sem criar receitas nem inventar valores clínicos.
  const score=(r:Recipe)=>{
   const {protein,kcal}=recipeTotals(r);
   if(goal==="hipertrofia")return protein*10+kcal*.01;
   if(goal==="ganho_peso")return kcal+protein;
   if(goal==="emagrecimento")return protein*5-kcal*.12;
   return 0;
  };
  if(goal!=="equilibrio")options.sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
  // Rotação por dia com variedade entre as quatro refeições; sem repetição
  // artificial no mesmo tipo de refeição e sem incluir ceia obrigatória.
  const chosen=options.length?options[(dayIndex+rotation+slotIndex)%options.length]:null;
  return {slot,recipe:chosen};
 });
}
