import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Download,
  ArrowLeft,
  BadgeCheck,
  Check,
  Copy,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  QrCode,
  Share2,
  ShoppingCart,
  Store,
  Truck,
  X,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  categoryName,
  money,
  productStatus,
  type Vendor,
  type VendorProduct,
} from "@/lib/marketplace";
import {
  downloadQrPng,
  downloadStoreCard,
  initialsOf as ini,
  QrImage,
  shortStoreUrl,
  socialLinks,
} from "../seller/shared";
import { CustomerChat } from "./CustomerChat";
import { useVendorReplies } from "./useVendorReplies";
import { ChatToastHost } from "../chat/ChatToasts";
import { PilotNotice } from "./PilotNotice";
import { StoreStatusChip } from "./StoreLed";
import { useLiveVendor } from "../LiveStores";
import { GUEST_MAX_ITEMS, useSignedIn, useVCart, vcart } from "./vendorCart";
import { useLiveProducts } from "./useLiveProducts";
import { couponErrorMessage, normalizeCode } from "@/lib/coupons";

/** Cotação devolvida pelo servidor (care_store_quote_order). O navegador só mostra; quem calcula é o banco. */
type CartQuote = {
  list_cents: number;
  promo_cents: number;
  subtotal_cents: number;
  discount_cents: number;
  coupon_code: string | null;
  fee_cents: number;
  total_cents: number;
  km?: number | null;
  min_card_cents?: number;
  min_delivery_cents?: number;
  max_km?: number;
};
import { STORE_LIVE } from "@/lib/store";
import { ACRE_CITIES, formatCpf, isValidCpf } from "@/lib/checkout";

type Sort = "relevancia" | "menor" | "desconto";
const offOf = (p: VendorProduct) =>
  p.old_price_cents ? Math.round((1 - p.price_cents / p.old_price_cents) * 100) : 0;
/** Foto de destaque quando a loja ainda não enviou o próprio banner. */
const bannerFor = (segment?: string | null) =>
  /moda|roupa|acess|bijut|beleza|fitness/i.test(segment ?? "")
    ? "/loja/mulher2.webp"
    : /suplement|farm|natural|saude|saúde/i.test(segment ?? "")
      ? "/images/hero-suplementos.webp"
      : "/images/hero-alimentacao.webp";
/** Taxa mínima de entrega cobrada pelo servidor (R$ 10), exceto frete grátis. */
const MIN_DELIVERY_FEE_CENTS = 1000;
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Carrega a loja do banco pelo endereço; se ainda não existir, mostra a versão ilustrativa (fallback). */
export function PublicStoreGate({ slug, fallback }: { slug: string; fallback: ReactNode }) {
  const [state, setState] = useState<
    { vendor: Vendor; products: VendorProduct[] } | null | undefined
  >(undefined);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const db = supabase as any;
      const { data: v } = await db
        .from("care_store_vendors")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!alive) return;
      if (!v) {
        setState(null);
        return;
      }
      const { data: p } = await db
        .from("care_store_products")
        .select("*")
        .eq("vendor_id", v.id)
        .eq("active", true)
        .order("created_at");
      const nowIso = new Date().toISOString();
      const { data: promos } = await db
        .from("care_store_promotions")
        .select("percent,product_ids")
        .eq("vendor_id", v.id)
        .eq("status", "ativo")
        .lte("starts_at", nowIso)
        .gte("ends_at", nowIso);
      const pct = new Map<string, number>();
      for (const pr of promos ?? []) {
        for (const id of pr.product_ids ?? []) pct.set(id, Math.max(pct.get(id) ?? 0, pr.percent));
      }
      const list: VendorProduct[] = (p ?? []).map((prod: VendorProduct) => {
        const x = pct.get(prod.id);
        if (!x) return prod;
        // Vale o menor entre o preço atual e o preço com a promoção.
        const promo = Math.min(prod.price_cents, Math.round((prod.price_cents * (100 - x)) / 100));
        return { ...prod, old_price_cents: prod.price_cents, price_cents: promo, promo_percent: x };
      });
      if (alive) setState({ vendor: v, products: list });
    })();
    return () => {
      alive = false;
    };
  }, [slug]);
  if (state === undefined)
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"
      >
        <Loader2 size={16} className="animate-spin" /> Abrindo a loja…
      </p>
    );
  if (state === null) return <>{fallback}</>;
  return <PublicStore vendor={state.vendor} products={state.products} />;
}

function PublicStore({
  vendor: initialVendor,
  products: initialProducts,
}: {
  vendor: Vendor;
  products: VendorProduct[];
}) {
  const vendor = useLiveVendor(initialVendor);
  const products = useLiveProducts(initialVendor.id, initialProducts);
  const signedIn = useSignedIn();
  const [cartNotice, setCartNotice] = useState("");
  useEffect(() => {
    if (!cartNotice) return;
    const t = window.setTimeout(() => setCartNotice(""), 3500);
    return () => window.clearTimeout(t);
  }, [cartNotice]);
  /** Adiciona respeitando estoque e as regras de visitante; explica quando não dá. */
  const addToCart = (p: VendorProduct) => {
    const r = vcart.add(vendor.id, p.id, productStatus(p).max);
    if (r === "added") setAdded(p.id);
    else if (r === "max")
      setCartNotice(`Você já tem no carrinho todas as unidades disponíveis de ${p.name}.`);
    else if (r === "guest-unit")
      setCartNotice(
        "Este produto já está no carrinho. Entre na sua conta para escolher mais unidades.",
      );
    else if (r === "guest-items")
      setCartNotice(
        `Sem login, o carrinho aceita até ${GUEST_MAX_ITEMS} produtos. Entre na sua conta para continuar.`,
      );
    else setCartNotice(`${p.name} está esgotado.`);
  };
  const navigate = useNavigate();
  const accent = vendor.accent_hex ?? "#0e7a5f";
  const [cat, setCat] = useState("todos");
  const [sort, setSort] = useState<Sort>("relevancia");
  const [cartOpen, setCartOpen] = useState(false);
  const [chat, setChat] = useState(false);
  const replies = useVendorReplies(vendor.id, vendor.name, chat);
  const [qrOpen, setQrOpen] = useState(false);
  // Voltou do cadastro/e-mail confirmado com itens na cesta: abre o checkout direto.
  useEffect(() => {
    try {
      if (STORE_LIVE && window.localStorage.getItem("nv_checkout_open") === vendor.slug)
        setCartOpen(true);
    } catch {
      /* ok */
    }
  }, [vendor.slug]);
  const [chatDraft, setChatDraft] = useState<string | undefined>(undefined);
  const [detail, setDetail] = useState<VendorProduct | null>(null);
  const deepLinked = useRef(false);
  const [linkCopied, setLinkCopied] = useState(false);
  // Link do produto (/p/<código>): abre o detalhe daquele produto uma única vez.
  useEffect(() => {
    if (deepLinked.current) return;
    const code = new URLSearchParams(window.location.search).get("produto");
    if (!code) return;
    deepLinked.current = true;
    const found = products.find((x) => x.share_code === code);
    if (found) setDetail(found);
  }, [products]);
  const [share, setShare] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const lines = useVCart(vendor.id);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const cats = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const shown = useMemo(() => {
    const base = cat === "todos" ? products : products.filter((p) => p.category === cat);
    if (sort === "menor") return [...base].sort((a, b) => a.price_cents - b.price_cents);
    if (sort === "desconto") return [...base].sort((a, b) => offOf(b) - offOf(a));
    return base;
  }, [products, cat, sort]);
  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(null), 1500);
    return () => window.clearTimeout(t);
  }, [added]);
  const tint = (pct: number, to = "#0b1220") => `color-mix(in srgb, ${accent} ${pct}%, ${to})`;
  const storeUrl = shortStoreUrl(vendor.slug);

  return (
    <div
      className="flex min-w-0 flex-col gap-3 sm:gap-4"
      style={{ "--v": accent } as CSSProperties}
    >
      <section
        className="nv-dark relative isolate rounded-3xl text-white shadow-pop"
        style={{
          background: `radial-gradient(120% 140% at 0% 0%, ${tint(70)} 0%, ${tint(32)} 45%, ${tint(12, "#070b14")} 100%)`,
        }}
      >
        <nav
          aria-label="Caminho"
          className="relative flex flex-wrap items-center gap-1.5 px-4 pt-3 text-[13px] text-white/75 sm:px-5"
        >
          <button
            type="button"
            onClick={() => void navigate({ to: "/loja" })}
            className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={15} /> Loja NextVita
          </button>
          <span aria-hidden>/</span>
          <span className="truncate font-semibold text-white">{vendor.name}</span>
          {vendor.is_demo && (
            <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 dark:text-amber-300">
              loja de teste
            </span>
          )}
          <PilotNotice className="ml-auto" />
        </nav>
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
          <img
            src={vendor.banner_url || bannerFor(vendor.segment)}
            alt=""

            className="absolute inset-y-0 right-0 h-full w-full object-cover opacity-90 lg:w-2/3"
          />
          {/* Gradiente forte só onde fica o texto; à direita o banner aparece nítido. */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, ${tint(80, "#070b14")} 0%, ${tint(66, "#070b14")} 36%, color-mix(in srgb, ${tint(62, "#070b14")} 40%, transparent) 60%, transparent 100%)`,
            }}
          />
          {/* No celular o texto ocupa toda a largura: véu extra para manter a leitura. */}
          <div className="absolute inset-0 bg-black/35 lg:hidden" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 flex-1 basis-[22rem] items-center gap-3.5">
            <span
              className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-lg font-black shadow-xl ring-2 ring-white/30"
              style={{ color: accent }}
            >
              {vendor.logo_url ? (
                <img
                  src={vendor.logo_url}
                  alt={`Logo ${vendor.name}`}
                  className="size-full object-cover"
                />
              ) : (
                initialsOf(vendor.name)
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-white/75">
                Loja parceira NextVita · {vendor.city}
              </p>
              <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
                {vendor.name}
                {vendor.verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-[0_0_0_3px_rgba(16,185,129,.25)]">
                    <BadgeCheck size={14} aria-hidden="true" /> Loja verificada
                  </span>
                )}
              </h1>
              {vendor.description && (
                <p className="mt-1 line-clamp-1 max-w-[56ch] text-[13px] text-white/85 max-sm:hidden">
                  {vendor.description}
                </p>
              )}
              <dl className="mt-3 grid max-w-[40rem] gap-2 sm:grid-cols-2">
                <div
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ring-1 ${
                    vendor.is_open && vendor.status === "ativo"
                      ? "bg-emerald-400/20 ring-emerald-300/50"
                      : "bg-amber-400/20 ring-amber-300/50"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`size-2.5 shrink-0 rounded-full ${
                      vendor.is_open && vendor.status === "ativo"
                        ? "bg-emerald-300"
                        : "bg-amber-300"
                    }`}
                  />
                  <div className="min-w-0">
                    <dt className="text-[12px] font-extrabold text-white">
                      {vendor.is_open && vendor.status === "ativo"
                        ? "Aberta agora"
                        : "Fechada no momento"}
                    </dt>
                    <dd className="truncate text-[11.5px] text-white/85">
                      {vendor.opening_hours || "Horário a confirmar"}
                    </dd>
                  </div>
                </div>
                {vendor.address && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/20 max-sm:hidden">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-sky-200" aria-hidden="true" />
                    <dd className="min-w-0 text-[12px] leading-snug text-white/90">
                      {vendor.address}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
          <div className="relative flex shrink-0 flex-wrap items-center gap-2 max-sm:w-full [&>button]:max-sm:flex-1 [&>button]:max-sm:justify-center">
            <button
              type="button"
              onClick={() => {
                setChatDraft(undefined);
                setChat(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-bold text-slate-950 transition hover:bg-white/90 active:scale-[.98]"
            >
              <MessageCircle size={15} /> Conversar
            </button>
            <button
              type="button"
              onClick={() => setShare(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/30 bg-black/20 px-3.5 text-[13px] font-semibold backdrop-blur transition hover:bg-white/15"
            >
              <Share2 size={14} /> Compartilhar
            </button>
            <button
              type="button"
              aria-expanded={qrOpen}
              onClick={() => setQrOpen((v) => !v)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/30 bg-black/20 px-3.5 text-[13px] font-semibold backdrop-blur transition hover:bg-white/15"
            >
              <QrCode size={14} /> QR Code
            </button>
            {qrOpen && (
              <div className="absolute right-0 top-12 z-20 w-60 overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-black/10">
                <div className="h-1.5" style={{ background: accent }} aria-hidden="true" />
                <div className="flex flex-col items-center px-4 pb-4 pt-3">
                  <QrImage
                    text={storeUrl}
                    size={132}
                    label={`QR Code da loja ${vendor.name}`}
                    badge={{ initials: ini(vendor.name), color: accent, logo: vendor.logo_url }}
                  />
                  <p className="mt-2 text-[13px] font-extrabold">Escaneie e abra a loja</p>
                  <button
                    type="button"
                    onClick={() => void downloadQrPng(storeUrl, `qr-${vendor.slug}.png`)}
                    className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-bold text-white transition hover:brightness-110"
                    style={{ background: accent }}
                  >
                    <Download size={14} aria-hidden="true" /> Baixar QR Code
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <ul className="rounded-b-3xl border-t border-white/10 bg-black/25 max-sm:hidden sm:grid sm:grid-cols-4">
          {[
            [
              Store,
              vendor.offers_pickup ? `Pronto em ~${vendor.prep_minutes ?? 30} min` : "Sem retirada",
              "Retirada na loja",
            ],
            [
              Truck,
              vendor.offers_delivery
                ? `A partir de ${money(Math.max(MIN_DELIVERY_FEE_CENTS, vendor.delivery_fee_cents))}${vendor.free_delivery_from_cents ? ` · grátis acima de ${money(vendor.free_delivery_from_cents)}` : ""}`
                : "Só retirada",
              "Entrega",
            ],
            [CheckCircle2, "Código de retirada", "Retire com o código"],
            [MessageCircle, "Chat com a loja", "Atendimento"],
          ].map(([I, value, label], i) => {
            const Icon = I as typeof Store;
            return (
              <li
                key={label as string}
                className={`flex min-w-0 items-center gap-2.5 px-4 py-3 sm:px-5 ${i % 2 ? "border-l border-white/10" : ""} ${i > 1 ? "border-t border-white/10 sm:border-t-0" : ""} sm:border-l sm:first:border-l-0`}
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-lg"
                  style={{ background: tint(35, "transparent") }}
                >
                  <Icon size={15} />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-[10.5px] text-white/55">{label as string}</span>
                  <strong className="block truncate text-[12.5px] font-semibold">
                    {value as string}
                  </strong>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex min-w-0 items-center justify-between gap-2 max-sm:-mx-3 max-sm:px-3">
        <div
          role="group"
          aria-label="Categorias"
          className="flex min-w-0 flex-1 snap-x gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&>button]:shrink-0 [&>button]:snap-start"
        >
          {["todos", ...cats].map((c) => {
            const on = cat === c;
            const n =
              c === "todos" ? products.length : products.filter((p) => p.category === c).length;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => setCat(c)}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${on ? "border-transparent text-white" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
                style={on ? { background: accent } : undefined}
              >
                {c === "todos" ? "Tudo" : categoryName(c)}
                <span
                  className={`rounded-full px-1.5 text-[10.5px] tabular-nums ${on ? "bg-white/20" : "bg-muted"}`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="max-sm:sr-only">Ordenar</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-[13px] font-semibold text-foreground"
          >
            <option value="relevancia">Relevância</option>
            <option value="menor">Menor preço</option>
            <option value="desconto">Maior desconto</option>
          </select>
        </label>
      </div>

      <section
        aria-label={`Produtos de ${vendor.name}`}
        className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))]"
      >
        {shown.map((p) => {
          const off = offOf(p);
          const st = productStatus(p);
          const out = !st.buyable;
          const inCart = lines.find((l) => l.product_id === p.id)?.qty ?? 0;
          return (
            <article
              key={p.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,box-shadow] duration-300 hover:border-[color-mix(in_srgb,var(--v)_45%,transparent)] hover:shadow-pop"
            >
              <button
                type="button"
                onClick={() => setDetail(p)}
                aria-label={`Ver detalhes de ${p.name}`}
                className="relative block aspect-[4/3.6] w-full cursor-pointer overflow-hidden bg-gradient-to-b from-[#f2f3f5] to-[#dfe2e6]"
              >
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    className={`size-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${out ? "opacity-50 grayscale" : ""}`}
                  />
                )}
                <span className="absolute left-2 top-2 flex flex-col items-start gap-1">
                  {off > 0 && (
                    <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[11px] font-extrabold text-white shadow">
                      -{off}%
                    </span>
                  )}
                  {out ? (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${st.key === "indisponivel" ? "bg-amber-400 text-slate-900" : "bg-slate-900 text-white"}`}
                    >
                      {st.label}
                    </span>
                  ) : (
                    p.stock <= 3 && (
                      <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-[10.5px] font-bold text-slate-900">
                        Últimas {st.max}
                      </span>
                    )
                  )}
                </span>
              </button>
              <div className="flex flex-1 flex-col p-3">
                <span className="text-[10.5px] font-medium text-muted-foreground">
                  {categoryName(p.category)}
                </span>
                <h3 className="mt-0.5 line-clamp-2 min-h-[2.5em] text-[13.5px] font-semibold leading-tight">
                  <button
                    type="button"
                    onClick={() => setDetail(p)}
                    className="text-left hover:underline"
                  >
                    {p.name}
                  </button>
                </h3>
                {p.code && (
                  <span className="mt-0.5 text-[10.5px] tabular-nums text-muted-foreground max-sm:hidden">
                    Código {p.code}
                  </span>
                )}
                <p className="mt-2 flex flex-wrap items-baseline gap-1.5">
                  <strong className="text-[17px] font-extrabold tabular-nums">
                    {money(p.price_cents)}
                  </strong>
                  {p.old_price_cents && (
                    <span className="text-[11px] text-muted-foreground line-through tabular-nums">
                      {money(p.old_price_cents)}
                    </span>
                  )}
                  {p.promo_percent && (
                    <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300">
                      Promoção −{p.promo_percent}%
                    </span>
                  )}
                </p>
                {!!p.colors?.length && (
                  <span
                    className="mt-1.5 flex flex-wrap items-center gap-1"
                    aria-label="Cores disponíveis"
                  >
                    {p.colors.map((c) => (
                      <span
                        key={c.name}
                        title={c.stock > 0 ? c.name : `${c.name} · esgotada`}
                        className={`relative size-4 border border-border ${c.stock <= 0 ? "opacity-35" : ""}`}
                        style={{ background: c.hex }}
                      >
                        {c.stock <= 0 && (
                          <span className="absolute inset-0 grid place-items-center text-[10px] font-bold leading-none text-slate-900">
                            /
                          </span>
                        )}
                      </span>
                    ))}
                  </span>
                )}
                {p.display_limit && !out && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Até {p.display_limit} por pedido
                  </p>
                )}
                {!STORE_LIVE && (
                  <p className="text-[11px] text-muted-foreground">Vendas em breve</p>
                )}
                {!out && p.stock <= 5 && (
                  <p className="mt-1 text-[11.5px] font-bold text-rose-600 dark:text-rose-400">
                    {p.stock === 1 ? "Última unidade!" : `Restam só ${p.stock} unidades`}
                  </p>
                )}
                <button
                  type="button"
                  disabled={out || inCart >= (signedIn ? st.max : 1)}
                  onClick={() => addToCart(p)}
                  className="mt-2.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold text-white transition hover:brightness-110 active:scale-[.97] disabled:opacity-45"
                  style={{ background: added === p.id ? "#059669" : accent }}
                >
                  {added === p.id ? (
                    <>
                      <CheckCircle2 size={15} /> Adicionado
                    </>
                  ) : out ? (
                    st.label
                  ) : inCart >= (signedIn ? st.max : 1) ? (
                    <>
                      <CheckCircle2 size={15} /> No carrinho
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={15} /> Adicionar
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChatDraft(
                      p.code
                        ? `Tenho uma dúvida sobre o produto ${p.code} (${p.name}).`
                        : `Tenho uma dúvida sobre o produto ${p.name}.`,
                    );
                    setChat(true);
                  }}
                  className="mt-1.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border text-[12.5px] max-sm:hidden font-semibold transition hover:bg-muted"
                >
                  <MessageCircle size={14} aria-hidden="true" /> Perguntar sobre este produto
                </button>
              </div>
            </article>
          );
        })}
        {!shown.length && (
          <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
            Esta loja ainda não tem produtos à venda.
          </p>
        )}
      </section>

      {!chat && <ChatToastHost />}
      {replies > 0 && !chat && (
        <button
          type="button"
          onClick={() => setChat(true)}
          className="nv-msg-pulse fixed bottom-[calc(8.5rem+env(safe-area-inset-bottom))] right-3 z-[90] inline-flex h-11 items-center gap-2 rounded-full bg-emerald-700 px-4 text-sm font-extrabold text-white shadow-xl sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"
        >
          <MessageCircle size={18} aria-hidden="true" /> {replies} nova{replies > 1 ? "s" : ""}{" "}
          resposta{replies > 1 ? "s" : ""}
        </button>
      )}
      {cartNotice && !cartOpen && (
        <p
          role="status"
          className="nv-fade-in fixed bottom-[calc(8.5rem+env(safe-area-inset-bottom))] right-3 z-[96] max-w-xs rounded-2xl bg-slate-950 px-4 py-3 text-[13px] font-semibold text-white shadow-2xl ring-1 ring-white/15 sm:bottom-24"
        >
          {cartNotice}
        </p>
      )}
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        aria-label={`Abrir carrinho da loja, ${count} itens`}
        className="nv-fab fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3 z-[90] inline-flex h-12 items-center gap-2 rounded-full px-4 text-sm font-extrabold text-white shadow-xl ring-2 ring-white/70 sm:bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:h-14 sm:px-5 sm:ring-4 dark:ring-slate-900/70"
        style={{ background: accent }}
      >
        <ShoppingCart size={20} /> <span className="max-sm:sr-only">Carrinho</span>
        {count > 0 && (
          <span
            key={count}
            className="nv-heart-pop grid size-6 place-items-center rounded-full bg-white text-xs"
            style={{ color: accent }}
          >
            {count}
          </span>
        )}
      </button>
      {cartOpen && (
        <VendorCheckout
          vendor={vendor}
          products={products}
          onClose={() => setCartOpen(false)}
          onChat={() => {
            setCartOpen(false);
            setChat(true);
          }}
        />
      )}
      {chat && (
        <CustomerChat vendor={vendor} onClose={() => setChat(false)} initialText={chatDraft} />
      )}
      {detail && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetail(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDetail(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-detail-title"
            className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-card shadow-2xl ring-1 ring-white/10 sm:grid sm:max-w-3xl sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] sm:overflow-hidden sm:rounded-3xl"
          >
            <button
              type="button"
              autoFocus
              onClick={() => setDetail(null)}
              aria-label="Fechar"
              className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
            >
              <X size={18} />
            </button>
            <div className="relative bg-white sm:min-h-full">
              {detail.image_url ? (
                <img
                  src={detail.image_url}
                  alt={detail.name}
                  className="aspect-[4/3] w-full object-cover sm:aspect-square sm:h-full"
                />
              ) : (
                <div className="grid aspect-[4/3] place-items-center text-4xl font-black text-slate-300 sm:aspect-square">
                  {initialsOf(detail.name)}
                </div>
              )}
              {detail.promo_percent ? (
                <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-extrabold text-white shadow">
                  −{detail.promo_percent}%
                </span>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col p-5 sm:max-h-[min(92vh,40rem)] sm:overflow-y-auto sm:p-6">
              <p
                className="text-[11.5px] font-semibold uppercase tracking-wide"
                style={{ color: accent }}
              >
                {categoryName(detail.category)}
              </p>
              <h2
                id="product-detail-title"
                className="mt-1 pr-8 font-display text-xl font-extrabold leading-snug sm:text-2xl"
              >
                {detail.name}
              </h2>
              {detail.code && (
                <p className="mt-1 text-xs text-muted-foreground">Código {detail.code}</p>
              )}
              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <strong className="text-2xl font-extrabold tabular-nums">
                  {money(detail.price_cents)}
                </strong>
                {detail.old_price_cents ? (
                  <span className="text-sm text-muted-foreground line-through tabular-nums">
                    {money(detail.old_price_cents)}
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                  productStatus(detail).buyable
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${productStatus(detail).buyable ? "bg-emerald-500" : "bg-slate-400"}`}
                />
                {productStatus(detail).label}
                {productStatus(detail).buyable && detail.stock <= 3
                  ? ` · últimas ${detail.stock}`
                  : ""}
              </p>
              {detail.description && (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {detail.description}
                </p>
              )}
              {!!detail.colors?.length && (
                <div className="mt-4">
                  <p className="text-xs font-semibold">Cores</p>
                  <ul className="mt-1.5 flex flex-wrap gap-2">
                    {detail.colors.map((c) => (
                      <li
                        key={c.name}
                        className={`flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-xs ${c.stock <= 0 ? "opacity-50 line-through" : ""}`}
                      >
                        <span
                          className="size-3.5 rounded-full border border-border"
                          style={{ background: c.hex }}
                          aria-hidden="true"
                        />
                        {c.name}
                        {c.stock <= 0 ? " (esgotada)" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-auto pt-5">
                <button
                  type="button"
                  disabled={!productStatus(detail).buyable}
                  onClick={() => addToCart(detail)}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-45"
                  style={{ background: accent }}
                >
                  <ShoppingCart size={18} /> Adicionar ao carrinho
                </button>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChatDraft(
                        detail.code
                          ? `Tenho uma dúvida sobre o produto ${detail.code} (${detail.name}).`
                          : `Tenho uma dúvida sobre o produto ${detail.name}.`,
                      );
                      setDetail(null);
                      setChat(true);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border text-xs font-semibold transition hover:bg-muted"
                  >
                    <MessageCircle size={15} /> Perguntar
                  </button>
                  {detail.share_code ? (
                    <>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `${detail.name} por ${money(detail.price_cents)} na ${vendor.name}:\n${window.location.origin}/p/${detail.share_code}`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border text-xs font-semibold transition hover:bg-muted"
                      >
                        <Share2 size={15} className="text-[#25D366]" /> WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard
                            ?.writeText(`${window.location.origin}/p/${detail.share_code}`)
                            .then(() => {
                              setLinkCopied(true);
                              setTimeout(() => setLinkCopied(false), 2000);
                            });
                        }}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border text-xs font-semibold transition hover:bg-muted"
                      >
                        {linkCopied ? <Check size={15} /> : <Copy size={15} />}
                        {linkCopied ? "Copiado" : "Copiar link"}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {share && <ShareSheet vendor={vendor} onClose={() => setShare(false)} />}
    </div>
  );
}

function ShareSheet({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const url = shortStoreUrl(vendor.slug);
  const [copied, setCopied] = useState(false);
  const native = typeof navigator !== "undefined" && typeof navigator.share === "function";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compartilhar loja"
      className="fixed inset-0 z-[95] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="nv-fade-in w-full max-w-sm rounded-3xl bg-card p-5 text-center shadow-2xl">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-8 place-items-center rounded-full hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>
        <p className="font-display text-lg font-extrabold">{vendor.name}</p>
        <p className="text-sm text-muted-foreground">Aponte a câmera para abrir a loja.</p>
        <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-3 ring-1 ring-border">
          <QrImage
            text={url}
            size={200}
            label={`QR Code da loja ${vendor.name}`}
            badge={{
              initials: ini(vendor.name),
              color: vendor.accent_hex ?? "#0e7a5f",
              logo: vendor.logo_url,
            }}
          />
        </div>
        <p className="mt-3 truncate rounded-lg bg-muted px-3 py-2 font-mono text-xs">
          {url.replace("https://", "")}
        </p>
        <div className="mt-3 grid grid-cols-4 gap-1.5 text-[11.5px] font-bold">
          {socialLinks(vendor.name, url).map((l) => (
            <a
              key={l.key}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="grid h-10 place-items-center rounded-xl text-white hover:brightness-110"
              style={{ background: l.color }}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-[12px] font-semibold">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(url).then(() => setCopied(true));
            }}
            className="h-10 rounded-xl border border-border hover:bg-muted"
          >
            {copied ? "Copiado" : "Copiar link"}
          </button>
          <button
            type="button"
            onClick={() => void downloadStoreCard(vendor)}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-border hover:bg-muted"
          >
            <QrCode size={14} /> Cartão
          </button>
          <button
            type="button"
            disabled={!native}
            onClick={() =>
              void navigator.share?.({
                title: vendor.name,
                text: `Conheça a ${vendor.name} na NextVita`,
                url,
              })
            }
            className="h-10 rounded-xl border border-border hover:bg-muted disabled:opacity-40"
          >
            Mais…
          </button>
        </div>
      </div>
    </div>
  );
}

function VendorCheckout({
  vendor,
  products,
  onClose,
  onChat,
}: {
  vendor: Vendor;
  products: VendorProduct[];
  onClose: () => void;
  onChat: () => void;
}) {
  const navigate = useNavigate();
  const lines = useVCart(vendor.id);
  const isLogged = useSignedIn();
  const accent = vendor.accent_hex ?? "#0e7a5f";
  // Todos os itens guardados (inclusive esgotados, que aparecem riscados).
  const allItems = lines
    .map((l) => ({ ...l, p: products.find((p) => p.id === l.product_id) }))
    .filter((x) => x.p) as { product_id: string; qty: number; p: VendorProduct }[];
  // Só entram no pedido os que ainda têm estoque.
  const items = allItems.filter((i) => productStatus(i.p).buyable);
  const subtotal = items.reduce((a, i) => a + i.p.price_cents * i.qty, 0);
  // Estoque baixou: ajusta a quantidade guardada para o que ainda existe.
  const [stockNote, setStockNote] = useState("");
  useEffect(() => {
    const over = allItems.filter((i) => {
      const st = productStatus(i.p);
      return st.buyable && i.qty > (isLogged ? st.max : 1);
    });
    if (!over.length) return;
    over.forEach((i) => vcart.setQty(vendor.id, i.p.id, i.qty, productStatus(i.p).max));
    if (isLogged)
      setStockNote(
        `O estoque mudou: ajustamos ${over.map((i) => i.p.name).join(", ")} para as unidades disponíveis.`,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allItems.map((i) => [i.p.id, i.qty, i.p.stock, i.p.availability])), isLogged]);
  const [step, setStep] = useState<"cart" | "dados">("cart");
  const [mode, setMode] = useState<"retirada" | "entrega">(
    vendor.offers_pickup ? "retirada" : "entrega",
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [cpf, setCpf] = useState("");
  const [city, setCity] = useState<string>(vendor.city.replace(/,\s*AC$/i, ""));
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [quoteErr, setQuoteErr] = useState("");
  const [signedIn, setSignedIn] = useState(true);
  const [pay, setPay] = useState("pix");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fee =
    mode === "entrega"
      ? vendor.free_delivery_from_cents && subtotal >= vendor.free_delivery_from_cents
        ? 0
        : Math.max(MIN_DELIVERY_FEE_CENTS, vendor.delivery_fee_cents)
      : 0;
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponErr, setCouponErr] = useState("");
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const itemsPayload = items.map((i) => ({ product_id: i.product_id, qty: i.qty }));
  const itemsKey = JSON.stringify(itemsPayload);
  useEffect(() => {
    const itemsArg = JSON.parse(itemsKey) as { product_id: string; qty: number }[];
    if (!itemsArg.length) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await (supabase as any).rpc("care_store_quote_checkout", {
        p_vendor_id: vendor.id,
        p_items: itemsArg,
        p_fulfillment: mode,
        p_coupon: coupon,
        p_city: city,
        p_lat: coords?.lat ?? null,
        p_lng: coords?.lng ?? null,
      });
      if (cancelled) return;
      if (error) {
        const m = String(error.message ?? "");
        setQuote(null);
        setQuoteErr(
          m.includes("Delivery minimum")
            ? `Para receber em casa, o pedido precisa ter pelo menos ${money(vendor.min_delivery_order_cents ?? 3000)} em produtos.`
            : m.includes("Delivery out of range")
              ? `Entregamos de moto-taxi só em ${vendor.city.replace(/,\s*AC$/i, "")}, até ${vendor.delivery_max_km ?? 8} km da loja. Escolha retirar na loja ou fale com a loja.`
              : "",
        );
        if (coupon) {
          setCoupon(null);
          setCouponErr(
            m.includes("Authentication required")
              ? "Entre na sua conta para aplicar o cupom."
              : couponErrorMessage(m),
          );
        }
        return;
      }
      setQuoteErr("");
      setQuote(data as CartQuote);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    itemsKey,
    mode,
    coupon,
    vendor.id,
    city,
    coords,
    vendor.city,
    vendor.min_delivery_order_cents,
    vendor.delivery_max_km,
  ]);
  const minCard = quote?.min_card_cents ?? vendor.min_card_order_cents ?? 0;
  const shownFee = quote ? quote.fee_cents : fee;
  const shownTotal = quote ? quote.total_cents : subtotal + fee;
  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      setSignedIn(!!data.user);
      try {
        if (data.user && window.localStorage.getItem("nv_checkout_open") === vendor.slug) {
          window.localStorage.removeItem("nv_checkout_open");
          setStep("dados");
        }
      } catch {
        /* ok */
      }
      const m = data.user?.user_metadata;
      if (m?.full_name || m?.name) setName(String(m.full_name ?? m.name));
      if (!data.user) return;
      // Cliente que já comprou (ou se cadastrou): preenche os dados sozinho.
      const { data: saved } = await (supabase as any)
        .from("care_customer_checkout")
        .select("full_name,cpf,phone,city,address")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (saved) {
        if (saved.full_name) setName(saved.full_name);
        if (saved.cpf) setCpf(formatCpf(saved.cpf));
        if (saved.phone) setPhone(saved.phone);
        if (saved.city) setCity(saved.city);
        if (saved.address) setAddress(saved.address);
      } else if (m?.phone) setPhone(String(m.phone));
    });
  }, [vendor.slug]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  /** Visitante pode montar a cesta; para fechar o pedido precisa se cadastrar e confirmar o e-mail. */
  async function goCheckout() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      try {
        const back = `/${vendor.slug}`;
        window.sessionStorage.setItem("nv_after_login", back);
        window.localStorage.setItem("nv_after_login", back);
        window.localStorage.setItem("nv_checkout_open", vendor.slug);
      } catch {
        /* ok */
      }
      window.location.assign("/entrar?mode=signup");
      return;
    }
    setStep("dados");
  }

  async function place(e: FormEvent) {
    e.preventDefault();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      try {
        window.sessionStorage.setItem("nv_after_login", `/loja?loja=${vendor.slug}`);
      } catch {
        /* ok */
      }
      window.location.assign("/entrar");
      return;
    }
    if (name.trim().length < 3) return setErr("Informe seu nome completo.");
    if (!isValidCpf(cpf)) return setErr("Informe um CPF válido.");
    if (phone.replace(/\D/g, "").length < 10) return setErr("Informe o WhatsApp com DDD.");
    if (pay === "cartao" && minCard && shownTotal < minCard)
      return setErr(`Cartão a partir de ${money(minCard)}. Escolha Pix ou aumente o pedido.`);
    if (mode === "entrega" && address.trim().length < 8)
      return setErr("Informe o endereço de entrega.");
    setErr("");
    setBusy(true);
    const { data: id, error } = await (supabase as any).rpc("care_store_place_checkout", {
      p_vendor_id: vendor.id,
      p_items: itemsPayload,
      p_fulfillment: mode,
      p_name: name.trim(),
      p_phone: phone.trim(),
      p_cpf: cpf,
      p_city: city,
      p_address: address.trim() || null,
      p_payment: pay,
      p_notes: notes.trim() || null,
      p_coupon: coupon,
      p_lat: coords?.lat ?? null,
      p_lng: coords?.lng ?? null,
    });
    setBusy(false);
    if (error) {
      const m = String(error.message ?? "");
      if (m.includes("Coupon:")) {
        setCoupon(null);
        return setErr(couponErrorMessage(m));
      }
      if (m.includes("Card minimum")) return setErr("Valor abaixo do mínimo para pagar no cartão.");
      if (m.includes("CPF invalid")) return setErr("Informe um CPF válido.");
      if (m.includes("Delivery"))
        return setErr(quoteErr || "Entrega indisponível para este pedido.");
      return setErr(
        m.includes("Out of stock")
          ? "Um dos produtos acabou de esgotar. Ajuste a quantidade e tente de novo."
          : "Não foi possível fazer o pedido. Confira os dados e tente de novo.",
      );
    }
    vcart.clear(vendor.id);
    onClose();
    void navigate({ to: "/loja", search: { pedido: id } as never });
  }

  const field =
    "mt-1 block h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm font-normal";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Carrinho da loja"
      className="fixed inset-0 z-[95] flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="nv-fade-in flex h-full w-full max-w-md flex-col bg-card shadow-2xl">
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          {step === "dados" && (
            <button
              type="button"
              onClick={() => setStep("cart")}
              aria-label="Voltar ao carrinho"
              className="grid size-8 place-items-center rounded-lg hover:bg-muted"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold">
              {step === "cart" ? "Seu carrinho" : "Finalizar pedido"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{vendor.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-8 place-items-center rounded-lg hover:bg-muted"
          >
            <X size={17} />
          </button>
        </header>
        {step === "cart" ? (
          <>
            {(allItems.length > 0 || stockNote) && (
              <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-2 text-xs">
                <span className="text-muted-foreground">
                  {allItems.length} produto{allItems.length === 1 ? "" : "s"}
                  {!isLogged ? " · sem login: 1 unidade de cada" : ""}
                </span>
                {allItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      vcart.clear(vendor.id);
                      setStockNote("");
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline dark:text-rose-300"
                  >
                    <Trash2 size={13} /> Limpar carrinho
                  </button>
                )}
              </div>
            )}
            {stockNote && (
              <p
                role="status"
                className="border-b border-border bg-amber-500/10 px-5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200"
              >
                {stockNote}
              </p>
            )}
            <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
              {allItems.map(({ p, qty }) => {
                const st = productStatus(p);
                const gone = !st.buyable;
                const cap = isLogged ? st.max : 1;
                return (
                  <li
                    key={p.id}
                    className={`flex items-center gap-3 px-5 py-3 ${gone ? "bg-muted/40" : ""}`}
                  >
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt=""
                        className={`size-14 rounded-xl bg-muted object-cover ${gone ? "opacity-40 grayscale" : ""}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`line-clamp-2 text-[13px] font-semibold ${gone ? "text-muted-foreground line-through" : ""}`}
                      >
                        {p.name}
                      </p>
                      {gone ? (
                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                          {st.label} · não entra no pedido
                        </p>
                      ) : (
                        <>
                          <p className="text-sm font-bold tabular-nums">
                            {money(p.price_cents * qty)}
                          </p>
                          {p.stock <= 5 && (
                            <p className="text-[11.5px] font-bold text-rose-600 dark:text-rose-400">
                              {p.stock === 1 ? "Última unidade!" : `Restam só ${p.stock} unidades`}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {gone ? (
                      <button
                        type="button"
                        onClick={() => vcart.remove(vendor.id, p.id)}
                        aria-label={`Remover ${p.name}`}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-rose-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : (
                      <div className="inline-flex items-center rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() => vcart.setQty(vendor.id, p.id, qty - 1, st.max)}
                          aria-label={`Diminuir ${p.name}`}
                          className="grid size-8 place-items-center hover:bg-muted"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-7 text-center text-sm font-bold tabular-nums">
                          {qty}
                        </span>
                        <button
                          type="button"
                          disabled={qty >= cap}
                          onClick={() => vcart.setQty(vendor.id, p.id, qty + 1, st.max)}
                          aria-label={`Aumentar ${p.name}`}
                          title={
                            !isLogged
                              ? "Entre na sua conta para escolher mais unidades"
                              : qty >= st.max
                                ? "Sem mais unidades em estoque"
                                : undefined
                          }
                          className="grid size-8 place-items-center hover:bg-muted disabled:opacity-40"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
              {!allItems.length && (
                <li className="grid place-items-center gap-2 px-6 py-20 text-center text-sm text-muted-foreground">
                  <ShoppingCart size={24} />
                  Seu carrinho desta loja está vazio.
                </li>
              )}
            </ul>
            <footer className="grid gap-3 border-t border-border p-5">
              <form
                className="grid gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const code = normalizeCode(couponInput);
                  if (!code) return;
                  setCouponErr("");
                  setCoupon(code);
                  setCouponInput("");
                }}
              >
                <label className="text-[13px] font-semibold" htmlFor="cupom-carrinho">
                  Cupom de desconto
                </label>
                {coupon && quote?.coupon_code ? (
                  <p className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 text-sm">
                    <span>
                      <strong>{quote.coupon_code}</strong> aplicado
                    </span>
                    <button
                      type="button"
                      onClick={() => setCoupon(null)}
                      className="text-xs font-semibold underline underline-offset-2"
                    >
                      Remover
                    </button>
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <input
                      id="cupom-carrinho"
                      className={`${field} mt-0 uppercase`}
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Digite o código"
                      autoComplete="off"
                      disabled={!items.length}
                    />
                    <button
                      type="submit"
                      disabled={!items.length || !couponInput.trim()}
                      className="h-10 shrink-0 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-45"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
                {couponErr && (
                  <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">
                    {couponErr}
                  </p>
                )}
              </form>
              <p className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <strong className="tabular-nums">{money(quote?.list_cents ?? subtotal)}</strong>
              </p>
              {quote && quote.promo_cents > 0 && (
                <p className="flex justify-between text-sm text-emerald-700 dark:text-emerald-300">
                  <span>Promoções</span>
                  <strong className="tabular-nums">− {money(quote.promo_cents)}</strong>
                </p>
              )}
              {quote && quote.discount_cents > 0 && (
                <p className="flex justify-between text-sm text-emerald-700 dark:text-emerald-300">
                  <span>Cupom {quote.coupon_code}</span>
                  <strong className="tabular-nums">− {money(quote.discount_cents)}</strong>
                </p>
              )}
              {STORE_LIVE ? (
                <button
                  type="button"
                  disabled={!items.length}
                  onClick={() => void goCheckout()}
                  className="h-12 rounded-xl text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-45"
                  style={{ background: accent }}
                >
                  Continuar
                </button>
              ) : (
                <p className="rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-center text-xs text-muted-foreground">
                  Compras em breve. A loja está em fase de implantação; seu carrinho fica guardado.
                </p>
              )}
            </footer>
          </>
        ) : (
          <form onSubmit={place} className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto p-5">
              <div role="radiogroup" aria-label="Como receber" className="grid grid-cols-2 gap-2">
                {(["retirada", "entrega"] as const).map((m) => {
                  const ok = m === "retirada" ? vendor.offers_pickup : vendor.offers_delivery;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={mode === m}
                      disabled={!ok}
                      onClick={() => setMode(m)}
                      className={`rounded-xl border p-3 text-left transition disabled:opacity-40 ${mode === m ? "border-transparent ring-2" : "border-border"}`}
                      style={mode === m ? { ["--tw-ring-color" as string]: accent } : undefined}
                    >
                      {m === "retirada" ? <Store size={17} /> : <Truck size={17} />}
                      <p className="mt-1 text-sm font-bold">
                        {m === "retirada" ? "Retirar na loja" : "Receber em casa"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {m === "retirada"
                          ? `Pronto em ~${vendor.prep_minutes ?? 30} min · grátis`
                          : ok
                            ? `Taxa a partir de ${money(Math.max(MIN_DELIVERY_FEE_CENTS, vendor.delivery_fee_cents))}`
                            : "Indisponível"}
                      </p>
                    </button>
                  );
                })}
              </div>
              <label className="text-[13px] font-semibold">
                Nome
                <input
                  className={field}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={80}
                />
              </label>
              <label className="text-[13px] font-semibold">
                WhatsApp com DDD
                <input
                  className={field}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(68) 90000-0000"
                />
              </label>
              <label className="text-[13px] font-semibold">
                CPF
                <input
                  className={field}
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                />
              </label>
              <label className="text-[13px] font-semibold">
                Cidade
                <select className={field} value={city} onChange={(e) => setCity(e.target.value)}>
                  {ACRE_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              {mode === "entrega" && (
                <>
                  <label className="text-[13px] font-semibold">
                    Endereço
                    <input
                      className={field}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      autoComplete="street-address"
                      placeholder="Rua, número, bairro e referência"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      navigator.geolocation?.getCurrentPosition(
                        (g) => setCoords({ lat: g.coords.latitude, lng: g.coords.longitude }),
                        () => setErr("Não foi possível obter sua localização."),
                        { timeout: 8000 },
                      )
                    }
                    className="justify-self-start text-xs font-semibold underline underline-offset-2"
                  >
                    {coords
                      ? `Localização usada no cálculo${quote?.km ? ` · ${quote.km} km da loja` : ""}`
                      : "Usar minha localização para calcular a entrega"}
                  </button>
                  {quoteErr && (
                    <p role="alert" className="rounded-lg bg-amber-500/10 p-2.5 text-xs">
                      {quoteErr}
                    </p>
                  )}
                </>
              )}
              <fieldset>
                <legend className="text-[13px] font-semibold">Pagamento</legend>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {[
                    ["pix", "Pix"],
                    ["cartao", "Cartão"],
                    ...(mode === "retirada" ? [["dinheiro", "Dinheiro na retirada"]] : []),
                  ].map(([k, l]) => (
                    <label
                      key={k}
                      className={`flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[13px] ${pay === k ? "border-transparent font-semibold ring-2" : "border-border"}`}
                      style={pay === k ? { ["--tw-ring-color" as string]: accent } : undefined}
                    >
                      <input
                        type="radio"
                        name="pay"
                        value={k}
                        checked={pay === k}
                        onChange={() => setPay(k)}
                        className="sr-only"
                      />
                      {l}
                    </label>
                  ))}
                </div>
                {minCard > 0 && (
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    Cartão a partir de {money(minCard)}.
                  </p>
                )}
              </fieldset>
              <label className="text-[13px] font-semibold">
                Observação
                <input
                  className={field}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={200}
                  placeholder="Opcional"
                />
              </label>
              <p className="rounded-lg bg-muted px-3 py-2 text-[11.5px] leading-snug text-muted-foreground">
                Ao confirmar, você acompanha cada etapa do pedido no seu painel, até a retirada ou
                entrega. Trocas e devoluções seguem o prazo de 7 dias do Código de Defesa do
                Consumidor, combinadas com a loja.
              </p>
              <button
                type="button"
                onClick={onChat}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border text-[13px] font-semibold hover:bg-muted"
              >
                Falar com a loja antes de fechar
              </button>
              {err && (
                <p
                  role="alert"
                  className="rounded-lg bg-rose-500/10 p-2.5 text-sm text-rose-700 dark:text-rose-300"
                >
                  {err}
                </p>
              )}
            </div>
            <footer className="grid gap-2 border-t border-border p-5 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Produtos</span>
                <span className="tabular-nums">{money(quote?.subtotal_cents ?? subtotal)}</span>
              </p>
              {quote && quote.discount_cents > 0 && (
                <p className="flex justify-between text-emerald-700 dark:text-emerald-300">
                  <span>Cupom {quote.coupon_code}</span>
                  <span className="tabular-nums">− {money(quote.discount_cents)}</span>
                </p>
              )}
              <p className="flex justify-between">
                <span className="text-muted-foreground">Entrega</span>
                <span className="tabular-nums">
                  {mode === "entrega" ? (shownFee ? money(shownFee) : "Grátis") : "—"}
                </span>
              </p>
              <p className="flex justify-between text-base font-extrabold">
                <span>Total</span>
                <span className="tabular-nums">{money(shownTotal)}</span>
              </p>
              <button
                type="submit"
                disabled={busy || !items.length || (mode === "entrega" && !!quoteErr)}
                className="mt-1 h-12 rounded-xl text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                style={{ background: accent }}
              >
                {busy ? "Enviando…" : "Confirmar pedido"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
