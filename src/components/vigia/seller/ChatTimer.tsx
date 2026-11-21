import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type TimerRow = {
  out_customer_id: string;
  out_stage: string;
  out_deadline: string | null;
  out_paused: boolean;
  out_server_now: string;
};
type RpcResult = { data: unknown; error: { message: string } | null };
const client = supabase as unknown as {
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
};
const rpc = (name: string, args: Record<string, unknown>) => client.rpc(name, args);

const CLOSE_REASONS = [
  { value: "atendido", label: "Atendimento concluído" },
  { value: "encerrado_atendente", label: "Encerrado pelo atendente" },
] as const;

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Prazo de inatividade da conversa aberta, com encerramento manual e motivo.
 * O relógio usa a hora do servidor: a hora do computador do lojista não altera o prazo.
 * Só aparece quando o cliente está na fila ativa.
 */
export function ChatTimer({
  vendorId,
  customerId,
  onClosed,
}: {
  vendorId: string;
  customerId: string;
  onClosed: () => void;
}) {
  const [row, setRow] = useState<TimerRow | null>(null);
  const [skew, setSkew] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState<string>("atendido");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error } = await rpc("care_store_chat_timers", { p_vendor: vendorId });
      if (!alive || error) return;
      const mine =
        ((data ?? []) as TimerRow[]).find((r) => r.out_customer_id === customerId) ?? null;
      setRow(mine);
      if (mine) setSkew(new Date(mine.out_server_now).getTime() - Date.now());
    };
    void load();
    const id = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [vendorId, customerId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!row) return null;

  const deadline = row.out_deadline ? new Date(row.out_deadline).getTime() : null;
  const remaining = deadline === null ? null : deadline - (now + skew);
  const warned = row.out_stage !== "ok";

  let label = "";
  if (row.out_paused) label = "O cliente respondeu. Responda para manter o atendimento.";
  else if (remaining !== null && warned)
    label = `Aviso enviado. Encerra por inatividade em ${mmss(remaining)}.`;
  else if (remaining !== null)
    label = `Sem resposta do cliente. Aviso automático em ${mmss(remaining)}.`;

  async function close() {
    setBusy(true);
    setMsg("");
    const { error } = await rpc("care_store_close_chat", {
      p_vendor: vendorId,
      p_customer: customerId,
      p_reason: reason,
    });
    setBusy(false);
    if (error) {
      setMsg("Não foi possível encerrar agora. Tente de novo.");
      return;
    }
    setConfirm(false);
    setRow(null);
    onClosed();
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mx-3 mt-2 rounded-lg border px-3 py-2 text-xs ${
        warned
          ? "border-amber-400 bg-amber-50 text-amber-900"
          : "border-border bg-muted/40 text-muted-foreground"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-start gap-1.5">
          <Clock size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{label}</span>
        </span>
        {!confirm && (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="shrink-0 font-semibold underline"
          >
            Encerrar
          </button>
        )}
      </div>
      {confirm && (
        <div className="mt-2 grid gap-2">
          <label className="grid gap-1 font-semibold">
            Motivo do encerramento
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface px-2 font-normal"
            >
              {CLOSE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className="h-8 rounded-md bg-slate-900 px-3 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Encerrando…" : "Confirmar encerramento"}
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="h-8 px-2">
              Cancelar
            </button>
          </div>
        </div>
      )}
      {msg && <p className="mt-1 text-rose-700">{msg}</p>}
    </div>
  );
}
