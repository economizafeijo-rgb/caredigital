import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardList, HeartPulse } from "lucide-react";
import { Btn, PageHeader, Panel } from "@/components/vigia/ui";
import { supabase } from "@/integrations/supabase/client";
import { StoreAdminDashboard } from "@/components/vigia/StoreAdminDashboard";
import { isSupabaseConfigured } from "@/lib/supabase-session";
import { AdminClientManager } from "@/components/vigia/AdminClientManager";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel de gestão — NextVita" }] }),
  component: Admin,
});

function Admin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [checklistCount, setChecklistCount] = useState<number | null>(null);
  const [pendingSignups, setPendingSignups] = useState<{ email: string; created_at: string }[]>([]);
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
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) {
          setMessage("É necessário entrar com sua conta administrativa para acessar o painel.");
          return;
        }
        if ((user.email ?? "").trim().toLowerCase() !== "francdenisbr@gmail.com") {
          setMessage("Acesso reservado ao administrador da plataforma.");
          return;
        }
        if (!active) return;
        setEmail(user.email ?? "");
        setOwnerId(user.id);
        // These tables are protected by RLS: a user sees only records owned by them.
        const db = supabase as unknown as { from: (table: string) => any };
        const [clients, tasks, signups] = await Promise.all([
          db.from("care_patients").select("id", { count: "exact", head: true }),
          db.from("care_daily_checklist").select("id", { count: "exact", head: true }),
          db
            .from("care_registration_signups")
            .select("email,created_at")
            .is("confirmed_at", null)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);
        if (clients.error) throw clients.error;
        if (tasks.error) throw tasks.error;
        if (active) {
          setClientCount(clients.count ?? 0);
          setChecklistCount(tasks.count ?? 0);
        }
      } catch {
        if (active)
          setMessage(
            "Falha ao carregar os dados. Verifique as permissões e a conexão do Supabase.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/entrar" });
  }

  return (
    <>
      <PageHeader eyebrow="NextVita · Espaço protegido" title="Painel de gestão">
        {email && (
          <Btn variant="ghost" onClick={() => void signOut()}>
            Sair
          </Btn>
        )}
      </PageHeader>
      {message && (
        <Panel>
          <p role="status" className="text-sm">
            {message}{" "}
            <Link to="/entrar" className="text-primary underline">
              Entrar
            </Link>
          </p>
        </Panel>
      )}
      {loading ? (
        <Panel>Carregando dados da conta…</Panel>
      ) : (
        email && (
          <>
            <section className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-card sm:p-8">
              <img
                src="/images/painel-visao.webp"
                alt=""
                aria-hidden="true"
                className="absolute inset-y-0 right-0 -z-20 h-full w-full object-cover sm:w-3/5"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-950 from-40% via-indigo-900/85 to-blue-700/10"
              />
              <p className="text-xs font-bold uppercase tracking-[.14em] text-white/70">
                Administração
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Gestão de clientes</h1>
              <p className="mt-1 max-w-xl text-sm text-slate-200">
                Cadastre, edite, acompanhe relatórios e gerencie licenças. Conta: {email}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-900">
                  <HeartPulse size={17} /> Cadastros e usuários
                </span>
                <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold backdrop-blur">
                  <ClipboardList size={17} /> {checklistCount ?? "—"} atividades ·{" "}
                  {clientCount ?? "—"} clientes
                </span>
              </div>
            </section>
            {pendingSignups.length > 0 && (
              <section
                className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-card"
                aria-label="Cadastros aguardando confirmação"
              >
                <p className="text-xs font-bold uppercase tracking-[.14em] text-amber-800 dark:text-amber-200">
                  Confirmação pendente
                </p>
                <h2 className="mt-1 text-lg font-bold">
                  {pendingSignups.length} cadastro(s) aguardando confirmação de e-mail
                </h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {pendingSignups.map((item) => (
                    <div
                      key={item.email}
                      className="rounded-xl border border-amber-500/20 bg-card px-3 py-2 text-sm"
                    >
                      <strong className="block">{item.email}</strong>
                      <span className="text-xs text-muted-foreground">
                        Inscrito em {new Date(item.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <StoreAdminDashboard />
            <AdminClientManager ownerId={ownerId} />
            <p className="mt-5 rounded-xl border border-success/30 bg-success/10 p-3 text-xs">
              Esta área administra os cadastros da plataforma. O acompanhamento pessoal do
              administrador permanece separado.
            </p>
          </>
        )
      )}
    </>
  );
}
