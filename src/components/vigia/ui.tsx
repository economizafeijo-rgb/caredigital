import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function useNow(interval = 1000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

export function secondsUntil(now: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const t = new Date(now);
  t.setHours(h, m, 0, 0);
  return Math.floor((t.getTime() - now.getTime()) / 1000);
}

export function fmtDuration(sec: number) {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return [h, m, r].map((n) => String(n).padStart(2, "0")).join(":");
}

export function fmtClock(d: Date | null) {
  if (!d) return "--:-- · --";
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
  return `${time} · ${date}`;
}

type Variant = "dark" | "primary" | "ghost" | "glass" | "danger";
const variants: Record<Variant, string> = {
  dark: "bg-foreground text-primary-foreground hover:bg-foreground/90",
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  ghost: "bg-foreground/5 text-foreground hover:bg-foreground/10",
  glass: "bg-primary-foreground/10 text-primary-foreground ring-1 ring-primary-foreground/15 hover:bg-primary-foreground/15",
  danger: "bg-destructive/10 text-destructive hover:bg-destructive/15",
};

export function Btn({
  variant = "dark",
  size = "sm",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "lg" }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-50",
        size === "sm" ? "rounded-md px-3 py-2 text-xs" : "rounded-lg px-5 py-3 text-sm",
        variants[variant],
        className,
      )}
    />
  );
}

const tones = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-foreground/5 text-muted-foreground",
} as const;
export type ToneKey = keyof typeof tones;

export function Tag({ tone = "muted", children, className }: { tone?: ToneKey; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

export function IconBox({ tone = "primary", children, round }: { tone?: ToneKey; children: ReactNode; round?: boolean }) {
  return (
    <div className={cn("grid size-10 shrink-0 place-items-center font-display", round ? "rounded-full" : "rounded-lg", tones[tone])}>
      {children}
    </div>
  );
}

export const kindTone = (k: string): ToneKey =>
  k === "Natural" ? "success" : k === "Suplemento" ? "warning" : "primary";

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex animate-rise flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="label-mono text-muted-foreground">{eyebrow}</div>
        <h1 className="mt-2 font-display text-5xl leading-[0.95] tracking-tight">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, delay = 0 }: { title?: string; action?: ReactNode; children: ReactNode; className?: string; delay?: number }) {
  return (
    <div className={cn("panel animate-rise", className)} style={{ animationDelay: `${delay}s` }}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-2xl tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label-mono mb-1.5 block text-[10px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="panel w-full max-w-lg animate-rise" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-3xl tracking-tight">{title}</h3>
          <button onClick={onClose} className="label-mono text-muted-foreground hover:text-foreground">Fechar</button>
        </div>
        {children}
      </div>
    </div>
  );
}
