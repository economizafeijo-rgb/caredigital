/**
 * Catálogo editorial CareDigital: alimentos regionais do Brasil e estimativas nutricionais.
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
 provenance?: "TACO"|"estimativa"|"rotulo";
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
];
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
