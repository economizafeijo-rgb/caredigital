import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ProfessionalProfile = Tables<"professional_profiles">;

export function isSupabaseConfigured() {
  return Boolean(
    import.meta.env["VITE_SUPABASE_URL"] && import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
  );
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

