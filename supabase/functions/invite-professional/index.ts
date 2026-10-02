import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedRoles = new Set(["professional", "physician", "dietitian", "fitness_trainer", "nurse", "caregiver"]);

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return respond({ error: "Configuração segura do servidor ausente." }, 500);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond({ error: "Sessão necessária." }, 401);

  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return respond({ error: "Sessão inválida ou expirada." }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin.from("professional_profiles")
    .select("role,is_active").eq("user_id", user.id).maybeSingle();
  if (profileError) return respond({ error: "Não foi possível validar o perfil." }, 500);
  if (profile?.role !== "platform_admin" || !profile.is_active) return respond({ error: "Somente um administrador ativo pode enviar convites." }, 403);

  let body: { email?: unknown; displayName?: unknown; role?: unknown; specialty?: unknown };
  try { body = await request.json(); } catch { return respond({ error: "Dados do convite inválidos." }, 400); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const role = typeof body.role === "string" ? body.role : "";
  const specialty = typeof body.specialty === "string" ? body.specialty.trim().slice(0, 120) : null;
  if (!/^\S+@\S+\.\S+$/.test(email) || displayName.length < 2 || displayName.length > 120 || !allowedRoles.has(role)) {
    return respond({ error: "Informe nome, e-mail válido e uma função profissional permitida." }, 400);
  }

  const { data: invitation, error: invitationError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { display_name: displayName },
  });
  if (invitationError || !invitation.user) {
    return respond({ error: invitationError?.message ?? "Não foi possível criar o convite." }, 400);
  }

  const { error: upsertError } = await admin.from("professional_profiles").upsert({
    user_id: invitation.user.id,
    display_name: displayName,
    email,
    role,
    specialty,
    is_active: true,
    invited_by: user.id,
  });
  if (upsertError) return respond({ error: "Convite criado; falhou ao salvar o perfil profissional." }, 500);

  return respond({ invited: true, profileId: invitation.user.id });
});

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
