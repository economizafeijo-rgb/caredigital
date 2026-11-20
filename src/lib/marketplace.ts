/** Regras do marketplace NextVita: segmentos, planos, cobrança e tipos usados pelas telas. */
export type Segment = "roupas" | "suplementos" | "farmacia" | "naturais" | "autonomo" | "outros";
export type VendorStatus = "pendente" | "ativo" | "suspenso";
export type PlanKey = "basico" | "vitrine" | "destaque";
export type OrderStatus =
  "aguardando_pagamento" | "pago" | "separando" | "pronto" | "enviado" | "entregue" | "cancelado";

export const SEGMENTS: { key: Segment; label: string; hint: string }[] = [
  {
    key: "roupas",
    label: "Roupas e acessórios fitness",
    hint: "Moda esportiva masculina e feminina",
  },
  { key: "suplementos", label: "Suplementos", hint: "Whey, creatina, pré-treino…" },
  { key: "farmacia", label: "Farmácia", hint: "Vitaminas e suplementos de balcão" },
  { key: "naturais", label: "Produtos naturais", hint: "Chás, fitoterápicos, granel" },
  { key: "autonomo", label: "Autônomo / revendedor", hint: "Vende por conta própria" },
  { key: "outros", label: "Outros", hint: "Outro tipo de comércio" },
];
export const segmentLabel = (key: string) => SEGMENTS.find((s) => s.key === key)?.label ?? "Outros";

export const PRODUCT_CATEGORIES = [
  { key: "suplementos", label: "Suplementos" },
  { key: "vitaminas", label: "Vitaminas" },
  { key: "nutricao", label: "Nutrição" },
  { key: "roupas-masculinas", label: "Moda masculina" },
  { key: "roupas-femininas", label: "Moda feminina" },
  { key: "acessorios", label: "Acessórios" },
  { key: "naturais", label: "Produtos naturais" },
  { key: "fitoterapicos", label: "Fitoterápicos" },
  { key: "farmacia", label: "Farmácia" },
  { key: "beleza", label: "Beleza e cosméticos" },
  { key: "bijuterias", label: "Bijuterias" },
  { key: "outros", label: "Outros" },
] as const;
export const categoryName = (key: string) =>
  PRODUCT_CATEGORIES.find((c) => c.key === key)?.label ?? "Outros";

/** Planos padrão. O administrador pode ajustar mensalidade e comissão de cada loja individualmente. */
export const PLANS: Record<
  PlanKey,
  { label: string; feeCents: number; bps: number; tagline: string; perks: string[] }
> = {
  basico: {
    label: "Básico",
    feeCents: 0,
    bps: 1000,
    tagline: "Para começar sem custo fixo",
    perks: [
      "Loja e produtos ilimitados",
      "Entrega e retirada",
      "Avaliações do público",
      "Comissão de 10% por venda",
    ],
  },
  vitrine: {
    label: "Vitrine",
    feeCents: 4900,
    bps: 700,
    tagline: "Para quem vende toda semana",
    perks: [
      "Tudo do Básico",
      "Selo da sua loja",
      "Aparece antes nas buscas",
      "Comissão de 7% por venda",
    ],
  },
  destaque: {
    label: "Destaque",
    feeCents: 9900,
    bps: 500,
    tagline: "Para crescer mais rápido",
    perks: [
      "Tudo do Vitrine",
      "Banner e topo da loja",
      "Divulgação na página inicial",
      "Comissão de 5% por venda",
    ],
  },
};

export const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const pct = (bps: number) =>
  `${(bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

/** Quanto a plataforma recebe de uma loja num mês com determinado volume de vendas. */
export function platformRevenue(salesCents: number, plan: PlanKey) {
  const p = PLANS[plan];
  const commission = Math.round((salesCents * p.bps) / 10000);
  return {
    fee: p.feeCents,
    commission,
    total: p.feeCents + commission,
    vendorKeeps: salesCents - commission - p.feeCents,
  };
}
/** Plano mais barato para o lojista para um volume mensal de vendas. */
export function bestPlanFor(salesCents: number): PlanKey {
  return (Object.keys(PLANS) as PlanKey[]).reduce(
    (best, key) =>
      platformRevenue(salesCents, key).total < platformRevenue(salesCents, best).total ? key : best,
    "basico" as PlanKey,
  );
}

export const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** "49,90" ou "49.90" para centavos; null se inválido. */
export function parseMoney(text: string): number | null {
  const n = Number(text.trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
export const centsToInput = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  aguardando_pagamento: {
    label: "Aguardando pagamento",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  pago: { label: "Pago", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  separando: { label: "Separando", tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  pronto: { label: "Pronto para retirar", tone: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" },
  enviado: {
    label: "Enviado / saiu para entrega",
    tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  entregue: {
    label: "Entregue / retirado",
    tone: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  },
  cancelado: { label: "Cancelado", tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
};
export const COUNTED: OrderStatus[] = ["pago", "separando", "pronto", "enviado", "entregue"];
/** Próxima etapa do pedido conforme a forma de receber. */
export function nextStatus(
  status: OrderStatus,
  fulfillment: "entrega" | "retirada",
): OrderStatus | null {
  const flow: OrderStatus[] =
    fulfillment === "entrega"
      ? ["aguardando_pagamento", "pago", "separando", "enviado", "entregue"]
      : ["aguardando_pagamento", "pago", "separando", "pronto", "entregue"];
  const i = flow.indexOf(status);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}
export const ORDER_FLOW = (fulfillment: "entrega" | "retirada"): OrderStatus[] =>
  fulfillment === "entrega"
    ? ["aguardando_pagamento", "pago", "separando", "enviado", "entregue"]
    : ["aguardando_pagamento", "pago", "separando", "pronto", "entregue"];
export const NEXT_ACTION: Partial<Record<OrderStatus, string>> = {
  aguardando_pagamento: "Confirmar pagamento",
  pago: "Começar a separar",
  separando: "Marcar como pronto",
  pronto: "Entregar ao cliente",
  enviado: "Confirmar entrega",
};

export type Vendor = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  segment: Segment;
  description: string | null;
  logo_url: string | null;
  phone: string;
  city: string;
  address: string | null;
  offers_delivery: boolean;
  offers_pickup: boolean;
  delivery_fee_cents: number;
  free_delivery_from_cents: number | null;
  delivery_area: string | null;
  status: VendorStatus;
  plan: PlanKey;
  monthly_fee_cents: number;
  commission_bps: number;
  verified: boolean;
  featured_until: string | null;
  created_at: string;
  accent_hex?: string | null;
  banner_url?: string | null;
  opening_hours?: string | null;
  prep_minutes?: number;
  delivery_minutes?: number;
  is_demo?: boolean;
  chat_capacity?: number;
};
export type VendorProduct = {
  id: string;
  vendor_id: string;
  name: string;
  category: string;
  description: string | null;
  price_cents: number;
  old_price_cents: number | null;
  image_url: string | null;
  stock: number;
  active: boolean;
  sku?: string | null;
  cost_cents?: number | null;
  min_stock?: number;
  unit?: string;
  ref?: string | null;
  colors?: ProductColor[];
  display_limit?: number | null;
  availability?: "auto" | "indisponivel" | "esgotado";
  featured?: boolean;
  created_at?: string;
};
export type ProductColor = { name: string; hex: string; stock: number };
/** Situação do produto na vitrine: leva em conta estoque, limite de exibição e a escolha manual do lojista. */
export function productStatus(p: Pick<VendorProduct, "stock" | "availability" | "display_limit">) {
  if (p.availability === "esgotado" || p.stock <= 0)
    return { key: "esgotado" as const, label: "Esgotado", buyable: false, max: 0 };
  if (p.availability === "indisponivel")
    return { key: "indisponivel" as const, label: "Indisponível", buyable: false, max: 0 };
  const max = Math.min(20, p.stock, p.display_limit ?? 20);
  return { key: "ok" as const, label: "Disponível", buyable: true, max };
}
export type VendorOrder = {
  id: string;
  vendor_id: string | null;
  customer_name: string;
  customer_phone: string;
  address: string | null;
  fulfillment: "entrega" | "retirada";
  items: { id: string; name: string; qty: number; price_cents: number }[];
  total_cents: number;
  delivery_fee_cents: number;
  commission_cents: number;
  vendor_net_cents: number;
  payment_method: string;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  user_id?: string;
  customer_email?: string | null;
  order_number?: number;
  pickup_code?: string | null;
  paid_at?: string | null;
  ready_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  promised_at?: string | null;
};
export type OrderEvent = {
  id: string;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
};
export type CashEntry = {
  id: string;
  vendor_id: string;
  kind: "entrada" | "saida";
  amount_cents: number;
  category: string;
  description: string | null;
  order_id: string | null;
  occurred_at: string;
};
export type StockMove = {
  id: string;
  product_id: string;
  delta: number;
  stock_after: number;
  reason: string;
  created_at: string;
};
export type ChatMessage = {
  id: string;
  vendor_id: string;
  customer_id: string;
  customer_name: string | null;
  from_vendor: boolean;
  body: string;
  order_id: string | null;
  read_at: string | null;
  created_at: string;
  deleted_at?: string | null;
};
export const PAYMENT_LABEL: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto",
  dinheiro: "Dinheiro",
};
export const storeUrl = (slug: string) =>
  `https://nextvita.life/loja?loja=${encodeURIComponent(slug)}`;
export const orderUrl = (id: string) =>
  `https://nextvita.life/loja?pedido=${encodeURIComponent(id)}`;
/** Tempo restante (ms) até o prazo prometido; negativo quando atrasado. */
export const msLeft = (promised: string | null | undefined, now = Date.now()) =>
  promised ? new Date(promised).getTime() - now : null;
export function formatLeft(ms: number) {
  const late = ms < 0;
  const m = Math.floor(Math.abs(ms) / 60000);
  const h = Math.floor(m / 60);
  const txt =
    h >= 24
      ? `${Math.floor(h / 24)}d ${h % 24}h`
      : h > 0
        ? `${h}h ${String(m % 60).padStart(2, "0")}min`
        : `${m} min`;
  return late ? `atrasado ${txt}` : txt;
}
export type Invoice = {
  id: string;
  vendor_id: string;
  period: string;
  monthly_fee_cents: number;
  gross_sales_cents: number;
  commission_cents: number;
  orders_count: number;
  total_due_cents: number;
  status: "pendente" | "pago" | "cancelado";
  due_date: string;
  paid_at: string | null;
};
