import { Info } from "lucide-react";

/**
 * Aviso discreto em vidro: a plataforma está em implantação e os produtos mostrados são ilustrativos.
 * Aparece na home e na vitrine de cada loja.
 */
export function PilotNotice({ className = "" }: { className?: string }) {
  return (
    <aside
      role="note"
      aria-label="Aviso sobre a fase da plataforma"
      className={`flex items-start gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-[12.5px] leading-snug text-slate-800 shadow-lg backdrop-blur-xl dark:border-white/15 dark:bg-white/[.07] dark:text-white/90 ${className}`}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-400/25 text-amber-700 dark:text-amber-300">
        <Info size={15} aria-hidden="true" />
      </span>
      <p className="min-w-0">
        <strong className="font-bold">Plataforma em fase de implantação.</strong> Os produtos e
        preços exibidos são <strong className="font-semibold">ilustrativos</strong>, para
        demonstração, e as compras ainda não estão ativas.
      </p>
    </aside>
  );
}
