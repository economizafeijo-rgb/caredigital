import { useEffect, useId, useRef, useState } from "react";
import { Bell, Check, Pencil, TimerReset, Volume2, VolumeX, X } from "lucide-react";

const SOUND_KEY = "nv-alert-sound";
let audioCtx: AudioContext | null = null;

/** Libera o áudio do navegador (precisa de um toque do usuário) e devolve o contexto. */
function audio() {
  if (typeof window === "undefined") return null;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx ??= new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

/** O usuário pode silenciar os alertas sonoros pelo ícone de som do relógio. */
export function alertSoundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

/** Alarme de limite de saúde: "near" = dois toques descendentes; "over"/"severe" = sirene curta e urgente. */
export function playWarning(level: "near" | "over" | "severe") {
  const ctx = audio();
  if (!ctx) return;
  const seq =
    level === "near"
      ? [
          [660, 0],
          [494, 0.22],
        ]
      : level === "over"
        ? [
            [880, 0],
            [660, 0.18],
            [880, 0.36],
            [660, 0.54],
          ]
        : [
            [988, 0],
            [740, 0.15],
            [988, 0.3],
            [740, 0.45],
            [988, 0.6],
            [740, 0.75],
          ];
  for (const [freq, at] of seq) {
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = level === "near" ? "triangle" : "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(level === "near" ? 0.16 : 0.09, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }
}

/** Alerta curto e agradável: três notas ascendentes, como um sino digital. */
export function playChime(volume = 0.25) {
  const ctx = audio();
  if (!ctx) return;
  const notes = [880, 1174.66, 1567.98];
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.16;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1);
  });
}

export function useAlertSound() {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      /* sem armazenamento */
    }
    if (next) {
      playChime(0.15);
      if (typeof Notification !== "undefined" && Notification.permission === "default")
        void Notification.requestPermission();
    }
  };
  return { on, toggle };
}

const clockTime = (ms: number) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Rio_Branco",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
const countdown = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
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
  /** Alterar a quantidade antes de registrar. */
  onEdit?: () => void;
  /** Adiar o horário (minutos); mostra um menu discreto. A confirmação é feita por quem recebe. */
  onPostpone?: (minutes: number) => void;
  /** Cancelar o item de hoje; a confirmação é feita por quem recebe. */
  onCancel?: () => void;
  /** Identifica o tipo de lembrete para não repetir o alerta do mesmo horário. */
  alertKey: string;
  className?: string;
  /** Versão menor para caber dentro de cartões (ex.: painel ao vivo). */
  compact?: boolean;
};

/**
 * Relógio do próximo cuidado: mostrador animado, contagem regressiva e alerta sonoro,
 * com vibração e notificação do navegador quando o horário chega (com a página aberta).
 */
export function NextUpClock({
  target,
  from,
  title,
  detail,
  color = "#22d3ee",
  emptyText = "Sem próximo horário",
  actionLabel,
  onAction,
  onEdit,
  onPostpone,
  onCancel,
  alertKey,
  className = "",
  compact = false,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [snooze, setSnooze] = useState<number | null>(null);
  const sound = useAlertSound();
  const gid = useId().replace(/:/g, "");
  const [menu, setMenu] = useState(false);
  const fired = useRef<string | null>(null);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  // Alguns horários são recalculados como "agora" a cada segundo depois de vencidos (ex.: próximo copo).
  // Fixa o primeiro horário vencido até surgir um horário realmente novo (mais de 5 min depois),
  // para o relógio não alternar entre contagem e "pendente".
  const [latched, setLatched] = useState<number | null>(null);
  const targetMin = target === null ? null : Math.round(target / 60_000);
  useEffect(() => {
    setSnooze(null);
  }, [targetMin]);
  useEffect(() => {
    if (target === null) {
      setLatched(null);
      return;
    }
    setLatched((l) => {
      if (l !== null && target <= l + 5 * 60_000 + Math.max(0, now - l)) return l;
      return target <= now + 1500 ? target : null;
    });
  }, [target, now]);

  const when = snooze ?? latched ?? target;
  const due = when !== null && when <= now + 1000;
  useEffect(() => {
    if (!due || when === null) return;
    const id = `${alertKey}:${Math.round(when / 60000)}`;
    let seen = fired.current === id;
    try {
      seen ||= sessionStorage.getItem("nv-alert:" + id) === "1";
    } catch {
      /* ok */
    }
    if (seen || now - when > 10 * 60_000) return; // não toca alertas antigos ao abrir a página
    fired.current = id;
    try {
      sessionStorage.setItem("nv-alert:" + id, "1");
    } catch {
      /* ok */
    }
    if (sound.on) {
      playChime();
      window.setTimeout(() => playChime(0.18), 1400);
    }
    try {
      navigator.vibrate?.([180, 90, 180]);
    } catch {
      /* ok */
    }
    try {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        document.visibilityState !== "visible"
      )
        new Notification(`NextVita · ${title}`, {
          body: detail ?? "Chegou a hora.",
          tag: alertKey,
          icon: "/caredigital-icon.svg",
        });
    } catch {
      /* ok */
    }
  }, [due, when, alertKey, sound.on, title, detail, now]);

  const start = from ?? (when ? when - 60 * 60_000 : now);
  const span = when ? Math.max(60_000, when - start) : 1;
  const progress = when ? Math.min(1, Math.max(0, (now - start) / span)) : 0;
  const R = 40,
    C = 2 * Math.PI * R;
    // Vencido: o relógio para de "correr" e assume a cor âmbar de pendência, com um brilho lento.
  const PEND = "#fbbf24";
  const idle = when === null;
  const ink = due ? PEND : idle ? "#34d399" : color;
  const lateMin = due && when !== null ? Math.max(0, Math.floor((now - when) / 60_000)) : 0;

  return (
    <div className="@container min-w-0">
      <div
        className={`${compact ? "flex items-center gap-3 rounded-2xl bg-gradient-to-br from-white/[.09] to-white/[.02] p-2.5" : "grid grid-cols-1 gap-x-3 gap-y-2 bg-gradient-to-br from-white/[.10] to-white/[.03] p-2 pb-2.5 @[46rem]:grid-cols-[minmax(0,1fr)_auto] @[46rem]:items-center"} relative overflow-hidden border backdrop-blur transition-colors duration-500 ${due ? "nv-due border-white/15 border-l-[3px] !border-l-amber-300" : "border-white/15"} ${className}`}
        style={{ ["--due" as string]: PEND }}
      >
        {!compact && when !== null && (
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
            <span
              className="block h-full transition-[width] duration-1000 ease-linear"
              style={{
                width: `${(due ? 1 : progress) * 100}%`,
                background: `linear-gradient(90deg, transparent, ${ink})`,
                boxShadow: `0 0 10px ${ink}`,
              }}
            />
          </span>
        )}
        <div className={`flex min-w-0 items-center gap-3 ${compact ? "" : "flex-1"}`}>
          <div
            className={`relative shrink-0 ${compact ? "size-[60px]" : "size-[62px]"}`}
            aria-hidden="true"
          >
            <svg viewBox="0 0 100 100" className="size-full">
              <defs>
                <linearGradient id={`${gid}-g`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={ink} stopOpacity=".45" />
                  <stop offset="1" stopColor={ink} />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r={R + 4} fill="#ffffff08" />
              <circle cx="50" cy="50" r={R} fill="none" stroke="#ffffff1f" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={`url(#${gid}-g)`}
                strokeWidth="6"
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className={due ? "nv-breathe" : ""}
                strokeDasharray={C}
                strokeDashoffset={C * (1 - (due || idle ? 1 : progress))}
                strokeOpacity={idle ? 0.55 : 1}
                style={{
                  transition: "stroke-dashoffset 1s linear, stroke .5s",
                  filter: due || idle ? "none" : `drop-shadow(0 0 4px ${ink}99)`,
                }}
              />
              {!due && !idle && progress > 0.02 && (
                <circle
                  cx={50 + R * Math.sin(progress * Math.PI * 2)}
                  cy={50 - R * Math.cos(progress * Math.PI * 2)}
                  r="4.2"
                  fill="#fff"
                  style={{ filter: `drop-shadow(0 0 4px ${ink})`, transition: "all 1s linear" }}
                />
              )}
            </svg>
            <span className="absolute inset-0 grid place-items-center">
              {due ? (
                <span
                  className={`relative grid place-items-center ${compact ? "size-8" : "size-8"}`}
                >
                  <svg viewBox="0 0 48 48" className="absolute inset-0 size-full">
                    <circle cx="24" cy="24" r="20" fill="#fbbf24" fillOpacity=".14" />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke="#fbbf24"
                      strokeOpacity=".7"
                      strokeWidth="1.2"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1.2"
                      className="nv-ping-ring"
                    />
                  </svg>
                  <Bell
                    size={compact ? 14 : 15}
                    className="nv-bell-swing relative"
                    style={{ color: PEND }}
                  />
                </span>
              ) : (
                idle ? (
                  <Check size={compact ? 18 : 20} strokeWidth={3} style={{ color: ink }} />
                ) : (
                  <span className="text-[13px] font-extrabold tabular-nums text-white/90">
                    {Math.round(progress * 100)}
                    <span className="text-[8px] font-bold text-white/50">%</span>
                  </span>
                )
              )}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center justify-between gap-2 text-[11px] font-semibold tracking-wide text-white/60">
              <span className="min-w-0 truncate" title={title}>
                {title}
              </span>
              <button
                type="button"
                onClick={sound.toggle}
                aria-pressed={sound.on}
                aria-label={sound.on ? "Desativar alerta sonoro" : "Ativar alerta sonoro"}
                title={sound.on ? "Som ativado" : "Som desativado"}
                className="grid size-5 shrink-0 place-items-center text-white/60 transition hover:text-white active:scale-90"
              >
                {sound.on ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
            </p>
            {when === null ? (
              <p className="mt-1 truncate text-[15px] font-bold leading-tight text-white">{emptyText}</p>
            ) : due ? (
              <p
                className={`mt-0.5 flex items-baseline gap-2 whitespace-nowrap text-lg font-extrabold leading-none`}
                style={{ color: PEND }}
              >
                {lateMin < 1 ? "É hora!" : "Pendente"}
                {lateMin >= 1 && (
                  <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-200">
                    há{" "}
                    {lateMin < 60
                      ? `${lateMin} min`
                      : `${Math.floor(lateMin / 60)} h ${String(lateMin % 60).padStart(2, "0")}`}
                  </span>
                )}
              </p>
            ) : (
              <p
                className={`mt-0.5 whitespace-nowrap font-mono text-2xl font-bold leading-none tabular-nums tracking-tight`}
                style={compact ? undefined : { textShadow: `0 0 10px ${ink}66` }}
              >
                {countdown(when - now)}
              </p>
            )}
            {when !== null && (
              <p
                className="mt-1 truncate text-[10.5px] leading-snug text-white/60"
                title={detail ?? undefined}
              >
                às {clockTime(when)}
                {detail ? ` · ${detail}` : ""}
              </p>
            )}
          </div>
        </div>
        {!compact && when !== null && (
          <div
            className={`flex h-8 w-full shrink-0 items-stretch gap-1 @[46rem]:w-auto transition-opacity duration-300 ${due || onPostpone || when - now < 15 * 60_000 ? "opacity-100" : "pointer-events-none opacity-0"}`}
            aria-hidden={!(due || onPostpone || when - now < 15 * 60_000)}
          >
            {onAction && (
              <button
                type="button"
                onClick={onAction}
                style={{
                  background: due ? PEND : `${ink}33`,
                  borderColor: ink,
                  color: due ? "#1c1300" : "#fff",
                }}
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap border px-3 text-[13px] font-bold transition hover:brightness-110 active:scale-[.98]"
              >
                <Check size={15} className="shrink-0" />
                <span className="max-w-[8rem] truncate">{actionLabel ?? "Registrar"}</span>
              </button>
            )}
            {onAction && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                title="Alterar a quantidade"
                aria-label="Alterar a quantidade antes de registrar"
                className="grid w-9 shrink-0 place-items-center border border-white/25 text-white/85 transition hover:bg-white/10 active:scale-95"
              >
                <Pencil size={14} />
              </button>
            )}
            {onPostpone && (
              <span className="relative flex">
                <button
                  type="button"
                  onClick={() => setMenu((m) => !m)}
                  aria-expanded={menu}
                  aria-label="Adiar"
                  title="Adiar"
                  className="grid w-9 shrink-0 place-items-center border border-white/25 text-white/85 transition hover:bg-white/10 active:scale-95"
                >
                  <TimerReset size={14} />
                </button>
                {menu && (
                  <span className="absolute bottom-11 right-0 z-20 flex flex-col border border-white/20 bg-slate-950/95 p-1 text-[12px] shadow-xl">
                    {[30, 60, 120, 180].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setMenu(false);
                          onPostpone(m);
                        }}
                        className="whitespace-nowrap px-4 py-1.5 text-left font-semibold text-white/90 hover:bg-white/10"
                      >
                        {m >= 60 ? `${m / 60} h` : `${m} min`}
                      </button>
                    ))}
                  </span>
                )}
              </span>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                title="Sem apetite"
                aria-label="Sem apetite"
                className="grid w-9 shrink-0 place-items-center border border-white/25 text-white/75 transition hover:bg-white/10 hover:text-white active:scale-95"
              >
                <X size={14} />
              </button>
            )}
            {due && !onPostpone && (
              <button
                type="button"
                onClick={() => setSnooze(Date.now() + 10 * 60_000)}
                title="Adiar 10 minutos"
                aria-label="Adiar 10 minutos"
                className="grid w-9 shrink-0 place-items-center border border-white/25 text-white/85 transition hover:bg-white/10 active:scale-95"
              >
                <TimerReset size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
