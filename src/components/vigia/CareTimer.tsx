import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlarmClock, ArrowRight, BellRing, Droplets, Pill, Sparkles, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey } from "@/lib/acre-time";

const tz = "America/Rio_Branco";
const hhmm = (ms: number) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(ms));

/** Relógio compartilhado de 1 s que não altera o layout (dígitos tabulares e largura fixa). */
export function useTicker(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const id = window.setInterval(update, intervalMs);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(id); window.removeEventListener("focus", update); };
  }, [intervalMs]);
  return now;
}

export function splitDuration(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60, total };
}

type Tone = "primary" | "water" | "med" | "meal" | "supplement";
const tones: Record<Tone, { from: string; to: string; chip: string }> = {
  primary: { from: "#6366f1", to: "#3b82f6", chip: "from-indigo-600 to-blue-500" },
  water: { from: "#0ea5e9", to: "#22d3ee", chip: "from-sky-600 to-cyan-500" },
  med: { from: "#e11d48", to: "#ec4899", chip: "from-rose-600 to-pink-500" },
  meal: { from: "#059669", to: "#84cc16", chip: "from-emerald-600 to-lime-500" },
  supplement: { from: "#7c3aed", to: "#f59e0b", chip: "from-violet-600 to-amber-500" },
};
export const toneForCategory = (category: string): Tone =>
  category === "hidratacao" ? "water" : category === "medicacao" ? "med" : category === "refeicao" ? "meal" : category === "outro" ? "supplement" : "primary";
const iconForTone: Record<Tone, LucideIcon> = { primary: AlarmClock, water: Droplets, med: Pill, meal: UtensilsCrossed, supplement: Sparkles };

/**
 * Timer profissional: anel de progresso, dígitos grandes HH:MM:SS e horário-alvo.
 * `windowMs` define quanto tempo antes do horário o anel começa a encher.
 */
export function CareTimer({ target, title, subtitle, tone = "primary", windowMs = 2 * 3600_000, size = "md", dark = false }: {
  target: number; title?: string; subtitle?: string; tone?: Tone; windowMs?: number; size?: "sm" | "md" | "lg"; dark?: boolean;
}) {
  const now = useTicker();
  const left = target - now;
  const { h, m, s } = splitDuration(left);
  const due = left <= 0;
  const progress = due ? 1 : Math.min(1, Math.max(0, 1 - left / windowMs));
  const dim = size === "lg" ? 168 : size === "sm" ? 96 : 128;
  const stroke = size === "sm" ? 8 : 10;
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const palette = tones[tone];
  const Icon = iconForTone[tone];
  const gradientId = `care-timer-${tone}`;
  const digits = size === "lg" ? "text-[28px]" : size === "sm" ? "text-[15px]" : "text-[19px]";
  return <div className="flex items-center gap-4" role="timer" aria-live="off" aria-label={due ? "Horário chegou" : `Faltam ${h} horas, ${m} minutos e ${s} segundos`}>
    <div className="relative shrink-0" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90" aria-hidden="true">
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={palette.from}/><stop offset="100%" stopColor={palette.to}/></linearGradient></defs>
        <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" strokeWidth={stroke} className={dark ? "stroke-white/15" : "stroke-muted"}/>
        <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" strokeWidth={stroke} stroke={`url(#${gradientId})`} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} style={{ transition: "stroke-dashoffset 1s linear" }}/>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {due
          ? <span className={`flex flex-col items-center gap-1 font-bold ${dark ? "text-white" : "text-foreground"}`}><BellRing size={size === "sm" ? 18 : 24} className="animate-pulse text-amber-400"/><span className="text-xs">Agora</span></span>
          : <span className={`font-mono font-bold tabular-nums tracking-tight ${digits} ${dark ? "text-white" : "text-foreground"}`}>
              {h > 0 ? `${String(h).padStart(2, "0")}:` : ""}{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
              <span className={`block text-[10px] font-semibold uppercase tracking-[.12em] ${dark ? "text-white/60" : "text-muted-foreground"}`}>{h > 0 ? "h · min · s" : "min · s"}</span>
            </span>}
      </div>
    </div>
    {(title || subtitle) && <div className="min-w-0">
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white ${palette.chip}`}><Icon size={13}/>Às {hhmm(target)}</span>
      {title && <p className={`mt-2 line-clamp-2 text-base font-bold leading-snug ${dark ? "text-white" : ""}`}>{title}</p>}
      {subtitle && <p className={`mt-0.5 text-sm ${dark ? "text-white/70" : "text-muted-foreground"}`}>{subtitle}</p>}
    </div>}
  </div>;
}

type NextTask = { id: string; title: string; category: string; scheduled_at: string };
const categoryLabel: Record<string, string> = { medicacao: "Medicação", hidratacao: "Hidratação", refeicao: "Refeição", outro: "Suplemento" };

/** Próximo cuidado do paciente logado, para a homepage. Atualiza silenciosamente a cada minuto. */
export function useNextCare() {
  const [task, setTask] = useState<NextTask | null>(null);
  const [ready, setReady] = useState(false);
  const minute = useTicker(60_000);
  useEffect(() => {
    let active = true;
    void (async () => {
      const db = supabase as any;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { if (active) { setTask(null); setReady(true); } return; }
      const grant = await db.from("care_patient_access").select("patient_id").eq("user_id", auth.user.id).limit(1);
      const patientId = grant.data?.[0]?.patient_id;
      if (!patientId) { if (active) setReady(true); return; }
      const start = new Date(acreDateKey() + "T00:00:00-05:00");
      const end = new Date(start.getTime() + 86_400_000);
      const rows = await db.from("care_daily_checklist").select("id,title,category,scheduled_at,completed_at")
        .eq("patient_id", patientId).is("completed_at", null)
        .gte("scheduled_at", new Date(Math.max(start.getTime(), Date.now() - 30 * 60_000)).toISOString())
        .lt("scheduled_at", end.toISOString()).order("scheduled_at", { ascending: true }).limit(1);
      if (!active) return;
      setTask(rows.data?.[0] ?? null);
      setReady(true);
    })();
    return () => { active = false; };
  }, [minute]);
  return { task, ready };
}

export function HomeNextCareCard({ panel }: { panel: string }) {
  const { task, ready } = useNextCare();
  if (!ready) return <div className="h-[184px] animate-pulse rounded-3xl bg-white/10"/>;
  return <div className="rounded-3xl border border-white/15 bg-white/10 p-5 text-white shadow-2xl backdrop-blur-md">
    <p className="text-[11px] font-bold uppercase tracking-[.14em] text-white/70">Seu próximo cuidado</p>
    {task
      ? <div className="mt-3"><CareTimer target={Date.parse(task.scheduled_at)} title={task.title} subtitle={categoryLabel[task.category] ?? "Cuidado"} tone={toneForCategory(task.category)} dark/></div>
      : <p className="mt-3 text-sm text-white/80">Nenhum cuidado pendente para hoje. Aproveite o dia!</p>}
    <Link to={panel} hash="agenda" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-white/90">
      Abrir agenda <ArrowRight size={16}/>
    </Link>
  </div>;
}
