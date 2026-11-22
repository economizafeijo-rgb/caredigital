import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Gem,
  Leaf,
  Minus,
  Pill,
  Plus,
  Shirt,
  ShoppingCart,
  Sparkles,
  Store,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import {
  cart,
  categories,
  money,
  PIX_DISCOUNT,
  products,
  useCart,
  vendors,
  type Product,
  type StoreCategory,
} from "@/lib/store";
import { productStatus, segmentLabel } from "@/lib/marketplace";
import { useLiveStores } from "./LiveStores";
import { openProduct } from "./StoreViews";
import { CartDrawer, Checkout } from "./StorePage";
import { CampaignTeaser, CampaignTicker, FlashDeals } from "./store/StorePromos";
import { currentCampaign } from "@/lib/store-promos";

type Filter = StoreCategory | "todos";

const pixPrice = (cents: number) => Math.round(cents * (1 - PIX_DISCOUNT));
const offOf = (price: number, old?: number | null) =>
  old ? Math.round((1 - price / old) * 100) : 0;

const bestSellers = [
  "whey-900",
  "conjunto-fem-1",
  "oleo-copaiba",
  "multivitaminico",
  "camiseta-regata",
  "guarana-po",
  "pre-treino",
  "halteres",
  "conjunto-fem-2",
  "tapete",
  "vitamina-d",
];

/** Superfície comum dos cards de produto: clara e curta, para vender sem ocupar a tela. */
const tile =
  "group flex w-[9.75rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-[0_10px_26px_-18px_rgba(0,0,0,.85)] ring-1 ring-black/5 transition-[transform,box-shadow] duration-200 [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:shadow-[0_18px_34px_-18px_rgba(0,0,0,.9)] sm:w-[11.25rem]";

function SectionHead({
  title,
  sub,
  to,
  cta,
}: {
  title: string;
  sub?: string;
  to?: string;
  cta?: string;
}) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-muted-foreground sm:text-sm">{sub}</p>}
      </div>
      {to && cta && (
        <Link
          to={to}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[13px] font-bold transition-colors hover:border-primary/50 hover:text-primary"
        >
          {cta} <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
        </Link>
      )}
    </header>
  );
}

/* ----------------------------------------------------------- Vitrine */

const categoryStyle: Record<StoreCategory, { icon: LucideIcon; color: string }> = {
  suplementos: { icon: Pill, color: "#a78bfa" },
  vitaminas: { icon: Sparkles, color: "#fbbf24" },
  nutricao: { icon: Utensils, color: "#34d399" },
  fitoterapicos: { icon: Leaf, color: "#4ade80" },
  "roupas-masculinas": { icon: Shirt, color: "#38bdf8" },
  "roupas-femininas": { icon: Shirt, color: "#f472b6" },
  acessorios: { icon: Gem, color: "#fb923c" },
};

function CategoryTiles({ active, onPick }: { active: Filter; onPick: (f: Filter) => void }) {
  const list = categories.filter(
    (c): c is { key: StoreCategory; label: string } => c.key !== "todos",
  );
  return (
    <div
      role="group"
      aria-label="Compre por categoria"
      className="-mx-3 flex snap-x gap-2.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-7 [&::-webkit-scrollbar]:hidden"
    >
      {list.map((c) => {
        const st = categoryStyle[c.key];
        const n = products.filter((p) => p.category === c.key).length;
        if (!n) return null;
        const on = active === c.key;
        return (
          <button
            key={c.key}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(on ? "todos" : c.key)}
            style={{ "--cat": st.color } as CSSProperties}
            className={`group flex w-[8.25rem] shrink-0 snap-start flex-col items-start gap-3 rounded-2xl border p-3.5 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[.98] motion-reduce:active:scale-100 sm:w-auto ${on ? "border-[var(--cat)] bg-[color-mix(in_srgb,var(--cat)_14%,transparent)]" : "border-border bg-card [@media(hover:hover)]:hover:border-[color-mix(in_srgb,var(--cat)_55%,transparent)]"}`}
          >
            <span
              className="grid size-11 place-items-center rounded-xl"
              style={{
                background: `color-mix(in srgb, ${st.color} 18%, transparent)`,
                color: st.color,
              }}
            >
              <st.icon size={22} aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <strong className="block text-sm font-bold">{c.label}</strong>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {n} {n === 1 ? "produto" : "produtos"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ProductTile({ p, qty, onAdd }: { p: Product; qty: number; onAdd: (p: Product) => void }) {
  const off = offOf(p.priceCents, p.oldPriceCents);
  return (
    <article className={tile}>
      <button
        type="button"
        onClick={() => openProduct(p.id)}
        aria-label={`Ver detalhes de ${p.name}`}
        className="relative block cursor-zoom-in overflow-hidden bg-[#eceef0]"
      >
        <img
          src={p.img}
          alt={p.name}
          width={360}
          height={360}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full object-cover motion-safe:transition motion-safe:duration-500 [@media(hover:hover)]:group-hover:scale-105"
        />
        {off > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-slate-950">
            −{off}%
          </span>
        )}
        {p.tag && (
          <span className="absolute bottom-2 left-2 rounded-full bg-slate-900/85 px-2 py-0.5 text-[11px] font-semibold text-white">
            {p.tag}
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="line-clamp-2 min-h-[2.5em] text-[13px] font-semibold leading-tight">
          {p.name}
        </h3>
        <strong className="mt-1.5 block whitespace-nowrap text-[15px] font-extrabold tabular-nums">
          {money(p.priceCents)}
        </strong>
        <span className="block h-4 whitespace-nowrap text-[11px] leading-4 text-slate-500 tabular-nums">
          {p.oldPriceCents ? (
            <>
              <span className="sr-only">Antes: </span>
              <s>{money(p.oldPriceCents)}</s>
            </>
          ) : null}
        </span>
        <p className="mb-2 text-[11.5px] font-semibold text-emerald-700 tabular-nums">
          {money(pixPrice(p.priceCents))} no Pix
        </p>
        {qty > 0 ? (
          <div className="mt-auto flex h-9 items-center justify-between rounded-lg bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600/30">
            <button
              type="button"
              onClick={() => cart.setQty(p.id, qty - 1)}
              aria-label={
                qty === 1 ? `Remover ${p.name} do carrinho` : `Diminuir quantidade de ${p.name}`
              }
              className="grid size-9 place-items-center rounded-l-lg hover:bg-emerald-100"
            >
              <Minus size={14} aria-hidden="true" />
            </button>
            <span className="inline-flex items-center gap-1 text-xs font-bold">
              <Check size={13} aria-hidden="true" /> {qty}
            </span>
            <button
              type="button"
              onClick={() => cart.setQty(p.id, qty + 1)}
              disabled={qty >= 20}
              aria-label={`Aumentar quantidade de ${p.name}`}
              className="grid size-9 place-items-center rounded-r-lg hover:bg-emerald-100 disabled:opacity-40"
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onAdd(p)}
            className="mt-auto inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-700 text-xs font-bold text-white transition hover:bg-emerald-600 active:scale-[.97] motion-reduce:active:scale-100"
          >
            <ShoppingCart size={14} aria-hidden="true" /> Adicionar
          </button>
        )}
      </div>
    </article>
  );
}

function Rail({
  label,
  children,
  railKey,
}: {
  label: string;
  children: ReactNode;
  railKey?: string;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const go = (dir: number) => {
    const el = rail.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  };
  return (
    <div className="relative">
      <div
        ref={rail}
        key={railKey}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="nv-fade-in -mx-3 flex snap-x snap-mandatory scroll-px-3 gap-3 overflow-x-auto px-3 pb-2 pt-1 [scrollbar-width:none] sm:-mx-4 sm:scroll-px-4 sm:px-4 lg:mx-0 lg:scroll-px-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Ver produtos anteriores"
        className="absolute -left-3 top-[5.5rem] hidden size-10 place-items-center rounded-full bg-white text-slate-900 shadow-lg ring-1 ring-black/10 transition hover:scale-105 lg:grid"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Ver mais produtos"
        className="absolute -right-3 top-[5.5rem] hidden size-10 place-items-center rounded-full bg-white text-slate-900 shadow-lg ring-1 ring-black/10 transition hover:scale-105 lg:grid"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

function LiveNews() {
  const { products: live } = useLiveStores();
  const items = useMemo(() => live.slice(0, 18), [live]);
  if (!items.length) return null;
  return (
    <section aria-labelledby="live-news-title" className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2
            id="live-news-title"
            className="font-display text-xl font-extrabold tracking-tight sm:text-2xl"
          >
            Novidades das lojas de Feijó
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground sm:text-sm">
            Produtos que acabaram de chegar nas lojas parceiras.
          </p>
        </div>
        <Link
          to="/nossos-parceiros"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[13px] font-bold transition-colors hover:border-primary/50 hover:text-primary"
        >
          Conheça os parceiros <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
        </Link>
      </div>
      <Rail label="Novidades das lojas de Feijó">
        {items.map((p) => {
          const st = productStatus(p);
          const off = offOf(p.price_cents, p.old_price_cents);
          return (
            <Link
              key={p.id}
              to="/loja"
              search={{ loja: p.vendor.slug } as never}
              aria-label={`${p.name}, ${money(p.price_cents)}, loja ${p.vendor.name}`}
              className={tile}
            >
              <span className="relative block overflow-hidden bg-[#f3eef2]">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                    alt=""
                    width={360}
                    height={360}
                    loading="lazy"
                    decoding="async"
                    className={`aspect-square w-full object-cover motion-safe:transition motion-safe:duration-500 [@media(hover:hover)]:group-hover:scale-105 ${st.buyable ? "" : "opacity-50 grayscale"}`}
                  />
                ) : (
                  <span className="grid aspect-square w-full place-items-center text-xs text-slate-500">
                    Sem foto
                  </span>
                )}
                {off > 0 && (
                  <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-slate-950">
                    −{off}%
                  </span>
                )}
                {!st.buyable && (
                  <span className="absolute left-2 top-2 rounded-full bg-slate-900/85 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {st.label}
                  </span>
                )}
              </span>
              <span className="flex flex-1 flex-col p-2.5">
                <span
                  className="truncate text-[11px] font-bold"
                  style={{ color: p.vendor.accent_hex ?? "#047857" }}
                >
                  {p.vendor.name}
                </span>
                <span className="mt-0.5 line-clamp-2 min-h-[2.5em] text-[13px] font-semibold leading-tight">
                  {p.name}
                </span>
                <strong className="mt-1.5 block whitespace-nowrap text-[15px] font-extrabold tabular-nums">
                  {money(p.price_cents)}
                </strong>
                <span className="block h-4 whitespace-nowrap text-[11px] leading-4 text-slate-500 tabular-nums">
                  {p.old_price_cents ? <s>{money(p.old_price_cents)}</s> : null}
                </span>
              </span>
            </Link>
          );
        })}
      </Rail>
    </section>
  );
}

function FeaturedStore() {
  const { products: live } = useLiveStores();
  const thumbs = live
    .filter((p) => p.vendor.slug === "kessia-digital-store" && p.image_url)
    .slice(0, 4);
  return (
    <Link
      to="/loja"
      search={{ loja: "kessia-digital-store" } as never}
      aria-label="Visitar a loja Kessia' Digital Store"
      className="group relative isolate grid grid-cols-[minmax(0,1fr)] items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-r from-[#4a0f3a] via-[#9b1860] to-[#6d3fd1] p-4 text-white shadow-card sm:grid-cols-[minmax(0,1fr)_auto] sm:p-6 lg:p-7"
    >
      <span
        aria-hidden="true"
        className="absolute -right-10 -top-16 -z-10 size-64 rounded-full bg-white/10 blur-2xl"
      />
      <span className="flex min-w-0 items-center gap-4">
        <img
          src="/loja/kessia/mark.svg"
          alt=""
          loading="lazy"
          className="size-14 shrink-0 rounded-full bg-white object-contain ring-4 ring-pink-200/50 sm:size-[4.5rem]"
        />
        <span className="min-w-0">
          <span className="inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-pink-100 ring-1 ring-white/20">
            Loja em destaque
          </span>
          <strong className="mt-1 block truncate font-display text-xl font-extrabold sm:text-2xl">
            Kessia' Digital Store
          </strong>
          <span className="block text-[13px] text-white/80 sm:text-sm">
            Moda fitness, beleza, bijuterias e moda regional · Feijó, AC
          </span>
        </span>
      </span>
      <span className="flex items-center gap-4 sm:justify-end">
        {thumbs.length > 0 && (
          <span className="hidden -space-x-3 lg:flex" aria-hidden="true">
            {thumbs.map((p) => (
              <img
                key={p.id}
                src={p.image_url!}
                onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                alt=""
                loading="lazy"
                className="size-14 rounded-full bg-white object-cover ring-2 ring-[#9b1860]"
              />
            ))}
          </span>
        )}
        <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-[#8a1459] transition group-hover:bg-pink-50">
          Visitar a loja <ArrowRight size={16} strokeWidth={2.6} aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

const STOP = new Set(["de", "da", "do", "das", "dos", "e", "&"]);
const initialsOf = (name: string) => {
  const w = name
    .replace(/[^\p{L}\p{N}\s&]/gu, "")
    .split(/\s+/)
    .filter((x) => x && !STOP.has(x.toLowerCase()));
  const two = w.length > 1 ? w[0][0] + w[1][0] : (w[0] ?? "?").slice(0, 2);
  return two.toUpperCase();
};

/** Card de loja: monograma na cor da loja quando não há logomarca, segmento, cidade e situação. */
function StoreRow({
  name,
  accent,
  logo,
  meta,
  count,
  search,
}: {
  name: string;
  accent: string;
  logo?: string | null;
  meta: string;
  count?: number;
  search: string;
}) {
  return (
    <Link
      to="/loja"
      search={{ loja: search } as never}
      aria-label={`Visitar a loja ${name}`}
      className="group flex items-center gap-3 p-3 transition-colors hover:bg-muted/50 sm:p-3.5"
    >
      {logo ? (
        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white p-0.5 ring-1 ring-black/10">
          <img
            src={logo}
            alt=""
            loading="lazy"
            onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            className="size-full object-contain"
          />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-[13px] font-bold"
          style={{ color: accent, background: `color-mix(in srgb, ${accent} 16%, transparent)` }}
        >
          {initialsOf(name)}
        </span>
      )}
      <span className="min-w-0 flex-1 leading-tight">
        <strong className="block truncate text-sm font-semibold">{name}</strong>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {count ? `${count} ${count === 1 ? "produto" : "produtos"} · ` : ""}
          {meta}
        </span>
      </span>
      <ArrowRight
        size={15}
        aria-hidden="true"
        className="shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
      />
    </Link>
  );
}

function PartnerStores() {
  const { vendors: live, products: liveProducts } = useLiveStores();
  const hasLive = live.length > 0;
  const countOf = (id: string) => liveProducts.filter((p) => p.vendor.id === id).length;
  return (
    <section
      aria-labelledby="stores-title"
      className="hidden grid-cols-[minmax(0,1fr)] gap-3 md:grid"
    >
      <SectionHead
        title="Lojas parceiras"
        sub={
          hasLive
            ? "Abra a vitrine de cada loja e compre direto."
            : "Exemplos de como as lojas aparecem na plataforma."
        }
        to="/nossos-parceiros"
        cta="Ver todas"
      />
      <h2 id="stores-title" className="sr-only">
        Lojas parceiras
      </h2>
      <ul className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card xl:grid-cols-4">
        {hasLive
          ? live.slice(0, 8).map((v) => (
              <li key={v.id} className="border-b border-r border-border">
                <StoreRow
                  name={v.name}
                  accent={v.accent_hex ?? "#0e7a5f"}
                  logo={v.logo_url}
                  meta={`${segmentLabel(v.segment)} · ${v.city.replace(", AC", "")}`}
                  count={countOf(v.id)}
                  search={v.slug}
                />
              </li>
            ))
          : vendors.slice(0, 8).map((v) => (
              <li key={v.id} className="border-b border-r border-border">
                <StoreRow
                  name={v.name}
                  accent={v.hex}
                  meta={`${v.sector} · ${v.city.replace(", AC", "")}`}
                  search={v.id}
                />
              </li>
            ))}
      </ul>
      <Link
        to="/parceiros"
        className="inline-flex items-center gap-1.5 justify-self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Tem uma loja em Feijó? <span className="font-semibold text-primary">Venda na NextVita</span>
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}

/** Vitrine completa da home: categorias que filtram, novidades reais, vendas da plataforma, destaque e lojas. */
export function HomeMarketplace() {
  const [filter, setFilter] = useState<Filter>("todos");
  const [announcement, setAnnouncement] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const campaign = useMemo(() => currentCampaign(), []);
  const { lines, count } = useCart();
  const qtyOf = (id: string) => lines.find((l) => l.id === id)?.qty ?? 0;
  const shown = useMemo(() => {
    if (filter !== "todos") return products.filter((p) => p.category === filter);
    const top = bestSellers.flatMap((id) => products.filter((p) => p.id === id));
    return [...top, ...products.filter((p) => !bestSellers.includes(p.id))];
  }, [filter]);
  const visibleCategories = categories.filter(
    (c) => c.key === "todos" || products.some((p) => p.category === c.key),
  );
  const pick = (f: Filter) => {
    setFilter(f);
    document.getElementById("ofertas")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };
  const add = (p: Product) => {
    cart.add(p.id);
    setAnnouncement(`${p.name} adicionado ao carrinho.`);
  };

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <CampaignTicker campaign={campaign} />

      <section aria-labelledby="cats-title" className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <SectionHead
          title="Compre por categoria"
          sub="Toque em uma categoria para ver as ofertas."
        />
        <h2 id="cats-title" className="sr-only">
          Categorias
        </h2>
        <CategoryTiles active={filter} onPick={pick} />
      </section>

      <LiveNews />

      <FeaturedStore />

      <FlashDeals campaign={campaign} />

      <section
        id="ofertas"
        aria-labelledby="offers-title"
        className="grid scroll-mt-20 grid-cols-[minmax(0,1fr)] gap-3"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2
              id="offers-title"
              className="font-display text-xl font-extrabold tracking-tight sm:text-2xl"
            >
              Mais vendidos
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground sm:text-sm">
              5% de desconto no Pix, cartão em até 3x e entrega ou retirada.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={
              count > 0
                ? `Abrir o carrinho: ${count} ${count === 1 ? "item" : "itens"}`
                : "Abrir o carrinho"
            }
            className="relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[13px] font-bold transition-colors hover:border-primary/50 hover:text-primary"
          >
            <ShoppingCart size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Carrinho</span>
            {count > 0 && (
              <span
                key={count}
                className="nv-bump grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground tabular-nums"
              >
                {count}
              </span>
            )}
          </button>
        </div>
        <div
          role="group"
          aria-label="Filtrar produtos por categoria"
          className="-mx-3 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {visibleCategories.map((c) => {
            const on = filter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(c.key)}
                className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold transition-colors ${on ? "bg-foreground text-background" : "border border-border bg-card hover:border-foreground/40"}`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <Rail label="Mais vendidos" railKey={filter}>
          {shown.map((p) => (
            <ProductTile key={p.id} p={p} qty={qtyOf(p.id)} onAdd={add} />
          ))}
        </Rail>
      </section>

      <PartnerStores />

      <CampaignTeaser />

      {count > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          aria-label={`Abrir carrinho, ${count} ${count === 1 ? "item" : "itens"}`}
          className="nv-fab fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[90] inline-flex h-14 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-extrabold text-white shadow-xl ring-4 ring-white/70 lg:bottom-6 dark:ring-slate-900/70"
        >
          <ShoppingCart size={22} /> Carrinho
          <span
            key={count}
            className="nv-heart-pop grid size-6 place-items-center rounded-full bg-emerald-400 text-xs text-slate-950"
          >
            {count}
          </span>
        </button>
      )}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setCheckout(true);
        }}
      />
      {checkout && <Checkout onClose={() => setCheckout(false)} />}
    </>
  );
}
