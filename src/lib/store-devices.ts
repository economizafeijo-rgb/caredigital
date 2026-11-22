import { supabase } from "@/integrations/supabase/client";

/** Dispositivos ao mesmo tempo em uma conta de loja. */
export const STORE_DEVICE_LIMIT = 3;
export const STORE_DEVICE_KEY = "nv-device-id";

export type StoreDeviceState = "ok" | "limit" | "expediente" | "not_store" | "error";

/** Mensagem exibida quando a conta de loja não pode ficar conectada neste momento. */
export function storeBlockMessage(state: StoreDeviceState): string | null {
  if (state === "limit") {
    return `Esta conta de loja já está conectada em ${STORE_DEVICE_LIMIT} dispositivos. Para entrar aqui, saia da conta em um dos aparelhos conectados e tente novamente. Dispositivos sem uso por 24 horas são liberados automaticamente.`;
  }
  if (state === "expediente") {
    return "O painel da loja está indisponível neste momento. Por segurança, a sessão foi encerrada. Entre novamente em instantes.";
  }
  return null;
}

/** Identificador deste navegador, guardado no armazenamento local. */
export function getDeviceId(): string {
  try {
    const saved = window.localStorage.getItem(STORE_DEVICE_KEY);
    if (saved) return saved;
    const id = crypto.randomUUID();
    window.localStorage.setItem(STORE_DEVICE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Confere se esta sessão pode continuar. Conta sem loja devolve 'not_store' e nada é registrado. */
export async function checkStoreDevice(): Promise<StoreDeviceState> {
  try {
    const { data, error } = await (supabase as any).rpc("care_store_device_check", {
      p_device: getDeviceId(),
    });
    if (error) return "error";
    return (data as StoreDeviceState) ?? "error";
  } catch {
    return "error";
  }
}

/** Libera a vaga deste dispositivo. Falhas são ignoradas: a saída continua. */
export async function releaseStoreDevice(): Promise<void> {
  try {
    await (supabase as any).rpc("care_store_device_release", { p_device: getDeviceId() });
  } catch {
    /* saída segue mesmo sem a liberação */
  }
}
