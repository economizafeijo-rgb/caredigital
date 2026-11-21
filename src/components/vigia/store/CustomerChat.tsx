import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { LogIn, Send, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "@/lib/marketplace";
import {
  AVG_SERVICE_SECONDS,
  CHAT_RETENTION_NOTE,
  CHAT_RULE_NOTE,
  fmtWait,
  validateChatText,
} from "@/lib/chat-rules";
import { playSound } from "@/lib/chat-sound";
import { ChatToastHost, SoundToggle, pushChatToast } from "../chat/ChatToasts";
import {
  availabilityOf,
  fetchQueuePosition,
  joinStoreQueue,
  leaveStoreQueue,
  useStoreStatus,
  continueChat,
  type QueuePosition,
} from "@/lib/store-presence";
import { QueueCard } from "./QueueCard";
import { precheckMessage } from "@/lib/store-moderation";
import { joinStoreChat } from "@/lib/store-chat-live";

type Queue = {
  state: "livre" | "atendimento" | "fila" | "vez";
  active: number;
  capacity: number;
  ahead: number;
  since: string | null;
  now: string;
  avg_seconds?: number;
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Rio_Branco",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Conversa do cliente com a loja, em tempo real. Exige estar logado (cliente cadastrado). */
export function CustomerChat({
  vendor,
  onClose,
  orderId,
  initialText,
}: {
  vendor: { id: string; name: string; accent_hex?: string | null };
  onClose: () => void;
  orderId?: string;
  /** Texto inicial do campo, ex.: pergunta sobre um produto. Fica no campo até o cliente enviar. */
  initialText?: string;
}) {
  const [user, setUser] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState(initialText ?? "");
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const skew = useRef(0);
  const prevState = useRef<string | null>(null);
  const { status: storeStatus } = useStoreStatus(vendor.id, 20000);
  const storeAvailability = availabilityOf(storeStatus);
  const [myQueue, setMyQueue] = useState<QueuePosition | null>(null);
  const [queueBusy, setQueueBusy] = useState(false);

  // Posição do cliente na fila: lida ao abrir (preserva a vez ao recarregar) e atualizada a cada 15 s.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = () =>
      fetchQueuePosition(vendor.id)
        .then((q) => alive && setMyQueue(q))
        .catch(() => undefined);
    void load();
    const t = window.setInterval(() => void load(), 15000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [user, vendor.id]);

  async function leaveQueue() {
    setQueueBusy(true);
    try {
      await leaveStoreQueue(vendor.id);
      setMyQueue(await fetchQueuePosition(vendor.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível sair da fila.");
    } finally {
      setQueueBusy(false);
    }
  }
  const seenIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const t = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const accent = vendor.accent_hex ?? "#0e7a5f";

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser(
        u
          ? {
              id: u.id,
              name: String(
                u.user_metadata?.full_name ??
                  u.user_metadata?.name ??
                  u.email?.split("@")[0] ??
                  "Cliente",
              ).slice(0, 80),
            }
          : null,
      );
    });
  }, []);
  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("care_store_messages")
      .select("*")
      .eq("vendor_id", vendor.id)
      .eq("customer_id", user.id)
      .order("created_at")
      .limit(300);
    const list: ChatMessage[] = data ?? [];
    // Aviso e som quando a loja responde com a conversa aberta.
    if (seenIds.current) {
      for (const m of list)
        if (m.from_vendor && !m.deleted_at && !seenIds.current.has(m.id))
          pushChatToast({ title: vendor.name, body: m.body, tone: "message" }, "incoming");
    }
    seenIds.current = new Set(list.map((m) => m.id));
    setMsgs(list);
    const q = await (supabase as any).rpc("care_store_chat_queue", { p_vendor: vendor.id });
    if (q.data) {
      const qq = q.data as Queue;
      skew.current = Date.parse(qq.now) - Date.now();
      if (qq.state === "vez" && prevState.current !== "vez")
        pushChatToast(
          { title: "É a sua vez", body: `${vendor.name} já vai responder você.`, tone: "turn" },
          "turn",
        );
      prevState.current = qq.state;
      setQueue(qq);
    }
    const unread = (data ?? [])
      .filter((m: ChatMessage) => m.from_vendor && !m.read_at)
      .map((m: ChatMessage) => m.id);
    if (unread.length)
      void (supabase as any)
        .from("care_store_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unread);
  }, [user, vendor.id, vendor.name]);

  // Presença e "digitando" do atendente nesta conversa.
  const [peerTyping, setPeerTyping] = useState(false);
  const liveRef = useRef<{ leave: () => void; typing: () => void } | null>(null);
  useEffect(() => {
    if (!user) return;
    let typingTimer: number | undefined;
    const live = joinStoreChat(vendor.id, user.id, "customer", {
      onTyping: () => {
        setPeerTyping(true);
        window.clearTimeout(typingTimer);
        typingTimer = window.setTimeout(() => setPeerTyping(false), 4000);
      },
    });
    liveRef.current = live;
    return () => {
      window.clearTimeout(typingTimer);
      live.leave();
      liveRef.current = null;
      setPeerTyping(false);
    };
  }, [user, vendor.id]);
  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(t);
  }, [load]);
  useEffect(() => {
    const db = supabase as any;
    if (!user || typeof db.channel !== "function") return;
    const ch = db
      .channel(`chat-${vendor.id}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "care_store_messages",
          filter: `vendor_id=eq.${vendor.id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void db.removeChannel(ch);
    };
  }, [user, vendor.id, load]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    if (storeAvailability === "offline")
      return setErr("A loja está offline agora. Tente de novo mais tarde.");
    const bad = validateChatText(text);
    if (bad) return setErr(bad);
    // Moderação no servidor antes de salvar. Em caso de recusa, o rascunho fica no campo para editar.
    try {
      const verdict = await precheckMessage(vendor.id, text.trim());
      if (!verdict.ok) return setErr(verdict.message);
    } catch (e) {
      return setErr(
        e instanceof Error ? e.message : "Não foi possível enviar agora. Tente de novo.",
      );
    }
    // Entra na fila no servidor (ou é atendido na hora, se houver vaga). Sem atendente, não entra.
    try {
      setMyQueue(await joinStoreQueue(vendor.id));
    } catch (e) {
      return setErr(e instanceof Error ? e.message : "Não foi possível entrar na fila.");
    }
    const { error } = await (supabase as any).from("care_store_messages").insert({
      vendor_id: vendor.id,
      customer_id: user.id,
      customer_name: user.name,
      from_vendor: false,
      body: text.trim(),
      order_id: orderId ?? null,
    });
    if (error) {
      setErr("Mensagem não enviada. Tente de novo.");
      return;
    }
    setErr("");
    setText("");
    playSound("sent");
    void load();
  }
  async function remove(id: string) {
    const { error } = await (supabase as any).rpc("care_store_delete_message", { p_message: id });
    if (error) setErr("Não foi possível apagar a mensagem.");
    else void load();
  }
  const login = () => {
    try {
      window.sessionStorage.setItem(
        "nv_after_login",
        window.location.pathname + window.location.search,
      );
    } catch {
      /* ok */
    }
    window.location.assign("/entrar");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Conversa com ${vendor.name}`}
      className="fixed inset-0 z-[95] flex items-end justify-end bg-black/40 backdrop-blur-[2px] sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <ChatToastHost />
      <div className="nv-fade-in flex h-[min(36rem,92dvh)] w-full flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:w-[24rem] sm:rounded-3xl">
        <header
          className="flex items-center gap-3 px-4 py-3 text-white"
          style={{ background: accent }}
        >
          <span className="grid size-9 place-items-center rounded-full bg-white/20 text-sm font-extrabold">
            {vendor.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{vendor.name}</p>
            <p className="text-[11px] text-white/75">Responde pelo chat da NextVita</p>
          </div>
          <SoundToggle className="!border-white/30 text-white hover:!bg-white/15" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar conversa"
            className="grid size-8 place-items-center rounded-full hover:bg-white/15"
          >
            <X size={17} />
          </button>
        </header>
        {user === null ? (
          <div className="grid flex-1 place-items-center gap-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Entre na sua conta para conversar com a loja. Assim ela sabe quem é você e pode
              acompanhar seu pedido.
            </p>
            <button
              type="button"
              onClick={login}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white"
              style={{ background: accent }}
            >
              <LogIn size={16} /> Entrar
            </button>
          </div>
        ) : (
          <>
            <StoreAvailabilityLine
              availability={storeAvailability}
              agents={storeStatus?.agents_online ?? null}
            />
            <QueueCard
              queue={myQueue ?? { state: "none" }}
              onLeave={() => void leaveQueue()}
              busy={queueBusy}
            />
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-muted/40 px-3 py-3">
              {!msgs.length && (
                <p className="mx-auto mt-6 max-w-[16rem] text-center text-xs text-muted-foreground">
                  Mande sua dúvida sobre produtos, prazos ou retirada. A loja recebe na hora.
                </p>
              )}
              {msgs.map((m) => (
                <div
                  key={m.id}
                  className={`group flex items-center gap-1 ${m.from_vendor ? "justify-start" : "justify-end"}`}
                >
                  {!m.from_vendor && !m.deleted_at && (
                    <button
                      type="button"
                      onClick={() => void remove(m.id)}
                      aria-label="Apagar mensagem"
                      title="Apagar mensagem"
                      className="grid size-7 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-muted hover:text-rose-500 focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <p
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13.5px] shadow-sm ${m.deleted_at ? "border border-dashed border-border bg-transparent italic text-muted-foreground" : m.from_vendor ? "rounded-bl-md bg-card" : "rounded-br-md text-white"}`}
                    style={m.from_vendor || m.deleted_at ? undefined : { background: accent }}
                  >
                    {m.deleted_at ? "Mensagem apagada" : m.body}
                    <span
                      className={`mt-0.5 block text-right text-[10px] ${m.from_vendor || m.deleted_at ? "text-muted-foreground" : "text-white/70"}`}
                    >
                      {time(m.created_at)}
                    </span>
                  </p>
                </div>
              ))}
              <div ref={end} />
            </div>
            {(() => {
              const last = msgs[msgs.length - 1];
              const waiting = !!last?.is_system && last.body.startsWith("Você ainda está por aqui");
              const warned =
                !!last?.is_system && last.body.startsWith("Seu atendimento será encerrado");
              if (!waiting && !warned) return null;
              return (
                <div className="flex items-center justify-between gap-2 border-t border-border bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <span role="status">{last.body}</span>
                  <button
                    type="button"
                    onClick={() =>
                      void continueChat(vendor.id)
                        .then(load)
                        .catch((e: unknown) =>
                          setErr(e instanceof Error ? e.message : "Não foi possível continuar."),
                        )
                    }
                    className="shrink-0 rounded-md bg-slate-950 px-3 py-1.5 font-bold text-white"
                  >
                    Continuar atendimento
                  </button>
                </div>
              );
            })()}
            {peerTyping && (
              <p role="status" className="px-3 pt-2 text-xs text-muted-foreground">
                Atendente digitando…
              </p>
            )}
            <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
              <input
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  liveRef.current?.typing();
                }}
                maxLength={500}
                placeholder="Escreva sua mensagem"
                aria-label="Mensagem"
                className="h-10 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm"
                disabled={!user || storeAvailability === "offline"}
              />
              <button
                type="submit"
                disabled={!text.trim() || !user || storeAvailability === "offline"}
                aria-label="Enviar"
                className="grid size-10 place-items-center rounded-full text-white disabled:opacity-40"
                style={{ background: accent }}
              >
                <Send size={16} />
              </button>
            </form>
            <p className="px-4 pb-2 text-[11px] text-muted-foreground">
              {CHAT_RULE_NOTE} {CHAT_RETENTION_NOTE}
            </p>
            {err && (
              <p role="alert" className="px-4 pb-2 text-xs text-rose-600">
                {err}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Faixa de espera: posição, tempo decorrido e estimado, com linha de progresso em tempo real. */
function QueueBanner({ q, clock, accent }: { q: Queue; clock: number; accent: string }) {
  if (q.state === "atendimento")
    return (
      <p className="flex items-center gap-2 border-b border-border bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        <span className="size-2 animate-pulse bg-emerald-500" /> Você está em atendimento
      </p>
    );
  const elapsed = q.since ? Math.max(0, (clock - Date.parse(q.since)) / 1000) : 0;
  const per = q.avg_seconds ?? AVG_SERVICE_SECONDS;
  const total = (q.ahead + 1) * per;
  const left = Math.max(0, total - elapsed);
  const pct = Math.min(100, Math.round((elapsed / Math.max(total, 1)) * 100));
  const turn = q.state === "vez";
  return (
    <div
      className={`border-b border-border px-4 py-2.5 text-xs ${turn ? "bg-amber-400/15" : "bg-muted/50"}`}
      role="status"
    >
      <p className="flex items-center justify-between gap-2 font-semibold">
        <span>
          {turn ? "É a sua vez! Já vamos responder." : `Você é o ${q.ahead + 1}º da fila`}
        </span>
        <span className="tabular-nums">{turn ? "" : `~${fmtWait(left)}`}</span>
      </p>
      <p className="mt-0.5 text-muted-foreground">
        {q.active}/{q.capacity} em atendimento agora · espera {fmtWait(elapsed)}
      </p>
      <div className="mt-1.5 h-1.5 bg-border" aria-hidden="true">
        <div
          className="h-full transition-[width] duration-1000 ease-linear"
          style={{ width: `${turn ? 100 : pct}%`, background: turn ? "#f59e0b" : accent }}
        />
      </div>
    </div>
  );
}

/** Estado da loja para o cliente: texto e ícone, sem depender só de cor. */
function StoreAvailabilityLine({
  availability,
  agents,
}: {
  availability: "offline" | "livre" | "ocupado";
  agents: number | null;
}) {
  if (availability === "offline")
    return (
      <p
        role="status"
        className="border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground"
      >
        Loja offline no momento. Não é possível entrar na fila agora; tente mais tarde.
      </p>
    );
  if (availability === "ocupado")
    return (
      <p
        role="status"
        className="border-b border-border bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
      >
        Todos os atendentes estão ocupados. Sua mensagem entra na fila.
      </p>
    );
  return (
    <p
      role="status"
      className="border-b border-border bg-emerald-50 px-4 py-2 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
    >
      Atendimento online{agents ? ` · ${agents} atendente${agents > 1 ? "s" : ""} disponível` : ""}.
    </p>
  );
}
