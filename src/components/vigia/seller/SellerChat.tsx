import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { joinStoreChat } from "@/lib/store-chat-live";

type RealtimeChannel = {
  on: (type: string, filter: Record<string, string>, cb: () => void) => RealtimeChannel;
  subscribe: () => RealtimeChannel;
};
import {
  ArrowLeft,
  CheckSquare,
  ChevronDown,
  Clock3,
  Zap,
  MessageCircle,
  Send,
  Square,
  Trash2,
} from "lucide-react";
import { useDialog } from "@/lib/dialog";
import {
  CHAT_RETENTION_NOTE,
  CHAT_RULE_NOTE,
  QUICK_GROUPS,
  computeQueue,
  fmtWait,
  validateChatText,
} from "@/lib/chat-rules";
import { playSound } from "@/lib/chat-sound";
import { SoundToggle } from "../chat/ChatToasts";
import { AvailabilityToggle } from "./AvailabilityToggle";
import { ProductLookup } from "./ProductLookup";
import { ChatTimer } from "./ChatTimer";
import { precheckMessage } from "@/lib/store-moderation";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage, Vendor } from "@/lib/marketplace";

const time = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Rio_Branco",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Conversas da loja com clientes cadastrados: lista à esquerda e a conversa à direita. */
export function SellerChat({
  vendor,
  messages,
  onChanged,
  initial,
  staff = false,
}: {
  staff?: boolean;
  vendor: Vendor;
  messages: ChatMessage[];
  onChanged: () => void;
  initial?: string | null;
}) {
  const threads = useMemo(() => {
    const map = new Map<string, { id: string; name: string; last: ChatMessage; unread: number }>();
    messages.forEach((m) => {
      const t = map.get(m.customer_id) ?? {
        id: m.customer_id,
        name: "Cliente",
        last: m,
        unread: 0,
      };
      if (m.customer_name) t.name = m.customer_name;
      t.last = m;
      if (!m.from_vendor && !m.read_at) t.unread += 1;
      map.set(m.customer_id, t);
    });
    return [...map.values()].sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
  }, [messages]);
  const [sel, setSel] = useState<string | null>(initial ?? null);
  useEffect(() => {
    if (initial) setSel(initial);
  }, [initial]);
  const active =
    sel ??
    (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
      ? (threads[0]?.id ?? null)
      : null);
  const convo = messages.filter((m) => m.customer_id === active);
  const name = threads.find((t) => t.id === active)?.name ?? "Cliente";
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Presença e "digitando" da conversa aberta.
  const [custOnline, setCustOnline] = useState(false);
  const [custTyping, setCustTyping] = useState(false);
  const liveRef = useRef<{ leave: () => void; typing: () => void } | null>(null);
  useEffect(() => {
    setCustOnline(false);
    setCustTyping(false);
    if (!active) return;
    let typingTimer: number | undefined;
    const live = joinStoreChat(vendor.id, active, "vendor", {
      onPeer: setCustOnline,
      onTyping: () => {
        setCustTyping(true);
        window.clearTimeout(typingTimer);
        typingTimer = window.setTimeout(() => setCustTyping(false), 4000);
      },
    });
    liveRef.current = live;
    return () => {
      window.clearTimeout(typingTimer);
      live.leave();
      liveRef.current = null;
    };
  }, [active, vendor.id]);

  // Mensagens novas chegam na hora: o painel é atualizado quando a loja recebe uma mensagem.
  const onChangedRef = useRef(onChanged);
  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);
  useEffect(() => {
    const db = supabase as unknown as {
      channel: (n: string) => RealtimeChannel;
      removeChannel: (c: RealtimeChannel) => Promise<unknown>;
    };
    const ch = db
      .channel(`seller-msgs-${vendor.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "care_store_messages",
          filter: `vendor_id=eq.${vendor.id}`,
        },
        () => onChangedRef.current(),
      )
      .subscribe();
    return () => {
      void db.removeChannel(ch);
    };
  }, [vendor.id]);

  const queue = useMemo(
    () => computeQueue(messages, now, vendor.chat_capacity ?? 3),
    [messages, now, vendor.chat_capacity],
  );
  const [quickOpen, setQuickOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  async function deleteThreads(ids: string[]) {
    if (!ids.length) return;
    if (
      !(await confirm(
        ids.length === 1 ? "Apagar esta conversa?" : `Apagar ${ids.length} conversas?`,
        "Todas as mensagens somem para você e para o cliente. Não dá para desfazer.",
        true,
        "Apagar tudo",
      ))
    )
      return;
    const { error } = await (supabase as any).rpc("care_store_delete_threads", {
      p_vendor: vendor.id,
      p_customers: ids,
    });
    if (error)
      return setErr("Não foi possível apagar. Aplique a migração mais recente e tente de novo.");
    setErr("");
    setPicked(new Set());
    setSelecting(false);
    if (active && ids.includes(active)) setSel(null);
    onChanged();
  }
  const toggle = (id: string) =>
    setPicked((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const { confirm } = useDialog();
  async function remove(id: string) {
    if (
      !(await confirm(
        "Apagar esta mensagem?",
        "Ela some para você e para o cliente, ficando só o aviso “Mensagem apagada”.",
        true,
        "Apagar",
      ))
    )
      return;
    const { error } = await (supabase as any).rpc("care_store_delete_message", { p_message: id });
    if (error) setErr("Não foi possível apagar a mensagem.");
    else onChanged();
  }

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [convo.length, active]);
  useEffect(() => {
    if (!active) return;
    const unread = convo.filter((m) => !m.from_vendor && !m.read_at).map((m) => m.id);
    if (unread.length)
      void (supabase as any)
        .from("care_store_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unread)
        .then(() => onChanged());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, convo.length]);

  async function send(e?: FormEvent, body = text) {
    e?.preventDefault();
    if (!active || !body.trim()) return;
    const bad = validateChatText(body);
    if (bad) return setErr(bad);
    // Moderação no servidor também para as mensagens da loja. O texto continua no campo se for recusado.
    try {
      const verdict = await precheckMessage(vendor.id, body.trim());
      if (!verdict.ok) return setErr(verdict.message);
    } catch (e) {
      return setErr(
        e instanceof Error ? e.message : "Não foi possível enviar agora. Tente de novo.",
      );
    }
    const { error } = await (supabase as any)
      .from("care_store_messages")
      .insert({ vendor_id: vendor.id, customer_id: active, from_vendor: true, body: body.trim() });
    if (error) {
      setErr("Mensagem não enviada. Tente de novo.");
      return;
    }
    setErr("");
    setText("");
    playSound("sent");
    onChanged();
  }

  return (
    <div className="grid h-[min(40rem,calc(100dvh-14rem))] min-h-[28rem] overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside
        className={`min-h-0 flex-col border-r border-border ${active ? "hidden lg:flex" : "flex"}`}
      >
        <AvailabilityToggle vendorId={vendor.id} />
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <p className="text-sm font-bold">
            Conversas <span className="font-normal text-muted-foreground">· {threads.length}</span>
          </p>
          {threads.length > 0 && !staff && (
            <button
              type="button"
              onClick={() => {
                setSelecting((v) => !v);
                setPicked(new Set());
              }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {selecting ? "Cancelar" : "Selecionar"}
            </button>
          )}
        </div>
        {selecting && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs">
            <button
              type="button"
              onClick={() =>
                setPicked(
                  picked.size === threads.length ? new Set() : new Set(threads.map((t) => t.id)),
                )
              }
              className="inline-flex items-center gap-1.5 font-semibold"
            >
              {picked.size === threads.length ? <CheckSquare size={14} /> : <Square size={14} />}
              {picked.size === threads.length ? "Desmarcar todas" : "Marcar todas"}
            </button>
            <button
              type="button"
              disabled={!picked.size}
              onClick={() => void deleteThreads([...picked])}
              className="ml-auto inline-flex items-center gap-1.5 bg-rose-600 px-2.5 py-1.5 font-bold text-white disabled:opacity-40"
            >
              <Trash2 size={13} /> Apagar{picked.size ? ` (${picked.size})` : ""}
            </button>
          </div>
        )}
        <div className="grid gap-1.5 border-b border-border bg-muted/30 px-4 py-2.5 text-xs">
          <p className="flex items-center justify-between font-semibold">
            <span>Em atendimento</span>
            <span className="tabular-nums">
              {queue.active.length}/{queue.capacity}
            </span>
          </p>
          <div className="flex h-1.5 gap-0.5" aria-hidden="true">
            {Array.from({ length: queue.capacity }, (_, i) => (
              <span
                key={i}
                className={`flex-1 ${i < queue.active.length ? "bg-emerald-500" : "bg-border"}`}
              />
            ))}
          </div>
          <p className="flex items-center justify-between text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={12} /> Na fila de espera
            </span>
            <strong className={queue.waiting.length ? "text-amber-600 dark:text-amber-300" : ""}>
              {queue.waiting.length}
            </strong>
          </p>
          {queue.waiting.slice(0, 4).map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => {
                setSelecting(false);
                setSel(w.id);
              }}
              className="flex items-center justify-between gap-2 border border-border bg-card px-2 py-1 text-left hover:bg-muted"
            >
              <span className="truncate">
                {w.position}º · {w.name}
              </span>
              <span className="shrink-0 font-bold tabular-nums text-amber-600 dark:text-amber-300">
                {fmtWait((now - w.since) / 1000)}
              </span>
            </button>
          ))}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => (selecting ? toggle(t.id) : setSel(t.id))}
                aria-current={t.id === active ? "true" : undefined}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${t.id === active ? "bg-[color-mix(in_srgb,var(--accent-store)_10%,transparent)]" : "hover:bg-muted/50"}`}
              >
                {selecting && (
                  <span aria-hidden="true" className="shrink-0 text-primary">
                    {picked.has(t.id) ? <CheckSquare size={17} /> : <Square size={17} />}
                  </span>
                )}
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                  style={{ background: "var(--accent-store)" }}
                >
                  {t.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2">
                    <strong className="truncate text-[13px]">{t.name}</strong>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {time(t.last.created_at).slice(6)}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t.last.deleted_at
                      ? "Mensagem apagada"
                      : `${t.last.from_vendor ? "Você: " : ""}${t.last.body}`}
                  </span>
                </span>
                {t.unread > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-sky-500 px-1.5 text-[11px] font-bold text-white">
                    {t.unread}
                  </span>
                )}
              </button>
            </li>
          ))}
          {!threads.length && (
            <li className="grid place-items-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground">
              <MessageCircle size={22} />
              Quando um cliente escrever pela página da loja, a conversa aparece aqui.
            </li>
          )}
        </ul>
      </aside>
      <section
        className={`min-h-0 flex-col ${active ? "flex" : "hidden lg:flex"}`}
        aria-label={active ? `Conversa com ${name}` : "Conversa"}
      >
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b border-border px-4 py-3">
              <button
                type="button"
                onClick={() => setSel(null)}
                aria-label="Voltar às conversas"
                className="grid size-8 place-items-center rounded-lg hover:bg-muted lg:hidden"
              >
                <ArrowLeft size={16} />
              </button>
              <span
                className="grid size-8 place-items-center rounded-full text-sm font-bold text-white"
                style={{ background: "var(--accent-store)" }}
              >
                {name.slice(0, 1)}
              </span>
              <SoundToggle />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{name}</p>
                <p className="text-[11px] text-muted-foreground">Cliente cadastrado na NextVita</p>
              </div>
              {!staff && (
                <button
                  type="button"
                  onClick={() => void deleteThreads([active])}
                  className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                >
                  <Trash2 size={13} /> Limpar conversa
                </button>
              )}
            </header>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,color-mix(in_srgb,currentColor_6%,transparent)_1px,transparent_0)] [background-size:18px_18px] px-4 py-4">
              {convo.map((m) => (
                <div
                  key={m.id}
                  className={`group flex items-center gap-1 ${m.from_vendor ? "justify-end" : "justify-start"}`}
                >
                  {m.from_vendor && !m.deleted_at && !staff && (
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
                    className={`nv-fade-in max-w-[78%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-snug shadow-sm ${m.deleted_at ? "border border-dashed border-border bg-transparent italic text-muted-foreground" : m.from_vendor ? "rounded-br-md text-white" : "rounded-bl-md bg-muted"}`}
                    style={
                      m.from_vendor && !m.deleted_at
                        ? { background: "var(--accent-store)" }
                        : undefined
                    }
                  >
                    {m.deleted_at ? "Mensagem apagada" : m.body}
                    <span
                      className={`mt-0.5 block text-right text-[11px] ${m.from_vendor && !m.deleted_at ? "text-white/70" : "text-muted-foreground"}`}
                    >
                      {time(m.created_at)}
                      {m.from_vendor && m.read_at && !m.deleted_at ? " · lida" : ""}
                    </span>
                  </p>
                </div>
              ))}
              <div ref={end} />
            </div>
            <div className="border-t border-border px-3 pt-2">
              <button
                type="button"
                onClick={() => setQuickOpen((v) => !v)}
                aria-expanded={quickOpen}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
              >
                <Zap size={13} /> Respostas prontas
                <ChevronDown size={13} className={quickOpen ? "rotate-180" : ""} />
              </button>
              {quickOpen && (
                <div className="mt-2 grid max-h-44 gap-2 overflow-y-auto border border-border bg-card p-2">
                  {QUICK_GROUPS.map((g) => (
                    <div key={g.title}>
                      <p className="mb-1 text-[11px] font-bold text-muted-foreground">{g.title}</p>
                      <div className="flex flex-wrap gap-1">
                        {g.items.map((qk) => (
                          <button
                            key={qk}
                            type="button"
                            onClick={() => {
                              setText(qk);
                              setQuickOpen(false);
                            }}
                            className="border border-border px-2 py-1 text-left text-[11.5px] hover:bg-muted"
                          >
                            {qk}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {active && (
              <p role="status" className="mx-3 mt-2 text-xs text-muted-foreground">
                {custTyping
                  ? "Cliente digitando…"
                  : custOnline
                    ? "Cliente conectado agora"
                    : "Cliente fora do chat"}
              </p>
            )}
            {active && (
              <ChatTimer
                key={active}
                vendorId={vendor.id}
                customerId={active}
                onClosed={onChanged}
              />
            )}
            <ProductLookup
              vendorId={vendor.id}
              disabled={!active}
              onSend={(body) => void send(undefined, body)}
            />
            <form onSubmit={send} className="flex gap-2 p-3">
              <input
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  liveRef.current?.typing();
                }}
                maxLength={500}
                placeholder="Escreva uma resposta"
                aria-label="Mensagem"
                className="h-10 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm"
              />
              <button
                type="submit"
                disabled={!text.trim()}
                aria-label="Enviar"
                className="grid size-10 place-items-center rounded-full text-white transition disabled:opacity-40"
                style={{ background: "var(--accent-store)" }}
              >
                <Send size={16} />
              </button>
            </form>
            <p className="px-4 pb-2 text-[11px] text-muted-foreground">
              {CHAT_RULE_NOTE} {CHAT_RETENTION_NOTE}
            </p>
            {err && (
              <p role="alert" className="px-4 pb-3 text-xs text-rose-600">
                {err}
              </p>
            )}
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
            Escolha uma conversa.
          </div>
        )}
      </section>
    </div>
  );
}
