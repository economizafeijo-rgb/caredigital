import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const rpc = (name: string, args: Record<string, unknown>) =>
  (supabase as any).rpc(name, args) as Promise<{ data: any; error: { message: string } | null }>;

/** Atendente marca-se online ou offline. Offline para de receber novos clientes na hora. */
export async function setAgentOnline(vendorId: string, online: boolean): Promise<StoreStatus> {
  const { data, error } = await rpc("care_store_set_online", { p_vendor: vendorId, p_online: online });
  if (error) throw new Error(error.message);
  return data as StoreStatus;
}

/** Sinal periódico do atendente. Sem ele, o atendente deixa de contar como presente após 60 s. */
export async function sendHeartbeat(vendorId: string): Promise<StoreStatus> {
  const { data, error } = await rpc("care_store_heartbeat", { p_vendor: vendorId });
  if (error) throw new Error(error.message);
  return data as StoreStatus;
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
