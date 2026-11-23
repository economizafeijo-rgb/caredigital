import { foodKinds, mealCombos, typicalFoods, type FoodKind } from "./care-intake-categories";
import { parseFoodText } from "./food-parser";
import { ingredients } from "./nutrition-catalog";

/**
 * Busca de alimentos do "Registrar refeição".
 * As categorias (café da manhã, almoço…) são só SUGESTÕES: a busca varre o catálogo
 * inteiro e todos os pratos prontos, em qualquer categoria. A categoria mais provável
 * dos resultados é devolvida apenas para ser destacada na tela.
 */
export type SearchItem = { label: string; text: string };
export type SearchHit = SearchItem & { kinds: FoodKind[]; score: number };
export type SearchResult = { items: SearchHit[]; suggestedKind: FoodKind | null };

export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Nomes populares que não aparecem no nome oficial do alimento. */
const synonyms: Record<string, string[]> = {
  bolacha: ["biscoito", "cream", "cracker"],
  biscoito: ["bolacha"],
  brigadeiro: ["doce", "docinho", "chocolate", "negrinho"],
  cocada: ["doce", "coco"],
  macaxeira: ["mandioca", "aipim"],
  mandioca: ["macaxeira", "aipim"],
  aipim: ["macaxeira", "mandioca"],
  jerimum: ["abobora"],
  abobora: ["jerimum"],
  refri: ["refrigerante"],
  pao: ["pao frances", "paozinho"],
  cuscuz: ["cuscuz de milho"],
  carne: ["bife", "boi", "bovina"],
  frango: ["galinha"],
  galinha: ["frango"],
  presunto: ["apresuntado"],
  mussarela: ["mucarela", "queijo"],
  queijo: ["mussarela", "coalho"],
  file: ["peito"],
  peito: ["file"],
  pimenta: ["panela", "cheiro", "malagueta"],
  cebola: ["cabeca"],
  sorvete: ["pote", "massa"],
  chocolate: ["barra"],
  cozido: ["cozidao"],
};

/** Itens que a pessoa espera achar na aba Frutas mesmo fora do grupo "frutas" do catálogo. */
const alsoFruit = new Set(["castanha_caju", "castanha_para", "coco", "amendoim"]);
const notFruit = new Set(["goiabada", "brigadeiro", "doce_coco", "doce_leite", "pe_moleque"]);

const groupKind: Record<string, FoodKind> = {
  frutas: "fruta",
  legumes: "salada",
  proteinas: "almoco",
  cereais: "almoco",
};

const STOPWORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "em",
  "com",
  "e",
  "a",
  "o",
  "as",
  "os",
  "no",
  "na",
]);
const DESCRIPTORS = new Set([
  "cru",
  "crua",
  "cozido",
  "cozida",
  "fuji",
  "formosa",
  "tommy",
  "italia",
  "vermelha",
  "caseiro",
  "caseira",
  "simples",
  "integral",
  "natural",
  "lisa",
  "tipo",
  "taiti",
  "industrializada",
  "magra",
  "oliva",
  "carioca",
  "bovina",
  "tradicional",
]);
const words = (text: string) => normalize(text).split(" ").filter(Boolean);
const queryWords = (text: string) => {
  const all = words(text);
  const useful = all.filter((w) => !STOPWORDS.has(w));
  return useful.length ? useful : all;
};

/** Distância de edição limitada (tolera um erro de digitação). */
function withinOneEdit(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

type Entry = SearchItem & {
  hay: string[];
  kinds: Set<FoodKind>;
  fromCatalog: boolean;
  id: string | null;
};
let indexCache: Entry[] | null = null;

function catalogText(item: { id: string; name: string }): string | null {
  const base = item.name
    .split(",")[0]
    .replace(/\s*\(.*$/, "")
    .trim();
  const candidates = [
    base,
    item.name
      .replace(/\s*\(.*?\)/g, "")
      .replace(/,/g, "")
      .trim(),
  ];
  for (const text of candidates) {
    const parsed = parseFoodText(text);
    if (parsed.length === 1 && parsed[0].id === item.id) return text;
  }
  return null;
}

function buildIndex(): Entry[] {
  if (indexCache) return indexCache;
  const byText = new Map<string, Entry>();
  const add = (
    label: string,
    text: string,
    kind: FoodKind | undefined,
    fromCatalog: boolean,
    extra = "",
  ) => {
    const key = normalize(text);
    let entry = byText.get(key);
    if (!entry) {
      const parsed = parseFoodText(text);
      entry = {
        label,
        text,
        hay: [],
        kinds: new Set(),
        fromCatalog,
        id: parsed.length === 1 ? parsed[0].id : null,
      };
      byText.set(key, entry);
    }
    if (kind) entry.kinds.add(kind);
    entry.hay = [...new Set([...entry.hay, ...words(`${label} ${extra}`)])];
  };

  for (const kind of foodKinds.map((c) => c.value)) {
    for (const item of [...(typicalFoods[kind] ?? []), ...(mealCombos[kind] ?? [])])
      add(item.label, item.text, kind, false);
  }
  for (const item of ingredients) {
    if (item.group === "bebidas") continue;
    const text = catalogText(item);
    if (!text) continue;
    const kind = notFruit.has(item.id) ? "sobremesa" : groupKind[item.group];
    add(text, text, kind, true, item.name);
    if (alsoFruit.has(item.id)) add(text, text, "fruta", true, item.name);
  }
  // sinônimos entram no "palheiro" de cada item que contém a palavra-base
  for (const entry of byText.values()) {
    const extra = entry.hay.flatMap((w) => synonyms[w] ?? []);
    if (extra.length) entry.hay = [...new Set([...entry.hay, ...extra.flatMap(words)])];
  }
  // Redundância: "Maçã Fuji crua" (catálogo) repete "Maçã" (lista) — fica só o nome simples.
  const entries = [...byText.values()];
  const simple = entries.filter((e) => !e.fromCatalog && e.id);
  indexCache = entries.filter((e) => {
    if (!e.fromCatalog || !e.id) return true;
    const own = words(e.label);
    return !simple.some((o) => {
      if (o.id !== e.id || o.label === e.label) return false;
      const short = words(o.label);
      if (!short.every((w) => own.includes(w))) return false;
      // só some quando o que sobra é mero descritor (crua, cozido, Fuji…), não outro preparo/variedade
      return own
        .filter((w) => !short.includes(w))
        .every((w) => DESCRIPTORS.has(w) || STOPWORDS.has(w));
    });
  });
  return indexCache;
}

function score(entry: Entry, tokens: string[]): number {
  let total = 0;
  const labelWords = words(entry.label);
  for (const token of tokens) {
    let best = 0;
    for (const w of entry.hay) {
      if (w === token) best = Math.max(best, 100);
      else if (w.startsWith(token)) best = Math.max(best, 70);
      else if (
        token.length >= 4 &&
        w[0] === token[0] &&
        (withinOneEdit(token, w.slice(0, token.length)) ||
          withinOneEdit(token, w.slice(0, token.length + 1)))
      )
        best = Math.max(best, 30);
    }
    if (!best) return 0;
    if (labelWords.includes(token) || labelWords.some((w) => w.startsWith(token))) best += 20;
    total += best;
  }
  return total - Math.min(entry.label.length, 40) / 10;
}

export function searchFoods(query: string, limit = 36): SearchResult {
  const tokens = queryWords(query);
  if (!tokens.length || normalize(query).length < 2) return { items: [], suggestedKind: null };
  const index = buildIndex();

  const seen = new Set<string>();
  let hits: SearchHit[] = index
    .map((entry) => ({ entry, s: score(entry, tokens) }))
    .filter((h) => h.s > 0)
    .sort((a, b) => b.s - a.s || a.entry.label.localeCompare(b.entry.label, "pt-BR"))
    .map(({ entry, s }) => ({
      label: entry.label,
      text: entry.text,
      kinds: [...entry.kinds],
      score: s,
    }))
    .filter((hit) => {
      const key = normalize(hit.label);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  hits = hits.slice(0, limit);

  const votes = new Map<FoodKind, number>();
  hits.slice(0, 8).forEach((hit, i) => {
    for (const kind of hit.kinds) votes.set(kind, (votes.get(kind) ?? 0) + 8 - i);
  });
  const suggestedKind = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { items: hits, suggestedKind };
}

/** Alimentos de uma categoria: os sugeridos primeiro e depois todo o catálogo que combina com ela. */
export function foodsForKind(kind: FoodKind): SearchItem[] {
  const out: SearchItem[] = [];
  const seen = new Set<string>();
  for (const entry of buildIndex()) {
    if (!entry.kinds.has(kind)) continue;
    const key = entry.id ?? normalize(entry.label);
    const dupKey = `${key}|${normalize(entry.label)}`;
    if (seen.has(dupKey)) continue;
    seen.add(dupKey);
    out.push({ label: entry.label, text: entry.text });
  }
  return out;
}

/** Frutas e alimentos de origem regional (Norte/Nordeste/Cerrado) — recebem selo na tela. */
export const regionalIds = new Set([
  "acai",
  "acai_acucar",
  "buriti",
  "tucuma",
  "bacuri",
  "cupuacu",
  "graviola",
  "biriba",
  "inga",
  "sapoti",
  "camu_camu",
  "araca_boi",
  "mangaba",
  "pitaia",
  "pequi",
  "umbu",
  "tapereba",
  "cajamanga",
  "castanha_para",
  "suco_graviola",
  "suco_cupuacu",
]);

/** True quando o texto do item corresponde a um alimento regional. */
export function isRegionalFood(text: string): boolean {
  const parsed = parseFoodText(text);
  return parsed.length > 0 && parsed.every((f) => regionalIds.has(f.id));
}
