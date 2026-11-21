/** LED de funcionamento: verde pulsando quando a loja está aberta, cinza quando fechada. */
export function StoreLed({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <span className={`relative inline-flex size-2.5 shrink-0 ${className}`} aria-hidden="true">
      {open && (
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70 motion-reduce:animate-none" />
      )}
      <span
        className={`relative inline-flex size-2.5 rounded-full ${open ? "bg-emerald-400" : "bg-slate-400"}`}
      />
    </span>
  );
}

/** Situação da loja: LED, "aberta agora" ou "fechada", com o horário de atendimento em destaque. */
export function StoreStatusChip({
  open,
  hours,
  dark = false,
}: {
  open: boolean;
  hours?: string | null;
  dark?: boolean;
}) {
  const tone = open
    ? dark
      ? "bg-emerald-400/15 text-emerald-100 ring-emerald-300/40"
      : "bg-emerald-500/10 text-emerald-700 ring-emerald-500/35 dark:text-emerald-300"
    : dark
      ? "bg-white/10 text-white/80 ring-white/15"
      : "bg-muted text-muted-foreground ring-border";
  return (
    <span
      role="status"
      className={`inline-flex flex-wrap items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${tone}`}
    >
      <StoreLed open={open} />
      {open ? "Aberta agora" : "Fechada no momento"}
      {hours && (
        <span className="inline-flex items-center gap-1 font-semibold opacity-90">· {hours}</span>
      )}
    </span>
  );
}
