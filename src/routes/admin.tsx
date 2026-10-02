import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Droplets, Dumbbell, HeartPulse, UserPlus, Users } from "lucide-react";
import { Btn, Field, IconBox, PageHeader, Panel, SelectField, Tag } from "@/components/vigia/ui";
import { supabase } from "@/integrations/supabase/client";
import { getProfessionalSession, isSupabaseConfigured, type ProfessionalProfile } from "@/lib/supabase-session";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração — DigitalCare" },
      { name: "description", content: "Painel da plataforma para equipe, especialistas e clientes." },
    ],
  }),
  component: Admin,
});

const roleOptions = [
  { value: "professional", label: "Profissional de saúde" },
  { value: "physician", label: "Médico(a)" },
  { value: "dietitian", label: "Nutricionista" },
  { value: "fitness_trainer", label: "Instrutor(a) de academia" },
  { value: "nurse", label: "Enfermeiro(a)" },
  { value: "caregiver", label: "Cuidador(a)" },
];

const roleLabel = (role: string) => roleOptions.find((item) => item.value === role)?.label ?? (role === "platform_admin" ? "Administrador da plataforma" : role);

function Admin() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [members, setMembers] = useState<ProfessionalProfile[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ displayName: "", email: "", role: "professional", specialty: "" });

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured()) { setLoading(false); return; }
      try {
        const session = await getProfessionalSession();
        if (!active) return;
        setProfile(session.profile);
        if (session.profile?.role === "platform_admin" && session.profile.is_active) {
          const [teamResult, clientResult] = await Promise.all([
            supabase.from("professional_profiles").select("*").order("created_at", { ascending: false }),
            supabase.from("care_clients").select("id", { count: "exact", head: true }),
          ]);
          if (teamResult.error) throw teamResult.error;
          if (clientResult.error) throw clientResult.error;
          if (active) { setMembers(teamResult.data ?? []); setClientCount(clientResult.count ?? 0); }
        } else if (!session.user && active) {
          setMessage("Entre com sua conta para abrir seu espaço de trabalho.");
        }
      } catch {
        if (active) setMessage("Não foi possível carregar o perfil. Confirme se as migrações e as variáveis do Supabase foram aplicadas.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  const invite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setMessage("");
    const { data, error } = await supabase.functions.invoke("invite-professional", { body: form });
    setBusy(false);
    if (error || data?.error) { setMessage(data?.error ?? "Não foi possível enviar o convite. Verifique se a função de convite está publicada."); return; }
    setMessage(`Convite enviado para ${form.email}. A pessoa receberá o link de acesso por e-mail.`);
    setForm({ displayName: "", email: "", role: "professional", specialty: "" });
    const { data: refreshed, error: refreshError } = await supabase.from("professional_profiles").select("*").order("created_at", { ascending: false });
    if (!refreshError) setMembers(refreshed ?? []);
  };

  const setActive = async (member: ProfessionalProfile) => {
    const { error } = await supabase.from("professional_profiles").update({ is_active: !member.is_active }).eq("user_id", member.user_id);
    if (error) { setMessage("Não foi possível atualizar o acesso desta conta."); return; }
    setMembers((list) => list.map((item) => item.user_id === member.user_id ? { ...item, is_active: !item.is_active } : item));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null); setMembers([]);
    await navigate({ to: "/entrar" });
  };

  return <>
    <PageHeader eyebrow={profile?.role === "platform_admin" ? "Administração da plataforma" : "Área profissional"} title={profile?.role === "platform_admin" ? "Equipe e clientes" : "Meu espaço de trabalho"}>
      {profile && <Btn variant="ghost" onClick={() => void signOut()}>Sair da conta</Btn>}
    </PageHeader>

    {!isSupabaseConfigured() && <Panel title="Banco de dados não conectado"><p className="text-sm text-muted-foreground">Conecte o projeto Supabase no Lovable e aplique as migrações para habilitar contas, permissões e cadastros sincronizados.</p></Panel>}
    {loading && <Panel><p className="text-sm text-muted-foreground">Carregando perfil e permissões…</p></Panel>}
    {!loading && !profile && isSupabaseConfigured() && <Panel title="Acesso da equipe"><p className="text-sm text-muted-foreground">{message || "Entre ou peça um convite ao administrador da plataforma."}</p><Link to="/entrar"><Btn size="lg" className="mt-4">Entrar na equipe</Btn></Link></Panel>}
    {message && profile && <p role="status" className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">{message}</p>}

    {profile && profile.role !== "platform_admin" && <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: "/pacientes", title: "Clientes", text: "Cadastre e acompanhe seus clientes", icon: Users },
          { to: "/protocolos", title: "Protocolos", text: "Consulte guias de cuidado", icon: HeartPulse },
          { to: "/dietas", title: "Dietas", text: "Veja planos e orientações", icon: Activity },
          { to: "/hidratacao", title: "Hidratação", text: "Organize lembretes individuais", icon: Droplets },
        ].map(({ to, title, text, icon: Icon }) => <Link key={to} to={to} className="panel group transition-colors hover:bg-primary/5"><Icon size={20} className="text-primary" /><h2 className="mt-3 font-display text-xl">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{text}</p></Link>)}
      </div>
      <Panel title="Perfil profissional">
        <div className="flex items-center gap-3"><IconBox round>{profile.display_name.slice(0, 2).toUpperCase()}</IconBox><div><div className="font-semibold">{profile.display_name}</div><div className="text-sm text-muted-foreground">{roleLabel(profile.role)}{profile.specialty ? ` · ${profile.specialty}` : ""}</div></div><Tag tone={profile.is_active ? "success" : "destructive"}>{profile.is_active ? "Ativo" : "Inativo"}</Tag></div>
        {profile.is_active && <Link to="/pacientes"><Btn size="lg" className="mt-5"><Users size={16} /> Cadastrar cliente</Btn></Link>}
      </Panel>
    </>}

    {profile?.role === "platform_admin" && profile.is_active && <>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Profissionais", members.length], ["Clientes", clientCount], ["Ativos", members.filter((item) => item.is_active).length], ["Especialidades", new Set(members.map((item) => item.role)).size]].map(([label, value]) => <Panel key={label}><div className="label-mono text-muted-foreground">{label}</div><div className="mt-1 font-display text-4xl">{value}</div></Panel>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <Panel title="Profissionais e instrutores" action={<Tag tone="primary">{members.length} contas</Tag>}>
          {members.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum profissional cadastrado ainda.</p> : <div className="divide-y divide-border">
            {members.map((member) => <div key={member.user_id} className="flex flex-wrap items-center gap-3 py-3">
              <IconBox round tone={member.role === "platform_admin" ? "primary" : "muted"}>{member.display_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</IconBox>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{member.display_name}</div><div className="truncate text-xs text-muted-foreground">{member.email}{member.specialty ? ` · ${member.specialty}` : ""}</div></div>
              <Tag tone="muted">{roleLabel(member.role)}</Tag>
              {member.role !== "platform_admin" && <button type="button" onClick={() => void setActive(member)} aria-label={`${member.is_active ? "Suspender" : "Ativar"} ${member.display_name}`}><Tag tone={member.is_active ? "success" : "destructive"}>{member.is_active ? "Ativo" : "Suspenso"}</Tag></button>}
            </div>)}
          </div>}
        </Panel>

        <div className="space-y-4">
          <Panel title="Convidar especialista">
            <form className="space-y-3" onSubmit={(event) => void invite(event)}>
              <Field label="Nome completo"><input className="field" required maxLength={120} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></Field>
              <Field label="E-mail profissional"><input type="email" className="field" required maxLength={255} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
              <Field label="Área de atuação"><SelectField value={form.role} onValueChange={(role) => setForm({ ...form, role })} options={roleOptions} /></Field>
              <Field label="Especialidade (opcional)"><input className="field" maxLength={120} placeholder="Ex.: saúde digestiva, musculação" value={form.specialty} onChange={(event) => setForm({ ...form, specialty: event.target.value })} /></Field>
              <Btn size="lg" type="submit" className="w-full" disabled={busy}><UserPlus size={16} />{busy ? "Enviando convite…" : "Enviar convite seguro"}</Btn>
            </form>
          </Panel>
          <Panel title="Acesso dos clientes">
            <p className="text-sm leading-relaxed text-muted-foreground">Cada profissional acompanha somente os clientes atribuídos à própria conta. Administradores podem consultar o painel geral. Convites usam Supabase Auth; senhas nunca ficam armazenadas nesta tela.</p>
            <Link to="/pacientes"><Btn variant="ghost" className="mt-4 w-full"><Dumbbell size={16} /> Abrir gestão de clientes</Btn></Link>
          </Panel>
        </div>
      </div>
    </>}
  </>;
}
