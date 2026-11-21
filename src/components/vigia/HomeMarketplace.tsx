import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gem,
  Gift,
  LayoutDashboard,
  Leaf,
  MapPin,
  Minus,
  Percent,
  Pill,
  Plus,
  Shirt,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Truck,
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
import { productStatus } from "@/lib/marketplace";
import { LiveModeLauncher } from "./LiveMode";
import { StoreLed } from "./store/StoreLed";
import { useLiveStores } from "./LiveStores";
import { openProduct } from "./StoreViews";

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

/* ---------------------------------------------------------------- Hero */

const heroIds = ["whey-900", "conjunto-fem-1", "oleo-copaiba"];

export function HomeHero({
  client,
  panel,
  firstName,
}: {
  client: boolean;
  panel: string | null;
  firstName: string;
}) {
  const picks = heroIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p);
  return (
    <section
      aria-labelledby="home-title"
      className="nv-dark relative isolate overflow-hidden rounded-3xl bg-[#05110e] text-white shadow-card"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_90%_at_88%_10%,rgba(16,185,129,.30),transparent_65%),radial-gradient(45%_70%_at_0%_100%,rgba(20,184,166,.18),transparent_65%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"
      />
      <div className="grid items-center gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10 lg:p-10 xl:p-12">
        <div className="min-w-0">
          <p
            style={{ animationDelay: "40ms" }}
            className="nv-rise inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-emerald-100 ring-1 ring-white/15"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-emerald-400/70 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Lojas de Feijó, Acre, no seu celular
          </p>
          <h1
            id="home-title"
            style={{ animationDelay: "120ms" }}
            className="nv-rise mt-4 text-balance font-display text-[1.95rem] font-extrabold leading-[1.05] tracking-tight min-[400px]:text-[2.2rem] sm:text-[2.7rem] xl:text-[3.2rem]"
          >
            {client
              ? `Olá, ${firstName}. Sua rotina em dia e as melhores ofertas de Feijó.`
              : "Compre de quem é daqui e cuide da sua rotina no mesmo lugar."}
          </h1>
          <p
            style={{ animationDelay: "220ms" }}
            className="nv-rise mt-3 max-w-[52ch] text-[15px] leading-relaxed text-slate-300 sm:text-base"
          >
            Suplementos, moda, beleza e bijuterias de lojas locais, com 5% de desconto no Pix. E um
            app gratuito para organizar água, doses, treinos e sono.
          </p>
          <div
            style={{ animationDelay: "320ms" }}
            className="nv-rise mt-5 flex flex-wrap items-center gap-2.5"
          >
            <Link
              to="/loja"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-400 px-6 text-[15px] font-extrabold text-slate-950 shadow-[0_12px_30px_-12px_rgba(52,211,153,.9)] transition hover:bg-emerald-300 active:scale-[.98] motion-reduce:active:scale-100"
            >
              <ShoppingCart size={18} aria-hidden="true" /> Ver ofertas da loja
            </Link>
            {panel ? (
              <>
                <Link
                  to={panel}
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-5 text-[15px] font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <LayoutDashboard size={17} aria-hidden="true" /> Abrir meu painel
                </Link>
                {client && <LiveModeLauncher className="!h-12 !px-4 !text-sm" />}
              </>
            ) : (
              <a
                href="/entrar?mode=signup"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-5 text-[15px] font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                <Gift size={17} aria-hidden="true" /> Criar conta grátis
              </a>
            )}
          </div>
        </div>

        <div
          style={{ animationDelay: "260ms" }}
          className="nv-rise grid grid-cols-3 gap-2.5 sm:gap-3 lg:grid-cols-2 lg:grid-rows-2"
        >
          {picks.map((p, i) => {
            const off = offOf(p.priceCents, p.oldPriceCents);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => openProduct(p.id)}
                aria-label={`Ver ${p.name}, ${money(p.priceCents)}`}
                className={`group relative overflow-hidden rounded-2xl bg-[#e9ebee] text-left ring-1 ring-white/20 transition-transform duration-200 [@media(hover:hover)]:hover:-translate-y-1 ${i === 0 ? "aspect-[3/4] lg:row-span-2 lg:aspect-auto" : "aspect-[3/4] lg:aspect-[4/3]"}`}
              >
                <img
                  src={p.img}
                  alt=""
                  width={480}
                  height={480}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="size-full object-cover motion-safe:transition motion-safe:duration-500 [@media(hover:hover)]:group-hover:scale-105"
                />
                {off > 0 && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-slate-950 sm:right-2.5 sm:top-2.5">
                    −{off}%
                  </span>
                )}
                <span className="absolute inset-x-1.5 bottom-1.5 rounded-xl bg-white/95 px-2 py-1.5 text-slate-900 shadow sm:inset-x-2.5 sm:bottom-2.5 sm:px-3 sm:py-2">
                  <span className="hidden line-clamp-1 text-[13px] font-semibold leading-tight sm:block">
                    {p.name}
                  </span>
                  <strong className="block text-[13px] font-extrabold tabular-nums text-emerald-700 sm:text-base">
                    {money(p.priceCents)}
                  </strong>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Benefícios */

export function HomeBenefits() {
  const items: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: Percent, title: "5% off no Pix", text: "Desconto automático no pagamento" },
    { icon: CreditCard, title: "Até 3x no cartão", text: "Parcele suas compras" },
    { icon: Truck, title: "Entrega ou retirada", text: "Receba em casa ou busque na loja" },
    { icon: MapPin, title: "Lojas de Feijó", text: "Compre local e fortaleça a cidade" },
  ];
  return (
    <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
      {items.map((b) => (
        <li
          key={b.title}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:p-3.5"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
            <b.icon size={19} aria-hidden="true" />
          </span>
          <span className="min-w-0 leading-tight">
            <strong className="block text-[13.5px] font-bold sm:text-sm">{b.title}</strong>
            <span className="mt-0.5 line-clamp-2 block text-[11.5px] text-muted-foreground sm:text-xs">
              {b.text}
            </span>
          </span>
        </li>
      ))}
    </ul>
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

function PartnerStores() {
  const { vendors: live } = useLiveStores();
  const hasLive = live.length > 0;
  return (
    <section aria-labelledby="stores-title" className="grid grid-cols-[minmax(0,1fr)] gap-3">
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
      <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4 xl:gap-3">
        {hasLive
          ? live.slice(0, 8).map((v) => (
              <li key={v.id}>
                <Link
                  to="/loja"
                  search={{ loja: v.slug } as never}
                  aria-label={`Visitar a loja ${v.name}`}
                  style={{ "--accent": v.accent_hex ?? "#0e7a5f" } as CSSProperties}
                  className="group block overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,transform] duration-200 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-[var(--accent)]"
                >
                  <span className="block h-14 bg-[linear-gradient(120deg,var(--accent),color-mix(in_srgb,var(--accent)_45%,#0b1020))]" />
                  <span className="-mt-7 flex items-end gap-2.5 px-3">
                    <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white ring-2 ring-card">
                      {v.logo_url ? (
                        <img
                          src={v.logo_url}
                          alt=""
                          className="size-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <strong className="text-lg font-extrabold text-slate-800">
                          {v.name.slice(0, 1)}
                        </strong>
                      )}
                    </span>
                  </span>
                  <span className="block px-3 pb-3 pt-2 leading-tight">
                    <span className="flex items-center gap-1">
                      <strong className="truncate text-sm font-bold">{v.name}</strong>
                      {v.verified && (
                        <BadgeCheck
                          size={14}
                          className="shrink-0 text-sky-500"
                          aria-label="Loja verificada"
                        />
                      )}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {v.is_open && <StoreLed open />}
                      {v.is_open ? "Aberta agora · " : ""}
                      {v.city}
                    </span>
                  </span>
                </Link>
              </li>
            ))
          : vendors.slice(0, 8).map((v) => (
              <li key={v.id}>
                <Link
                  to="/loja"
                  search={{ loja: v.id } as never}
                  aria-label={`Visitar a loja ${v.name}`}
                  style={{ "--accent": v.hex } as CSSProperties}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-[border-color,transform] duration-200 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-[var(--accent)]"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white"
                    style={{ background: v.hex }}
                  >
                    {v.initials}
                  </span>
                  <span className="min-w-0 leading-tight">
                    <strong className="block truncate text-sm font-bold">{v.name}</strong>
                    <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Star
                        size={11}
                        className="fill-amber-400 text-amber-400"
                        aria-hidden="true"
                      />
                      {v.sampleRating.toFixed(1).replace(".", ",")} · {v.city.replace(", AC", "")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
      </ul>
      <Link
        to="/parceiros"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3.5 transition-colors hover:bg-primary/10 sm:px-5"
      >
        <span className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Store size={19} aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <strong className="block text-sm font-bold">Tem uma loja em Feijó?</strong>
            <span className="text-[13px] text-muted-foreground">
              Venda na NextVita e alcance moradores da cidade.
            </span>
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary">
          Quero vender <ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" />
        </span>
      </Link>
    </section>
  );
}

/** Vitrine completa da home: categorias que filtram, novidades reais, vendas da plataforma, destaque e lojas. */
export function HomeMarketplace() {
  const [filter, setFilter] = useState<Filter>("todos");
  const [announcement, setAnnouncement] = useState("");
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
          <Link
            to="/loja"
            aria-label={
              count > 0
                ? `Ir para a loja: ${count} ${count === 1 ? "item" : "itens"} no carrinho`
                : "Ir para a loja"
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
          </Link>
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
    </>
  );
}
