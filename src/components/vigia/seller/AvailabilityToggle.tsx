import { useEffect, useState } from "react";
import { CircleOff, CircleDot, Loader2, MessagesSquare, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { availabilityOf, sendHeartbeat, setAgentOnline, useStoreStatus } from "@/lib/store-presence";

const HEARTBEAT_MS = 20000;

/**
 * Controle de disponibilidade do atendente. "Estamos online" mantém o sinal periódico;
 * se o painel fechar ou a conexão cair, o servidor tira o atendente da contagem após 60 s.
 * O estado é sempre texto + ícone (não depende só de cor).
 */
export function AvailabilityToggle({ vendorId }: { vendorId: string }) {
  const { status, error, loading, refresh } = useStoreStatus(vendorId);
  const [mine, setMine] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Ao abrir (ou recarregar) o painel, lê o estado real deste atendente no servidor.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const { data } = await (supabase as any)
        .from("care_store_presence")
        .select("online, last_seen")
        .eq("vendor_id", vendorId)
        .eq("user_id", uid)
        .maybeSingle();
      if (alive) setMine(Boolean(data?.online));
    })();
    return () => {
      alive = false;
    };
  }, [vendorId]);

  // Enquanto estiver online, envia o sinal periódico. Sem ele o servidor tira este atendente da contagem.
  useEffect(() => {
    if (mine !== true) return;
    const t = window.setInterval(() => {
      sendHeartbeat(vendorId).catch(() =>
        setActionError("Conexão instável. Tentando manter você online."),
      );
    }, HEARTBEAT_MS);
    return () => window.clearInterval(t);
  }, [mine, vendorId]);

  async function change(online: boolean) {
    setBusy(true);
    setActionError(null);
    try {
      await setAgentOnline(vendorId, online);
      setMine(online);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Não foi possível alterar a disponibilidade.");
    } finally {
      setBusy(false);
    }
  }

  const state = availabilityOf(status);
  const view =
    state === "offline"
      ? { label: "Offline", hint: "Você não recebe novos clientes.", icon: CircleOff, tone: "text-muted-foreground" }
      : state === "ocupado"
        ? { label: "Online, em atendimento", hint: "Conectado, mas com todas as vagas ocupadas. Novos clientes entram na fila.", icon: MessagesSquare, tone: "text-amber-700 dark:text-amber-300" }
        : { label: "Online e disponível", hint: "Pode receber um novo atendimento.", icon: CircleDot, tone: "text-emerald-700 dark:text-emerald-300" };
  const Icon = view.icon;

  return (
    <section aria-labelledby="availability-title" className="border-b border-border px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="availability-title" className="text-sm font-bold">
          Atendimento
        </h2>
        {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" aria-label="Carregando" />}
      </div>

      <p className={`mt-1 flex items-center gap-2 text-sm font-semibold ${view.tone}`} role="status">
        <Icon size={16} aria-hidden="true" />
        {view.label}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{view.hint}</p>

      <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Alterar disponibilidade">
        <button
          type="button"
          onClick={() => void change(true)}
          disabled={busy || mine === true}
          aria-pressed={mine === true}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-600/40 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        >
          <CircleDot size={14} aria-hidden="true" /> Estamos online
        </button>
        <button
          type="button"
          onClick={() => void change(false)}
          disabled={busy || mine === false}
          aria-pressed={mine === false}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted disabled:opacity-60"
        >
          <CircleOff size={14} aria-hidden="true" /> Estamos offline
        </button>
      </div>

      {(error || actionError) && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          {actionError ?? error}
        </p>
      )}
      {status && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Na fila: {status.waiting} · em atendimento: {status.active} · atendentes online: {status.agents_online}
        </p>
      )}
    </section>
  );
}
