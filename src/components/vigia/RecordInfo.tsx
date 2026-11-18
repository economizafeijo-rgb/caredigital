import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Clock3, Info } from "lucide-react";

export type RecordInfoRow = { label: string; value: ReactNode };
type Props = {
  title: string;
  /** Data e hora do registro (ISO). */
  at?: string | null;
  category?: string;
  /** Linhas extras: quantidade, itens, nutrientes, origem… */
  rows?: RecordInfoRow[];
  description?: string | null;
  color?: string;
  className?: string;
};

const tz = "America/Rio_Branco";
const fmtDate = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "short", day: "2-digit", month: "long", year: "numeric" }).format(new Date(iso));
const fmtTime = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/**
 * Botão "i" de um registro: ao passar o mouse, focar ou tocar, mostra data, hora,
 * o que foi registrado e a quantidade. O cartão é renderizado fora da lista para não ser cortado.
 */
export function RecordInfo({ title, at, category, rows = [], description, color = "var(--primary)", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const id = useId();

  const show = () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); setOpen(true); };
  const hide = () => { if (pinned) return; closeTimer.current = window.setTimeout(() => setOpen(false), 120); };

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => {
      const r = btn.current!.getBoundingClientRect();
      const w = 288, h = card.current?.offsetHeight ?? 220;
      const above = r.bottom + h + 12 > window.innerHeight && r.top > h + 12;
      const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
      setPos({ top: above ? r.top - h - 8 : r.bottom + 8, left, above });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => { window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place); };
  }, [open]);

  useEffect(() => {
    if (!pinned) return;
    const onDown = (e: PointerEvent) => {
      if (btn.current?.contains(e.target as Node) || card.current?.contains(e.target as Node)) return;
      setPinned(false); setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setPinned(false); setOpen(false); btn.current?.focus(); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [pinned]);

  const valid = at && Number.isFinite(Date.parse(at));
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={`Detalhes do registro: ${title}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") show(); }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") hide(); }}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => { e.stopPropagation(); setPinned((p) => !p); setOpen(true); }}
        className={`grid size-7 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:scale-110 hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${open ? "border-primary/50 text-primary" : ""} ${className}`}
      >
        <Info size={14} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={card}
          id={id}
          role="tooltip"
          onPointerEnter={show}
          onPointerLeave={hide}
          className="nv-fade-in fixed z-[10000] w-72 overflow-hidden rounded-2xl border border-border bg-card text-left text-foreground shadow-pop"
          style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
        >
          <div className="h-1 w-full" style={{ background: color }} />
          <div className="p-3.5">
            {category && <p className="text-[11px] font-semibold" style={{ color }}>{category}</p>}
            <p className="mt-0.5 text-sm font-bold leading-snug">{title}</p>
            {valid && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 capitalize"><CalendarDays size={11} /> {fmtDate(at!)}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"><Clock3 size={11} /> {fmtTime(at!)}</span>
              </div>
            )}
            {rows.length > 0 && (
              <dl className="mt-2.5 grid gap-1.5 border-t border-border pt-2.5 text-xs">
                {rows.map((r) => (
                  <div key={r.label} className="grid grid-cols-[6.5rem_1fr] gap-2">
                    <dt className="text-muted-foreground">{r.label}</dt>
                    <dd className="min-w-0 break-words font-semibold">{r.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {description && <p className="mt-2.5 border-t border-border pt-2.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
