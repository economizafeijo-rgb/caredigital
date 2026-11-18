import { openProduct } from "./StoreViews";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Check, ChevronLeft, ChevronRight, Minus, Plus, ShoppingBag, ShoppingCart, Star, X } from "lucide-react";
import { cart, categories, categoryLabel, money, PIX_DISCOUNT, products, useCart, vendorById, vendors, type Product, type StoreCategory, type VendorId } from "@/lib/store";

type Filter = StoreCategory | "todos";

const featuredOrder = ["whey-900", "conjunto-fem-1", "oleo-copaiba", "multivitaminico", "camiseta-regata", "guarana-po", "pre-treino", "halteres", "conjunto-fem-2", "tapete", "vitamina-d"];
const pixPrice = (cents: number) => Math.round(cents * (1 - PIX_DISCOUNT));
const discountOf = (p: Product) => (p.oldPriceCents ? Math.round((1 - p.priceCents / p.oldPriceCents) * 100) : 0);

function pickProducts(filter: Filter, vendor: VendorId | null): Product[] {
  if (vendor) return products.filter((p) => p.vendorId === vendor);
  if (filter !== "todos") return products.filter((p) => p.category === filter);
  const ordered = featuredOrder.flatMap((id) => products.filter((p) => p.id === id));
  return [...ordered, ...products.filter((p) => !featuredOrder.includes(p.id))];
}

function ProductCard({ p, qty, onAdd }: { p: Product; qty: number; onAdd: (p: Product) => void }) {
  const off = discountOf(p);
  return (
    <article className="group flex w-[42vw] max-w-44 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border bg-card sm:w-44">
      <button type="button" onClick={() => openProduct(p.id)} aria-label={`Ver detalhes de ${p.name}`} className="relative block cursor-zoom-in overflow-hidden bg-[#e6e7e9]">
        <img src={p.img} alt={p.name} width={360} height={360} loading="lazy" decoding="async" className="aspect-square w-full object-cover motion-safe:transition motion-safe:duration-500 motion-safe:group-hover:scale-105" />
        {off > 0 && <span className="absolute right-2 top-2 rounded-full bg-emerald-800 px-2 py-0.5 text-[11px] font-bold text-white">{off}% off</span>}
        {p.tag && <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-900">{p.tag}</span>}
      </button>
      <div className="flex flex-1 flex-col gap-0.5 p-2.5">
        <span className="text-[11px] font-medium text-slate-600 dark:text-muted-foreground">{categoryLabel[p.category]}</span>
        <h3 className="line-clamp-2 min-h-[2.4em] text-[13px] font-semibold leading-tight">{p.name}</h3>
        <p className="mt-1 flex items-baseline gap-1.5">
          <strong className="text-base font-extrabold tabular-nums">{money(p.priceCents)}</strong>
          {p.oldPriceCents && <span className="text-[11px] text-slate-500 line-through tabular-nums"><span className="sr-only">Antes: </span>{money(p.oldPriceCents)}</span>}
        </p>
        <p className="text-[11px] text-emerald-700 tabular-nums dark:text-emerald-300">{money(pixPrice(p.priceCents))} no Pix</p>
        {vendorById(p.vendorId) && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500 dark:text-muted-foreground">
            <span className="truncate">Vendido por <span className="font-semibold text-slate-700 dark:text-foreground">{vendorById(p.vendorId)!.name}</span></span>
            {vendorById(p.vendorId)!.sampleVerified && <BadgeCheck size={12} className="shrink-0 text-sky-600" aria-label="Selo de loja verificada (exemplo)" />}
          </p>
        )}
        {qty > 0 ? (
          <div className="mt-2 flex h-9 items-center justify-between rounded-lg border border-emerald-600/40 bg-emerald-600/10 text-emerald-900 dark:text-emerald-100">
            <button type="button" onClick={() => cart.setQty(p.id, qty - 1)} aria-label={qty === 1 ? `Remover ${p.name} do carrinho` : `Diminuir quantidade de ${p.name}`} className="grid size-9 place-items-center rounded-l-lg hover:bg-emerald-600/15"><Minus size={14} /></button>
            <span className="inline-flex items-center gap-1 text-xs font-bold"><Check size={13} aria-hidden="true" /> {qty} no carrinho</span>
            <button type="button" onClick={() => cart.setQty(p.id, qty + 1)} disabled={qty >= 20} aria-label={`Aumentar quantidade de ${p.name}`} className="grid size-9 place-items-center rounded-r-lg hover:bg-emerald-600/15 disabled:opacity-40"><Plus size={14} /></button>
          </div>
        ) : (
          <button type="button" onClick={() => onAdd(p)} className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:brightness-110 active:scale-[.98] motion-reduce:active:scale-100">
            <ShoppingCart size={14} aria-hidden="true" /> Adicionar
          </button>
        )}
      </div>
    </article>
  );
}

/** Vitrine compacta da Loja NextVita na página inicial: filtro por categoria, trilho com setas e carrinho com quantidade. */
export function HomeStore({ className = "" }: { className?: string }) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [announcement, setAnnouncement] = useState("");
  const [vendor, setVendor] = useState<VendorId | null>(null);
  const { lines, count } = useCart();
  const shown = useMemo(() => pickProducts(filter, vendor), [filter, vendor]);
  const rail = useRef<HTMLDivElement>(null);
  const qtyOf = (id: string) => lines.find((l) => l.id === id)?.qty ?? 0;
  const visibleCategories = categories.filter((c) => c.key === "todos" || products.some((p) => p.category === c.key));
  const scrollRail = (dir: number) => {
    const el = rail.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  };
  const add = (p: Product) => {
    cart.add(p.id);
    setAnnouncement(`${p.name} adicionado ao carrinho.`);
  };

  return (
    <section aria-labelledby="home-store-title" className={`rounded-2xl border border-border bg-[#f1f2f3] p-4 dark:bg-card sm:p-5 ${className}`}>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="home-store-title" className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
            <ShoppingBag className="text-primary" size={22} aria-hidden="true" /> Loja NextVita
          </h2>
          <p className="text-[12.5px] text-slate-600 dark:text-muted-foreground sm:text-sm"><span className="sm:hidden">5% off no Pix · até 3x no cartão</span><span className="hidden sm:inline">5% de desconto no Pix, cartão em até 3x e entrega ou retirada.</span></p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link to="/loja" aria-label={count > 0 ? `Ir para a loja: ${count} ${count === 1 ? "item" : "itens"} no carrinho` : "Ir para a loja e ver o carrinho"} className="relative hidden h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold hover:border-primary/50 sm:inline-flex">
            <ShoppingCart size={17} aria-hidden="true" /> Carrinho
            {count > 0 && <span key={count} className="nv-bump grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground tabular-nums">{count}</span>}
          </Link>
          <Link to="/loja" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-foreground px-3.5 text-sm font-semibold text-background hover:opacity-90">
            Ver a loja <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <p role="note" className="mt-2 flex items-start gap-2 text-[11px] leading-snug text-slate-600 dark:text-muted-foreground sm:items-center sm:text-xs">
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-foreground">Pré-lançamento</span>
        <span className="sm:hidden">Produtos e lojas ilustrativos.</span><span className="hidden sm:inline">Produtos, preços e lojas são ilustrativos. As vendas ainda não estão abertas.</span>
      </p>

      <div className="mt-3 flex items-center gap-2">
        <div role="group" aria-label="Filtrar produtos por categoria" className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleCategories.map((c) => {
            const active = !vendor && filter === c.key;
            return (
              <button key={c.key} type="button" aria-pressed={active} onClick={() => { setVendor(null); setFilter(c.key); }}
                className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${active ? "bg-foreground text-background" : "border border-border bg-background hover:border-foreground/40"}`}>
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="hidden shrink-0 gap-1.5 sm:flex">
          <button type="button" onClick={() => scrollRail(-1)} aria-label="Ver produtos anteriores" className="grid size-9 place-items-center rounded-full border border-border bg-background hover:border-foreground/40"><ChevronLeft size={17} /></button>
          <button type="button" onClick={() => scrollRail(1)} aria-label="Ver mais produtos" className="grid size-9 place-items-center rounded-full border border-border bg-background hover:border-foreground/40"><ChevronRight size={17} /></button>
        </div>
      </div>

      {vendor && (
        <p className="mt-3 flex items-center gap-2 text-sm">
          Produtos de <strong className="font-semibold">{vendorById(vendor)?.name}</strong>
          <button type="button" onClick={() => setVendor(null)} className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-xs font-semibold hover:border-foreground/40"><X size={12} aria-hidden="true" /> Ver todos</button>
        </p>
      )}

      <div ref={rail} key={`${filter}-${vendor ?? ""}`} className="nv-fade-in -mx-4 mt-3 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:scroll-px-5 sm:px-5 [&::-webkit-scrollbar]:hidden">
        {shown.map((p) => <ProductCard key={p.id} p={p} qty={qtyOf(p.id)} onAdd={add} />)}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">Lojas parceiras <span className="hidden rounded-full sm:inline bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">exemplos ilustrativos</span></h3>
          <Link to="/parceiros" className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-primary">
            <span className="sm:hidden">Venda aqui</span><span className="hidden sm:inline">Tem uma loja? Venda aqui</span> <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <ul className="-mx-4 mt-3 grid auto-cols-[minmax(10.5rem,1fr)] grid-flow-col gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {vendors.map((v) => (
            <li key={v.id} className="min-w-0">
              <Link to="/loja" search={{ loja: v.id } as never} aria-label={`Visitar a loja ${v.name}`} style={{ "--tile": v.hex } as CSSProperties}
                className="group flex h-full items-center gap-2.5 rounded-xl border border-border bg-background/60 px-2.5 py-2 transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--tile)_45%,transparent)] hover:bg-[color-mix(in_srgb,var(--tile)_6%,transparent)]">
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-extrabold ring-1 ring-inset"
                  style={{ background: `color-mix(in srgb, ${v.hex} 16%, transparent)`, color: `color-mix(in srgb, ${v.hex} 55%, var(--color-foreground, #fff))`, ["--tw-ring-color" as string]: `color-mix(in srgb, ${v.hex} 30%, transparent)` }}>
                  {v.initials}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="flex items-center gap-1">
                    <strong className="truncate text-[12.5px] font-semibold">{v.name}</strong>
                    {v.sampleVerified && <BadgeCheck size={12} className="shrink-0 text-sky-500" aria-label="Verificada (exemplo)" />}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                    <Star size={10} className="shrink-0 fill-amber-400 text-amber-400" aria-hidden="true" />
                    {v.sampleRating.toFixed(1).replace(".", ",")} · {v.city.replace(", AC", "")}
                  </span>
                </span>
                <ArrowRight size={13} aria-hidden="true" className="shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
