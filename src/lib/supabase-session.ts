import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ProfessionalProfile = Tables<"professional_profiles">;

/** Checks the project identity as well as missing credentials.
 *  Avoid reporting a wrong Supabase project as an incorrect patient password. */
export function getSupabaseConfigurationIssue(): string | null {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const projectId = import.meta.env["VITE_SUPABASE_PROJECT_ID"] as string | undefined;
  const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !publishableKey) return "A conexão de autenticação não está configurada. Entre em contato com o suporte.";
  if (publishableKey.startsWith("sb_secret_")) return "Configuração de autenticação inválida. Entre em contato com o suporte.";
  if (projectId && (url.endsWith("/") ? url.slice(0, -1) : url) !== `https://${projectId}.supabase.co`) {
    return "A plataforma está conectada ao projeto de autenticação errado. Entre em contato com o suporte.";
  }
  return null;
}

export function isSupabaseConfigured() {
  return getSupabaseConfigurationIssue() === null;
}

export async function getProfessionalSession() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return { user: null, profile: null };

  const { data: profile, error } = await supabase.from("professional_profiles")
    .select("*").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return { user, profile };
}

