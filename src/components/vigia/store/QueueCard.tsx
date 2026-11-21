import { Loader2, LogOut, MessageCircle } from "lucide-react";
import type { QueuePosition } from "@/lib/store-presence";

/**
 * Posição do cliente na fila. Texto claro, aviso lido por leitor de tela e animação
 * discreta que respeita a preferência de movimento reduzido.
 */
export function QueueCard({
  queue,
  onLeave,
  busy,
}: {
  queue: QueuePosition;
  onLeave: () => void;
  busy: boolean;
}) {
  if (queue.state === "none") return null;

  if (queue.state === "atendimento")
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 border-b border-border bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        <MessageCircle size={14} aria-hidden="true" /> Você está sendo atendido agora.
      </div>
    );

  const people = queue.ahead;
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <span className="flex items-center gap-2 font-semibold">
        <Loader2 size={14} aria-hidden="true" className="motion-safe:animate-spin" />
        Você está na posição {queue.position}.
      </span>
      <span>
        {people === 0
          ? "Você é a próxima pessoa."
          : `Há ${people} ${people === 1 ? "pessoa" : "pessoas"} à sua frente.`}{" "}
        Avisaremos quando chegar sua vez.
      </span>
      <button
        type="button"
        onClick={onLeave}
        disabled={busy}
        className="ml-auto inline-flex items-center gap-1 rounded-md border border-amber-900/30 px-2 py-1 font-semibold hover:bg-amber-100 disabled:opacity-60 dark:hover:bg-amber-900/40"
      >
        <LogOut size={12} aria-hidden="true" /> Sair da fila
      </button>
    </div>
  );
}
