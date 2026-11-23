import { supabase } from "@/integrations/supabase/client";

/** Ações do administrador sobre as lojas e as solicitações de novos lojistas. */
type Rpc = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message?: string } | null }>;
const rpc: Rpc = (name, args) => (supabase as unknown as { rpc: Rpc }).rpc(name, args);

export type SellerRequest = {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  segment: string;
  city: string;
  address: string | null;
  message: string | null;
  status: "nova" | "em_analise" | "aprovada" | "recusada";
  admin_notes: string | null;
  vendor_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  archived_at: string | null;
};

export type RequestLogEntry = {
  id: string;
  created_at: string;
  action: string;
  actor_email: string;
  details: {
    request_id?: string;
    business_name?: string;
    status_anterior?: string;
    status_novo?: string;
    nota?: string | null;
  } | null;
};

export type TimelineItem = {
  at: string;
  kind: "admin" | "pedido" | "estoque" | "caixa" | "conversa";
  title: string;
  detail: string | null;
  actor: string | null;
};

export const STATUS_LABEL = { pendente: "Pendente", ativo: "Ativa", suspenso: "Suspensa" } as const;

export const REQUEST_STATUS: Record<SellerRequest["status"], { label: string; tone: string }> = {
  nova: { label: "Nova", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  em_analise: { label: "Em análise", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  aprovada: { label: "Aprovada", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  recusada: { label: "Recusada", tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
};

export function adminError(message?: string): string {
  const m = message ?? "";
  if (m.includes("Admin only")) return "Só o administrador da plataforma pode fazer isso.";
  if (m.includes("Slug taken") || m.includes("care_store_vendors_slug"))
    return "Esse endereço de loja já está em uso. Escolha outro.";
  if (m.includes("Name mismatch")) return "O nome digitado não confere com o nome da loja.";
  if (m.includes("Email invalid")) return "E-mail de acesso inválido.";
  if (m.includes("Password length")) return "A senha de acesso precisa ter de 6 a 72 caracteres.";
  if (m.includes("phone")) return "Telefone inválido: use DDD e número (10 a 13 dígitos).";
  if (m.includes("slug")) return "Endereço inválido: use letras minúsculas, números e hífen.";
  if (m.includes("city")) return "Informe a cidade.";
  if (m.includes("name")) return "O nome da loja precisa ter de 2 a 80 caracteres.";
  if (m.includes("Too many requests"))
    return "Você já enviou solicitações hoje. Aguarde o contato da nossa equipe.";
  if (m.includes("email")) return "E-mail inválido.";
  return "Não foi possível concluir agora. Tente de novo.";
}

async function call<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(name, args);
  if (error) throw new Error(adminError(error.message));
  return data as T;
}

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export type NewVendorInput = {
  name: string;
  slug: string;
  segment: string;
  city: string;
  address: string;
  phone: string;
  plan: string;
  status: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerName: string;
  requestId?: string | null;
};

export const createVendor = (i: NewVendorInput) =>
  call<{ id: string; linked_existing: boolean }>("care_store_admin_create_vendor", {
    p_name: i.name,
    p_slug: i.slug,
    p_segment: i.segment,
    p_city: i.city,
    p_address: i.address,
    p_phone: i.phone,
    p_plan: i.plan,
    p_status: i.status,
    p_owner_email: i.ownerEmail || null,
    p_owner_password: i.ownerPassword || null,
    p_owner_name: i.ownerName || null,
    p_request: i.requestId ?? null,
  });

export const setVendorStatus = (vendorId: string, status: string) =>
  call<void>("care_store_admin_set_status", { p_vendor: vendorId, p_status: status });

export const deleteVendor = (vendorId: string, confirmName: string) =>
  call<void>("care_store_admin_delete_vendor", { p_vendor: vendorId, p_confirm_name: confirmName });

export const adminLog = (vendorId: string, action: string, details: Record<string, unknown> = {}) =>
  rpc("care_store_admin_log", { p_vendor: vendorId, p_action: action, p_details: details }).then(
    () => undefined,
    () => undefined,
  );

export const vendorTimeline = (vendorId: string) =>
  call<TimelineItem[]>("care_store_admin_timeline", { p_vendor: vendorId, p_limit: 300 });

export const listSellerRequests = () =>
  call<SellerRequest[]>("care_store_admin_seller_requests", { p_status: null });

export const updateSellerRequest = (id: string, status: string, notes: string) =>
  call<void>("care_store_admin_update_request", { p_id: id, p_status: status, p_notes: notes });

export const archiveSellerRequest = (id: string, archive: boolean) =>
  call<void>("care_store_admin_archive_request", { p_id: id, p_archive: archive });

export const deleteSellerRequest = (id: string, confirmName: string) =>
  call<void>("care_store_admin_delete_request", { p_id: id, p_confirm: confirmName });

/** Histórico das solicitações (de um pedido, ou de todos). */
export const listSellerRequestLog = (requestId: string | null = null) =>
  call<RequestLogEntry[]>("care_store_admin_request_log", { p_request: requestId, p_limit: 500 });

export const REQUEST_ACTION_LABEL: Record<string, string> = {
  solicitacao_atualizada: "Situação ou resposta",
  solicitacao_arquivada: "Arquivada",
  solicitacao_desarquivada: "Desarquivada",
  solicitacao_excluida: "Excluída definitivamente",
};

export const submitSellerRequest = (r: {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  segment: string;
  city: string;
  address: string;
  message: string;
}) =>
  call<string>("care_store_submit_seller_request", {
    p_business_name: r.businessName,
    p_owner_name: r.ownerName,
    p_email: r.email,
    p_phone: r.phone,
    p_segment: r.segment,
    p_city: r.city,
    p_address: r.address,
    p_message: r.message,
  });
