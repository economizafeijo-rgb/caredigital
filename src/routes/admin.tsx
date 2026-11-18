import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Btn, PageHeader, Panel } from "@/components/vigia/ui";
import { supabase } from "@/integrations/supabase/client";
import { StoreAdminDashboard } from "@/components/vigia/StoreAdminDashboard";
import { AdminMarketplace } from "@/components/vigia/AdminMarketplace";
import { isSupabaseConfigured } from "@/lib/supabase-session";
import { AdminClientManager } from "@/components/vigia/AdminClientManager";
import { AdminAds } from "@/components/vigia/AdminAds";
import { AdminPayments } from "@/components/vigia/AdminPayments";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel de gestão — NextVita" }] }),
  component: Admin,
});

type AdminTab = "visao" | "clientes" | "lojas" | "vendas" | "propagandas" | "pagamentos";
const ADMIN_TABS: { id: AdminTab; label: string; title: string; hint: string }[] = [
  { id: "visao", label: "Visão geral", title: "Visão geral", hint: "" },
  { id: "clientes", label: "Clientes", title: "Cadastro de clientes", hint: "Cadastrar, editar, licenças e acesso dos clientes." },
  { id: "lojas", label: "Lojas e estabelecimentos", title: "Lojas e estabelecimentos", hint: "Aprovar lojistas, planos, comissão, selo e cobranças." },
  { id: "vendas", label: "Vendas e faturamento", title: "Vendas e faturamento", hint: "Receita, pedidos, ticket médio e produtos mais vendidos." },
  { id: "propagandas", label: "Propagandas", title: "Propagandas", hint: "Banners por local da plataforma, período e prioridade." },
  { id: "pagamentos", label: "Pagamentos", title: "Sistema de pagamento", hint: "PIX, formas aceitas, mensalidades, comissão e vencimento." },
];

function Admin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [checklistCount, setChecklistCount] = useState<number | null>(null);
  const [pendingSignups, setPendingSignups] = useState<{ email: string; created_at: string }[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [vendorCount, setVendorCount] = useState<number | null>(null);
  const [adCount, setAdCount] = useState<number | null>(null);
  const location = useLocation();
  const tab = ((ADMIN_TABS.some((t) => t.id === location.hash) ? location.hash : "visao") as AdminTab);
  const go = (t: AdminTab) => { void navigate({ to: "/admin", hash: t }); };

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
        const [clients, tasks, signups, vendors, ads] = await Promise.all([
          db.from("care_patients").select("id", { count: "exact", head: true }),
          db.from("care_daily_checklist").select("id", { count: "exact", head: true }),
          db
            .from("care_registration_signups")
            .select("email,created_at")
            .is("confirmed_at", null)
            .order("created_at", { ascending: false })
            .limit(20),
          db.from("care_store_vendors").select("id", { count: "exact", head: true }),
          db.from("care_ads").select("id", { count: "exact", head: true }).eq("active", true),
        ]);
        if (clients.error) throw clients.error;
        if (tasks.error) throw tasks.error;
        if (active) {
          setClientCount(clients.count ?? 0);
          setChecklistCount(tasks.count ?? 0);
          setVendorCount(vendors?.count ?? 0);
          setAdCount(ads?.count ?? 0);
          setPendingSignups(signups?.data ?? []);
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
            <section className="nv-dark relative isolate overflow-hidden rounded-2xl bg-[#070b1a] p-4 text-white shadow-card sm:p-5">
              <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_120%_at_90%_0%,rgba(99,102,241,.35),transparent_60%),radial-gradient(50%_100%_at_0%_100%,rgba(16,185,129,.2),transparent_60%)]" />
              <div aria-hidden className="absolute inset-0 -z-10 opacity-[.06] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white/60">Administração da plataforma · {email}</p>
                  <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">{ADMIN_TABS.find((t) => t.id === tab)?.title ?? "Visão geral"}</h1>
                </div>
                <dl className="flex flex-wrap gap-2 text-sm">
                  {[["Clientes", clientCount], ["Lojas", vendorCount], ["Propagandas no ar", adCount], ["Cadastros pendentes", pendingSignups.length]].map(([l, v]) => (
                    <div key={l as string} className="rounded-xl border border-white/12 bg-white/[.06] px-3 py-1.5"><dt className="text-[10px] text-white/60">{l as string}</dt><dd className="font-extrabold tabular-nums">{(v as number | null) ?? "—"}</dd></div>
                  ))}
                </dl>
              </div>
              <nav aria-label="Seções da administração" className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
                {ADMIN_TABS.map((t) => (
                  <button key={t.id} type="button" aria-current={tab === t.id ? "page" : undefined} onClick={() => go(t.id)}
                    className={`h-9 shrink-0 rounded-xl px-3.5 text-[13px] font-bold transition ${tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>{t.label}</button>
                ))}
              </nav>
            </section>
            {tab === "visao" && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {ADMIN_TABS.filter((t) => t.id !== "visao").map((t) => (
                  <button key={t.id} type="button" onClick={() => go(t.id)} className="group rounded-2xl border border-border bg-card p-4 text-left shadow-card transition hover:border-primary/40">
                    <strong className="block text-base">{t.title}</strong>
                    <span className="mt-1 block text-xs text-muted-foreground">{t.hint}</span>
                    <span className="mt-3 inline-flex text-xs font-bold text-primary transition group-hover:translate-x-0.5">Abrir →</span>
                  </button>
                ))}
              </div>
            )}
            {tab === "visao" && pendingSignups.length > 0 && (
              <section
                className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-card"
                aria-label="Cadastros aguardando confirmação"
              >
                <h2 className="text-base font-bold">
                  {pendingSignups.length} cadastro(s) aguardando confirmação de e-mail
                </h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {pendingSignups.map((item) => (
                    <div key={item.email} className="rounded-xl border border-amber-500/20 bg-card px-3 py-2 text-sm">
                      <strong className="block">{item.email}</strong>
                      <span className="text-xs text-muted-foreground">Inscrito em {new Date(item.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {tab === "clientes" && <AdminClientManager ownerId={ownerId} />}
            {tab === "lojas" && <AdminMarketplace />}
            {tab === "vendas" && <StoreAdminDashboard />}
            {tab === "propagandas" && <AdminAds />}
            {tab === "pagamentos" && <AdminPayments />}
          </>
        )
      )}
    </>
  );
}
