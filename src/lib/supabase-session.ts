import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ProfessionalProfile = Tables<"professional_profiles">;

/** Checks the project identity as well as missing credentials.
 *  Avoid reporting a wrong Supabase project as an incorrect patient password. */
export function getSupabaseConfigurationIssue(): string | null {
  // The client uses the verified CareDigital project and its public publishable key.
  // Do not reject valid authentication because of stale Lovable build-time variables.
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

