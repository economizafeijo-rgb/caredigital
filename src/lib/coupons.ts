/** Cupons e promoções da loja: regras de formulário e textos. O cálculo de preço fica no servidor. */

export const COUPON_CODE_RE = /^[A-Z0-9]{3,20}$/;
export const PERCENT_MIN = 1;
export const PERCENT_MAX = 90;

export type CouponKind = "percent" | "fixed";
export type CouponScope = "loja" | "produtos";
export type CouponStatus = "ativo" | "pausado" | "encerrado";

export type OccasionKey =
  | "dia-das-maes"
  | "dia-dos-pais"
  | "dia-dos-namorados"
  | "natal"
  | "black-friday"
  | "aniversario-loja"
  | "volta-as-aulas"
  | "personalizada";

export type Occasion = {
  key: OccasionKey;
  label: string;
  /** Código sugerido. O lojista pode trocar. */
  suggestedCode: string;
  /** Mês (1–12) e dia do início sugerido. Personalizada não tem data. */
  suggestedStart?: { month: number; day: number };
  suggestedDays?: number;
};

export const OCCASIONS: Occasion[] = [
  {
    key: "dia-das-maes",
    label: "Dia das Mães",
    suggestedCode: "MAE10",
    suggestedStart: { month: 5, day: 1 },
    suggestedDays: 14,
  },
  {
    key: "dia-dos-pais",
    label: "Dia dos Pais",
    suggestedCode: "PAI10",
    suggestedStart: { month: 8, day: 1 },
    suggestedDays: 14,
  },
  {
    key: "dia-dos-namorados",
    label: "Dia dos Namorados",
    suggestedCode: "NAMORO10",
    suggestedStart: { month: 6, day: 1 },
    suggestedDays: 10,
  },
  {
    key: "natal",
    label: "Natal",
    suggestedCode: "NATAL15",
    suggestedStart: { month: 12, day: 1 },
    suggestedDays: 24,
  },
  {
    key: "black-friday",
    label: "Black Friday",
    suggestedCode: "BLACK20",
    suggestedStart: { month: 11, day: 20 },
    suggestedDays: 5,
  },
  {
    key: "aniversario-loja",
    label: "Aniversário da loja",
    suggestedCode: "ANIVER10",
    suggestedDays: 7,
  },
  {
    key: "volta-as-aulas",
    label: "Volta às aulas",
    suggestedCode: "AULAS10",
    suggestedStart: { month: 2, day: 1 },
    suggestedDays: 14,
  },
  { key: "personalizada", label: "Personalizada", suggestedCode: "" },
];

export function occasionLabel(key: string): string {
  return OCCASIONS.find((o) => o.key === key)?.label ?? "Personalizada";
}

/** Converte "YYYY-MM-DD" + hora local do Acre (UTC-5) em ISO. Fim do dia = 23:59:59. */
export function acreDateTime(date: string, endOfDay: boolean): string {
  const time = endOfDay ? "23:59:59" : "00:00:00";
  return `${date}T${time}-05:00`;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export type CouponForm = {
  code: string;
  kind: CouponKind;
  value: string;
  startDate: string;
  endDate: string;
  minOrder: string;
  maxUses: string;
  perCustomer: string;
  scope: CouponScope;
  productIds: string[];
};

export type CouponPayload = {
  code: string;
  kind: CouponKind;
  value: number;
  starts_at: string;
  ends_at: string;
  min_order_cents: number;
  max_uses: number | null;
  per_customer_limit: number;
  scope: CouponScope;
  product_ids: string[];
};

/** Valida o formulário do cupom e devolve o payload ou a primeira mensagem de erro. */
export function buildCouponPayload(
  f: CouponForm,
): { ok: true; payload: CouponPayload } | { ok: false; error: string } {
  const code = normalizeCode(f.code);
  if (!COUPON_CODE_RE.test(code))
    return { ok: false, error: "Código: use de 3 a 20 letras ou números, sem espaços." };

  const raw = Number(String(f.value).replace(",", "."));
  if (!Number.isFinite(raw) || raw <= 0)
    return { ok: false, error: "Informe o valor do desconto." };
  let value: number;
  if (f.kind === "percent") {
    if (!Number.isInteger(raw) || raw < PERCENT_MIN || raw > PERCENT_MAX)
      return { ok: false, error: `Percentual entre ${PERCENT_MIN}% e ${PERCENT_MAX}%.` };
    value = raw;
  } else {
    value = Math.round(raw * 100);
    if (value < 100) return { ok: false, error: "Desconto fixo de pelo menos R$ 1,00." };
  }

  if (!f.startDate || !f.endDate) return { ok: false, error: "Informe início e fim." };
  if (f.endDate < f.startDate) return { ok: false, error: "O fim não pode ser antes do início." };

  const minRaw = Number(String(f.minOrder || "0").replace(",", "."));
  if (!Number.isFinite(minRaw) || minRaw < 0)
    return { ok: false, error: "Pedido mínimo inválido." };

  let maxUses: number | null = null;
  if (f.maxUses.trim() !== "") {
    const m = Number(f.maxUses);
    if (!Number.isInteger(m) || m < 1)
      return { ok: false, error: "Limite de usos deve ser um número maior que zero." };
    maxUses = m;
  }

  const per = Number(f.perCustomer || "1");
  if (!Number.isInteger(per) || per < 1)
    return { ok: false, error: "Limite por cliente deve ser pelo menos 1." };

  if (f.scope === "produtos" && f.productIds.length === 0)
    return { ok: false, error: "Escolha pelo menos um produto para este cupom." };

  return {
    ok: true,
    payload: {
      code,
      kind: f.kind,
      value,
      starts_at: acreDateTime(f.startDate, false),
      ends_at: acreDateTime(f.endDate, true),
      min_order_cents: Math.round(minRaw * 100),
      max_uses: maxUses,
      per_customer_limit: per,
      scope: f.scope,
      product_ids: f.scope === "produtos" ? f.productIds : [],
    },
  };
}

/** Texto curto do valor do desconto, ex.: "10% de desconto" ou "R$ 15,00 de desconto". */
export function discountLabel(kind: CouponKind, value: number): string {
  if (kind === "percent") return `${value}% de desconto`;
  const reais = (value / 100).toFixed(2).replace(".", ",");
  return `R$ ${reais} de desconto`;
}

export function couponStatusLabel(
  status: CouponStatus,
  startsAt: string,
  endsAt: string,
  now = Date.now(),
): string {
  if (status === "encerrado") return "Encerrado";
  if (status === "pausado") return "Pausado";
  if (now < Date.parse(startsAt)) return "Agendado";
  if (now > Date.parse(endsAt)) return "Vencido";
  return "Ativo";
}

/** Traduz o erro do servidor (prefixo "Coupon: motivo") em texto para o cliente. */
export function couponErrorMessage(serverMessage: string): string {
  const m = /Coupon:\s*(\w+)/.exec(serverMessage);
  switch (m?.[1]) {
    case "not_found":
      return "Cupom não encontrado. Confira o código.";
    case "inactive":
      return "Este cupom não está disponível no momento.";
    case "not_started":
      return "Este cupom ainda não começou.";
    case "expired":
      return "Este cupom já venceu.";
    case "exhausted":
      return "Os usos deste cupom acabaram.";
    case "customer_limit":
      return "Você já usou este cupom o número máximo de vezes.";
    case "min_order":
      return "O pedido ainda não atingiu o valor mínimo para este cupom.";
    case "not_eligible":
      return "Nenhum produto do seu carrinho é elegível para este cupom.";
    default:
      return "Não foi possível aplicar o cupom.";
  }
}
