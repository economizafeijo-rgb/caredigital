import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ShoppingCart, Store } from "lucide-react";
import { cart, money, products } from "@/lib/store";
import { ShareButton } from "./ShareButton";

const featured = ["whey-900", "conjunto-fem-1", "multivitaminico", "camiseta-regata", "pre-treino", "halteres"]
  .flatMap((id) => products.filter((p) => p.id === id));

function Card({ id }: { id: string }) {
  const p = products.find((x) => x.id === id)!;
  const [added, setAdded] = useState(false);
  const off = p.oldPriceCents ? Math.round((1 - p.priceCents / p.oldPriceCents) * 100) : 0;
  return (
    <article className="group relative flex w-[11.5rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl ring-1 ring-white/30 sm:w-auto">
      <Link to="/loja" className="relative block aspect-[4/3] overflow-hidden bg-slate-100" aria-label={`Ver ${p.name} na loja`}>
        <img src={p.img} alt={p.name} loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-105" />
        {p.tag && <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">{p.tag}</span>}
        {off > 0 && <span className="absolute bottom-2 left-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold text-white">-{off}%</span>}
      </Link>
      <ShareButton className="absolute right-2 top-2" title={p.name} text={`Olha esse produto na Loja NextVita: ${p.name} por ${money(p.priceCents)}.`} path="/loja" />
      <div className="flex flex-1 flex-col gap-0.5 p-2.5">
        <h3 className="line-clamp-2 text-[13px] font-bold leading-tight">{p.name}</h3>
        <p className="mt-auto pt-1"><strong className="text-base font-extrabold">{money(p.priceCents)}</strong>{p.oldPriceCents && <span className="ml-1.5 text-[11px] text-slate-500 line-through">{money(p.oldPriceCents)}</span>}</p>
        <button type="button" onClick={() => { cart.add(p.id); setAdded(true); window.setTimeout(() => setAdded(false), 1200); }}
          className={`mt-1.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-extrabold text-white transition active:scale-95 ${added ? "bg-emerald-600" : "bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110"}`}>
          {added ? <><CheckCircle2 size={14} /> Adicionado</> : <><ShoppingCart size={14} /> Adicionar</>}
        </button>
      </div>
    </article>
  );
}

/** Vitrine de vendas da página inicial: produtos com preço, carrinho e compartilhar, mais o convite para lojistas. */
export function HeroShowcase({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="showcase-title" className={`relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#2a1204] via-[#7c2d12] to-[#d97706] p-4 text-white shadow-2xl sm:p-6 ${className}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 -z-10 size-64 rounded-full bg-amber-300/30 blur-3xl" />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[.16em] text-slate-950">
            <span className="relative flex size-2" aria-hidden="true"><span className="absolute inline-flex size-full animate-ping rounded-full bg-slate-900 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-slate-900" /></span> Loja virtual · no ar
          </span>
          <h2 id="showcase-title" className="mt-2 font-display text-2xl font-extrabold leading-tight sm:text-3xl">Vitrine NextVita: compre sem sair do app.</h2>
          <p className="text-sm text-white/85">Suplementos, vitaminas, moda fitness e acessórios. Pix com 5% de desconto.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/loja" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-slate-950 shadow-lg transition hover:-translate-y-0.5">Ver a loja completa <ArrowRight size={16} /></Link>
          <Link to="/parceiros" className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-5 text-sm font-bold backdrop-blur transition hover:bg-white/20"><Store size={16} /> Quero vender aqui · grátis</Link>
        </div>
      </header>
      <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6 [&::-webkit-scrollbar]:hidden">
        {featured.map((p) => <Card key={p.id} id={p.id} />)}
      </div>
    </section>
  );
}
