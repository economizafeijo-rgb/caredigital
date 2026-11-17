import { useEffect, useState, type ReactNode } from "react";
import { Beef, Droplets, Flame, Moon, Pill, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DaySummary, GoalMetric, GoalStatus } from "@/lib/day-metrics";

export const nf = (value: number | null | undefined, digits = 0) =>
  value === null || value === undefined || !Number.isFinite(value) ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: digits });
export const hm = (hours: number) => `${Math.floor(hours)}h${String(Math.round((hours % 1) * 60)).padStart(2, "0")}`;
export const clock = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Rio_Branco", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

export const METRIC_STYLE: Record<GoalMetric, { icon: LucideIcon; hex: string; text: string; soft: string }> = {
  hidratacao: { icon: Droplets, hex: "#0ea5e9", text: "text-sky-600 dark:text-sky-300", soft: "bg-sky-500/15" },
  calorias: { icon: Flame, hex: "#f97316", text: "text-orange-600 dark:text-orange-300", soft: "bg-orange-500/15" },
  proteina: { icon: Beef, hex: "#f43f5e", text: "text-rose-600 dark:text-rose-300", soft: "bg-rose-500/15" },
  suplementos: { icon: Sparkles, hex: "#8b5cf6", text: "text-violet-600 dark:text-violet-300", soft: "bg-violet-500/15" },
  medicacao: { icon: Pill, hex: "#ec4899", text: "text-pink-600 dark:text-pink-300", soft: "bg-pink-500/15" },
  sono: { icon: Moon, hex: "#6366f1", text: "text-indigo-600 dark:text-indigo-300", soft: "bg-indigo-500/15" },
};

export const STATUS_STYLE: Record<GoalStatus, { label: string; cls: string; hex: string }> = {
  atingida: { label: "Atingida", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", hex: "#10b981" },
  nao_atingida: { label: "Não atingida", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300", hex: "#f43f5e" },
  em_andamento: { label: "Em andamento", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300", hex: "#0ea5e9" },
  sem_registro: { label: "Sem registro", cls: "bg-muted text-muted-foreground", hex: "#94a3b8" },
  sem_meta: { label: "Sem meta", cls: "bg-muted text-muted-foreground", hex: "#94a3b8" },
};
export const SUMMARY_HEX: Record<DaySummary, string> = { ok: "#10b981", partial: "#f59e0b", miss: "#f43f5e", open: "#0ea5e9", empty: "#cbd5e1", future: "#e2e8f0" };

export function StatusBadge({ status }: { status: GoalStatus }) {
  const style = STATUS_STYLE[status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style.cls}`}>{style.label}</span>;
}

/** Anel de progresso que enche com uma transição suave quando aparece. */
export function ProgressRing({ pct, color, size = 84, children }: { pct: number; color: string; size?: number; children?: ReactNode }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const [shown, setShown] = useState(0);
  useEffect(() => { const frame = requestAnimationFrame(() => setShown(Math.min(100, Math.max(0, pct)))); return () => cancelAnimationFrame(frame); }, [pct]);
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)} style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }} />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

export function Panel({ title, note, action, children, className = "" }: { title: string; note?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-4 shadow-card ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h3 className="font-display text-sm font-bold">{title}</h3>{note && <p className="text-[11px] text-muted-foreground">{note}</p>}</div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Kpi({ label, value, note, icon: Icon, tone }: { label: string; value: string; note?: string; icon: LucideIcon; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 shadow-card">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <span className={`grid size-7 place-items-center rounded-lg ${tone}`}><Icon size={15} /></span>{label}
      </div>
      <p className="mt-2 font-display text-xl font-extrabold tabular-nums tracking-tight">{value}</p>
      {note && <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{note}</p>}
    </div>
  );
}

/** Dica flutuante padrão dos gráficos, com o mesmo visual do restante do aplicativo. */
export function ChartTip({ active, payload, title, rows }: { active?: boolean; payload?: any[]; title: (row: any) => string; rows: (row: any) => [string, string, string?][] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-pop">
      <p className="font-bold">{title(row)}</p>
      {rows(row).map(([label, value, color]) => (
        <p key={label} className="mt-0.5 flex items-center gap-1.5">
          {color && <span className="inline-block size-2 rounded-full" style={{ background: color }} />}<span className="text-muted-foreground">{label}:</span> <strong>{value}</strong>
        </p>
      ))}
    </div>
  );
}
