import { useSyncExternalStore } from "react";

export type StoreCategory = "suplementos" | "vitaminas" | "nutricao" | "fitoterapicos" | "roupas-masculinas" | "roupas-femininas" | "acessorios";
export type Product = { id: string; name: string; category: StoreCategory; priceCents: number; oldPriceCents?: number; img: string; tag?: string; text: string; vendorId?: VendorId };

/** Lojas ilustrativas: demonstram como diferentes setores venderão na plataforma. Não são lojas reais. */
export type VendorId = "arena" | "farmavida" | "emporio" | "erva-viva" | "studio-move" | "base-athletic" | "casa-do-treino";
/** sampleRating e sampleVerified são valores de exemplo para demonstrar o selo e a nota; não vêm de avaliações reais. */
export type Vendor = { id: VendorId; name: string; sector: string; city: string; initials: string; color: string; hex: string; sampleRating: number; sampleVerified: boolean };
export const vendors: Vendor[] = [
  { id: "arena", name: "Arena Suplementos", sector: "Suplementos esportivos", city: "Rio Branco, AC", initials: "AS", color: "bg-blue-700", hex: "#1d4ed8", sampleRating: 4.8, sampleVerified: true },
  { id: "farmavida", name: "Farmácia Vida & Saúde", sector: "Farmácia e vitaminas", city: "Tarauacá, AC", initials: "FV", color: "bg-rose-700", hex: "#be123c", sampleRating: 4.7, sampleVerified: true },
  { id: "erva-viva", name: "Erva Viva Fitoterápicos", sector: "Fitoterápicos e produtos da Amazônia", city: "Feijó, AC", initials: "EV", color: "bg-green-800", hex: "#166534", sampleRating: 4.9, sampleVerified: true },
  { id: "emporio", name: "Empório Verde Natural", sector: "Produtos naturais", city: "Feijó, AC", initials: "EN", color: "bg-lime-700", hex: "#4d7c0f", sampleRating: 4.6, sampleVerified: false },
  { id: "studio-move", name: "Studio Move Fitwear", sector: "Moda fitness feminina", city: "Rio Branco, AC", initials: "SM", color: "bg-pink-700", hex: "#be185d", sampleRating: 4.8, sampleVerified: true },
  { id: "base-athletic", name: "Base Athletic", sector: "Moda fitness masculina", city: "Tarauacá, AC", initials: "BA", color: "bg-slate-800", hex: "#1e293b", sampleRating: 4.5, sampleVerified: false },
  { id: "casa-do-treino", name: "Casa do Treino", sector: "Equipamentos e acessórios", city: "Feijó, AC", initials: "CT", color: "bg-amber-700", hex: "#b45309", sampleRating: 4.7, sampleVerified: true },
];
export const vendorById = (id?: VendorId) => vendors.find((v) => v.id === id);

export const categories: { key: StoreCategory | "todos"; label: string }[] = [
  { key: "todos", label: "Tudo" },
  { key: "suplementos", label: "Suplementos" },
  { key: "vitaminas", label: "Vitaminas" },
  { key: "nutricao", label: "Nutrição" },
  { key: "fitoterapicos", label: "Fitoterápicos" },
  { key: "roupas-masculinas", label: "Masculino" },
  { key: "roupas-femininas", label: "Feminino" },
  { key: "acessorios", label: "Acessórios" },
];
export const categoryLabel: Record<StoreCategory, string> = {
  suplementos: "Suplementos", vitaminas: "Vitaminas", nutricao: "Nutrição", fitoterapicos: "Fitoterápicos", "roupas-masculinas": "Moda masculina", "roupas-femininas": "Moda feminina", acessorios: "Acessórios",
};

/** Catálogo inicial (vitrine em desenvolvimento): preços de demonstração até a loja abrir oficialmente. */
export const products: Product[] = [
  { id: "whey-900", name: "Whey Protein 900 g", category: "suplementos", priceCents: 14990, oldPriceCents: 17990, img: "/loja/v2/whey.webp", tag: "Mais vendido", text: "Proteína de alto valor biológico para recuperação muscular.", vendorId: "arena" },
  { id: "whey-shaker", name: "Kit Whey + Coqueteleira", category: "suplementos", priceCents: 16990, img: "/loja/v2/kit-whey-coqueteleira.webp", tag: "Kit", text: "Whey com coqueteleira para levar ao treino.", vendorId: "arena" },
  { id: "pre-treino", name: "Pré-treino 300 g", category: "suplementos", priceCents: 11990, oldPriceCents: 13990, img: "/loja/v2/pre-treino.webp", text: "Energia e foco para treinos intensos.", vendorId: "arena" },
  { id: "proteina-vegetal", name: "Proteína Vegetal 500 g", category: "nutricao", priceCents: 12990, img: "/loja/v2/proteina-vegetal.webp", tag: "Novo", text: "Opção sem lactose para o dia a dia.", vendorId: "emporio" },
  { id: "oleo-copaiba", name: "Óleo de Copaíba 30 ml", category: "fitoterapicos", priceCents: 3990, img: "/loja/v2/oleo-copaiba.webp", tag: "Da Amazônia", text: "Óleo-resina de copaíba envasado em frasco âmbar com conta-gotas.", vendorId: "erva-viva" },
  { id: "cha-camomila", name: "Chá de Camomila 30 sachês", category: "fitoterapicos", priceCents: 1490, img: "/loja/v2/cha-camomila.webp", text: "Flores de camomila desidratadas em sachês para infusão.", vendorId: "erva-viva" },
  { id: "guarana-po", name: "Guaraná em Pó 100 g", category: "fitoterapicos", priceCents: 2490, oldPriceCents: 2990, img: "/loja/v2/guarana-po.webp", text: "Guaraná da Amazônia moído para sucos e vitaminas.", vendorId: "erva-viva" },
  { id: "multivitaminico", name: "Multivitamínico 120 cápsulas", category: "vitaminas", priceCents: 6990, img: "/loja/v2/multivitaminico.webp", tag: "Essencial", text: "Complexo de vitaminas e minerais para a rotina.", vendorId: "farmavida" },
  { id: "vitamina-d", name: "Vitamina D3 60 cápsulas", category: "vitaminas", priceCents: 4990, oldPriceCents: 5990, img: "/loja/v2/vitamina-d.webp", text: "Apoio à saúde óssea e imunidade.", vendorId: "farmavida" },
  { id: "camiseta-regata", name: "Regata Dry Fit Masculina", category: "roupas-masculinas", priceCents: 7990, img: "/loja/v2/regata.webp", tag: "Dry Fit", text: "Tecido leve que seca rápido, ideal para musculação.", vendorId: "base-athletic" },
  { id: "conjunto-treino-m", name: "Conjunto Treino Masculino", category: "roupas-masculinas", priceCents: 15990, oldPriceCents: 18990, img: "/loja/v2/conjunto-masculino.webp", text: "Camiseta e bermuda de alta mobilidade.", vendorId: "base-athletic" },
  { id: "camiseta-oversized", name: "Camiseta Performance", category: "roupas-masculinas", priceCents: 8990, img: "/loja/v2/camiseta-performance.webp", text: "Conforto e respirabilidade para todo treino.", vendorId: "base-athletic" },
  { id: "conjunto-fem-1", name: "Conjunto Top + Legging Preto", category: "roupas-femininas", priceCents: 17990, img: "/loja/v2/conjunto-preto.webp", tag: "Destaque", text: "Top com sustentação e legging de cintura alta.", vendorId: "studio-move" },
  { id: "conjunto-fem-2", name: "Conjunto Rosé Seamless", category: "roupas-femininas", priceCents: 18990, oldPriceCents: 21990, img: "/loja/v2/conjunto-rose.webp", text: "Modelagem sem costura, toque macio.", vendorId: "studio-move" },
  { id: "conjunto-fem-3", name: "Conjunto Azul Marinho", category: "roupas-femininas", priceCents: 19990, img: "/loja/v2/conjunto-marinho.webp", tag: "Novo", text: "Conjunto com jaqueta para o antes e depois do treino.", vendorId: "studio-move" },
  { id: "legging", name: "Legging Compressão", category: "roupas-femininas", priceCents: 11990, img: "/loja/mulher4.webp", text: "Compressão confortável e cós alto.", vendorId: "studio-move" },
  { id: "halteres", name: "Par de Halteres Emborrachados", category: "acessorios", priceCents: 12990, img: "/loja/v2/halteres.webp", text: "Peso fixo com revestimento antiderrapante.", vendorId: "casa-do-treino" },
  { id: "kit-barra", name: "Kit Anilhas e Barra", category: "acessorios", priceCents: 39990, img: "/loja/v2/kit-barra.webp", tag: "Kit", text: "Para treino de força completo em casa.", vendorId: "casa-do-treino" },
  { id: "tapete", name: "Tapete de Treino Antiderrapante", category: "acessorios", priceCents: 8990, img: "/loja/v2/tapete.webp", text: "Alta aderência para alongamento e funcional.", vendorId: "casa-do-treino" },
  { id: "coqueteleira", name: "Coqueteleira 600 ml", category: "acessorios", priceCents: 3990, img: "/loja/v2/coqueteleira.webp", text: "Tampa de segurança e misturador interno.", vendorId: "casa-do-treino" },
];

export const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const paymentMethods = [
  { key: "pix", label: "Pix", note: "5% de desconto · confirmação rápida" },
  { key: "cartao", label: "Cartão de crédito", note: "Em até 3x sem juros" },
  { key: "boleto", label: "Boleto bancário", note: "Vence em 2 dias úteis" },
] as const;
export type PaymentKey = (typeof paymentMethods)[number]["key"];
export const PIX_DISCOUNT = 0.05;
export function orderTotal(subtotal: number, method: PaymentKey) { return method === "pix" ? Math.round(subtotal * (1 - PIX_DISCOUNT)) : subtotal; }

export const STORE_WHATSAPP = "5568992031340";
/** Compras reais só depois que as lojas parceiras publicarem produtos oficiais. */
export const STORE_LIVE = false;

/* Carrinho: guardado no aparelho e compartilhado entre componentes. */
export type CartLine = { id: string; qty: number };
const KEY = "nextvita.cart.v1";
let lines: CartLine[] = [];
let loaded = false;
const listeners = new Set<() => void>();
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = JSON.parse(window.localStorage.getItem(KEY) || "[]"); if (Array.isArray(raw)) lines = raw.filter((l) => l && typeof l.id === "string" && l.qty > 0 && products.some((p) => p.id === l.id)); } catch { /* sem armazenamento */ }
}
function commit(next: CartLine[]) {
  lines = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* sem armazenamento */ }
  listeners.forEach((l) => l());
}
export const cart = {
  add(id: string, qty = 1) { load(); const found = lines.find((l) => l.id === id); commit(found ? lines.map((l) => (l.id === id ? { ...l, qty: Math.min(20, l.qty + qty) } : l)) : [...lines, { id, qty }]); },
  setQty(id: string, qty: number) { load(); commit(qty <= 0 ? lines.filter((l) => l.id !== id) : lines.map((l) => (l.id === id ? { ...l, qty: Math.min(20, qty) } : l))); },
  remove(id: string) { load(); commit(lines.filter((l) => l.id !== id)); },
  clear() { load(); commit([]); },
};
const subscribe = (cb: () => void) => { load(); listeners.add(cb); return () => { listeners.delete(cb); }; };
const empty: CartLine[] = [];
export function useCart() {
  const current = useSyncExternalStore(subscribe, () => { load(); return lines; }, () => empty);
  const detailed = current.flatMap((l) => { const p = products.find((x) => x.id === l.id); return p ? [{ ...l, product: p }] : []; });
  const count = detailed.reduce((s, l) => s + l.qty, 0);
  const subtotal = detailed.reduce((s, l) => s + l.qty * l.product.priceCents, 0);
  return { lines: detailed, count, subtotal };
}
