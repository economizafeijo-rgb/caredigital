import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, CreditCard, Info, Minus, Plus, QrCode, ShoppingBag, ShoppingCart, Store, Truck } from "lucide-react";
import { cart, categories, categoryLabel, money, PIX_DISCOUNT, products, useCart, type Product, type StoreCategory } from "@/lib/store";

type Filter = StoreCategory | "todos";

/** Ordem da vitrine em "Tudo": um destaque grande seguido de uma seleção variada de categorias. */
const featuredOrder = ["whey-900", "conjunto-fem-1", "multivitaminico", "camiseta-regata", "pre-treino", "halteres", "conjunto-fem-2", "tapete", "vitamina-d"];
const MAX_TILES = 9;

const pixPrice = (cents: number) => Math.round(cents * (1 - PIX_DISCOUNT));
const discountOf = (p: Product) => (p.oldPriceCents ? Math.round((1 - p.priceCents / p.oldPriceCents) * 100) : 0);

function pickProducts(filter: Filter): Product[] {
  if (filter !== "todos") return products.filter((p) => p.category === filter).slice(0, MAX_TILES);
  const ordered = featuredOrder.flatMap((id) => products.filter((p) => p.id === id));
  const rest = products.filter((p) => !featuredOrder.includes(p.id));
  return [...ordered, ...rest].slice(0, MAX_TILES);
}

function ProductTile({ p, qty, featured, onAdd }: { p: Product; qty: number; featured: boolean; onAdd: (p: Product) => void }) {
  const off = discountOf(p);
  return (
    <article
      className={`group flex shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card max-sm:w-[68vw] max-sm:max-w-[17rem] ${featured ? "sm:col-span-2 sm:row-span-2" : ""}`}
    >
      <Link to="/loja" aria-label={`Ver ${p.name} na loja`} className="relative block overflow-hidden bg-[#e6e7e9]">
        <img
          src={p.img}
          alt={p.name}
          width={720}
          height={720}
          loading={featured ? "eager" : "lazy"}
          decoding="async"
          className={`aspect-square w-full object-cover motion-safe:transition motion-safe:duration-500 motion-safe:group-hover:scale-[1.03] ${featured ? "sm:aspect-[4/3]" : ""}`}
        />
        {p.tag && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-sm">{p.tag}</span>
        )}
        {off > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-emerald-800 px-2.5 py-1 text-[11px] font-bold text-white">
            {off}% off
          </span>
        )}
      </Link>
      <div className={`flex flex-1 flex-col ${featured ? "gap-1.5 p-5" : "gap-1 p-3.5"}`}>
        <span className="text-xs font-medium text-muted-foreground">{categoryLabel[p.category]}</span>
        <h3 className={`font-display font-bold leading-snug ${featured ? "text-xl" : "text-sm"}`}>{p.name}</h3>
        {featured && <p className="max-w-[46ch] text-sm leading-relaxed text-muted-foreground">{p.text}</p>}
        <div className="mt-auto pt-2">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <strong className={`font-extrabold tabular-nums ${featured ? "text-2xl" : "text-lg"}`}>{money(p.priceCents)}</strong>
            {p.oldPriceCents && (
              <span className="text-xs text-muted-foreground line-through tabular-nums">
                <span className="sr-only">Antes: </span>
                {money(p.oldPriceCents)}
              </span>
            )}
          </p>
          <p className="text-xs text-emerald-700 tabular-nums dark:text-emerald-300">{money(pixPrice(p.priceCents))} no Pix</p>
          {qty > 0 ? (
            <div className="mt-2.5 flex h-10 items-center justify-between rounded-xl border border-emerald-600/40 bg-emerald-600/10 text-emerald-900 dark:text-emerald-100">
              <button
                type="button"
                onClick={() => cart.setQty(p.id, qty - 1)}
                aria-label={qty === 1 ? `Remover ${p.name} do carrinho` : `Diminuir quantidade de ${p.name}`}
                className="grid size-10 place-items-center rounded-l-xl hover:bg-emerald-600/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Minus size={16} />
              </button>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                <Check size={15} aria-hidden="true" /> {qty} no carrinho
              </span>
              <button
                type="button"
                onClick={() => cart.setQty(p.id, qty + 1)}
                disabled={qty >= 20}
                aria-label={`Aumentar quantidade de ${p.name}`}
                className="grid size-10 place-items-center rounded-r-xl hover:bg-emerald-600/15 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAdd(p)}
              className="mt-2.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:brightness-110 active:scale-[.98] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ShoppingCart size={16} aria-hidden="true" /> {featured ? "Adicionar ao carrinho" : "Adicionar"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/** Vitrine da Loja NextVita na página inicial: filtro por categoria, carrinho com quantidade e convite para lojistas. */
export function HomeStore({ className = "" }: { className?: string }) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [announcement, setAnnouncement] = useState("");
  const { lines, count } = useCart();
  const shown = useMemo(() => pickProducts(filter), [filter]);
  const qtyOf = (id: string) => lines.find((l) => l.id === id)?.qty ?? 0;
  const visibleCategories = categories.filter((c) => c.key === "todos" || products.some((p) => p.category === c.key));

  const add = (p: Product) => {
    cart.add(p.id);
    setAnnouncement(`${p.name} adicionado ao carrinho.`);
  };

  return (
    <section aria-labelledby="home-store-title" className={`rounded-3xl border border-border bg-[#f1f2f3] p-4 dark:bg-card sm:p-6 lg:p-8 ${className}`}>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[60ch]">
          <h2 id="home-store-title" className="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            <ShoppingBag className="text-primary" size={26} aria-hidden="true" /> Loja NextVita
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
            Suplementos, vitaminas, moda fitness e acessórios para a rotina que você já acompanha aqui.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/loja"
            aria-label={count > 0 ? `Ir para a loja: ${count} ${count === 1 ? "item" : "itens"} no carrinho` : "Ir para a loja e ver o carrinho"}
            className="relative inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold hover:border-primary/50"
          >
            <ShoppingCart size={18} aria-hidden="true" /> Carrinho
            {count > 0 && (
              <span key={count} className="nv-bump grid min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground tabular-nums">
                {count}
              </span>
            )}
          </Link>
          <Link to="/loja" className="inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90">
            Ver a loja completa <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div role="group" aria-label="Filtrar produtos por categoria" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {visibleCategories.map((c) => {
          const active = filter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(c.key)}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active ? "bg-foreground text-background" : "border border-border bg-background text-foreground hover:border-foreground/40"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div
        key={filter}
        className="nv-fade-in -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden"
      >
        {shown.map((p, i) => (
          <ProductTile key={p.id} p={p} qty={qtyOf(p.id)} featured={i === 0 && shown.length > 2} onAdd={add} />
        ))}
      </div>

      <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
        <li className="flex items-center gap-2.5 rounded-xl bg-background px-3.5 py-3">
          <QrCode size={18} className="shrink-0 text-primary" aria-hidden="true" /> 5% de desconto pagando com Pix
        </li>
        <li className="flex items-center gap-2.5 rounded-xl bg-background px-3.5 py-3">
          <CreditCard size={18} className="shrink-0 text-primary" aria-hidden="true" /> Cartão em até 3x sem juros
        </li>
        <li className="flex items-center gap-2.5 rounded-xl bg-background px-3.5 py-3">
          <Truck size={18} className="shrink-0 text-primary" aria-hidden="true" /> Entrega ou retirada combinada
        </li>
      </ul>

      <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        A loja está em fase de lançamento: preços e estoque ainda são de demonstração, e o pagamento é combinado com a nossa equipe.
      </p>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-[#06302b] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10" aria-hidden="true">
            <Store size={20} />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold">Venda seus produtos na NextVita</h3>
            <p className="text-sm text-emerald-50/80">Lojas de suplementos, moda fitness e produtos naturais ganham vitrine própria, avaliações e painel de vendas.</p>
          </div>
        </div>
        <Link to="/parceiros" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#06302b] hover:bg-emerald-50">
          Quero vender aqui <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
