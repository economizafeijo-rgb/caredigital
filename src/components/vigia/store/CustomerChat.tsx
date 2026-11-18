import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { LogIn, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "@/lib/marketplace";

const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Rio_Branco", hour: "2-digit", minute: "2-digit" });

/** Conversa do cliente com a loja, em tempo real. Exige estar logado (cliente cadastrado). */
export function CustomerChat({ vendor, onClose, orderId }: { vendor: { id: string; name: string; accent_hex?: string | null }; onClose: () => void; orderId?: string }) {
  const [user, setUser] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const accent = vendor.accent_hex ?? "#0e7a5f";

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser(u ? { id: u.id, name: String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split("@")[0] ?? "Cliente").slice(0, 80) } : null);
    });
  }, []);
  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("care_store_messages").select("*").eq("vendor_id", vendor.id).eq("customer_id", user.id).order("created_at").limit(300);
    setMsgs(data ?? []);
    const unread = (data ?? []).filter((m: ChatMessage) => m.from_vendor && !m.read_at).map((m: ChatMessage) => m.id);
    if (unread.length) void (supabase as any).from("care_store_messages").update({ read_at: new Date().toISOString() }).in("id", unread);
  }, [user, vendor.id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const db = supabase as any;
    if (!user || typeof db.channel !== "function") return;
    const ch = db.channel(`chat-${vendor.id}-${user.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "care_store_messages", filter: `vendor_id=eq.${vendor.id}` }, () => void load()).subscribe();
    return () => { void db.removeChannel(ch); };
  }, [user, vendor.id, load]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    const { error } = await (supabase as any).from("care_store_messages").insert({ vendor_id: vendor.id, customer_id: user.id, customer_name: user.name, from_vendor: false, body: text.trim(), order_id: orderId ?? null });
    if (error) { setErr("Mensagem não enviada. Tente de novo."); return; }
    setErr(""); setText(""); void load();
  }
  const login = () => { try { window.sessionStorage.setItem("nv_after_login", window.location.pathname + window.location.search); } catch { /* ok */ } window.location.assign("/entrar"); };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Conversa com ${vendor.name}`} className="fixed inset-0 z-[95] flex items-end justify-end bg-black/40 backdrop-blur-[2px] sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="nv-fade-in flex h-[min(36rem,92dvh)] w-full flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:w-[24rem] sm:rounded-3xl">
        <header className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: accent }}>
          <span className="grid size-9 place-items-center rounded-full bg-white/20 text-sm font-extrabold">{vendor.name.slice(0, 1)}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{vendor.name}</p><p className="text-[11px] text-white/75">Responde pelo chat da NextVita</p></div>
          <button type="button" onClick={onClose} aria-label="Fechar conversa" className="grid size-8 place-items-center rounded-full hover:bg-white/15"><X size={17} /></button>
        </header>
        {user === null ? (
          <div className="grid flex-1 place-items-center gap-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">Entre na sua conta para conversar com a loja. Assim ela sabe quem é você e pode acompanhar seu pedido.</p>
            <button type="button" onClick={login} className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white" style={{ background: accent }}><LogIn size={16} /> Entrar</button>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-muted/40 px-3 py-3">
              {!msgs.length && <p className="mx-auto mt-6 max-w-[16rem] text-center text-xs text-muted-foreground">Mande sua dúvida sobre produtos, prazos ou retirada. A loja recebe na hora.</p>}
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.from_vendor ? "justify-start" : "justify-end"}`}>
                  <p className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13.5px] shadow-sm ${m.from_vendor ? "rounded-bl-md bg-card" : "rounded-br-md text-white"}`} style={m.from_vendor ? undefined : { background: accent }}>
                    {m.body}<span className={`mt-0.5 block text-right text-[10px] ${m.from_vendor ? "text-muted-foreground" : "text-white/70"}`}>{time(m.created_at)}</span>
                  </p>
                </div>
              ))}
              <div ref={end} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Escreva sua mensagem" aria-label="Mensagem" className="h-10 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm" disabled={!user} />
              <button type="submit" disabled={!text.trim() || !user} aria-label="Enviar" className="grid size-10 place-items-center rounded-full text-white disabled:opacity-40" style={{ background: accent }}><Send size={16} /></button>
            </form>
            {err && <p role="alert" className="px-4 pb-2 text-xs text-rose-600">{err}</p>}
          </>
        )}
      </div>
    </div>
  );
}
