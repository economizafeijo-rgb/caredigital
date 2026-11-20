import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, MessageCircle, Send, Trash2 } from "lucide-react";
import { useDialog } from "@/lib/dialog";
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
const QUICK = [
  "Olá! Como posso ajudar?",
  "Temos sim, pode fazer o pedido pelo app.",
  "Seu pedido já está separado.",
  "Pode retirar com o código no balcão.",
];

/** Conversas da loja com clientes cadastrados: lista à esquerda e a conversa à direita. */
export function SellerChat({
  vendor,
  messages,
  onChanged,
  initial,
}: {
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
    const { error } = await (supabase as any)
      .from("care_store_messages")
      .insert({ vendor_id: vendor.id, customer_id: active, from_vendor: true, body: body.trim() });
    if (error) {
      setErr("Mensagem não enviada. Tente de novo.");
      return;
    }
    setErr("");
    setText("");
    onChanged();
  }

  return (
    <div className="grid h-[min(40rem,calc(100dvh-14rem))] min-h-[28rem] overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside
        className={`min-h-0 flex-col border-r border-border ${active ? "hidden lg:flex" : "flex"}`}
      >
        <p className="border-b border-border px-4 py-3 text-sm font-bold">
          Conversas <span className="font-normal text-muted-foreground">· {threads.length}</span>
        </p>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSel(t.id)}
                aria-current={t.id === active ? "true" : undefined}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${t.id === active ? "bg-[color-mix(in_srgb,var(--accent-store)_10%,transparent)]" : "hover:bg-muted/50"}`}
              >
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
              <div>
                <p className="text-sm font-bold">{name}</p>
                <p className="text-[11px] text-muted-foreground">Cliente cadastrado na NextVita</p>
              </div>
            </header>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,color-mix(in_srgb,currentColor_6%,transparent)_1px,transparent_0)] [background-size:18px_18px] px-4 py-4">
              {convo.map((m) => (
                <div
                  key={m.id}
                  className={`group flex items-center gap-1 ${m.from_vendor ? "justify-end" : "justify-start"}`}
                >
                  {m.from_vendor && !m.deleted_at && (
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
            <div className="flex gap-1.5 overflow-x-auto border-t border-border px-3 pt-2 [scrollbar-width:none]">
              {QUICK.map((qk) => (
                <button
                  key={qk}
                  type="button"
                  onClick={() => void send(undefined, qk)}
                  className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground"
                >
                  {qk}
                </button>
              ))}
            </div>
            <form onSubmit={send} className="flex gap-2 p-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
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
