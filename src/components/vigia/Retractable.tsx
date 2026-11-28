import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

/** Evento global para recolher/expandir todos os blocos do painel de uma vez. */
export const RETRACT_ALL_EVENT = "nv-retract-all";

/**
 * Bloco retrátil do painel: cabeçalho com faixa de cor, resumo curto visível quando recolhido,
 * corpo que desliza e lembra se ficou aberto ou fechado (por bloco, neste aparelho).
 */
export function Retractable({
  id,
  eyebrow,
  title,
  summary,
  action,
  accent = "#14b8a6",
  defaultOpen = true,
  className = "",
  bodyClassName = "",
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  summary?: ReactNode;
  action?: ReactNode;
  accent?: string;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const key = `nv-retract-${id}`;
  const [open, setOpen] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? defaultOpen : v === "1";
    } catch {
      return defaultOpen;
    }
  });
  const bodyId = useId();
  const set = (v: boolean) => {
    setOpen(v);
    try {
      localStorage.setItem(key, v ? "1" : "0");
    } catch {
      /* só não lembra */
    }
  };
  useEffect(() => {
    const on = (e: Event) => set(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener(RETRACT_ALL_EVENT, on);
    return () => window.removeEventListener(RETRACT_ALL_EVENT, on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      aria-label={title}
      className={`relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card ${className}`}
      style={{
        backgroundImage: `linear-gradient(180deg, ${accent}10, transparent 3.5rem)`,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: `linear-gradient(${accent}, ${accent}33)` }}
      />
      <div className="flex items-center gap-2 py-2.5 pl-4 pr-2.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => set(!open)}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="min-w-0 flex-1">
            {eyebrow ? (
              <span className="block text-[11px] font-semibold" style={{ color: accent }}>
                {eyebrow}
              </span>
            ) : null}
            <span className="block truncate text-[15px] font-bold leading-tight">{title}</span>
          </span>
          {summary ? (
            <span
              className={`hidden min-w-0 max-w-[55%] truncate rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-opacity sm:block ${open ? "opacity-0" : "opacity-100"}`}
            >
              {summary}
            </span>
          ) : null}
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-muted/40 text-muted-foreground transition group-hover:bg-muted group-active:scale-95"
            aria-hidden="true"
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div
        id={bodyId}
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        aria-hidden={!open}
        {...(open ? {} : { inert: "" as unknown as boolean })}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={`border-t border-border/70 p-3.5 ${bodyClassName}`}>{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Botões "Recolher tudo / Expandir tudo": ícones compactos que cabem na barra do topo. */
export function RetractAllBar() {
  const fire = (v: boolean) =>
    window.dispatchEvent(new CustomEvent<boolean>(RETRACT_ALL_EVENT, { detail: v }));
  const cls =
    "grid size-10 shrink-0 place-items-center rounded-xl border border-white/30 bg-slate-950/60 text-white shadow-md backdrop-blur-md transition hover:bg-slate-900/85 active:scale-95";
  return (
    <>
      <button
        type="button"
        className={cls}
        onClick={() => fire(false)}
        aria-label="Recolher blocos"
        title="Recolher blocos"
      >
        <ChevronsDownUp size={17} />
      </button>
      <button
        type="button"
        className={cls}
        onClick={() => fire(true)}
        aria-label="Expandir blocos"
        title="Expandir blocos"
      >
        <ChevronsUpDown size={17} />
      </button>
    </>
  );
}
