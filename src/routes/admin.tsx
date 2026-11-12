import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardList, HeartPulse } from "lucide-react";
import { Btn, PageHeader, Panel } from "@/components/vigia/ui";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase-session";
import { AdminClientManager } from "@/components/vigia/AdminClientManager";
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
      <section className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-card sm:p-8">
        <img src="/images/painel-visao.webp" alt="" aria-hidden="true" className="absolute inset-y-0 right-0 -z-20 h-full w-full object-cover sm:w-3/5"/>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-950 from-40% via-indigo-900/85 to-blue-700/10"/>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-white/70">Administração</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Gestão de clientes</h1>
        <p className="mt-1 max-w-xl text-sm text-slate-200">Cadastre, edite, acompanhe relatórios e gerencie licenças. Conta: {email}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/prontuario" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-900 hover:bg-white/90"><HeartPulse size={17}/> Prontuários e agenda</Link>
          <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold backdrop-blur"><ClipboardList size={17}/> {checklistCount ?? "—"} atividades · {clientCount ?? "—"} clientes</span>
        </div>
      </section>
      <AdminClientManager ownerId={ownerId}/>
      <ProtocolAdminManager ownerId={ownerId} />
      <p className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs">Esta é uma visão dos seus registros, não uma autorização de administrador global. Gestão de profissionais, convites e acesso compartilhado exigem permissões específicas no backend.</p>
    </>}
  </>;
}
