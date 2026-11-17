import { Link } from "@tanstack/react-router";
import { ArrowRight, Construction, ShoppingBag } from "lucide-react";

const shots = ["/loja/whey2.webp", "/loja/mulher1.webp", "/loja/homem2.webp", "/loja/vit2.webp"];

/** Destaque da loja virtual na página inicial (computador e celular). */
export function StoreHighlight() {
  return (
    <Link to="/loja" aria-label="Abrir a loja virtual NextVita" className="group relative isolate grid overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-900 text-white shadow-pop sm:grid-cols-[1.1fr_1fr] sm:items-center">
      <div className="p-5 sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-slate-950"><Construction size={13} /> Em desenvolvimento</span>
        <h2 className="mt-3 text-balance font-display text-3xl font-extrabold leading-[1.05] sm:text-4xl">Loja <span className="text-emerald-300">NextVita</span></h2>
        <p className="mt-2 max-w-md text-sm text-slate-200 sm:text-base">Suplementos, vitaminas, nutrição e moda fitness para homens e mulheres, com Pix, cartão e boleto.</p>
        <span className="mt-4 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-slate-950 transition group-hover:brightness-95"><ShoppingBag size={18} /> Conhecer a loja <ArrowRight size={16} /></span>
      </div>
      <div className="grid grid-cols-4 gap-2 px-4 pb-4 sm:grid-cols-2 sm:p-6 sm:pl-0">
        {shots.map((src, i) => <img key={src} src={src} alt="" aria-hidden="true" loading="lazy" className={`aspect-[3/4] w-full rounded-2xl sm:aspect-[4/3] object-cover shadow-lg ring-1 ring-white/20 transition duration-700 group-hover:scale-[1.02] ${i % 2 ? "sm:translate-y-4" : ""}`} />)}
      </div>
    </Link>
  );
}
