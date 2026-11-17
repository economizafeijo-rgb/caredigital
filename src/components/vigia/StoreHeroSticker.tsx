import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

/** Cartão flutuante da loja sobre o hero da página inicial: chama a atenção do visitante para a Loja NextVita. */
export function StoreHeroSticker({ className = "" }: { className?: string }) {
  return (
    <Link to="/loja" aria-label="Abrir a Loja NextVita: suplementos, vitaminas e moda fitness"
      className={`nv-float group absolute z-20 flex items-center gap-3 rounded-2xl bg-white p-2.5 pr-4 text-slate-900 shadow-[0_26px_55px_-14px_rgba(0,0,0,.75)] ring-2 ring-amber-300 transition hover:scale-[1.04] ${className}`}>
      <span className="absolute -right-1.5 -top-1.5 flex size-4" aria-hidden="true"><span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" /><span className="relative inline-flex size-4 rounded-full bg-amber-400" /></span>
      <span className="flex -space-x-4" aria-hidden="true">
        {["/loja/whey2.webp", "/loja/mulher1.webp", "/loja/vit2.webp"].map((src) => <img key={src} src={src} alt="" loading="eager" className="size-14 rounded-xl object-cover ring-2 ring-white" />)}
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-extrabold uppercase tracking-widest text-amber-600">Novidade · Loja NextVita</span>
        <strong className="block font-display text-base leading-tight">Suplementos, vitaminas<br />e moda fitness</strong>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">Pix com 5% de desconto <ArrowRight size={13} className="transition group-hover:translate-x-0.5" /></span>
      </span>
    </Link>
  );
}
