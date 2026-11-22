import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Search } from "lucide-react";
import {
  BadgeCheck,
  BookUser,
  Boxes,
  ChevronDown,
  ExternalLink,
  FileBarChart,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  ReceiptText,
  ShoppingBag,
  Store,
  UserRound,
  Users,
  ShieldAlert,
  Tag,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, money, segmentLabel, type Vendor } from "@/lib/marketplace";
import { ChatToastHost, pushChatToast } from "../chat/ChatToasts";
import { useSellerData } from "./useSellerData";
import { SellerOverview } from "./SellerOverview";
import { SellerOrders } from "./SellerOrders";
import { SellerProducts } from "./SellerProducts";
import { SellerCash } from "./SellerCash";
import { SellerChat } from "./SellerChat";
import { SellerReports } from "./SellerReports";
import { SellerRegistry } from "./SellerRegistry";
import { SellerStaff } from "./SellerStaff";
import { SellerStore } from "./SellerStore";
import { SellerClients } from "./SellerClients";
import { SellerDisputes } from "./SellerDisputes";
import { SellerPromotions } from "./SellerPromotions";

export type SellerTab =
  | "visao"
  | "pedidos"
  | "produtos"
  | "caixa"
  | "relatorios"
  | "cadastros"
  | "equipe"
  | "mensagens"
  | "clientes"
  | "disputas"
  | "promocoes"
  | "loja";
const STATUS = {
  pendente: ["Em análise", "bg-amber-400"],
  ativo: ["Loja aberta", "bg-emerald-400"],
  suspenso: ["Suspensa", "bg-rose-400"],
} as const;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Painel do lojista: menu lateral com a loja e as ações, e os módulos de operação ao lado. */
export function SellerDashboard({
  vendors,
  onChanged,
  initialId,
  staffVendorIds = [],
}: {
  staffVendorIds?: string[];
  vendors: Vendor[];
  onChanged: () => void;
  initialId?: string;
}) {
  const [vendorId, setVendorId] = useState(
    vendors.find((v) => v.id === initialId)?.id ?? vendors[0].id,
  );
  const vendor = vendors.find((v) => v.id === vendorId) ?? vendors[0];
  const [tab, setTab] = useState<SellerTab>(
    staffVendorIds.includes(vendors.find((v) => v.id === initialId)?.id ?? vendors[0].id)
      ? "pedidos"
      : "visao",
  );
  const [chatWith, setChatWith] = useState<string | null>(null);
  const [switcher, setSwitcher] = useState(false);
  const { data, loaded, error, reload } = useSellerData(vendor.id);
  const accent = vendor.accent_hex ?? "#0e7a5f";
  const isStaff = staffVendorIds.includes(vendor.id);
  // Papel no banco: 'dono', 'operador' ou 'visualizador'. Visualizador só lê o painel.
  const [myRole, setMyRole] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data, error } = await (supabase as any).rpc("care_store_my_role", {
        p_vendor: vendor.id,
      });
      if (alive && !error) setMyRole(typeof data === "string" ? data : null);
    })();
    return () => {
      alive = false;
    };
  }, [vendor.id]);
  const readOnly = isStaff && myRole === "visualizador";

  // Avisos em tempo real: som e pop-up para mensagem nova do cliente e pedido novo.
  const seen = useRef<{ vendor: string; ids: Set<string> } | null>(null);
  useEffect(() => {
    if (!loaded) return;
    const ids = new Set([...data.messages.map((m) => m.id), ...data.orders.map((o) => o.id)]);
    if (!seen.current || seen.current.vendor !== vendor.id) {
      seen.current = { vendor: vendor.id, ids };
      return;
    }
    const known = seen.current.ids;
    for (const m of data.messages) {
      if (known.has(m.id) || m.from_vendor || m.deleted_at) continue;
      pushChatToast(
        {
          title: `Nova mensagem de ${m.customer_name ?? "cliente"}`,
          body: m.body,
          tone: "message",
          onOpen: () => {
            setChatWith(m.customer_id);
            setTab("mensagens");
          },
        },
        "incoming",
      );
    }
    for (const o of data.orders) {
      if (known.has(o.id)) continue;
      pushChatToast(
        {
          title: "Novo pedido recebido",
          body: `${o.customer_name} · ${money(o.total_cents)}`,
          tone: "order",
          onOpen: () => setTab("pedidos"),
        },
        "order",
      );
    }
    seen.current = { vendor: vendor.id, ids };
  }, [data.messages, data.orders, loaded, vendor.id]);

  const [openDisputes, setOpenDisputes] = useState(0);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { count } = await (supabase as any)
        .from("care_store_disputes")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendor.id)
        .eq("status", "aberta");
      if (alive) setOpenDisputes(count ?? 0);
    })();
    return () => {
      alive = false;
    };
  }, [vendor.id, data.orders]);

  const badges = useMemo(
    () => ({
      pedidos: data.orders.filter((o) =>
        ["aguardando_pagamento", "pago", "separando", "pronto"].includes(o.status),
      ).length,
      mensagens: data.messages.filter((m) => !m.from_vendor && !m.read_at).length,
      produtos: data.products.filter((p) => p.active && p.stock <= (p.min_stock ?? 3)).length,
    }),
    [data],
  );
  const allNav: Record<
    SellerTab,
    { label: string; icon: typeof Store; badge?: number; group: "operacao" | "gestao" }
  > = {
    visao: { label: "Visão geral", icon: LayoutDashboard, group: "operacao" },
    pedidos: { label: "Pedidos", icon: ShoppingBag, badge: badges.pedidos, group: "operacao" },
    produtos: { label: "Estoque", icon: Boxes, badge: badges.produtos, group: "operacao" },
    mensagens: {
      label: "Mensagens",
      icon: MessageCircle,
      badge: badges.mensagens,
      group: "operacao",
    },
    caixa: { label: "Caixa", icon: Wallet, group: "operacao" },
    relatorios: { label: "Relatórios", icon: FileBarChart, group: "gestao" },
    cadastros: { label: "Cadastros", icon: BookUser, group: "gestao" },
    clientes: { label: "Clientes", icon: UserRound, group: "operacao" },
    disputas: {
      label: "Disputas",
      icon: ShieldAlert,
      badge: openDisputes,
      group: "operacao",
    },
    promocoes: { label: "Promoções", icon: Tag, group: "gestao" },
    equipe: { label: "Funcionários", icon: Users, group: "gestao" },
    loja: { label: "Minha loja", icon: Store, group: "gestao" },
  };
  const about: Partial<Record<SellerTab, string>> = {
    pedidos: "Acompanhe cada pedido do pagamento à entrega e responda dentro do prazo.",
    produtos: "Cadastre produtos, controle o estoque e ajuste preços e margem.",
    mensagens: "Converse com os clientes e tire dúvidas antes da compra.",
    caixa: "Entradas, saídas e fechamento do caixa da loja.",
    relatorios: "Vendas, margem e desempenho por período, prontos para exportar.",
    cadastros: "Fornecedores, categorias e dados de apoio da operação.",
    clientes: "Quem compra de você, histórico e contato.",
    disputas: "Reclamações abertas e a resolução de cada caso.",
    promocoes: "Cupons e ofertas para vender mais.",
    equipe: "Funcionários e o que cada um pode acessar.",
    loja: "Logomarca, banner, horário e dados públicos da vitrine.",
  };
  const [palette, setPalette] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
        setQ("");
      } else if (e.key === "Escape") setPalette(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const allowed = (key: SellerTab) =>
    !isStaff || ["pedidos", "mensagens", "clientes"].includes(key);
  const groups = [
    {
      title: "Operação",
      keys: [
        "visao",
        "pedidos",
        "clientes",
        "disputas",
        "produtos",
        "mensagens",
        "caixa",
      ] as SellerTab[],
    },
    {
      title: "Gestão",
      keys: ["relatorios", "cadastros", "promocoes", "equipe", "loja"] as SellerTab[],
    },
  ]
    .map((g) => ({ ...g, keys: g.keys.filter(allowed) }))
    .filter((g) => g.keys.length);
  const refresh = () => {
    void reload();
    onChanged();
  };

  return (
    <>
      <ChatToastHost />
      {palette && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ir para uma seção"
          className="fixed inset-0 z-[120] grid place-items-start bg-black/55 p-4 pt-[15vh]"
          onClick={() => setPalette(false)}
        >
          <div
            className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <label className="flex items-center gap-2 border-b border-border px-4">
              <Search size={15} className="text-muted-foreground" aria-hidden />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Para onde quer ir? Pedidos, estoque, caixa…"
                className="h-12 w-full bg-transparent text-sm outline-none"
              />
            </label>
            <ul className="max-h-72 overflow-y-auto p-1.5">
              {groups
                .flatMap((g) => g.keys)
                .filter((k) => allNav[k].label.toLowerCase().includes(q.trim().toLowerCase()))
                .map((k) => {
                  const I = allNav[k].icon;
                  return (
                    <li key={k}>
                      <button
                        type="button"
                        onClick={() => {
                          setTab(k);
                          setPalette(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted"
                      >
                        <I size={16} aria-hidden /> {allNav[k].label}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      )}
      <div
        className="grid min-h-full w-full gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]"
        style={{ "--accent-store": accent } as CSSProperties}
      >
        {/* Menu lateral: identidade da loja, navegação e ações */}
        <aside
          aria-label="Menu do lojista"
          className="nv-dark relative flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-3 lg:sticky lg:top-2 lg:h-[calc(100dvh-5.5rem)] lg:self-start"
        >
          <div
            className="relative overflow-hidden rounded-xl p-3 text-white"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 75%, #020617) 0%, #0b1220 85%)`,
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-sm font-black shadow-lg"
                style={{ color: accent }}
              >
                {vendor.logo_url ? (
                  <img src={vendor.logo_url} alt="" className="size-full object-cover" />
                ) : (
                  initialsOf(vendor.name)
                )}
              </span>
              <div className="relative min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => vendors.length > 1 && setSwitcher((v) => !v)}
                  aria-expanded={vendors.length > 1 ? switcher : undefined}
                  className="flex max-w-full items-center gap-1.5 text-left"
                >
                  <span className="truncate font-display text-[15px] font-extrabold tracking-tight">
                    {vendor.name}
                  </span>
                  {vendor.verified && (
                    <BadgeCheck
                      size={15}
                      className="shrink-0 text-sky-300"
                      aria-label="Loja verificada"
                    />
                  )}
                  {vendors.length > 1 && (
                    <ChevronDown
                      size={15}
                      className={`shrink-0 text-white/70 transition ${switcher ? "rotate-180" : ""}`}
                    />
                  )}
                </button>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/70">
                  <span className={`size-1.5 rounded-full ${STATUS[vendor.status][1]}`} />
                  {STATUS[vendor.status][0]}
                </p>
                {switcher && (
                  <ul className="absolute left-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card p-1 text-foreground shadow-2xl">
                    {vendors.map((v) => (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setVendorId(v.id);
                            setSwitcher(false);
                            setTab("visao");
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted ${v.id === vendor.id ? "bg-muted font-semibold" : ""}`}
                        >
                          <span
                            className="grid size-7 place-items-center rounded-md text-[11px] font-extrabold text-white"
                            style={{ background: v.accent_hex ?? "#0e7a5f" }}
                          >
                            {initialsOf(v.name)}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{v.name}</span>
                          {v.is_demo && (
                            <span className="rounded bg-muted-foreground/15 px-1 text-[11px]">
                              teste
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <p className="mt-2.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-white/65">
              <span>{segmentLabel(vendor.segment)}</span>
              <span aria-hidden>·</span>
              <span>{vendor.city}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <ReceiptText size={11} /> {PLANS[vendor.plan].label}
              </span>
            </p>
            {vendor.is_demo && (
              <span className="mt-2 inline-block rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
                Loja de teste
              </span>
            )}
          </div>

          <nav
            aria-label="Painel da loja"
            className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:mx-0 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:px-0"
          >
            {groups.map((g) => (
              <div key={g.title} className="flex gap-1 lg:flex-col">
                <p className="hidden px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground lg:block">
                  {g.title}
                </p>
                {g.keys.map((key) => {
                  const n = allNav[key];
                  const on = tab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      aria-current={on ? "page" : undefined}
                      className={`relative inline-flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 text-[13px] font-semibold transition-colors ${on ? "text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground max-lg:border max-lg:border-border max-lg:bg-card"}`}
                      style={on ? { background: accent } : undefined}
                    >
                      <n.icon size={16} /> {n.label}
                      {!!n.badge && (
                        <span
                          className={`ml-auto grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${on ? "bg-white/25 text-white" : "bg-[var(--accent-store)] text-white"}`}
                        >
                          {n.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="grid gap-1.5 border-t border-border pt-3">
            <a
              href={`/loja?loja=${vendor.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ver a página pública da loja"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border text-[13px] font-semibold transition hover:bg-muted"
            >
              <ExternalLink size={14} /> Ver loja pública
            </a>
          </div>
        </aside>

        {/* Área de trabalho com fundo de imagem */}
        <main
          className="relative isolate flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-background p-4 sm:p-6"
          style={{ minHeight: "calc(100dvh - 5.5rem)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage: `radial-gradient(60rem 22rem at 100% 0%, color-mix(in srgb, ${accent} 16%, transparent), transparent 70%), radial-gradient(40rem 20rem at 0% 100%, color-mix(in srgb, ${accent} 10%, transparent), transparent 70%)`,
            }}
          />
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm"
            >
              {error}
            </p>
          )}
          {readOnly && (
            <p
              role="status"
              className="mb-3 flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm"
            >
              Acesso somente para visualizar. Você consulta o painel, mas não altera pedidos nem
              responde clientes.
            </p>
          )}
          <div
            className="nv-dark relative -mx-4 -mt-4 mb-5 flex min-h-[8.5rem] items-end overflow-hidden rounded-t-2xl p-4 text-white sm:-mx-6 sm:-mt-6 sm:min-h-[10rem] sm:p-6"
            style={{
              backgroundImage: `linear-gradient(100deg, color-mix(in srgb, ${accent} 92%, #000) 0%, color-mix(in srgb, ${accent} 70%, #fff 0%) 38%, rgba(15,23,42,.35) 100%), url(${vendor.banner_url || "/loja/bela-vista/banner.jpg"})`,
              backgroundSize: "cover",
              backgroundPosition: "center 30%",
            }}
          >
            <span
              aria-hidden
              className="absolute -right-10 -top-14 size-44 rounded-full bg-white/15 blur-2xl"
            />
            <span
              aria-hidden
              className="absolute bottom-0 right-1/4 size-24 rounded-full bg-white/10 blur-xl"
            />
            <div className="relative flex min-w-0 items-center gap-3 sm:gap-4">
              <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1 shadow-lg ring-4 ring-white/30 sm:size-16">
                {vendor.logo_url ? (
                  <img src={vendor.logo_url} alt="" className="size-full object-contain" />
                ) : (
                  <span className="text-xl font-black" style={{ color: accent }}>
                    {vendor.name.slice(0, 1)}
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold tracking-wide text-white/85">
                  Painel da loja
                </p>
                <p className="truncate font-display text-xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                  {vendor.name}
                </p>
                <p className="mt-0.5 text-[13px] text-white/85">
                  {allNav[tab]?.label ?? "Visão geral"} · {vendor.city.replace(/,\s*AC$/i, "")}
                </p>
              </div>
            </div>
          </div>
          {!loaded ? (
            <p
              role="status"
              className="flex flex-1 items-center justify-center gap-2 py-24 text-sm text-muted-foreground"
            >
              <Loader2 size={16} className="animate-spin" /> Carregando a loja…
            </p>
          ) : (
            <div key={`${vendor.id}-${tab}`} className="nv-fade-in flex min-h-0 flex-1 flex-col">
              {tab !== "visao" && (
                <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight sm:text-2xl">
                      {(() => {
                        const I = allNav[tab].icon;
                        return <I size={20} style={{ color: "var(--accent-store)" }} aria-hidden />;
                      })()}
                      {allNav[tab].label}
                    </h2>
                    {about[tab] && (
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{about[tab]}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPalette(true)}
                    className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground transition hover:text-foreground sm:inline-flex"
                  >
                    <Search size={13} aria-hidden /> Ir para…
                    <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                      Ctrl K
                    </kbd>
                  </button>
                </header>
              )}
              {tab === "visao" && (
                <SellerOverview vendor={vendor} data={data} go={setTab} onChanged={refresh} />
              )}
              {tab === "disputas" && <SellerDisputes vendor={vendor} onChanged={refresh} />}
              {tab === "promocoes" && !isStaff && <SellerPromotions vendor={vendor} />}
              {tab === "pedidos" && (
                <SellerOrders
                  vendor={vendor}
                  orders={data.orders}
                  onChanged={refresh}
                  openChat={(id) => {
                    setChatWith(id);
                    setTab("mensagens");
                  }}
                />
              )}
              {tab === "produtos" && (
                <SellerProducts
                  vendor={vendor}
                  products={data.products}
                  moves={data.moves}
                  onChanged={refresh}
                />
              )}
              {tab === "relatorios" && !isStaff && <SellerReports vendor={vendor} />}
              {tab === "cadastros" && !isStaff && <SellerRegistry vendor={vendor} />}
              {tab === "equipe" && !isStaff && <SellerStaff vendor={vendor} />}
              {tab === "clientes" && <SellerClients vendor={vendor} readOnly={readOnly} />}
              {tab === "caixa" && (
                <SellerCash vendor={vendor} cash={data.cash} onChanged={refresh} />
              )}
              {tab === "mensagens" && (
                <SellerChat
                  vendor={vendor}
                  messages={data.messages}
                  onChanged={refresh}
                  initial={chatWith}
                  staff={isStaff}
                />
              )}
              {tab === "loja" && (
                <SellerStore
                  key={vendor.id}
                  vendor={vendor}
                  invoices={data.invoices}
                  onChanged={refresh}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
