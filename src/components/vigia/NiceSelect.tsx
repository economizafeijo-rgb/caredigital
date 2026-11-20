import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";

export type NiceOption = { value: string; label: string; hint?: string; icon?: ReactNode };
type Props = {
  value: string;
  onChange: (value: string) => void;
  options: NiceOption[];
  ariaLabel: string;
  className?: string;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
};

/** Seletor próprio do app: no computador abre uma lista junto ao campo; no celular abre uma folha inferior com opções amplas. */
export function NiceSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
  placeholder = "Selecione",
  title,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<{
    left: number;
    top: number;
    width: number;
    up: boolean;
  } | null>(null);
  const [mobile, setMobile] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  function openMenu() {
    if (disabled) return;
    const isMobile =
      typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
    setMobile(isMobile);
    const box = button.current?.getBoundingClientRect();
    if (box) {
      const room = window.innerHeight - box.bottom;
      setRect({
        left: Math.max(8, Math.min(box.left, window.innerWidth - Math.max(box.width, 220) - 8)),
        top: room < 280 && box.top > room ? box.top : box.bottom,
        width: Math.max(box.width, 220),
        up: room < 280 && box.top > room,
      });
    }
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  }
  function pick(next: string) {
    onChange(next);
    setOpen(false);
    button.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        button.current?.focus();
      }
    };
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    if (!mobile) window.addEventListener("scroll", close, true);
    const previous = document.body.style.overflow;
    if (mobile) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      document.body.style.overflow = previous;
    };
  }, [open, mobile]);
  useLayoutEffect(() => {
    if (open)
      list.current
        ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [open, active]);

  function onTriggerKey(e: KeyboardEvent) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openMenu();
    }
  }
  function onListKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (options[active]) pick(options[active].value);
    }
  }

  const rows = (
    <ul
      ref={list}
      id={id}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={-1}
      onKeyDown={onListKey}
      autoFocus
      className={`${mobile ? "max-h-[55dvh]" : "max-h-72"} overflow-y-auto overscroll-contain p-1.5 outline-none`}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <li
            key={o.value}
            role="option"
            aria-selected={on}
            data-index={i}
            onMouseEnter={() => setActive(i)}
            onClick={() => pick(o.value)}
            className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 ${mobile ? "min-h-12 text-base" : "min-h-10 text-sm"} font-semibold ${i === active ? "bg-primary/10" : ""} ${on ? "text-primary" : "text-foreground"}`}
          >
            {o.icon && (
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                {o.icon}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate">{o.label}</span>
              {o.hint && (
                <span className="block truncate text-[11px] font-normal text-muted-foreground">
                  {o.hint}
                </span>
              )}
            </span>
            {on && <Check size={17} className="shrink-0" />}
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={ariaLabel}
        title={title}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onTriggerKey}
        className={`inline-flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 text-left text-sm font-semibold text-foreground transition hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 ${open ? "border-primary ring-2 ring-primary/20" : ""} ${className}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.icon}
          <span className={`truncate ${selected ? "" : "text-muted-foreground"}`}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[400]"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            {mobile ? (
              <>
                <div
                  className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
                  onClick={() => setOpen(false)}
                />
                <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl">
                  <div className="flex items-center justify-between px-4 pb-1 pt-3">
                    <strong className="text-sm">{ariaLabel}</strong>
                    <button
                      type="button"
                      aria-label="Fechar"
                      onClick={() => setOpen(false)}
                      className="grid size-9 place-items-center rounded-full bg-muted"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {rows}
                </div>
              </>
            ) : (
              rect && (
                <div
                  className="absolute rounded-2xl border border-border bg-card shadow-2xl ring-1 ring-black/5"
                  style={{
                    left: rect.left,
                    width: rect.width,
                    ...(rect.up
                      ? { bottom: window.innerHeight - rect.top + 6 }
                      : { top: rect.top + 6 }),
                  }}
                >
                  {rows}
                </div>
              )
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
