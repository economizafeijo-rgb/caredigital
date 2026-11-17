/** Regras do marketplace NextVita: segmentos, planos, cobrança e tipos usados pelas telas. */
export type Segment = "roupas" | "suplementos" | "farmacia" | "naturais" | "autonomo" | "outros";
export type VendorStatus = "pendente" | "ativo" | "suspenso";
export type PlanKey = "basico" | "vitrine" | "destaque";
export type OrderStatus = "aguardando_pagamento" | "pago" | "enviado" | "entregue" | "cancelado";

export const SEGMENTS: { key: Segment; label: string; hint: string }[] = [
  { key: "roupas", label: "Roupas e acessórios fitness", hint: "Moda esportiva masculina e feminina" },
  { key: "suplementos", label: "Suplementos", hint: "Whey, creatina, pré-treino…" },
  { key: "farmacia", label: "Farmácia", hint: "Vitaminas e suplementos de balcão" },
  { key: "naturais", label: "Produtos naturais", hint: "Chás, fitoterápicos, granel" },
  { key: "autonomo", label: "Autônomo / revendedor", hint: "Vende por conta própria" },
  { key: "outros", label: "Outros", hint: "Outro tipo de comércio" },
];
export const segmentLabel = (key: string) => SEGMENTS.find((s) => s.key === key)?.label ?? "Outros";

export const PRODUCT_CATEGORIES = [
  { key: "suplementos", label: "Suplementos" }, { key: "vitaminas", label: "Vitaminas" }, { key: "nutricao", label: "Nutrição" },
  { key: "roupas-masculinas", label: "Moda masculina" }, { key: "roupas-femininas", label: "Moda feminina" }, { key: "acessorios", label: "Acessórios" },
  { key: "naturais", label: "Produtos naturais" }, { key: "farmacia", label: "Farmácia" }, { key: "outros", label: "Outros" },
] as const;
export const categoryName = (key: string) => PRODUCT_CATEGORIES.find((c) => c.key === key)?.label ?? "Outros";

/** Planos padrão. O administrador pode ajustar mensalidade e comissão de cada loja individualmente. */
export const PLANS: Record<PlanKey, { label: string; feeCents: number; bps: number; tagline: string; perks: string[] }> = {
  basico: { label: "Básico", feeCents: 0, bps: 1000, tagline: "Para começar sem custo fixo", perks: ["Loja e produtos ilimitados", "Entrega e retirada", "Avaliações do público", "Comissão de 10% por venda"] },
  vitrine: { label: "Vitrine", feeCents: 4900, bps: 700, tagline: "Para quem vende toda semana", perks: ["Tudo do Básico", "Selo da sua loja", "Aparece antes nas buscas", "Comissão de 7% por venda"] },
  destaque: { label: "Destaque", feeCents: 9900, bps: 500, tagline: "Para crescer mais rápido", perks: ["Tudo do Vitrine", "Banner e topo da loja", "Divulgação na página inicial", "Comissão de 5% por venda"] },
};

export const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const pct = (bps: number) => `${(bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

/** Quanto a plataforma recebe de uma loja num mês com determinado volume de vendas. */
export function platformRevenue(salesCents: number, plan: PlanKey) {
  const p = PLANS[plan];
  const commission = Math.round((salesCents * p.bps) / 10000);
  return { fee: p.feeCents, commission, total: p.feeCents + commission, vendorKeeps: salesCents - commission - p.feeCents };
}
/** Plano mais barato para o lojista para um volume mensal de vendas. */
export function bestPlanFor(salesCents: number): PlanKey {
  return (Object.keys(PLANS) as PlanKey[]).reduce((best, key) => (platformRevenue(salesCents, key).total < platformRevenue(salesCents, best).total ? key : best), "basico" as PlanKey);
}

export const slugify = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/** "49,90" ou "49.90" para centavos; null se inválido. */
export function parseMoney(text: string): number | null {
  const n = Number(text.trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
export const centsToInput = (cents: number | null | undefined) => (cents == null ? "" : (cents / 100).toFixed(2).replace(".", ","));

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  aguardando_pagamento: { label: "Aguardando pagamento", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  pago: { label: "Pago", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  enviado: { label: "Enviado / saiu para entrega", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  entregue: { label: "Entregue / retirado", tone: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
  cancelado: { label: "Cancelado", tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
};
export const COUNTED: OrderStatus[] = ["pago", "enviado", "entregue"];

export type Vendor = {
  id: string; owner_id: string; name: string; slug: string; segment: Segment; description: string | null; logo_url: string | null;
  phone: string; city: string; address: string | null; offers_delivery: boolean; offers_pickup: boolean; delivery_fee_cents: number;
  free_delivery_from_cents: number | null; delivery_area: string | null; status: VendorStatus; plan: PlanKey; monthly_fee_cents: number;
  commission_bps: number; verified: boolean; featured_until: string | null; created_at: string;
};
export type VendorProduct = {
  id: string; vendor_id: string; name: string; category: string; description: string | null; price_cents: number;
  old_price_cents: number | null; image_url: string | null; stock: number; active: boolean;
};
export type VendorOrder = {
  id: string; vendor_id: string | null; customer_name: string; customer_phone: string; address: string | null; fulfillment: "entrega" | "retirada";
  items: { id: string; name: string; qty: number; price_cents: number }[]; total_cents: number; delivery_fee_cents: number; commission_cents: number;
  vendor_net_cents: number; payment_method: string; status: OrderStatus; notes: string | null; created_at: string;
};
export type Invoice = {
  id: string; vendor_id: string; period: string; monthly_fee_cents: number; gross_sales_cents: number; commission_cents: number;
  orders_count: number; total_due_cents: number; status: "pendente" | "pago" | "cancelado"; due_date: string; paid_at: string | null;
};
