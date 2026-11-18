import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, Clock3, TimerReset } from "lucide-react";

const SOUND_KEY = "nv-alert-sound";
let audioCtx: AudioContext | null = null;

/** Libera o áudio do navegador (precisa de um toque do usuário) e devolve o contexto. */
function audio() {
  if (typeof window === "undefined") return null;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx ??= new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch { return null; }
}

/** Alerta curto e agradável: três notas ascendentes, como um sino digital. */
export function playChime(volume = 0.25) {
  const ctx = audio();
  if (!ctx) return;
  const notes = [880, 1174.66, 1567.98];
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.16;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t); osc.stop(t + 1);
  });
}

export function useAlertSound() {
  const [on, setOn] = useState(() => { try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; } });
  const toggle = () => {
    const next = !on;
    setOn(next);
    try { localStorage.setItem(SOUND_KEY, next ? "on" : "off"); } catch { /* sem armazenamento */ }
    if (next) {
      playChime(0.15);
      if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
    }
  };
  return { on, toggle };
}

const clockTime = (ms: number) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Rio_Branco", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
const countdown = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

type Props = {
  /** Momento previsto (ms). Sem previsão, mostra `emptyText`. */
  target: number | null;
  /** Início do intervalo (ex.: último registro); define o progresso do anel. */
  from?: number | null;
  title: string;
  detail?: string;
  color?: string;
  emptyText?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Identifica o tipo de lembrete para não repetir o alerta do mesmo horário. */
  alertKey: string;
  className?: string;
};

/**
 * Relógio do próximo cuidado: mostrador animado, contagem regressiva e alerta sonoro,
 * com vibração e notificação do navegador quando o horário chega (com a página aberta).
 */
export function NextUpClock({ target, from, title, detail, color = "#22d3ee", emptyText = "Sem próximo horário", actionLabel, onAction, alertKey, className = "" }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [snooze, setSnooze] = useState<number | null>(null);
  const sound = useAlertSound();
  const fired = useRef<string | null>(null);
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  useEffect(() => { setSnooze(null); }, [target]);

  const when = snooze ?? target;
  const due = when !== null && when <= now;
  useEffect(() => {
    if (!due || when === null) return;
    const id = `${alertKey}:${Math.round(when / 60000)}`;
    let seen = fired.current === id;
    try { seen ||= sessionStorage.getItem("nv-alert:" + id) === "1"; } catch { /* ok */ }
    if (seen || now - when > 10 * 60_000) return; // não toca alertas antigos ao abrir a página
    fired.current = id;
    try { sessionStorage.setItem("nv-alert:" + id, "1"); } catch { /* ok */ }
    if (sound.on) { playChime(); window.setTimeout(() => playChime(0.18), 1400); }
    try { navigator.vibrate?.([180, 90, 180]); } catch { /* ok */ }
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible")
        new Notification(`NextVita · ${title}`, { body: detail ?? "Chegou a hora.", tag: alertKey, icon: "/caredigital-icon.svg" });
    } catch { /* ok */ }
  }, [due, when, alertKey, sound.on, title, detail, now]);

  const start = from ?? (when ? when - 60 * 60_000 : now);
  const span = when ? Math.max(60_000, when - start) : 1;
  const progress = when ? Math.min(1, Math.max(0, (now - start) / span)) : 0;
  const R = 40, C = 2 * Math.PI * R;
  const sec = new Date(now).getSeconds();

  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur ${due ? "nv-due" : ""} ${className}`} style={{ ["--due" as string]: color }}>
      <div className="relative size-[88px] shrink-0" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="size-full">
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
            const r1 = big ? 44 : 46, r2 = 48.5;
            return <line key={i} x1={50 + r1 * Math.sin(a)} y1={50 - r1 * Math.cos(a)} x2={50 + r2 * Math.sin(a)} y2={50 - r2 * Math.cos(a)} stroke="#fff" strokeOpacity={i === sec ? 0.95 : big ? 0.45 : 0.15} strokeWidth={big ? 1.6 : 1} />;
          })}
          <circle cx="50" cy="50" r={R} fill="none" stroke="#ffffff14" strokeWidth="6" />
          <circle cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" transform="rotate(-90 50 50)"
            strokeDasharray={C} strokeDashoffset={C * (1 - (due ? 1 : progress))} style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 5px ${color})` }} />
          <line x1="50" y1="50" x2={50 + 30 * Math.sin((sec / 60) * Math.PI * 2)} y2={50 - 30 * Math.cos((sec / 60) * Math.PI * 2)} stroke={color} strokeWidth="1.6" strokeLinecap="round" style={{ transition: sec === 0 ? "none" : "all .25s cubic-bezier(.4,2.2,.6,1)" }} />
          <circle cx="50" cy="50" r="2.6" fill={color} />
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          {due ? <Bell size={20} className="nv-ring-bell" style={{ color }} /> : <Clock3 size={14} className="mt-7 text-white/50" />}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center justify-between gap-2 text-[11px] font-semibold text-white/70">
          <span className="truncate">{title}</span>
          <button type="button" onClick={sound.toggle} aria-pressed={sound.on} aria-label={sound.on ? "Desativar alerta sonoro" : "Ativar alerta sonoro"} title={sound.on ? "Som ativado" : "Som desativado"}
            className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 active:scale-90">{sound.on ? <Bell size={13} /> : <BellOff size={13} />}</button>
        </p>
        {when === null ? (
          <p className="mt-0.5 text-sm font-bold">{emptyText}</p>
        ) : due ? (
          <p className="mt-0.5 text-xl font-extrabold" style={{ color }}>É hora!</p>
        ) : (
          <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums leading-none">{countdown(when - now)}</p>
        )}
        {when !== null && <p className="mt-1 truncate text-[11px] text-white/70">às {clockTime(when)}{detail ? ` · ${detail}` : ""}</p>}
        {when !== null && (due || when - now < 15 * 60_000) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {onAction && <button type="button" onClick={onAction} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 text-xs font-bold text-slate-900 transition hover:bg-white/90 active:scale-95"><Check size={13} /> {actionLabel ?? "Registrar"}</button>}
            {due && <button type="button" onClick={() => setSnooze(Date.now() + 10 * 60_000)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/25 px-2.5 text-xs font-semibold text-white/85 transition hover:bg-white/10 active:scale-95"><TimerReset size={13} /> Adiar 10 min</button>}
          </div>
        )}
      </div>
    </div>
  );
}
