import { useEffect, useRef, useState } from "react";
import { Check, Link2, MessageCircle, Send, Share2 } from "lucide-react";

export type ShareData = { title: string; text: string; path?: string };

export function shareUrl(path = "/loja") {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.nextvita.life";
  return `${origin}${path}`;
}

/** Compartilhar: usa a folha nativa do celular quando existe; no computador abre WhatsApp, Telegram ou copiar link. */
export function ShareButton({ title, text, path = "/loja", label = "Compartilhar", variant = "icon", className = "" }: ShareData & { label?: string; variant?: "icon" | "pill"; className?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const url = shareUrl(path);
  const message = `${text} ${url}`;

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  async function click(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (typeof navigator !== "undefined" && typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ title, text, url }); } catch { /* cancelado */ }
      return;
    }
    setOpen((v) => !v);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { window.prompt("Copie o link:", url); }
  }

  const item = "flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100";
  return (
    <span ref={box} className={`${className.includes("absolute") ? "" : "relative"} inline-flex ${className}`} onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={(e) => void click(e)} aria-haspopup="menu" aria-expanded={open} aria-label={`${label}: ${title}`}
        className={variant === "pill"
          ? "inline-flex h-11 items-center gap-2 rounded-2xl border border-white/35 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
          : "grid size-9 place-items-center rounded-full bg-white/90 text-slate-800 shadow ring-1 ring-black/5 backdrop-blur transition hover:bg-white active:scale-95"}>
        <Share2 size={variant === "pill" ? 17 : 16} />{variant === "pill" && label}
      </button>
      {open && (
        <span role="menu" aria-label="Compartilhar em" className="absolute bottom-full right-0 z-50 mb-2 grid w-52 gap-0.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl">
          <a role="menuitem" className={item} href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}><MessageCircle size={16} className="text-emerald-600" /> WhatsApp</a>
          <a role="menuitem" className={item} href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}><Send size={16} className="text-sky-600" /> Telegram</a>
          <button role="menuitem" type="button" className={item} onClick={() => void copy()}>{copied ? <Check size={16} className="text-emerald-600" /> : <Link2 size={16} />} {copied ? "Link copiado" : "Copiar link"}</button>
        </span>
      )}
    </span>
  );
}
