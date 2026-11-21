import { supabase } from "@/integrations/supabase/client";

/**
 * Presença e "digitando…" de uma conversa da loja, pelo canal Realtime da conversa.
 * Não guarda texto: só diz quem está no chat e quem está digitando.
 * Pode ser lido por quem conhece o canal; por isso nenhuma mensagem trafega aqui.
 */
export type ChatRole = "customer" | "vendor";

type Meta = { role: ChatRole; at: number };
type Channel = {
  on: (type: string, filter: Record<string, string>, cb: (arg: unknown) => void) => Channel;
  subscribe: (cb?: (status: string) => void) => Channel;
  track: (state: Meta) => Promise<unknown>;
  presenceState: () => Record<string, Meta[]>;
  send: (msg: {
    type: string;
    event: string;
    payload: Record<string, unknown>;
  }) => Promise<unknown>;
};
type RealtimeDb = {
  channel: (name: string, opts?: unknown) => Channel;
  removeChannel: (c: Channel) => Promise<unknown>;
};

export function joinStoreChat(
  vendorId: string,
  customerId: string,
  role: ChatRole,
  handlers: { onPeer?: (online: boolean) => void; onTyping?: () => void },
) {
  const db = supabase as unknown as RealtimeDb;
  if (typeof db.channel !== "function") return { leave: () => undefined, typing: () => undefined };

  const other: ChatRole = role === "customer" ? "vendor" : "customer";
  const ch = db.channel(`store-chat-${vendorId}-${customerId}`, {
    config: {
      broadcast: { self: false },
      presence: { key: `${role}-${Math.random().toString(36).slice(2)}` },
    },
  });

  const checkPeer = () => {
    const state = ch.presenceState();
    const online = Object.values(state).some((metas) => metas.some((m) => m.role === other));
    handlers.onPeer?.(online);
  };

  ch.on("presence", { event: "sync" }, checkPeer)
    .on("presence", { event: "join" }, checkPeer)
    .on("presence", { event: "leave" }, checkPeer)
    .on("broadcast", { event: "typing" }, (arg) => {
      const payload = (arg as { payload?: { role?: ChatRole } }).payload;
      if (payload?.role === other) handlers.onTyping?.();
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") void ch.track({ role, at: Date.now() });
    });

  let lastSent = 0;
  return {
    leave: () => {
      void db.removeChannel(ch);
    },
    /** Avisa o outro lado que está digitando. Limitado a um aviso a cada 2 s. */
    typing: () => {
      const now = Date.now();
      if (now - lastSent < 2000) return;
      lastSent = now;
      void ch.send({ type: "broadcast", event: "typing", payload: { role } });
    },
  };
}
