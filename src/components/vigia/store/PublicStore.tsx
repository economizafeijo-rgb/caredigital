import {
  useEffect,
  useMemo,
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
import { StoreStatusChip } from "./StoreLed";
import { useVCart, vcart } from "./vendorCart";
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
};
import { STORE_LIVE } from "@/lib/store";

type Sort = "relevancia" | "menor" | "desconto";
const offOf = (p: VendorProduct) =>
  p.old_price_cents ? Math.round((1 - p.price_cents / p.old_price_cents) * 100) : 0;
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

function PublicStore({ vendor, products }: { vendor: Vendor; products: VendorProduct[] }) {
  const navigate = useNavigate();
  const accent = vendor.accent_hex ?? "#0e7a5f";
  const [cat, setCat] = useState("todos");
  const [sort, setSort] = useState<Sort>("relevancia");
  const [cartOpen, setCartOpen] = useState(false);
  const [chat, setChat] = useState(false);
  const [chatDraft, setChatDraft] = useState<string | undefined>(undefined);
  const [detail, setDetail] = useState<VendorProduct | null>(null);
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
    <div className="flex flex-col gap-4" style={{ "--v": accent } as CSSProperties}>
      <nav aria-label="Caminho" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={() => void navigate({ to: "/loja" })}
          className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 font-semibold transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={15} /> Loja NextVita
        </button>
        <span aria-hidden>/</span>
        <span className="truncate font-semibold text-foreground">{vendor.name}</span>
        {vendor.is_demo && (
          <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 dark:text-amber-300">
            loja de teste
          </span>
        )}
      </nav>

      <section
        className="nv-dark relative isolate overflow-hidden rounded-3xl text-white shadow-pop"
        style={{
          background: `radial-gradient(120% 140% at 0% 0%, ${tint(70)} 0%, ${tint(32)} 45%, ${tint(12, "#070b14")} 100%)`,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[.06] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]"
        />
        <div className="grid items-center gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10 lg:p-8">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <span
                className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-xl font-black shadow-xl ring-4 ring-white/10 sm:size-[4.5rem]"
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
                <p className="text-xs font-semibold text-white/65">
                  Loja parceira NextVita · {vendor.city}
                </p>
                <h1 className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[2rem]">
                  {vendor.name}
                  {vendor.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-0.5 text-[11px] font-bold text-sky-200 ring-1 ring-white/15">
                      <BadgeCheck size={13} /> Verificada
                    </span>
                  )}
                </h1>
              </div>
            </div>
            {vendor.description && (
              <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-white/80 sm:text-[15px]">
                {vendor.description}
              </p>
            )}
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70">
              {vendor.address && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} /> {vendor.address}
                </span>
              )}
            </p>
            <div className="mt-3">
              <StoreStatusChip
                open={!!vendor.is_open && vendor.status === "ativo"}
                hours={vendor.opening_hours}
                dark
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setChatDraft(undefined);
                  setChat(true);
                }}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-white/90 active:scale-[.98]"
              >
                <MessageCircle size={16} /> Conversar com a loja
              </button>
              <button
                type="button"
                onClick={() => setShare(true)}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-4 text-sm font-semibold backdrop-blur transition hover:bg-white/15"
              >
                <Share2 size={15} /> Compartilhar
              </button>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[16.5rem] lg:mx-0">
            <div
              className="rounded-3xl border-t-[6px] bg-white p-4 text-slate-900 shadow-[0_28px_60px_-22px_rgba(0,0,0,.75)] ring-4 ring-white/15"
              style={{ borderTopColor: accent }}
            >
              <p className="text-center font-display text-[15px] font-extrabold leading-tight">
                Escaneie e abra a loja
              </p>
              <p className="mt-0.5 text-center text-xs text-slate-500">
                Aponte a câmera do celular
              </p>
              <div className="mx-auto mt-3 w-fit rounded-2xl p-1.5 ring-1 ring-slate-200">
                <QrImage
                  text={storeUrl}
                  size={176}
                  label={`QR Code da loja ${vendor.name}`}
                  badge={{
                    initials: ini(vendor.name),
                    color: accent,
                    logo: vendor.logo_url,
                  }}
                />
              </div>
              <p className="mt-2.5 truncate text-center font-mono text-[11px] text-slate-500">
                {storeUrl.replace("https://", "")}
              </p>
              <button
                type="button"
                onClick={() => void downloadQrPng(storeUrl, `qr-${vendor.slug}.png`)}
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-[13px] font-bold text-white transition hover:bg-slate-800 active:scale-[.98] motion-reduce:active:scale-100"
              >
                <Download size={15} aria-hidden="true" /> Baixar QR Code
              </button>
            </div>
          </div>
        </div>
        <ul className="grid grid-cols-2 border-t border-white/10 bg-black/20 sm:grid-cols-4">
          {[
            [
              Store,
              vendor.offers_pickup ? `Pronto em ~${vendor.prep_minutes ?? 30} min` : "Sem retirada",
              "Retirada na loja",
            ],
            [
              Truck,
              vendor.offers_delivery
                ? vendor.delivery_fee_cents
                  ? `${money(vendor.delivery_fee_cents)}${vendor.free_delivery_from_cents ? ` · grátis acima de ${money(vendor.free_delivery_from_cents)}` : ""}`
                  : "Grátis"
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Categorias"
          className="flex min-w-0 gap-1.5 overflow-x-auto [scrollbar-width:none]"
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
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Ordenar
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
              <div className="relative aspect-[4/3.6] overflow-hidden bg-gradient-to-b from-[#f2f3f5] to-[#dfe2e6]">
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
              </div>
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
                  <span className="mt-0.5 text-[10.5px] tabular-nums text-muted-foreground">
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
                <button
                  type="button"
                  disabled={out || inCart >= st.max}
                  onClick={() => {
                    vcart.add(vendor.id, p.id, st.max);
                    setAdded(p.id);
                  }}
                  className="mt-2.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold text-white transition hover:brightness-110 active:scale-[.97] disabled:opacity-45"
                  style={{ background: added === p.id ? "#059669" : accent }}
                >
                  {added === p.id ? (
                    <>
                      <CheckCircle2 size={15} /> Adicionado
                    </>
                  ) : out ? (
                    st.label
                  ) : (
                    <>
                      <ShoppingCart size={15} /> Adicionar{inCart ? ` (${inCart})` : ""}
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
                  className="mt-1.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border text-[12.5px] font-semibold transition hover:bg-muted"
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

      <button
        type="button"
        onClick={() => setCartOpen(true)}
        aria-label={`Abrir carrinho da loja, ${count} itens`}
        className="nv-fab fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[90] inline-flex h-14 items-center gap-2 rounded-full px-5 text-sm font-extrabold text-white shadow-xl ring-4 ring-white/70 dark:ring-slate-900/70"
        style={{ background: accent }}
      >
        <ShoppingCart size={21} /> Carrinho
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
        <VendorCheckout vendor={vendor} products={products} onClose={() => setCartOpen(false)} />
      )}
      {chat && (
        <CustomerChat vendor={vendor} onClose={() => setChat(false)} initialText={chatDraft} />
      )}
      {detail && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-6"
          onKeyDown={(e) => {
            if (e.key === "Escape") setDetail(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-detail-title"
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-card p-5 shadow-xl sm:max-w-lg sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {categoryName(detail.category)}
                  {detail.code ? ` · Código ${detail.code}` : ""}
                </p>
                <h2 id="product-detail-title" className="text-lg font-extrabold leading-tight">
                  {detail.name}
                </h2>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setDetail(null)}
                aria-label="Fechar"
                className="shrink-0 rounded-full p-2 hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>
            {detail.image_url && (
              <img
                src={detail.image_url}
                alt={detail.name}
                className="mt-3 aspect-[4/3] w-full rounded-2xl object-cover"
              />
            )}
            <p className="mt-3 flex flex-wrap items-baseline gap-2">
              <strong className="text-2xl font-extrabold tabular-nums">
                {money(detail.price_cents)}
              </strong>
              {detail.old_price_cents ? (
                <span className="text-sm text-muted-foreground line-through tabular-nums">
                  {money(detail.old_price_cents)}
                </span>
              ) : null}
              {detail.promo_percent ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Promoção −{detail.promo_percent}%
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {productStatus(detail).label}
              {productStatus(detail).buyable && detail.stock <= 3
                ? ` · últimas ${detail.stock}`
                : ""}
            </p>
            {!!detail.colors?.length && (
              <div className="mt-3">
                <p className="text-xs font-semibold">Cores</p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {detail.colors.map((c) => (
                    <li
                      key={c.name}
                      className={`flex items-center gap-1.5 text-xs ${c.stock <= 0 ? "opacity-50 line-through" : ""}`}
                    >
                      <span
                        className="size-4 rounded-full border border-border"
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
            {detail.description && (
              <p className="mt-3 text-sm text-muted-foreground">{detail.description}</p>
            )}
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={!productStatus(detail).buyable}
                onClick={() => {
                  vcart.add(vendor.id, detail.id, productStatus(detail).max);
                  setAdded(detail.id);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:opacity-45"
                style={{ background: accent }}
              >
                <ShoppingCart size={16} /> Adicionar ao carrinho
              </button>
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted"
              >
                <MessageCircle size={16} /> Perguntar sobre este produto
              </button>
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
}: {
  vendor: Vendor;
  products: VendorProduct[];
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const lines = useVCart(vendor.id);
  const accent = vendor.accent_hex ?? "#0e7a5f";
  const items = lines
    .map((l) => ({ ...l, p: products.find((p) => p.id === l.product_id) }))
    .filter((x) => x.p) as { product_id: string; qty: number; p: VendorProduct }[];
  const subtotal = items.reduce((a, i) => a + i.p.price_cents * i.qty, 0);
  const [step, setStep] = useState<"cart" | "dados">("cart");
  const [mode, setMode] = useState<"retirada" | "entrega">(
    vendor.offers_pickup ? "retirada" : "entrega",
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pay, setPay] = useState("pix");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fee =
    mode === "entrega"
      ? vendor.free_delivery_from_cents && subtotal >= vendor.free_delivery_from_cents
        ? 0
        : vendor.delivery_fee_cents
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
      const { data, error } = await (supabase as any).rpc("care_store_quote_order", {
        p_vendor_id: vendor.id,
        p_items: itemsArg,
        p_fulfillment: mode,
        p_coupon: coupon,
      });
      if (cancelled) return;
      if (error) {
        const m = String(error.message ?? "");
        setQuote(null);
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
      setQuote(data as CartQuote);
    })();
    return () => {
      cancelled = true;
    };
  }, [itemsKey, mode, coupon, vendor.id]);
  const shownFee = quote ? quote.fee_cents : fee;
  const shownTotal = quote ? quote.total_cents : subtotal + fee;
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const m = data.user?.user_metadata;
      if (m?.full_name || m?.name) setName(String(m.full_name ?? m.name));
    });
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

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
    if (phone.replace(/\D/g, "").length < 10) return setErr("Informe o WhatsApp com DDD.");
    if (mode === "entrega" && address.trim().length < 8)
      return setErr("Informe o endereço de entrega.");
    setErr("");
    setBusy(true);
    const { data: id, error } = await (supabase as any).rpc("care_store_place_order", {
      p_vendor_id: vendor.id,
      p_items: itemsPayload,
      p_fulfillment: mode,
      p_name: name.trim(),
      p_phone: phone.trim(),
      p_address: mode === "entrega" ? address.trim() : null,
      p_payment: pay,
      p_notes: notes.trim() || null,
      p_coupon: coupon,
    });
    setBusy(false);
    if (error) {
      const m = String(error.message ?? "");
      if (m.includes("Coupon:")) {
        setCoupon(null);
        return setErr(couponErrorMessage(m));
      }
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
            <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
              {items.map(({ p, qty }) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt=""
                      className="size-14 rounded-xl bg-muted object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] font-semibold">{p.name}</p>
                    <p className="text-sm font-bold tabular-nums">{money(p.price_cents * qty)}</p>
                  </div>
                  <div className="inline-flex items-center rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => vcart.setQty(vendor.id, p.id, qty - 1)}
                      aria-label={`Diminuir ${p.name}`}
                      className="grid size-8 place-items-center hover:bg-muted"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-7 text-center text-sm font-bold tabular-nums">{qty}</span>
                    <button
                      type="button"
                      disabled={qty >= productStatus(p).max}
                      onClick={() => vcart.setQty(vendor.id, p.id, qty + 1)}
                      aria-label={`Aumentar ${p.name}`}
                      className="grid size-8 place-items-center hover:bg-muted disabled:opacity-40"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </li>
              ))}
              {!items.length && (
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
                  onClick={() => setStep("dados")}
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
                            ? vendor.delivery_fee_cents
                              ? `Taxa ${money(vendor.delivery_fee_cents)}`
                              : "Grátis"
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
              {mode === "entrega" && (
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
                Ao confirmar, você recebe um código de retirada e o acompanhamento do pedido. A loja
                confirma o pagamento e começa a separar. Durante o pré-lançamento, os pedidos são de
                teste.
              </p>
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
                disabled={busy || !items.length}
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
