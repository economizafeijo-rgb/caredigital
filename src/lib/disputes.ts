/** Disputas e devoluções de pedidos: tipos, regras e rótulos (sem acesso ao banco). */

export const DISPUTE_WINDOW_DAYS = 30;

export type DisputeStatus =
  | "aberta"
  | "reembolso_total"
  | "reembolso_parcial"
  | "devolucao_aceita"
  | "recusada"
  | "desistida";

export type DisputeReason =
  "produto_diferente" | "defeito" | "nao_entregue" | "desistencia" | "outro";

export type DisputeResolution =
  "reembolso_total" | "reembolso_parcial" | "devolucao_aceita" | "recusada";

export type Dispute = {
  id: string;
  order_id: string;
  vendor_id: string;
  user_id: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  amount_cents: number | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type DisputeMessage = {
  id: string;
  dispute_id: string;
  author: "cliente" | "lojista";
  body: string;
  created_at: string;
};

const REASON_LABELS: Record<DisputeReason, string> = {
  produto_diferente: "Produto diferente do anunciado",
  defeito: "Produto com defeito",
  nao_entregue: "Não recebi o pedido",
  desistencia: "Desisti da compra",
  outro: "Outro motivo",
};

const STATUS_LABELS: Record<DisputeStatus, string> = {
  aberta: "Aguardando a loja",
  reembolso_total: "Reembolso total",
  reembolso_parcial: "Reembolso parcial",
  devolucao_aceita: "Devolução aceita",
  recusada: "Recusada",
  desistida: "Desistida pelo cliente",
};

export const disputeReasonLabel = (reason: DisputeReason) => REASON_LABELS[reason];
export const disputeStatusLabel = (status: DisputeStatus) => STATUS_LABELS[status];

/** Pode abrir disputa? Pedido cancelado não aceita, e a janela vale 30 dias a partir da compra. */
export function canOpenDispute(
  orderCreatedAt: string,
  orderStatus: string,
  now: Date,
): { ok: true } | { ok: false; reason: string } {
  if (orderStatus === "cancelado") {
    return { ok: false, reason: "Pedido cancelado não aceita disputa." };
  }
  const elapsed = now.getTime() - new Date(orderCreatedAt).getTime();
  if (elapsed > DISPUTE_WINDOW_DAYS * 86_400_000) {
    return { ok: false, reason: `O prazo de ${DISPUTE_WINDOW_DAYS} dias para disputa encerrou.` };
  }
  return { ok: true };
}

/** Descrição da disputa: de 10 a 1000 caracteres depois do trim. Devolve o erro ou null. */
export function validateDescription(text: string): string | null {
  const n = text.trim().length;
  if (n < 10) return "Descreva o problema com pelo menos 10 caracteres.";
  if (n > 1000) return "A descrição pode ter no máximo 1000 caracteres.";
  return null;
}

/** Valor da resolução: reembolso parcial precisa estar entre 1 centavo e o total do pedido. */
export function validateRefund(
  totalCents: number,
  type: DisputeResolution,
  amountCents: number | null,
): string | null {
  if (type !== "reembolso_parcial") return null;
  if (amountCents === null || amountCents <= 0) return "Informe o valor do reembolso parcial.";
  if (amountCents > totalCents) return "O reembolso parcial não pode passar do total do pedido.";
  return null;
}
