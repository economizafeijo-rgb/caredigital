/** Categories are persisted as distinct values in Supabase. Other beverages do not
 * increase the water-only goal; foods do not mark scheduled meals completed. */
export const foodKinds=[
  {value:"fruta",label:"Frutas",example:"Ex.: banana, mamão, maçã",hint:"Uma fruta ou porção de frutas"},
  {value:"cafe_manha",label:"Café da manhã",example:"Ex.: mingau de aveia, banana e ovo",hint:"Refeição da manhã"},
  {value:"almoco",label:"Almoço",example:"Ex.: arroz, carne cozida e macaxeira (100 g cada)",hint:"Refeição principal"},
  {value:"jantar",label:"Jantar",example:"Ex.: sopa de legumes com frango",hint:"Refeição da noite"},
  {value:"lanche",label:"Lanche",example:"Ex.: sanduíche, banana ou tapioca",hint:"Entre as refeições"},
  {value:"ceia",label:"Ceia",example:"Ex.: fruta ou mingau leve",hint:"Pequena refeição noturna"},
  {value:"refeicao",label:"Refeição completa",example:"Ex.: prato com arroz, feijão, carne e legumes",hint:"Outro tipo de refeição"},
  {value:"salada",label:"Salada / legumes",example:"Ex.: salada de folhas e legumes cozidos",hint:"Vegetais consumidos"},
  {value:"sopa",label:"Sopa / caldo",example:"Ex.: sopa de legumes com batata",hint:"Sopas e caldos"},
  {value:"sobremesa",label:"Sobremesa",example:"Ex.: gelatina, pudim ou doce",hint:"Sobremesas consumidas"},
] as const;

export const beverageKinds=[
  {value:"agua",label:"Água",example:"Água",hint:"Conta para a meta de líquidos",amount:200},
  {value:"cha",label:"Chá",example:"Ex.: chá de camomila",hint:"Infusão ou chá preparado",amount:200},
  {value:"suco",label:"Suco",example:"Ex.: suco natural de maçã",hint:"Suco natural ou industrializado",amount:200},
  {value:"cafe",label:"Café",example:"Ex.: café coado",hint:"Café, expresso ou com leite",amount:100},
  {value:"energetico",label:"Energético",example:"Ex.: energético em lata",hint:"Bebida energética",amount:250},
  {value:"suplemento",label:"Suplemento líquido",example:"Ex.: suplemento nutricional pronto",hint:"Suplemento consumido como líquido",amount:200},
  {value:"shake",label:"Shake",example:"Ex.: shake de proteína com banana",hint:"Batida proteica ou shake",amount:300},
  {value:"isotonico",label:"Isotônico",example:"Ex.: bebida esportiva",hint:"Isotônico ou bebida eletrolítica",amount:500},
  {value:"vitamina",label:"Vitamina / smoothie",example:"Ex.: vitamina de mamão e aveia",hint:"Frutas batidas e smoothies",amount:250},
  {value:"leite",label:"Leite / derivado",example:"Ex.: leite sem lactose",hint:"Leite ou bebida semelhante",amount:200},
  {value:"agua_coco",label:"Água de coco",example:"Água de coco natural",hint:"Conta para a hidratação diária",amount:250},
  {value:"refrigerante",label:"Refrigerante",example:"Ex.: refrigerante sem açúcar",hint:"Bebida gaseificada",amount:250},
  {value:"outra",label:"Outra bebida",example:"Descreva a bebida que tomou",hint:"Outra opção não listada",amount:200},
] as const;

export type FoodKind=(typeof foodKinds)[number]["value"];
export type BeverageKind=(typeof beverageKinds)[number]["value"];
export type IntakeKind=FoodKind|BeverageKind;
const foodSet=new Set<string>(foodKinds.map(c=>c.value));
const beverageSet=new Set<string>(beverageKinds.map(c=>c.value));
export const isFoodKind=(kind:string):kind is FoodKind=>foodSet.has(kind);
export const isBeverageKind=(kind:string):kind is BeverageKind=>beverageSet.has(kind);
export const foodCategory=(kind:string)=>foodKinds.find(c=>c.value===kind);
export const beverageCategory=(kind:string)=>beverageKinds.find(c=>c.value===kind);
export const intakeCategory=(kind:string)=>foodCategory(kind)||beverageCategory(kind);
