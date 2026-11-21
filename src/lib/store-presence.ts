import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Se este atendente está marcado como online (lido do servidor ao abrir o painel). */
export async function fetchMyPresence(vendorId: string): Promise<boolean> {
  const { data, error } = await rpc("care_store_my_presence", { p_vendor: vendorId });
  if (error) throw new Error(error.message);
  return Boolean((data as { online?: boolean } | null)?.online);
}

/** Estado da loja vindo do servidor (care_store_store_status). Contagens, sem dados internos. */
export type StoreStatus = {
  open: boolean;
  agents_online: number;
  capacity_per_agent: number;
  active: number;
  waiting: number;
  free_slots: number;
  now: string;
};

/** Estado do atendimento de um atendente (derivado do status da loja). */
export type AgentAvailability = "offline" | "livre" | "ocupado";

export function availabilityOf(s: StoreStatus | null | undefined): AgentAvailability {
  if (!s || !s.open) return "offline";
  return s.free_slots > 0 ? "livre" : "ocupado";
}

type RpcResult = { data: unknown; error: { message: string } | null };
const client = supabase as unknown as {
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
};
const rpc = (name: string, args: Record<string, unknown>) => client.rpc(name, args);

/** Atendente marca-se online ou offline. Offline para de receber novos clientes na hora. */
export async function setAgentOnline(vendorId: string, online: boolean): Promise<StoreStatus> {
  const { data, error } = await rpc("care_store_set_online", {
    p_vendor: vendorId,
    p_online: online,
  });
  if (error) throw new Error(error.message);
  return data as StoreStatus;
}

/** Sinal periódico do atendente. Sem ele, o atendente deixa de contar como presente após 60 s. */
export async function sendHeartbeat(vendorId: string): Promise<StoreStatus> {
  const { data, error } = await rpc("care_store_heartbeat", { p_vendor: vendorId });
  if (error) throw new Error(error.message);
  return data as StoreStatus;
}

/** Posição do próprio cliente na fila (care_store_queue_position). */
export type QueuePosition =
  | { state: "none" }
  | { state: "espera"; position: number; ahead: number; since: string; now: string }
  | { state: "atendimento"; since: string | null };

/** Entra na fila (idempotente: não duplica, não perde a posição). Falha se a loja estiver offline. */
export async function joinStoreQueue(vendorId: string): Promise<QueuePosition> {
  const { data, error } = await rpc("care_store_queue_join", { p_vendor: vendorId });
  if (error)
    throw new Error(
      error.message.includes("Store offline") ? "A loja está offline agora." : error.message,
    );
  return data as QueuePosition;
}

/** Posição atual do cliente. Usada ao abrir o chat e a cada atualização. */
export async function fetchQueuePosition(vendorId: string): Promise<QueuePosition> {
  const { data, error } = await rpc("care_store_queue_position", { p_vendor: vendorId });
  if (error) throw new Error(error.message);
  return data as QueuePosition;
}

/** Sai voluntariamente da fila de espera. */
export async function leaveStoreQueue(vendorId: string): Promise<void> {
  const { error } = await rpc("care_store_queue_leave", { p_vendor: vendorId });
  if (error) throw new Error(error.message);
}

/** Status atual da loja, para qualquer usuário autenticado (só contagens). */
export async function fetchStoreStatus(vendorId: string): Promise<StoreStatus> {
  const { data, error } = await rpc("care_store_store_status", { p_vendor: vendorId });
  if (error) throw new Error(error.message);
  return data as StoreStatus;
}

/**
 * Acompanha o status da loja em tempo quase real: consulta ao servidor a cada `intervalMs`
 * e na volta do foco da aba. Não considera o navegador como presença do atendente.
 */
export function useStoreStatus(vendorId: string | null | undefined, intervalMs = 15000) {
  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    if (!vendorId) return;
    try {
      const s = await fetchStoreStatus(vendorId);
      if (!alive.current) return;
      setStatus(s);
      setError(null);
    } catch (e) {
      if (!alive.current) return;
      setError(e instanceof Error ? e.message : "Não foi possível carregar o status da loja.");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    const t = window.setInterval(() => void refresh(), intervalMs);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      alive.current = false;
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh, intervalMs]);

  return { status, error, loading, refresh };
}

/** Cliente toca "Continuar atendimento": renova o prazo de inatividade (não é sinal de conexão). */
export async function continueChat(vendorId: string): Promise<void> {
  const { error } = await rpc("care_store_customer_ping", { p_vendor: vendorId });
  if (error) throw new Error(error.message);
}
