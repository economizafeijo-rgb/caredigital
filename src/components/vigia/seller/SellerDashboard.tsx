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
  Users,
  Wallet,
} from "lucide-react";
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

export type SellerTab =
  | "visao"
  | "pedidos"
  | "produtos"
  | "caixa"
  | "relatorios"
  | "cadastros"
  | "equipe"
  | "mensagens"
  | "loja";
const STATUS = {
  pendente: ["Em análise", "bg-amber-400"],
  ativo: ["Loja aberta", "bg-emerald-400"],
  suspenso: ["Suspensa", "bg-rose-400"],
} as const;

/** Painel do lojista: navegação lateral, cabeçalho da loja e os módulos de operação. */
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
  const allNav: { key: SellerTab; label: string; icon: typeof Store; badge?: number }[] = [
    { key: "visao", label: "Visão geral", icon: LayoutDashboard },
    { key: "pedidos", label: "Pedidos", icon: ShoppingBag, badge: badges.pedidos },
    { key: "produtos", label: "Estoque", icon: Boxes, badge: badges.produtos },
    { key: "caixa", label: "Caixa", icon: Wallet },
    { key: "relatorios", label: "Relatórios", icon: FileBarChart },
    { key: "cadastros", label: "Cadastros", icon: BookUser },
    { key: "mensagens", label: "Mensagens", icon: MessageCircle, badge: badges.mensagens },
    { key: "equipe", label: "Equipe", icon: Users },
    { key: "loja", label: "Minha loja", icon: Store },
  ];
  const nav = allNav.filter((n) => !isStaff || ["pedidos", "mensagens"].includes(n.key));
  const refresh = () => {
    void reload();
    onChanged();
  };
  const initials = vendor.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="grid gap-4" style={{ "--accent-store": accent } as CSSProperties}>
      <ChatToastHost />
      <header
        className="nv-dark relative isolate overflow-hidden rounded-2xl text-white"
        style={{
          background: `linear-gradient(120deg, color-mix(in srgb, ${accent} 70%, #020617) 0%, #0b1220 70%)`,
        }}
      >
        <div
          aria-hidden
          className="absolute -right-16 -top-20 -z-10 size-72 rounded-full blur-3xl"
          style={{ background: `color-mix(in srgb, ${accent} 45%, transparent)` }}
        />
        <div className="flex items-center gap-3 p-3.5 sm:gap-4 sm:p-5">
          <span
            className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-base font-black shadow-lg sm:size-14 sm:rounded-2xl sm:text-lg"
            style={{ color: accent }}
          >
            {vendor.logo_url ? (
              <img src={vendor.logo_url} alt="" className="size-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="relative max-w-full">
              <button
                type="button"
                onClick={() => vendors.length > 1 && setSwitcher((v) => !v)}
                aria-expanded={vendors.length > 1 ? switcher : undefined}
                className="flex max-w-full items-center gap-2 text-left"
              >
                <h1 className="truncate font-display text-lg font-extrabold tracking-tight sm:text-2xl">
                  {vendor.name}
                </h1>
                {vendor.verified && (
                  <BadgeCheck
                    size={18}
                    className="shrink-0 text-sky-300"
                    aria-label="Loja verificada"
                  />
                )}
                {vendors.length > 1 && (
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-white/70 transition ${switcher ? "rotate-180" : ""}`}
                  />
                )}
              </button>
              {switcher && (
                <ul className="absolute left-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-card p-1 text-foreground shadow-2xl">
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
                          {v.name
                            .split(/\s+/)
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")}
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
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${STATUS[vendor.status][1]}`} />
                {STATUS[vendor.status][0]}
              </span>
              <span className="hidden sm:inline">{segmentLabel(vendor.segment)}</span>
              <span className="hidden sm:inline">{vendor.city}</span>
              <span className="hidden items-center gap-1 sm:inline-flex">
                <ReceiptText size={12} /> Plano {PLANS[vendor.plan].label}
              </span>
              {vendor.is_demo && (
                <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white">
                  Loja de teste
                </span>
              )}
            </p>
          </div>
          <a
            href={`/loja?loja=${vendor.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ver a página pública da loja"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-[13px] font-semibold ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 sm:px-3"
          >
            <ExternalLink size={14} /> <span className="hidden sm:inline">Ver loja</span>
          </a>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        <nav
          aria-label="Painel da loja"
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:sticky lg:top-2 lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-2"
        >
          {nav.map((n) => {
            const on = tab === n.key;
            return (
              <button
                key={n.key}
                type="button"
                onClick={() => setTab(n.key)}
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
        </nav>

        <main className="min-w-0">
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm"
            >
              {error}
            </p>
          )}
          {!loaded ? (
            <p
              role="status"
              className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"
            >
              <Loader2 size={16} className="animate-spin" /> Carregando a loja…
            </p>
          ) : (
            <div key={`${vendor.id}-${tab}`} className="nv-fade-in">
              {tab === "visao" && <SellerOverview vendor={vendor} data={data} go={setTab} />}
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
    </div>
  );
}
