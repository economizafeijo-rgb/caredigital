import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, MessageCircle, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import {
  canOpenDispute,
  disputeReasonLabel,
  disputeStatusLabel,
  validateDescription,
  type Dispute,
  type DisputeMessage,
  type DisputeReason,
} from "@/lib/disputes";

const REASONS: DisputeReason[] = [
  "nao_entregue",
  "defeito",
  "produto_diferente",
  "desistencia",
  "outro",
];

const field =
  "mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal";

/** Disputa do pedido no acompanhamento do cliente: abrir, conversar com a loja e desistir. */
export function DisputePanel({
  orderId,
  orderStatus,
  createdAt,
}: {
  orderId: string;
  orderStatus: string;
  createdAt: string;
}) {
  const { confirm } = useDialog();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [reason, setReason] = useState<DisputeReason>("nao_entregue");
  const [description, setDescription] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const db = supabase as any;
    const { data: d } = await db
      .from("care_store_disputes")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setDispute(d ?? null);
    if (d) {
      const { data: m } = await db
        .from("care_store_dispute_messages")
        .select("*")
        .eq("dispute_id", d.id)
        .order("created_at");
      setMessages(m ?? []);
    } else {
      setMessages([]);
    }
    setLoaded(true);
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const windowCheck = canOpenDispute(createdAt, orderStatus, new Date());

  async function open(e: FormEvent) {
    e.preventDefault();
    const bad = validateDescription(description);
    if (bad) return setErr(bad);
    setBusy("open");
    setErr("");
    const { error } = await (supabase as any).rpc("care_store_open_dispute", {
      p_order: orderId,
      p_reason: reason,
      p_description: description.trim(),
    });
    setBusy("");
    if (error) return setErr(errorText(error));
    setDescription("");
    await load();
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!dispute || !reply.trim()) return;
    setBusy("reply");
    setErr("");
    const { error } = await (supabase as any).rpc("care_store_dispute_message", {
      p_dispute: dispute.id,
      p_body: reply.trim(),
    });
    setBusy("");
    if (error) return setErr(errorText(error));
    setReply("");
    await load();
  }

  async function withdraw() {
    if (!dispute) return;
    const ok = await confirm(
      "Desistir da disputa?",
      "A loja deixa de ver o caso. Você pode abrir outra disputa depois, se precisar.",
      true,
      "Desistir",
    );
    if (!ok) return;
    setBusy("withdraw");
    setErr("");
    const { error } = await (supabase as any).rpc("care_store_dispute_withdraw", {
      p_dispute: dispute.id,
    });
    setBusy("");
    if (error) return setErr("Não foi possível desistir agora. Tente de novo.");
    await load();
  }

  if (!loaded) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5" aria-label="Disputa">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <ShieldAlert size={16} aria-hidden="true" /> Problema com o pedido
      </h2>

      {!dispute && !windowCheck.ok && (
        <p className="mt-2 text-sm text-muted-foreground">
          {windowCheck.ok ? "" : windowCheck.reason}
        </p>
      )}

      {!dispute && windowCheck.ok && (
        <form onSubmit={open} className="mt-3 grid gap-3">
          <label className="text-[13px] font-semibold">
            Motivo
            <select
              className={field}
              value={reason}
              onChange={(e) => setReason(e.target.value as DisputeReason)}
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {disputeReasonLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[13px] font-semibold">
            Conte o que aconteceu
            <textarea
              className={`${field} min-h-24`}
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema com pelo menos 10 caracteres."
            />
          </label>
          {err && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-300">
              {err}
            </p>
          )}
          <button
            type="submit"
            disabled={busy === "open"}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy === "open" && <Loader2 size={14} className="animate-spin" />}
            Abrir disputa
          </button>
        </form>
      )}

      {dispute && (
        <div className="mt-3 grid gap-3">
          <p className="text-sm">
            <span className="font-semibold">{disputeStatusLabel(dispute.status)}</span>
            {" · "}
            {disputeReasonLabel(dispute.reason)}
          </p>
          {dispute.status !== "aberta" && dispute.resolution_note && (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">
              Resposta da loja: {dispute.resolution_note}
            </p>
          )}
          <ul className="grid gap-2" aria-label="Mensagens da disputa">
            <li className="rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="text-xs font-semibold text-muted-foreground">Você</span>
              <p>{dispute.description}</p>
            </li>
            {messages.map((m) => (
              <li
                key={m.id}
                className={`rounded-lg px-3 py-2 text-sm ${m.author === "cliente" ? "bg-muted" : "bg-primary/10"}`}
              >
                <span className="text-xs font-semibold text-muted-foreground">
                  {m.author === "cliente" ? "Você" : "Loja"}
                </span>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </li>
            ))}
          </ul>

          {dispute.status === "aberta" && (
            <form onSubmit={send} className="grid gap-2">
              <label className="text-[13px] font-semibold">
                <span className="flex items-center gap-1">
                  <MessageCircle size={13} aria-hidden="true" /> Responder à loja
                </span>
                <textarea
                  className={`${field} min-h-16`}
                  value={reply}
                  maxLength={1000}
                  onChange={(e) => setReply(e.target.value)}
                />
              </label>
              {err && (
                <p role="alert" className="text-xs text-rose-600 dark:text-rose-300">
                  {err}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={!reply.trim() || busy === "reply"}
                  className="h-9 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  Enviar
                </button>
                <button
                  type="button"
                  onClick={() => void withdraw()}
                  disabled={busy === "withdraw"}
                  className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300"
                >
                  Desistir da disputa
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

function errorText(error: unknown) {
  const msg = String((error as { message?: string }).message ?? "");
  if (msg.includes("prazo")) return "O prazo para disputa deste pedido já encerrou.";
  if (msg.includes("já existe")) return "Já existe uma disputa aberta para este pedido.";
  return "Não foi possível enviar agora. Tente de novo.";
}
