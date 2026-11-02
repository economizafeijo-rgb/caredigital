import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardList, HeartPulse, ShieldCheck, Users } from "lucide-react";
import { Btn, PageHeader, Panel } from "@/components/vigia/ui";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase-session";
import { ProtocolAdminManager } from "@/components/vigia/ProtocolAdminManager";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel de gestão — CareDigital" }] }),
  component: Admin,
});

function Admin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [ownerId,setOwnerId] = useState("");
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [checklistCount, setChecklistCount] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured()) {
        setMessage("Configure o Supabase deste ambiente para acessar o painel.");
        setLoading(false);
        return;
      }
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) { setMessage("É necessário entrar com sua conta administrativa para acessar o painel."); return; }
        if ((user.email ?? "").trim().toLowerCase() !== "francdenisbr@gmail.com") { setMessage("Acesso reservado ao administrador da plataforma."); return; }
        if (!active) return;
        setEmail(user.email ?? "");
        setOwnerId(user.id);
        // These tables are protected by RLS: a user sees only records owned by them.
        const db = supabase as unknown as { from: (table: string) => any };
        const [clients, tasks] = await Promise.all([
          db.from("care_patients").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
          db.from("care_daily_checklist").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        ]);
        if (clients.error) throw clients.error;
        if (tasks.error) throw tasks.error;
        if (active) { setClientCount(clients.count ?? 0); setChecklistCount(tasks.count ?? 0); }
      } catch {
        if (active) setMessage("Falha ao carregar os dados. Verifique as permissões e a conexão do Supabase.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/entrar" });
  }

  return <>
    <PageHeader eyebrow="CareDigital · Espaço protegido" title="Painel de gestão">
      {email && <Btn variant="ghost" onClick={() => void signOut()}>Sair</Btn>}
    </PageHeader>
    {message && <Panel><p role="status" className="text-sm">{message} <Link to="/entrar" className="text-primary underline">Entrar</Link></p></Panel>}
    {loading ? <Panel>Carregando dados da conta…</Panel> : email && <>
      <p className="mb-5 text-sm text-muted-foreground">Conta autenticada: {email}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Panel><Users className="text-primary" /><p className="mt-3 text-sm text-muted-foreground">Clientes sob seus cuidados</p><p className="mt-1 text-4xl font-semibold">{clientCount ?? "—"}</p></Panel>
        <Panel><ClipboardList className="text-primary" /><p className="mt-3 text-sm text-muted-foreground">Atividades registradas</p><p className="mt-1 text-4xl font-semibold">{checklistCount ?? "—"}</p></Panel>
        <Panel><ShieldCheck className="text-primary" /><p className="mt-3 text-sm text-muted-foreground">Proteção dos dados</p><p className="mt-1 text-lg font-semibold">RLS por proprietário</p></Panel>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Link to="/prontuario" className="panel block transition-colors hover:bg-primary/5"><HeartPulse className="text-primary" /><h2 className="mt-3 text-xl font-semibold">Prontuários</h2><p className="mt-1 text-sm text-muted-foreground">Cadastre clientes, consulte a agenda e registre cuidados.</p></Link>
        <Link to="/medicamentos" className="panel block transition-colors hover:bg-primary/5"><ClipboardList className="text-primary" /><h2 className="mt-3 text-xl font-semibold">Medicamentos</h2><p className="mt-1 text-sm text-muted-foreground">Conheça a apresentação pública; os medicamentos e registros reais permanecem nos prontuários protegidos.</p></Link>
      </div>
      <ProtocolAdminManager ownerId={ownerId} />
      <p className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs">Esta é uma visão dos seus registros, não uma autorização de administrador global. Gestão de profissionais, convites e acesso compartilhado exigem permissões específicas no backend.</p>
    </>}
  </>;
}
