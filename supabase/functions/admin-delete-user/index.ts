import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user || user.email?.toLowerCase() !== "francdenisbr@gmail.com") return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId || userId === user.id) return new Response(JSON.stringify({ error: "Invalid target user" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const result = await admin.auth.admin.deleteUser(userId);
  if (result.error) return new Response(JSON.stringify({ error: result.error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ deleted: true, userId }), { headers: { "Content-Type": "application/json" } });
});
