import { useId, useState, type ReactNode } from "react";
import { ChevronDown, Info, type LucideIcon } from "lucide-react";

/**
 * Bloco retrátil: cabeçalho com ícone colorido, título, botão (i) que abre uma explicação
 * e seta para recolher/expandir o conteúdo.
 */
export function Fold({
  title,
  icon: Icon,
  color,
  info,
  aside,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: LucideIcon;
  color: string;
  info?: string;
  aside?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showInfo, setShowInfo] = useState(false);
  const id = useId();
  return (
    <section className="border border-border bg-card" data-accent={color}>
      <div className="flex items-center gap-2 px-3 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <Icon size={15} className="shrink-0 text-muted-foreground" />
          <h4 className="min-w-0 truncate text-sm font-bold">{title}</h4>
        </button>
        {aside && (
          <span className="hidden text-[11px] text-muted-foreground sm:inline">{aside}</span>
        )}
        {info && (
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            aria-expanded={showInfo}
            aria-label={`Mais informações: ${title}`}
            className={
              "grid size-6 shrink-0 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground " +
              (showInfo ? "bg-muted text-foreground" : "")
            }
          >
            <Info size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? `Recolher ${title}` : `Expandir ${title}`}
          className="grid size-6 shrink-0 place-items-center text-muted-foreground hover:bg-muted"
        >
          <ChevronDown size={16} className={"transition-transform " + (open ? "rotate-180" : "")} />
        </button>
      </div>
      {showInfo && info && (
        <p className="nv-fade-in mx-3 mb-2 border-l-2 border-border bg-muted/40 px-2.5 py-1.5 text-xs leading-relaxed text-muted-foreground">
          {info}
        </p>
      )}
      {open && (
        <div id={id} className="px-3 pb-2.5">
          {children}
        </div>
      )}
    </section>
  );
}
