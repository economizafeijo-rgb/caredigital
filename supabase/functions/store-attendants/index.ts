import { createClient } from "jsr:@supabase/supabase-js@2";

// Contas de atendente da loja: o dono cria (até 2), define o nome e a senha, e pode trocar a senha.
// Usa a chave de serviço só aqui no servidor; o navegador nunca a recebe.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_ATTENDANTS = 2;

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond({ error: "Configuração segura do servidor ausente." }, 500);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond({ error: "Sessão necessária." }, 401);
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return respond({ error: "Sessão inválida ou expirada." }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return respond({ error: "Dados inválidos." }, 400);
  }
  const action = String(body.action ?? "");
  const vendorId = String(body.vendorId ?? "");

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: vendor } = await admin
    .from("care_store_vendors")
    .select("id, owner_id, name")
    .eq("id", vendorId)
    .maybeSingle();
  if (!vendor || vendor.owner_id !== user.id) {
    return respond({ error: "Somente o dono da loja gerencia as atendentes." }, 403);
  }

  if (action === "create") {
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (name.length < 2 || name.length > 40) {
      return respond({ error: "O nome da atendente deve ter de 2 a 40 letras." }, 400);
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) return respond({ error: "Informe um e-mail válido." }, 400);
    if (password.length < 8) return respond({ error: "A senha precisa de pelo menos 8 caracteres." }, 400);

    const { count } = await admin
      .from("care_store_staff")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .eq("role", "atendente");
    if ((count ?? 0) >= MAX_ATTENDANTS) {
      return respond({ error: `Cada loja pode ter até ${MAX_ATTENDANTS} atendentes. Remova uma para criar outra.` }, 409);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name, store_attendant: true, store_vendor: vendorId },
    });
    if (createError || !created.user) {
      const exists = /already|registered|exists/i.test(createError?.message ?? "");
      return respond({
        error: exists
          ? "Esse e-mail já tem conta na NextVita. Use outro e-mail para a atendente."
          : "Não foi possível criar a conta da atendente.",
      }, 400);
    }

    const { error: staffError } = await admin.from("care_store_staff").insert({
      vendor_id: vendorId,
      user_id: created.user.id,
      email,
      name,
      role: "atendente",
      active: true,
    });
    if (staffError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return respond({ error: "Não foi possível vincular a atendente à loja." }, 500);
    }
    return respond({ created: true });
  }

  if (action === "password") {
    const staffId = String(body.staffId ?? "");
    const password = String(body.password ?? "");
    if (password.length < 8) return respond({ error: "A senha precisa de pelo menos 8 caracteres." }, 400);
    const { data: staff } = await admin
      .from("care_store_staff")
      .select("user_id, role")
      .eq("id", staffId)
      .eq("vendor_id", vendorId)
      .maybeSingle();
    if (!staff || staff.role !== "atendente") return respond({ error: "Atendente não encontrada." }, 404);
    const { error } = await admin.auth.admin.updateUserById(staff.user_id, { password });
    if (error) return respond({ error: "Não foi possível trocar a senha." }, 400);
    // Senha nova: a atendente precisa entrar de novo em qualquer aparelho.
    await admin
      .from("care_active_sessions")
      .upsert({ user_id: staff.user_id, session_id: "revogada", updated_at: new Date().toISOString() });
    return respond({ updated: true });
  }

  return respond({ error: "Ação desconhecida." }, 400);
});

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
