/** Resultado da verificação no servidor antes de salvar uma mensagem. */
export type ModerationVerdict =
  { ok: true } | { ok: false; reason: "content" | "rate" | "blocked"; message: string };

import { supabase } from "@/integrations/supabase/client";

type RpcResult = { data: unknown; error: { message: string } | null };
const client = supabase as unknown as {
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
};

/**
 * Verifica a mensagem no servidor. A validação no navegador complementa, mas não substitui esta.
 * O texto não é guardado; o servidor registra só a categoria e um hash.
 */
export async function precheckMessage(vendorId: string, body: string): Promise<ModerationVerdict> {
  const { data, error } = await client.rpc("care_store_moderation_precheck", {
    p_vendor: vendorId,
    p_body: body,
  });
  if (error) throw new Error(error.message);
  const v = data as { ok?: boolean; reason?: "content" | "rate" | "blocked"; message?: string };
  if (v.ok) return { ok: true };
  return {
    ok: false,
    reason: v.reason ?? "content",
    message: v.message ?? "Sua mensagem contém conteúdo inadequado. Revise o texto para continuar.",
  };
}
