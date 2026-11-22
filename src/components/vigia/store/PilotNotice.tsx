/**
 * Selo discreto em vidro: a plataforma está em implantação e os produtos são ilustrativos.
 * Uma linha só, para não tomar espaço na home nem na vitrine da loja.
 */
export function PilotNotice({ className = "" }: { className?: string }) {
  const text =
    "Plataforma em fase de implantação. Os produtos e preços exibidos são ilustrativos, para demonstração.";
  return (
    <span
      role="note"
      title={text}
      aria-label={text}
      className={`inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-slate-800 shadow-lg backdrop-blur-xl dark:border-white/20 dark:bg-white/10 dark:text-white/90 ${className}`}
    >
      <span className="relative flex size-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex size-full rounded-full bg-amber-400/70 motion-safe:animate-ping" />
        <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
      </span>
      Em implantação
      <span aria-hidden="true" className="opacity-40">
        ·
      </span>
      <span className="font-medium opacity-80">produtos ilustrativos</span>
    </span>
  );
}
