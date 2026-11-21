import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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

/** Fundo padrão do painel: arcos concêntricos na cor da loja, sem depender de imagem externa. */
function panelBackground(accent: string, banner?: string | null) {
  if (banner) return `url("${banner}")`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${accent}' stop-opacity='.9'/><stop offset='1' stop-color='#020617' stop-opacity='1'/></linearGradient></defs><rect width='1200' height='800' fill='url(#g)'/><g fill='none' stroke='#ffffff' stroke-opacity='.08' stroke-width='2'><circle cx='1120' cy='-40' r='240'/><circle cx='1120' cy='-40' r='340'/><circle cx='1120' cy='-40' r='440'/><circle cx='80' cy='880' r='300'/><circle cx='80' cy='880' r='420'/></g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

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
    equipe: { label: "Funcionários", icon: Users, group: "gestao" },
    loja: { label: "Minha loja", icon: Store, group: "gestao" },
  };
  const allowed = (key: SellerTab) =>
    !isStaff || ["pedidos", "mensagens", "clientes"].includes(key);
  const groups = [
    {
      title: "Operação",
      keys: ["visao", "pedidos", "clientes", "produtos", "mensagens", "caixa"] as SellerTab[],
    },
    { title: "Gestão", keys: ["relatorios", "cadastros", "equipe", "loja"] as SellerTab[] },
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
            className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-[position:70%_40%] opacity-25 blur-[2px] dark:opacity-20"
            style={{ backgroundImage: panelBackground(accent, vendor.banner_url) }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-background/90"
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
          {!loaded ? (
            <p
              role="status"
              className="flex flex-1 items-center justify-center gap-2 py-24 text-sm text-muted-foreground"
            >
              <Loader2 size={16} className="animate-spin" /> Carregando a loja…
            </p>
          ) : (
            <div key={`${vendor.id}-${tab}`} className="nv-fade-in flex min-h-0 flex-1 flex-col">
              {tab === "visao" && (
                <SellerOverview vendor={vendor} data={data} go={setTab} onChanged={refresh} />
              )}
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
