import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  ShoppingCart,
  Store,
} from "lucide-react";
import { StoreLed } from "./store/StoreLed";
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
import { CampaignTeaser, FlashDeals } from "./store/StorePromos";
import { currentCampaign } from "@/lib/store-promos";
import { PilotNotice } from "./store/PilotNotice";

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

/** Faixa com foto de fundo e véu escuro: dá cor e profundidade às seções de vitrine. */
function Band({
  src,
  tint,
  children,
  className = "",
  ...rest
}: {
  src: string;
  tint: string;
  children: ReactNode;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <section
      {...rest}
      className={`nv-dark relative isolate grid grid-cols-[minmax(0,1fr)] gap-4 overflow-hidden rounded-3xl p-4 text-white max-sm:-mx-3 max-sm:rounded-none sm:p-7 ${className}`}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 -z-20 size-full object-cover opacity-45"
      />
      <span aria-hidden="true" className={`absolute inset-0 -z-10 ${tint}`} />
      {children}
    </section>
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

/** Card de loja: logomarca (ou monograma neutro), quantidade de produtos, segmento e cidade. */
function StoreRow({
  name,
  logo,
  meta,
  count,
  search,
}: {
  name: string;
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
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-[12px] font-bold text-foreground ring-1 ring-border"
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

type MobileStore = {
  key: string;
  name: string;
  slug: string;
  logo?: string | null;
  accent: string;
  meta: string;
  open?: boolean;
  verified?: boolean;
  count: number;
  thumbs: string[];
};

/** Celular: vitrine deslizante das lojas parceiras, com logomarca, situação e prévia de produtos. */
function MobileStoreRail({ stores, total }: { stores: MobileStore[]; total: number }) {
  return (
    <section
      aria-labelledby="stores-title-m"
      className="nv-dark relative isolate -mx-3 overflow-hidden bg-[#06201e] py-6 text-white md:hidden"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_100%_0%,rgba(63,224,200,.28),transparent_60%),radial-gradient(80%_60%_at_0%_100%,rgba(232,54,143,.22),transparent_60%)]"
      />
      <div className="px-4">
        <p className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#7ff0dc]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-[#3fe0c8]/70 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-[#3fe0c8]" />
          </span>
          Compre de quem é daqui
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <h2
            id="stores-title-m"
            className="font-display text-[1.65rem] font-extrabold leading-[1.05] tracking-tight"
          >
            Lojas parceiras
            <span className="ml-2 align-middle text-[13px] font-bold text-[#3fe0c8] tabular-nums">
              {total}
            </span>
          </h2>
          <Link
            to="/nossos-parceiros"
            className="inline-flex h-9 shrink-0 items-center gap-1 bg-white/10 px-3 text-[13px] font-bold ring-1 ring-white/25 active:bg-white/20"
          >
            Ver todas <ArrowRight size={14} strokeWidth={2.6} aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-1 text-[13px] text-white/70">
          Deslize para conhecer e toque para entrar na vitrine.
        </p>
      </div>

      <ul className="mt-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stores.map((s) => (
          <li key={s.key} className="w-[15.5rem] shrink-0 snap-start">
            <Link
              to="/loja"
              search={{ loja: s.slug } as never}
              aria-label={`Entrar na loja ${s.name}`}
              className="flex h-full flex-col overflow-hidden bg-white text-slate-900 shadow-[0_18px_40px_-20px_rgba(0,0,0,.9)] active:scale-[.98] motion-reduce:active:scale-100"
            >
              <span
                className="relative flex h-[4.5rem] items-end px-3 pb-0"
                style={{
                  background: `linear-gradient(135deg, ${s.accent}, color-mix(in srgb, ${s.accent} 45%, #0a1226))`,
                }}
              >
                <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 bg-black/35 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                  {s.open !== undefined && <StoreLed open={s.open} />}
                  {s.open === undefined ? "Feijó" : s.open ? "Aberta" : "Fechada"}
                </span>
                <span className="grid size-14 translate-y-1/2 place-items-center overflow-hidden bg-white p-1 shadow-lg ring-2 ring-white">
                  {s.logo ? (
                    <img
                      src={s.logo}
                      alt=""
                      loading="lazy"
                      onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                      className="size-full object-contain"
                    />
                  ) : (
                    <span
                      className="grid size-full place-items-center text-[15px] font-extrabold text-white"
                      style={{ background: s.accent }}
                    >
                      {initialsOf(s.name)}
                    </span>
                  )}
                </span>
              </span>
              <span className="flex flex-1 flex-col px-3 pb-3 pt-9">
                <strong className="flex items-center gap-1 text-[15px] font-extrabold leading-tight">
                  <span className="truncate">{s.name}</span>
                  {s.verified && (
                    <BadgeCheck
                      size={15}
                      className="shrink-0 text-sky-600"
                      aria-label="Loja verificada"
                    />
                  )}
                </strong>
                <span className="mt-0.5 block truncate text-[12px] text-slate-500">
                  {s.count > 0 ? `${s.count} ${s.count === 1 ? "produto" : "produtos"} · ` : ""}
                  {s.meta}
                </span>
                {s.thumbs.length > 0 && (
                  <span className="mt-2.5 grid grid-cols-3 gap-1.5">
                    {s.thumbs.map((t, k) => (
                      <img
                        key={k}
                        src={t}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full bg-slate-100 object-cover"
                      />
                    ))}
                  </span>
                )}
                <span
                  className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 text-[13.5px] font-extrabold text-white"
                  style={{ background: s.accent }}
                >
                  <Store size={15} aria-hidden="true" /> Entrar na loja
                </span>
              </span>
            </Link>
          </li>
        ))}
        <li className="w-[11rem] shrink-0 snap-start">
          <Link
            to="/parceiros"
            className="flex h-full min-h-[14rem] flex-col justify-between bg-[#3fe0c8] p-4 text-slate-950"
          >
            <Store size={26} aria-hidden="true" />
            <span>
              <strong className="block font-display text-lg font-extrabold leading-tight">
                Tem uma loja em Feijó?
              </strong>
              <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-bold">
                Venda aqui <ArrowRight size={14} aria-hidden="true" />
              </span>
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}

function PartnerStores() {
  const { vendors: live, products: liveProducts } = useLiveStores();
  const hasLive = live.length > 0;
  const countOf = (id: string) => liveProducts.filter((p) => p.vendor.id === id).length;
  const mobile: MobileStore[] = hasLive
    ? live.map((v) => {
        const mine = liveProducts.filter((p) => p.vendor.id === v.id);
        return {
          key: v.id,
          name: v.name,
          slug: v.slug,
          logo: v.logo_url,
          accent: v.accent_hex ?? "#0e7a5f",
          meta: `${segmentLabel(v.segment)} · ${v.city.replace(", AC", "")}`,
          open: !!v.is_open,
          verified: !!v.verified,
          count: mine.length,
          thumbs: mine
            .map((p) => p.image_url)
            .filter((x): x is string => !!x)
            .slice(0, 3),
        };
      })
    : vendors.slice(0, 8).map((v) => ({
        key: v.id,
        name: v.name,
        slug: v.id,
        accent: "#0e7a5f",
        meta: `${v.sector} · ${v.city.replace(", AC", "")}`,
        count: 0,
        thumbs: [],
      }));
  return (
    <>
      <MobileStoreRail stores={mobile} total={mobile.length} />
      <Band
        aria-labelledby="stores-title"
        src="/images/hero-metricas.webp"
        tint="bg-gradient-to-r from-[#0b2b29]/90 via-[#0a1226]/80 to-[#0a1226]/70"
        className="max-md:hidden"
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
          Tem uma loja em Feijó?{" "}
          <span className="font-semibold text-primary">Venda na NextVita</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </Band>
    </>
  );
}

/** Vitrine completa da home: categorias que filtram, novidades reais, vendas da plataforma, destaque e lojas. */
export function HomeMarketplace({ middle }: { middle?: ReactNode }) {
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
  const add = (p: Product) => {
    cart.add(p.id);
    setAnnouncement(`${p.name} adicionado ao carrinho.`);
  };

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <FlashDeals campaign={campaign} />

      <Band
        id="ofertas"
        aria-labelledby="offers-title"
        src="/images/hero-alimentacao.webp"
        tint="bg-gradient-to-r from-[#052e2b]/90 via-[#0a1226]/80 to-[#0a1226]/70"
        className="scroll-mt-20"
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
      </Band>

      <div className="flex justify-end">
        <PilotNotice />
      </div>

      {middle}

      <PartnerStores />

      <CampaignTeaser />

      {count > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          aria-label={`Abrir carrinho, ${count} ${count === 1 ? "item" : "itens"}`}
          className="nv-fab fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3 z-[90] inline-flex size-12 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl ring-2 ring-white/70 lg:hidden dark:ring-slate-900/70"
        >
          <ShoppingCart size={20} />
          <span
            key={count}
            className="nv-heart-pop absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-emerald-400 text-[11px] font-extrabold text-slate-950"
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
