import { supabase } from "@/integrations/supabase/client";

/** Histórico de conversas da loja (30 dias) e backup do administrador (6 meses). */
export type ArchivedChat = {
  id: string;
  vendor_id?: string;
  vendor_name?: string;
  customer_id: string;
  customer_name: string | null;
  started_at: string;
  closed_at: string;
  close_reason: string | null;
  message_count: number;
  vendor_deleted_at?: string | null;
  preview: string;
};

export type ArchivedMessage = {
  id: string;
  from_vendor: boolean;
  is_system: boolean;
  body: string;
  created_at: string;
  deleted: boolean;
};

export type ArchivedChatDetail = {
  id: string;
  vendor_name?: string;
  customer_name: string | null;
  started_at: string;
  closed_at: string;
  close_reason: string | null;
  vendor_deleted_at?: string | null;
  messages: ArchivedMessage[];
};

export type OwnerPassStatus = {
  is_owner: boolean;
  can_change?: boolean;
  is_default?: boolean;
  changed_at?: string | null;
};

type Rpc = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message?: string } | null }>;
const rpc: Rpc = (name, args) => (supabase as unknown as { rpc: Rpc }).rpc(name, args);

export const CLOSE_REASONS: Record<string, string> = {
  atendido: "Atendimento concluído",
  encerrado_atendente: "Encerrado pelo atendente",
  inatividade: "Encerrado por inatividade",
  sem_atendente: "Sem atendente",
  desconectado: "Cliente desconectou",
  saiu_fila: "Cliente saiu da fila",
  apagada_pela_loja: "Apagada pela loja",
  limpeza_automatica: "Guardada na limpeza de 30 dias",
  encerrado: "Encerrado",
};

/** Traduz os erros do servidor para mensagens claras. */
export function historyError(message?: string): string {
  const m = message ?? "";
  if (m.includes("Wrong password")) return "Senha incorreta.";
  if (m.includes("Password locked"))
    return "Muitas tentativas erradas. Aguarde 15 minutos e tente de novo.";
  if (m.includes("Already changed"))
    return "A senha já foi trocada uma vez. Para trocar de novo, peça ao administrador da plataforma.";
  if (m.includes("Invalid new password"))
    return "A nova senha precisa ter 6 números e ser diferente de 000000.";
  if (m.includes("Only the owner")) return "Só o dono da loja pode fazer isso.";
  if (m.includes("Admin only")) return "Só o administrador da plataforma pode fazer isso.";
  return "Não foi possível concluir agora. Tente de novo.";
}

async function call<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(name, args);
  if (error) throw new Error(historyError(error.message));
  return data as T;
}

export const listVendorHistory = (vendorId: string, search: string) =>
  call<ArchivedChat[]>("care_store_chat_history_list", {
    p_vendor: vendorId,
    p_search: search.trim() || null,
    p_limit: 200,
  });

export const getVendorHistory = (id: string) =>
  call<ArchivedChatDetail>("care_store_chat_history_get", { p_id: id });

export const deleteVendorHistory = (vendorId: string, ids: string[], password: string) =>
  call<number>("care_store_chat_history_delete", {
    p_vendor: vendorId,
    p_ids: ids,
    p_password: password,
  });

export const listAdminBackup = (vendorId: string | null, search: string) =>
  call<ArchivedChat[]>("care_store_admin_chat_backup_list", {
    p_vendor: vendorId,
    p_search: search.trim() || null,
    p_limit: 300,
  });

export const getAdminBackup = (id: string) =>
  call<ArchivedChatDetail>("care_store_admin_chat_backup_get", { p_id: id });

export const ownerPassStatus = (vendorId: string) =>
  call<OwnerPassStatus>("care_store_owner_pass_status", { p_vendor: vendorId });

export const changeOwnerPass = (vendorId: string, current: string, next: string) =>
  call<void>("care_store_owner_pass_change", {
    p_vendor: vendorId,
    p_current: current,
    p_new: next,
  });

export const adminResetOwnerPass = (vendorId: string) =>
  call<void>("care_store_admin_reset_owner_pass", { p_vendor: vendorId });

export const deleteThreadsWithPass = (vendorId: string, customers: string[], password: string) =>
  call<number>("care_store_delete_threads", {
    p_vendor: vendorId,
    p_customers: customers,
    p_password: password,
  });

export const deleteVendorMessage = (id: string, password: string) =>
  call<void>("care_store_delete_message", { p_message: id, p_password: password });
