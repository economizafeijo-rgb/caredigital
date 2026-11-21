import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import { money, type Vendor } from "@/lib/marketplace";
import {
  disputeReasonLabel,
  disputeStatusLabel,
  validateDescription,
  validateRefund,
  type Dispute,
  type DisputeMessage,
  type DisputeResolution,
} from "@/lib/disputes";
import { Panel, inputCls } from "./shared";

type OrderLite = { id: string; total_cents: number; customer_name: string };

const RESOLUTIONS: { key: DisputeResolution; label: string; hint: string }[] = [
  { key: "devolucao_aceita", label: "Aceitar devolução", hint: "Sem reembolso registrado." },
  { key: "reembolso_total", label: "Reembolso total", hint: "Devolve o valor do pedido inteiro." },
  { key: "reembolso_parcial", label: "Reembolso parcial", hint: "Devolve só parte do valor." },
  { key: "recusada", label: "Recusar", hint: "Mantém o pedido como foi entregue." },
];

/** Disputas da loja: o dono lê o caso, conversa com o cliente e registra a resolução. */
export function SellerDisputes({ vendor, onChanged }: { vendor: Vendor; onChanged: () => void }) {
  const { confirm } = useDialog();
  const accent = vendor.accent_hex ?? "#0e7a5f";
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [orders, setOrders] = useState<Record<string, OrderLite>>({});
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [resolution, setResolution] = useState<DisputeResolution>("reembolso_total");
  const [partial, setPartial] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const db = supabase as any;
    const { data: ds } = await db
      .from("care_store_disputes")
      .select("*")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false });
    const list: Dispute[] = ds ?? [];
    setDisputes(list);
    const ids = [...new Set(list.map((d) => d.order_id))];
    if (ids.length) {
      const { data: os } = await db
        .from("care_store_orders")
        .select("id,total_cents,customer_name")
        .in("id", ids);
      setOrders(Object.fromEntries((os ?? []).map((o: OrderLite) => [o.id, o])));
    }
    setSelected((cur) => cur ?? list[0]?.id ?? null);
  }, [vendor.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = useMemo(
    () => disputes.find((d) => d.id === selected) ?? null,
    [disputes, selected],
  );

  useEffect(() => {
    if (!current) {
      setMessages([]);
      return;
    }
    let alive = true;
    void (async () => {
      const { data } = await (supabase as any)
        .from("care_store_dispute_messages")
        .select("*")
        .eq("dispute_id", current.id)
        .order("created_at");
      if (alive) setMessages(data ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [current]);

  const order = current ? orders[current.order_id] : undefined;

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!current || !reply.trim()) return;
    setBusy("reply");
    setErr("");
    const { error } = await (supabase as any).rpc("care_store_dispute_message", {
      p_dispute: current.id,
      p_body: reply.trim(),
    });
    setBusy("");
    if (error) return setErr("Não foi possível enviar a mensagem. Tente de novo.");
    setReply("");
    await load();
  }

  async function resolve() {
    if (!current || !order) return;
    const parsed = Number(partial.replace(",", "."));
    const amount =
      resolution === "reembolso_parcial" && Number.isFinite(parsed)
        ? Math.round(parsed * 100)
        : null;
    const bad = validateRefund(order.total_cents, resolution, amount);
    if (bad) return setErr(bad);
    if (note.length > 1000) return setErr("A nota pode ter no máximo 1000 caracteres.");
    const ok = await confirm(
      "Registrar esta resolução?",
      "Ela é final e não pode ser desfeita. Se houver reembolso, devolva o valor ao cliente pelo meio combinado. O sistema apenas registra.",
      true,
      "Registrar",
    );
    if (!ok) return;
    setBusy("resolve");
    setErr("");
    const { error } = await (supabase as any).rpc("care_store_dispute_resolve", {
      p_dispute: current.id,
      p_status: resolution,
      p_amount_cents: resolution === "reembolso_total" ? order.total_cents : amount,
      p_note: note.trim() || null,
    });
    setBusy("");
    if (error)
      return setErr("Não foi possível registrar agora. Confira se a disputa segue aberta.");
    setNote("");
    setPartial("");
    await load();
    onChanged();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <Panel title="Disputas">
        {!disputes.length && (
          <p className="p-4 text-sm text-muted-foreground">Nenhuma disputa até agora.</p>
        )}
        <ul className="grid max-h-[32rem] overflow-y-auto divide-y divide-border">
          {disputes.map((d) => {
            const on = d.id === selected;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setSelected(d.id)}
                  aria-current={on ? "true" : undefined}
                  className={`grid w-full gap-0.5 px-4 py-3 text-left transition-colors ${on ? "bg-muted" : "hover:bg-muted/60"}`}
                  style={on ? { boxShadow: `inset 3px 0 0 ${accent}` } : undefined}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-bold">
                    {orders[d.order_id]?.customer_name ?? "Cliente"}
                    {d.status === "aberta" && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ background: accent }}
                      >
                        Aberta
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {disputeReasonLabel(d.reason)} · {disputeStatusLabel(d.status)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      {current ? (
        <div className="grid content-start gap-4">
          <Panel title={`Pedido de ${order?.customer_name ?? "cliente"}`}>
            <div className="grid gap-3 p-4">
              <p className="text-sm">
                <span className="font-semibold">{disputeReasonLabel(current.reason)}</span>
                {order && (
                  <span className="text-muted-foreground"> · total {money(order.total_cents)}</span>
                )}
              </p>
              <p className="whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm">
                {current.description}
              </p>
              <ul className="grid gap-2" aria-label="Mensagens da disputa">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className={`rounded-lg px-3 py-2 text-sm ${m.author === "lojista" ? "ml-8" : "mr-8 bg-muted"}`}
                    style={
                      m.author === "lojista"
                        ? { background: `color-mix(in srgb, ${accent} 14%, transparent)` }
                        : undefined
                    }
                  >
                    <span className="text-xs font-semibold text-muted-foreground">
                      {m.author === "lojista" ? "Você" : "Cliente"}
                    </span>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </li>
                ))}
              </ul>

              {current.status === "aberta" ? (
                <form onSubmit={send} className="grid gap-2">
                  <textarea
                    className={`${inputCls} min-h-16`}
                    value={reply}
                    maxLength={1000}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Responder ao cliente"
                    aria-label="Responder ao cliente"
                  />
                  <button
                    type="submit"
                    disabled={!reply.trim() || busy === "reply"}
                    className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold text-white disabled:opacity-50"
                    style={{ background: accent }}
                  >
                    <MessageCircle size={14} aria-hidden="true" /> Enviar
                  </button>
                </form>
              ) : (
                <p className="rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="font-semibold">{disputeStatusLabel(current.status)}</span>
                  {current.amount_cents != null && <> · {money(current.amount_cents)}</>}
                  {current.resolution_note && <> · {current.resolution_note}</>}
                </p>
              )}
            </div>
          </Panel>

          {current.status === "aberta" && order && (
            <Panel title="Resolver">
              <div className="grid gap-3 p-4">
                <fieldset className="grid gap-2">
                  <legend className="text-[13px] font-semibold">Resolução</legend>
                  {RESOLUTIONS.map((r) => (
                    <label
                      key={r.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm ${resolution === r.key ? "border-transparent" : "border-border"}`}
                      style={
                        resolution === r.key
                          ? { boxShadow: `inset 0 0 0 1.5px ${accent}` }
                          : undefined
                      }
                    >
                      <input
                        type="radio"
                        name="resolucao"
                        className="mt-1"
                        checked={resolution === r.key}
                        onChange={() => setResolution(r.key)}
                      />
                      <span>
                        <span className="font-semibold">{r.label}</span>
                        <span className="block text-xs text-muted-foreground">{r.hint}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                {resolution === "reembolso_parcial" && (
                  <label className="text-[13px] font-semibold">
                    Valor a devolver (R$)
                    <input
                      className={inputCls}
                      inputMode="decimal"
                      value={partial}
                      onChange={(e) => setPartial(e.target.value)}
                      placeholder={`até ${money(order.total_cents)}`}
                    />
                  </label>
                )}
                <label className="text-[13px] font-semibold">
                  Nota interna (opcional)
                  <textarea
                    className={`${inputCls} min-h-16`}
                    value={note}
                    maxLength={1000}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                {err && (
                  <p role="alert" className="text-xs text-rose-600 dark:text-rose-300">
                    {err}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void resolve()}
                  disabled={busy === "resolve"}
                  className="inline-flex h-10 w-fit items-center gap-2 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: accent }}
                >
                  {busy === "resolve" && <Loader2 size={14} className="animate-spin" />}
                  Registrar resolução
                </button>
              </div>
            </Panel>
          )}
          {err && current.status !== "aberta" && (
            <p role="alert" className="text-xs text-rose-600">
              {err}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
