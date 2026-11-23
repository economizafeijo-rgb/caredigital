import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { LogIn, Maximize2, MessageCircle, Minimize2, Minus, Send, Trash2, X } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  vendor: { id: string; name: string; accent_hex?: string | null; logo_url?: string | null };
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
  const [view, setView] = useState<"normal" | "max" | "min">("normal");
  // Mensagens da loja que chegaram com o chat minimizado.
  const seenAtMin = useRef(0);
  useEffect(() => {
    if (view === "min") seenAtMin.current = msgs.filter((m) => m.from_vendor).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  const unreadMin =
    view === "min" ? Math.max(0, msgs.filter((m) => m.from_vendor).length - seenAtMin.current) : 0;

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

  // Limpa o chat do cliente. A loja mantém o histórico no arquivo.
  const [clearing, setClearing] = useState(false);
  const [askClear, setAskClear] = useState(false);
  async function clearChat() {
    if (!user || clearing) return;
    setAskClear(false);
    setClearing(true);
    const client = supabase as unknown as {
      rpc: (
        n: string,
        a: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;
    };
    const { error } = await client.rpc("care_store_customer_clear_chat", { p_vendor: vendor.id });
    setClearing(false);
    if (error) return setErr("Não foi possível limpar a conversa agora. Tente de novo.");
    setErr("");
    await load();
  }

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
    if (!user || !text.trim() || storeAvailability === "offline") return;
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
    // Entra na fila no servidor (ou é atendido na hora, se houver vaga).
    try {
      setMyQueue(await joinStoreQueue(vendor.id));
    } catch {
      /* segue: a mensagem é salva mesmo sem vaga na fila agora */
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

  const statusLabel =
    storeAvailability === "offline"
      ? "Offline"
      : storeAvailability === "ocupado"
        ? "Atendentes ocupados"
        : "Online agora";
  const statusDot =
    storeAvailability === "offline"
      ? "bg-slate-400"
      : storeAvailability === "ocupado"
        ? "bg-amber-400"
        : "bg-emerald-400";
  const avatar = (size: string) => (
    <span
      className={`relative grid ${size} shrink-0 place-items-center overflow-hidden rounded-full bg-white text-sm font-extrabold shadow-sm ring-2 ring-white/40`}
      style={{ color: accent }}
    >
      {vendor.logo_url ? (
        <img src={vendor.logo_url} alt="" className="size-full object-cover" />
      ) : (
        vendor.name.slice(0, 1).toUpperCase()
      )}
    </span>
  );

  if (view === "min")
    return (
      <div className="fixed bottom-[calc(8.5rem+env(safe-area-inset-bottom))] right-3 z-[95] sm:bottom-24 sm:right-5">
        <ChatToastHost />
        <div
          className="nv-fade-in flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-2 text-white shadow-2xl ring-1 ring-white/20"
          style={{
            background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 60%, #0b1220))`,
          }}
        >
          <button
            type="button"
            onClick={() => setView("normal")}
            aria-label={`Abrir conversa com ${vendor.name}`}
            className="flex min-w-0 items-center gap-2.5 rounded-full pr-1 text-left"
          >
            <span className="relative">
              {avatar("size-9")}
              <span
                className={`absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-white ${statusDot}`}
                aria-hidden="true"
              />
            </span>
            <span className="min-w-0">
              <span className="block max-w-[11rem] truncate text-[13px] font-bold">
                {vendor.name}
              </span>
              <span className="block text-[11px] text-white/80">
                {unreadMin > 0
                  ? `${unreadMin} nova${unreadMin > 1 ? "s" : ""} mensage${unreadMin > 1 ? "ns" : "m"}`
                  : statusLabel}
              </span>
            </span>
            {unreadMin > 0 && (
              <span
                className="nv-msg-pulse grid min-w-5 place-items-center rounded-full bg-white px-1.5 text-[11px] font-extrabold"
                style={{ color: accent }}
              >
                {unreadMin}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar conversa"
            className="grid size-8 place-items-center rounded-full hover:bg-white/15"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );

  const max = view === "max";
  return (
    <div
      className={`fixed z-[95] ${max ? "inset-0 grid place-items-center bg-slate-950/60 p-0 backdrop-blur-sm sm:p-6" : "inset-0 sm:inset-auto sm:bottom-24 sm:right-5"}`}
      onClick={(e) => max && e.target === e.currentTarget && setView("normal")}
    >
      <ChatToastHost />
      <div
        role="dialog"
        aria-modal={max ? "true" : "false"}
        aria-label={`Conversa com ${vendor.name}`}
        className={`nv-fade-in flex flex-col overflow-hidden bg-card shadow-2xl ring-1 ring-black/5 dark:ring-white/10 ${
          max
            ? "h-full w-full sm:h-[min(52rem,92dvh)] sm:w-[min(56rem,96vw)] sm:rounded-3xl"
            : "h-full w-full sm:h-[min(36rem,calc(100dvh-8rem))] sm:w-[25rem] sm:rounded-3xl"
        }`}
      >
        <header
          className="relative flex items-center gap-3 px-4 py-3.5 text-white"
          style={{
            background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 55%, #0b1220))`,
          }}
        >
          <span className="relative">
            {avatar("size-10")}
            <span
              className={`absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-white ${statusDot}`}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-extrabold leading-tight">{vendor.name}</p>
            <p className="mt-0.5 text-[11.5px] text-white/85">
              {peerTyping ? "Digitando…" : statusLabel}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            {user && (
              <AlertDialog open={askClear} onOpenChange={setAskClear}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar esta conversa?</AlertDialogTitle>
                    <AlertDialogDescription>
                      As mensagens saem do seu chat. A loja mantém o histórico.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void clearChat()}>
                      Limpar conversa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {user && (
              <button
                type="button"
                onClick={() => setAskClear(true)}
                disabled={clearing}
                aria-label="Limpar conversa"
                title="Limpar conversa"
                className="grid size-8 place-items-center rounded-full transition hover:bg-white/15 disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            )}
            <SoundToggle className="!size-8 !border-0 text-white hover:!bg-white/15" />
            <button
              type="button"
              onClick={() => setView("min")}
              aria-label="Minimizar conversa"
              title="Minimizar"
              className="grid size-8 place-items-center rounded-full transition hover:bg-white/15"
            >
              <Minus size={17} />
            </button>
            <button
              type="button"
              onClick={() => setView(max ? "normal" : "max")}
              aria-label={max ? "Restaurar tamanho" : "Maximizar conversa"}
              title={max ? "Restaurar" : "Maximizar"}
              className="hidden size-8 place-items-center rounded-full transition hover:bg-white/15 sm:grid"
            >
              {max ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar conversa"
              title="Fechar"
              className="grid size-8 place-items-center rounded-full transition hover:bg-white/15"
            >
              <X size={17} />
            </button>
          </div>
        </header>
        {user === null ? (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div className="max-w-xs">
              <span
                className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted"
                style={{ color: accent }}
              >
                <MessageCircle size={26} />
              </span>
              <p className="mt-4 text-base font-bold">Entre para conversar com a loja</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Assim a loja sabe quem é você e pode acompanhar seu pedido.
              </p>
              <button
                type="button"
                onClick={login}
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-md transition hover:brightness-110"
                style={{ background: accent }}
              >
                <LogIn size={16} /> Entrar na minha conta
              </button>
            </div>
          </div>
        ) : (
          <>
            {storeAvailability !== "livre" && (
              <StoreAvailabilityLine
                availability={storeAvailability}
                agents={storeStatus?.agents_online ?? null}
              />
            )}
            <QueueCard
              queue={myQueue ?? { state: "none" }}
              onLeave={() => void leaveQueue()}
              busy={queueBusy}
            />
            <div className="min-h-0 flex-1 overflow-y-auto bg-[color-mix(in_srgb,var(--muted)_55%,transparent)] px-3 py-4 sm:px-4">
              <div className={`mx-auto flex flex-col gap-2 ${max ? "max-w-3xl" : ""}`}>
                {!msgs.length && (
                  <div className="mx-auto mt-8 max-w-[17rem] text-center">
                    <span
                      className="mx-auto grid size-12 place-items-center rounded-2xl bg-card shadow-sm"
                      style={{ color: accent }}
                    >
                      <MessageCircle size={22} />
                    </span>
                    <p className="mt-3 text-sm font-bold">Como podemos ajudar?</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pergunte sobre produtos, prazos, entrega ou retirada. A loja recebe na hora.
                    </p>
                  </div>
                )}
                {msgs.map((m) =>
                  m.is_system ? (
                    <p
                      key={m.id}
                      className="mx-auto my-1 w-fit max-w-[90%] rounded-full bg-card px-3 py-1 text-center text-[11.5px] text-muted-foreground shadow-sm"
                    >
                      {m.body}
                    </p>
                  ) : (
                    <div
                      key={m.id}
                      className={`group flex items-end gap-1.5 ${m.from_vendor ? "justify-start" : "justify-end"}`}
                    >
                      {m.from_vendor && avatar("size-6")}
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
                        className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[13.5px] leading-snug shadow-sm ${m.deleted_at ? "border border-dashed border-border bg-transparent italic text-muted-foreground" : m.from_vendor ? "rounded-bl-md bg-card" : "rounded-br-md text-white"}`}
                        style={m.from_vendor || m.deleted_at ? undefined : { background: accent }}
                      >
                        {m.deleted_at ? "Mensagem apagada" : m.body}
                        <span
                          className={`mt-0.5 block text-right text-[10.5px] ${m.from_vendor || m.deleted_at ? "text-muted-foreground" : "text-white/75"}`}
                        >
                          {time(m.created_at)}
                        </span>
                      </p>
                    </div>
                  ),
                )}
                <div ref={end} />
              </div>
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
                    className="shrink-0 rounded-lg bg-slate-950 px-3 py-1.5 font-bold text-white"
                  >
                    Continuar atendimento
                  </button>
                </div>
              );
            })()}
            <form onSubmit={send} className="border-t border-border bg-card p-3">
              <div
                className={`mx-auto flex items-center gap-2 rounded-2xl border border-border bg-surface p-1.5 pl-4 focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--v,#888)_40%,transparent)] ${max ? "max-w-3xl" : ""}`}
              >
                <input
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    liveRef.current?.typing();
                  }}
                  maxLength={500}
                  placeholder={
                    storeAvailability === "offline"
                      ? "Chat inativo: loja offline"
                      : "Escreva sua mensagem…"
                  }
                  aria-label="Mensagem"
                  className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
                  disabled={!user || storeAvailability === "offline"}
                />
                <button
                  type="submit"
                  disabled={!text.trim() || !user || storeAvailability === "offline"}
                  aria-label="Enviar"
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-white shadow-sm transition hover:brightness-110 disabled:opacity-40"
                  style={{ background: accent }}
                >
                  <Send size={15} />
                </button>
              </div>
              {err && (
                <p
                  role="alert"
                  className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300"
                >
                  {err}
                </p>
              )}
              <p className="mt-2 text-center text-[10.5px] leading-snug text-muted-foreground">
                {CHAT_RULE_NOTE} {CHAT_RETENTION_NOTE}
              </p>
            </form>
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
        A loja está offline no momento e o chat está inativo. Volte mais tarde ou veja o horário de
        atendimento na página da loja.
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
