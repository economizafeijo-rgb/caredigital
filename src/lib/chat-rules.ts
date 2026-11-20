import type { ChatMessage } from "@/lib/marketplace";

/** O canal da loja é só para compra, confirmação e dúvidas: sem links, telefones ou redes sociais. */
export const CHAT_RULE_NOTE =
  "Canal só para compra, confirmação e dúvidas. Links, telefones, WhatsApp, imagens e áudios não são permitidos.";

export const CHAT_RETENTION_NOTE =
  "O histórico fica guardado por até 12 meses e é apagado na virada do ano.";

const URL_RE =
  /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|br|net|org|io|me|app|link|ly|gg|co|info|site|xyz|shop|store|online|dev|ac)\b)/i;
const SOCIAL_RE =
  /\b(whats?\s?app|whats|zap|zapzap|wpp|telegram|insta(gram)?|facebook|tiktok|discord|signal|e-?mail|gmail|hotmail|outlook)\b/i;
const HANDLE_RE = /(^|\s)@\w{3,}|\w+@\w+/;

/** Devolve o motivo da recusa, ou null se a mensagem pode ser enviada. Mesma regra do banco. */
export function validateChatText(text: string): string | null {
  const t = text.trim();
  if (!t) return "Escreva uma mensagem.";
  if (URL_RE.test(t)) return "Links não são permitidos neste chat.";
  if (HANDLE_RE.test(t) || SOCIAL_RE.test(t))
    return "Não compartilhe WhatsApp, redes sociais ou e-mail. Use apenas este chat.";
  if (t.replace(/\D/g, "").length >= 9)
    return "Não compartilhe números de telefone. Use apenas este chat.";
  return null;
}

/** Tempo médio estimado por atendimento, em segundos, usado na estimativa da fila. */
export const AVG_SERVICE_SECONDS = 240;
export const ACTIVE_WINDOW_MS = 10 * 60 * 1000;

export type QueueEntry = { id: string; name: string; since: number; position: number };
export type QueueSummary = {
  active: { id: string; name: string }[];
  waiting: QueueEntry[];
  capacity: number;
};

/** Quem está em atendimento (a loja respondeu há pouco) e quem espera (mensagem sem resposta). */
export function computeQueue(messages: ChatMessage[], now: number, capacity = 3): QueueSummary {
  const by = new Map<string, ChatMessage[]>();
  for (const m of messages) {
    if (m.deleted_at) continue;
    by.set(m.customer_id, [...(by.get(m.customer_id) ?? []), m]);
  }
  const active: QueueSummary["active"] = [];
  const waiting: Omit<QueueEntry, "position">[] = [];
  for (const [id, list] of by) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const name = list.find((m) => !m.from_vendor)?.customer_name ?? "Cliente";
    const lastVendor = [...list].reverse().find((m) => m.from_vendor);
    const vendorAt = lastVendor ? Date.parse(lastVendor.created_at) : 0;
    if (vendorAt && now - vendorAt <= ACTIVE_WINDOW_MS) {
      active.push({ id, name });
      continue;
    }
    const pending = list.filter((m) => !m.from_vendor && Date.parse(m.created_at) > vendorAt);
    if (pending.length && now - Date.parse(pending[pending.length - 1].created_at) < 6 * 3600_000)
      waiting.push({ id, name, since: Date.parse(pending[0].created_at) });
  }
  waiting.sort((a, b) => a.since - b.since);
  return { active, waiting: waiting.map((w, i) => ({ ...w, position: i + 1 })), capacity };
}

export const fmtWait = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** Respostas prontas e profissionais para o lojista, por assunto. */
export const QUICK_GROUPS: { title: string; items: string[] }[] = [
  {
    title: "Atendimento",
    items: [
      "Olá! Seja bem-vindo(a). Como posso ajudar?",
      "Obrigado pelo contato. Já vou verificar para você.",
      "Um momento, por favor, estou consultando o estoque.",
      "Fico à disposição para qualquer dúvida.",
    ],
  },
  {
    title: "Produto e estoque",
    items: [
      "Temos o produto em estoque e você pode fazer o pedido pelo app.",
      "No momento esse produto está esgotado. Posso indicar uma alternativa?",
      "O produto está indisponível por enquanto. Assim que chegar, ele volta à loja.",
      "Esse item tem limite por pedido para atender todos os clientes.",
    ],
  },
  {
    title: "Pedido e pagamento",
    items: [
      "Recebemos seu pedido e estamos conferindo.",
      "Seu pagamento foi confirmado. Já estamos separando o pedido.",
      "Seu pedido já está separado.",
      "O pedido segue aguardando o pagamento para ser separado.",
    ],
  },
  {
    title: "Retirada e entrega",
    items: [
      "Pode retirar com o código do pedido no balcão.",
      "Seu pedido saiu para entrega e chega no prazo informado.",
      "Nosso horário de atendimento está na página da loja.",
      "Confirme o endereço de entrega no pedido, por favor.",
    ],
  },
  {
    title: "Encerramento",
    items: [
      "Posso ajudar em mais alguma coisa?",
      "Agradecemos a preferência. Boas compras e boa saúde!",
      "Vou encerrar este atendimento. Se precisar, é só escrever novamente.",
    ],
  },
];
