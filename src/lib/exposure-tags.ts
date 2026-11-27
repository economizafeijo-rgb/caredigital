/** Classifica o que a pessoa ingeriu (comida, bebida, remédio, suplemento) em grupos que costumam dar sintomas. */

export type ExposureKind = "alimento" | "bebida" | "remedio" | "suplemento";

export const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

type Rule = { tag: string; label: string; re: RegExp; kinds?: ExposureKind[] };

const FOOD_RULES: Rule[] = [
  {
    tag: "g:laticinio",
    label: "Laticínios",
    re: /\b(leite|queijo|iogurte|requeij|manteiga|creme de leite|nata|whey|condensado|sorvete|coalhada|kefir|chocolate ao leite|mussarela|muçarela|ricota|cream cheese|cappuccino)/,
  },
  {
    tag: "g:gluten",
    label: "Glúten (trigo)",
    re: /\b(pao|paes|macarr|massa|bolo|trigo|biscoit|bolach|pizza|cerveja|pastel|coxinha|empad|torrada|lasanha|nhoque|cuscuz de trigo|panqueca)/,
  },
  { tag: "g:ovo", label: "Ovo", re: /\b(ovo|ovos|omelete|maionese|gema|clara)/ },
  {
    tag: "g:frutos_mar",
    label: "Frutos do mar",
    re: /\b(camarao|marisco|lagosta|caranguejo|siri|lula|polvo|ostra|mexilhao)/,
  },
  {
    tag: "g:peixe",
    label: "Peixe",
    re: /\b(peixe|tilapia|sardinha|atum|salmao|pescada|tambaqui|pirarucu|bacalhau|surubim)/,
  },
  {
    tag: "g:oleaginosas",
    label: "Amendoim e castanhas",
    re: /\b(amendoim|castanha|noz|nozes|amendoa|pistache|pacoca|avela)/,
  },
  { tag: "g:soja", label: "Soja", re: /\b(soja|tofu|shoyu|edamame)/ },
  {
    tag: "g:gorduroso",
    label: "Fritura e gordura",
    re: /\b(frito|frita|fritura|torresmo|bacon|linguica|calabresa|hamburguer|pizza|feijoada|churrasco|gordura|pastel|coxinha|salgado)/,
  },
  { tag: "g:picante", label: "Picante", re: /\b(pimenta|picante|curry|chilli|molho de pimenta)/ },
  {
    tag: "g:citrico",
    label: "Frutas e molhos ácidos",
    re: /\b(limao|laranja|abacaxi|acerola|maracuja|tomate|vinagre|tangerina|morango|kiwi|caju|ketchup)/,
  },
  {
    tag: "g:acucar",
    label: "Açúcar e doces",
    re: /\b(refrigerante|doce|sorvete|bolo|chocolate|acucar|bala|sobremesa|pudim|brigadeiro|mel\b|suco de caixa|achocolatado)/,
  },
  {
    tag: "g:carne_verm",
    label: "Carne vermelha",
    re: /\b(carne|bife|picanha|costela|porco|figado|alcatra|maminha|cupim|fraldinha)/,
  },
  {
    tag: "g:processado",
    label: "Embutidos e ultraprocessados",
    re: /\b(presunto|salsicha|linguica|mortadela|salame|nuggets|bacon|peito de peru|apresuntado|salgadinho|macarrao instantaneo|miojo|biscoito recheado|sopa instantanea)/,
  },
  {
    tag: "g:sodio",
    label: "Muito sal",
    re: /\b(presunto|salsicha|linguica|mortadela|salame|nuggets|bacon|salgadinho|miojo|macarrao instantaneo|sopa instantanea|enlatado|conserva|shoyu|queijo curado|parmesao|fast food|hamburguer|carne seca|charque|sardinha em lata|azeitona)/,
  },
  {
    tag: "g:histamina",
    label: "Histamina e tiramina (curados, fermentados)",
    re: /\b(queijo curado|parmesao|gorgonzola|vinho|salame|presunto|atum|sardinha|chucrute|kimchi|vinagre|cerveja|embutido|shoyu)/,
  },
  {
    tag: "g:gases",
    label: "Feijões e crucíferas",
    re: /\b(feijao|lentilha|grao de bico|ervilha|brocolis|couve|repolho|couve-flor|couve flor|cebola|alho)/,
  },
  {
    tag: "g:adocante",
    label: "Adoçantes",
    re: /\b(adocante|aspartame|sucralose|diet|zero|light|stevia)/,
  },
  {
    tag: "g:alcool",
    label: "Álcool",
    re: /\b(cerveja|vinho|cachaca|vodka|whisky|caipirinha|alcool|chopp|champanhe|licor|gin\b|drink)/,
  },
  {
    tag: "g:cafeina",
    label: "Cafeína",
    re: /\b(cafe|cha preto|cha verde|mate|energetico|guarana|cola|coca|pre.?treino|cappuccino|expresso)/,
  },
];

const RX_RULES: Rule[] = [
  {
    tag: "r:ains",
    label: "Anti-inflamatórios (irritam o estômago)",
    re: /\b(ibuprofeno|diclofenaco|naproxeno|nimesulida|cetoprofeno|aspirina|aas|acido acetilsalicilico|meloxicam|cetorolaco|alivium|advil)/,
  },
  {
    tag: "r:analgesico",
    label: "Analgésicos",
    re: /\b(dipirona|paracetamol|tramadol|codeina|novalgina|tylenol|neosaldina)/,
  },
  {
    tag: "r:anti_hipert",
    label: "Remédios de pressão",
    re: /\b(losartana|enalapril|captopril|anlodipino|amlodipino|atenolol|metoprolol|hidroclorotiazida|valsartana|propranolol|furosemida|carvedilol|olmesartana)/,
  },
  {
    tag: "r:antibiotico",
    label: "Antibióticos",
    re: /\b(amoxicilina|azitromicina|cefalexina|ciprofloxacino|metronidazol|sulfa|claritromicina|cefuroxima|levofloxacino|clavulanato)/,
  },
  {
    tag: "r:diabetes",
    label: "Remédios de diabetes",
    re: /\b(metformina|glibenclamida|glimepirida|insulina|gliclazida|sitagliptina)/,
  },
  {
    tag: "r:corticoide",
    label: "Corticoides",
    re: /\b(prednisona|prednisolona|dexametasona|betametasona|hidrocortisona|deflazacorte)/,
  },
  {
    tag: "r:antialergico",
    label: "Antialérgicos (dão sono)",
    re: /\b(loratadina|desloratadina|cetirizina|dexclorfeniramina|hidroxizina|fexofenadina)/,
  },
  {
    tag: "r:protetor",
    label: "Protetores de estômago",
    re: /\b(omeprazol|pantoprazol|esomeprazol|lansoprazol|ranitidina)/,
  },
  {
    tag: "r:calmante",
    label: "Calmantes e para dormir",
    re: /\b(clonazepam|alprazolam|diazepam|zolpidem|bromazepam|rivotril|melatonina)/,
  },
  {
    tag: "r:antidepressivo",
    label: "Antidepressivos",
    re: /\b(sertralina|fluoxetina|escitalopram|amitriptilina|venlafaxina|paroxetina|duloxetina)/,
  },
];

const SUP_RULES: Rule[] = [
  { tag: "s:ferro", label: "Ferro", re: /\b(ferro|sulfato ferroso|ferroso)/ },
  { tag: "s:magnesio", label: "Magnésio", re: /\b(magnesio)/ },
  { tag: "s:zinco", label: "Zinco", re: /\b(zinco)/ },
  { tag: "s:calcio", label: "Cálcio", re: /\b(calcio)/ },
  { tag: "s:vitc", label: "Vitamina C", re: /\b(vitamina c|vit c|acido ascorbico)/ },
  { tag: "s:creatina", label: "Creatina", re: /\b(creatina)/ },
  { tag: "s:whey", label: "Whey e proteínas", re: /\b(whey|proteina|albumina|caseina)/ },
  {
    tag: "s:pretreino",
    label: "Pré-treino e termogênicos",
    re: /\b(pre.?treino|termogenic|cafeina|taurina)/,
  },
  { tag: "s:omega", label: "Ômega 3", re: /\b(omega|oleo de peixe)/ },
];

export type TagInfo = { tag: string; label: string };
const ALL = [...FOOD_RULES, ...RX_RULES, ...SUP_RULES];
export const TAG_LABELS = new Map<string, string>(ALL.map((r) => [r.tag, r.label]));
TAG_LABELS.set("g:lactose", "Lactose");

/** Nome curto e estável de um item, usado para achar o mesmo alimento ou remédio em outros dias. */
export function itemKey(label: string): string {
  const words = norm(label)
    .replace(/[0-9.,]+\s*(ml|g|kg|mg|l|un|unidades?|fatias?|colheres?|copos?|xicaras?)?/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 1 && !["de", "da", "do", "com", "sem", "em", "e", "ao", "a", "o"].includes(w),
    );
  return words.slice(0, 3).join(" ");
}

export function tagsFor(label: string, kind: ExposureKind): string[] {
  const text = norm(label);
  const rules =
    kind === "remedio"
      ? RX_RULES
      : kind === "suplemento"
        ? [...SUP_RULES, ...RX_RULES]
        : FOOD_RULES;
  const out = rules.filter((r) => r.re.test(text)).map((r) => r.tag);
  if (kind === "suplemento" && /cafeina|pre.?treino|termogenic/.test(text)) out.push("g:cafeina");
  if (
    out.includes("g:laticinio") &&
    !/sem lactose|zero lactose|delac/.test(text) &&
    !/whey/.test(text)
  )
    out.push("g:lactose");
  const key = itemKey(label);
  if (key) out.push(`i:${key}`);
  return out;
}
