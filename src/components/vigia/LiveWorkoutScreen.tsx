import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Bike,
  Flame,
  Footprints,
  Lock,
  LockOpen,
  MapPin,
  Pause,
  Play,
  Satellite,
  Square,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import {
  currentSpeedKmh,
  estimateKcal,
  paceLabel,
  routePath,
  type LivePoint,
  type LiveStatus,
} from "./LiveWorkoutVisual";
import { formatPace } from "@/lib/gps-tracker";

export const WORKOUT_TYPES = [
  { value: "caminhada", label: "Caminhada", icon: Footprints },
  { value: "corrida", label: "Corrida", icon: Zap },
  { value: "ciclismo", label: "Ciclismo", icon: Bike },
] as const;

const BG = "/images/hero-treinos.webp";

const CSS = `
@keyframes nvw-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes nvw-count{0%{opacity:0;transform:scale(1.8)}25%{opacity:1;transform:scale(1)}85%{opacity:1}100%{opacity:0;transform:scale(.7)}}
@keyframes nvw-ring{0%{transform:scale(1);opacity:.55}100%{transform:scale(1.55);opacity:0}}
@keyframes nvw-glow{0%,100%{opacity:.35}50%{opacity:.7}}
@keyframes nvw-draw{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}
@keyframes nvw-pan{from{transform:scale(1.08) translateX(0)}to{transform:scale(1.08) translateX(-3%)}}
.nvw-in{animation:nvw-in .5s cubic-bezier(.2,.8,.2,1) both}
.nvw-btn{transition:transform .15s ease,background-color .2s ease,box-shadow .2s ease}
.nvw-btn:active{transform:scale(.94)}
@media (prefers-reduced-motion: reduce){.nvw-anim,.nvw-in{animation:none!important}}
`;

const hhmmss = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
};

/** Camada de tela cheia (acima de toda a página, abaixo das caixas de confirmação). */
export function WorkoutShell({
  children,
  label,
  moving = false,
}: {
  children: ReactNode;
  label: string;
  moving?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  if (!mounted) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="nv-dark nv-round fixed inset-0 z-[11000] !max-h-none overflow-hidden bg-[#050b14] text-white"
    >
      <style>{CSS}</style>
      <div aria-hidden="true" className="absolute inset-0">
        <img
          src={BG}
          alt=""
          className="nvw-anim absolute inset-0 size-full object-cover opacity-55"
          style={{ animation: "nvw-pan 40s ease-in-out infinite alternate" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,11,20,.55)_0%,rgba(5,11,20,.82)_38%,rgba(5,11,20,.96)_70%,#050b14_100%)]" />
        <div
          className="nvw-anim absolute -top-32 left-1/2 size-[34rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: moving ? "rgba(16,185,129,.28)" : "rgba(56,189,248,.18)",
            animation: "nvw-glow 4s ease-in-out infinite",
            transition: "background 1s ease",
          }}
        />
      </div>
      <div
        className="relative flex h-full flex-col overflow-y-auto overscroll-contain"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 12px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 14px)",
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function SignalBars({ accuracy, lost }: { accuracy?: number; lost: boolean }) {
  const level =
    lost || !accuracy ? 0 : accuracy <= 8 ? 4 : accuracy <= 15 ? 3 : accuracy <= 30 ? 2 : 1;
  return (
    <span
      className="inline-flex items-end gap-[3px]"
      aria-label={lost ? "Sem sinal de GPS" : `Sinal do GPS ${level} de 4`}
    >
      {[1, 2, 3, 4].map((n) => (
        <i
          key={n}
          className="w-[4px] rounded-full transition-colors duration-500"
          style={{
            height: 4 + n * 3,
            background:
              n <= level
                ? level >= 3
                  ? "#34d399"
                  : level === 2
                    ? "#fbbf24"
                    : "#f87171"
                : "rgba(255,255,255,.2)",
          }}
        />
      ))}
    </span>
  );
}

/** Botão que exige segurar por alguns instantes (evita toques acidentais). */
function HoldButton({
  ms,
  onDone,
  children,
  className,
  ringColor,
  label,
}: {
  ms: number;
  onDone: () => void;
  children: ReactNode;
  className: string;
  ringColor: string;
  label: string;
}) {
  const [p, setP] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef(0);
  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    setP(0);
  };
  const tick = () => {
    const v = Math.min(1, (performance.now() - start.current) / ms);
    setP(v);
    if (v >= 1) {
      stop();
      navigator.vibrate?.(40);
      onDone();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => stop, []);
  return (
    <button
      type="button"
      aria-label={label}
      className={`relative ${className}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        start.current = performance.now();
        raf.current = requestAnimationFrame(tick);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onDone();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute -inset-1.5 size-[calc(100%+12px)] -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="none"
          stroke={ringColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="295.3"
          strokeDashoffset={295.3 * (1 - p)}
        />
      </svg>
      {children}
    </button>
  );
}

export function WorkoutReady({
  type,
  onType,
  onStart,
  onCancel,
  countdown,
}: {
  type: string;
  onType: (t: string) => void;
  onStart: () => void;
  onCancel: () => void;
  countdown: number | null;
}) {
  const t = WORKOUT_TYPES.find((x) => x.value === type) ?? WORKOUT_TYPES[0];
  if (countdown !== null) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[.3em] text-emerald-200/80">
            Prepare-se
          </p>
          <p
            key={countdown}
            className="nvw-anim mt-2 font-display text-[9rem] font-black leading-none tabular-nums"
            style={{ animation: "nvw-count 1s ease-out both" }}
          >
            {countdown || "Vai!"}
          </p>
          <p className="mt-4 text-sm text-white/65">O GPS já está buscando sua posição…</p>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/15 backdrop-blur">
          <Satellite size={14} className="text-emerald-300" /> Treino com GPS
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar"
          className="nvw-btn grid size-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur"
        >
          <X size={18} />
        </button>
      </div>
      <div className="nvw-in mt-auto pt-10">
        <h2 className="font-display text-4xl font-extrabold leading-tight">
          Pronto para a {t.label.toLowerCase()}?
        </h2>
        <p className="mt-2 text-[15px] text-white/75">
          Escolha a atividade e toque em Iniciar. O tempo e a distância só contam enquanto você se
          move.
        </p>
        <div
          className="mt-5 grid grid-cols-3 gap-2"
          role="radiogroup"
          aria-label="Tipo de atividade"
        >
          {WORKOUT_TYPES.map((o) => {
            const on = o.value === type;
            const Icon = o.icon;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onType(o.value)}
                className={`nvw-btn flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-bold ring-1 backdrop-blur ${
                  on
                    ? "bg-emerald-400 text-emerald-950 ring-emerald-300 shadow-[0_8px_30px_-8px_rgba(52,211,153,.7)]"
                    : "bg-white/10 text-white ring-white/15"
                }`}
              >
                <Icon size={20} /> {o.label}
              </button>
            );
          })}
        </div>
        <ul className="mt-5 space-y-2 text-[13px] text-white/75">
          <li className="flex gap-2">
            <MapPin size={16} className="shrink-0 text-emerald-300" /> Fique em local aberto para o
            GPS achar você mais rápido.
          </li>
          <li className="flex gap-2">
            <Pause size={16} className="shrink-0 text-emerald-300" /> Parou? O tempo pausa sozinho e
            volta quando você andar.
          </li>
          <li className="flex gap-2">
            <Lock size={16} className="shrink-0 text-emerald-300" /> A tela fica ligada. Use o
            cadeado para evitar toques sem querer.
          </li>
        </ul>
        <button
          type="button"
          onClick={onStart}
          className="nvw-btn mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-base font-extrabold text-emerald-950 shadow-[0_12px_40px_-10px_rgba(52,211,153,.8)]"
        >
          <Play size={20} fill="currentColor" /> Iniciar {t.label.toLowerCase()}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 h-11 w-full text-sm font-semibold text-white/70"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}

export function WorkoutLive({
  type,
  status,
  elapsed,
  distanceKm,
  route,
  gpsLost,
  locked,
  onLock,
  onTogglePause,
  onStop,
  stillPrompt,
  onStillHere,
  onFinishNow,
  maxMinutes,
}: {
  type: string;
  status: LiveStatus;
  elapsed: number;
  distanceKm: number;
  route: LivePoint[];
  gpsLost: boolean;
  locked: boolean;
  onLock: (v: boolean) => void;
  onTogglePause: () => void;
  onStop: () => void;
  stillPrompt: number | null;
  onStillHere: () => void;
  onFinishNow: () => void;
  maxMinutes: number;
}) {
  const t = WORKOUT_TYPES.find((x) => x.value === type) ?? WORKOUT_TYPES[0];
  const Icon = t.icon;
  const live = status === "moving";
  const paused = status === "manual";
  const speed = live ? currentSpeedKmh(route) : 0;
  const avgPace = formatPace(distanceKm, elapsed);
  const accuracy = route.at(-1)?.accuracy;
  const path = useMemo(() => routePath(route, 340, 170, 18), [route]);
  const pathLen = route.length * 40;
  const remaining = maxMinutes * 60 - elapsed;

  const pill = gpsLost
    ? {
        text: "Sem sinal de GPS",
        cls: "bg-rose-500/20 text-rose-100 ring-rose-400/40",
        dot: "bg-rose-400 animate-pulse",
      }
    : status === "moving"
      ? {
          text: "Em movimento",
          cls: "bg-emerald-400/15 text-emerald-100 ring-emerald-300/40",
          dot: "bg-emerald-300 animate-pulse",
        }
      : status === "searching"
        ? {
            text: "Buscando GPS",
            cls: "bg-sky-400/15 text-sky-100 ring-sky-300/40",
            dot: "bg-sky-300 animate-pulse",
          }
        : status === "auto"
          ? {
              text: "Parado · pausa automática",
              cls: "bg-amber-400/15 text-amber-100 ring-amber-300/40",
              dot: "bg-amber-300",
            }
          : {
              text: "Pausado",
              cls: "bg-amber-400/15 text-amber-100 ring-amber-300/40",
              dot: "bg-amber-300",
            };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4">
      {/* Topo */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-1.5 pr-3 text-[13px] font-bold ring-1 ring-white/15 backdrop-blur">
          <span className="grid size-7 place-items-center rounded-full bg-emerald-400 text-emerald-950">
            <Icon size={15} />
          </span>
          {t.label}
        </span>
        <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold ring-1 ring-white/15 backdrop-blur">
          <SignalBars accuracy={accuracy} lost={gpsLost} />
          {gpsLost ? "GPS" : accuracy ? `±${Math.round(accuracy)} m` : "GPS"}
        </span>
      </div>

      <div className="mt-3 flex justify-center">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold ring-1 backdrop-blur transition-colors duration-500 ${pill.cls}`}
        >
          <span className={`size-2 rounded-full ${pill.dot}`} /> {pill.text}
        </span>
      </div>

      {gpsLost && (
        <div className="nvw-in mt-3 flex items-start gap-2.5 rounded-2xl bg-rose-500/15 p-3 text-[13px] ring-1 ring-rose-400/30 backdrop-blur">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-rose-300" />
          <p>
            <strong className="block">O sinal do GPS caiu.</strong>
            <span className="text-white/75">
              A distância volta a contar quando o sinal retornar. Vá para um local aberto.
            </span>
          </p>
        </div>
      )}

      {/* Tempo */}
      <div className="mt-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-white/55">
          Tempo em movimento
        </p>
        <p
          className={`font-display font-black leading-none tabular-nums tracking-tight transition-colors duration-500 ${status === "moving" ? "text-white" : "text-white/60"}`}
          style={{ fontSize: "clamp(3.6rem, 19vw, 6.2rem)" }}
          aria-live="off"
        >
          {hhmmss(elapsed)}
        </p>
      </div>

      {/* Números */}
      <dl className="mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-3xl bg-white/[.07] py-3 ring-1 ring-white/10 backdrop-blur-md">
        {[
          ["Distância", distanceKm.toFixed(2), "km"],
          ["Ritmo médio", avgPace, "min/km"],
          ["Agora", speed.toFixed(1), "km/h"],
        ].map(([k, v, u]) => (
          <div key={k} className="px-2 text-center">
            <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-white/55">
              {k}
            </dt>
            <dd className="mt-0.5 text-[1.6rem] font-extrabold leading-none tabular-nums">{v}</dd>
            <dd className="mt-1 text-[11px] text-white/50">{u}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 flex items-center justify-center gap-4 text-[12px] text-white/65">
        <span className="inline-flex items-center gap-1.5">
          <Flame size={13} className="text-orange-300" /> ~{estimateKcal(type, elapsed / 60)} kcal
        </span>
        <span className="inline-flex items-center gap-1.5">
          Ritmo agora <strong className="tabular-nums text-white/90">{paceLabel(speed)}</strong>
        </span>
      </div>

      {/* Percurso */}
      <div className="relative mt-4 min-h-[150px] flex-1 overflow-hidden rounded-3xl bg-black/35 ring-1 ring-white/10 backdrop-blur">
        <svg
          viewBox="0 0 340 170"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 size-full"
          role="img"
          aria-label="Percurso ao vivo"
        >
          <defs>
            <linearGradient id="nvwRoute" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#34d399" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
            <pattern id="nvwGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M24 0H0V24" fill="none" stroke="#fff" strokeOpacity=".06" />
            </pattern>
          </defs>
          <rect width="340" height="170" fill="url(#nvwGrid)" />
          {path.d ? (
            <>
              <path
                d={path.d}
                fill="none"
                stroke="#34d399"
                strokeOpacity=".18"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={path.d}
                fill="none"
                stroke="url(#nvwRoute)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={pathLen}
                className="nvw-anim"
                style={{ ["--len" as string]: pathLen, animation: "nvw-draw 1.2s ease-out both" }}
              />
              <circle
                cx={path.start![0]}
                cy={path.start![1]}
                r="5"
                fill="#050b14"
                stroke="#34d399"
                strokeWidth="3"
              />
              {live && (
                <circle
                  cx={path.end![0]}
                  cy={path.end![1]}
                  r="9"
                  fill="#38bdf8"
                  className="nvw-anim"
                  style={{
                    transformOrigin: `${path.end![0]}px ${path.end![1]}px`,
                    animation: "nvw-ring 1.6s ease-out infinite",
                  }}
                />
              )}
              <circle
                cx={path.end![0]}
                cy={path.end![1]}
                r="6.5"
                fill="#38bdf8"
                stroke="#fff"
                strokeWidth="2.5"
              />
            </>
          ) : (
            <text x="170" y="90" textAnchor="middle" fill="#fff" fillOpacity=".6" fontSize="12.5">
              {gpsLost
                ? "Aguardando o sinal voltar…"
                : "Comece a se mover para desenhar o percurso"}
            </text>
          )}
        </svg>
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
          <MapPin size={12} /> Percurso ao vivo
        </span>
        {remaining <= 15 * 60 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
            Encerra sozinho em {Math.max(0, Math.ceil(remaining / 60))} min (limite de{" "}
            {Math.round(maxMinutes / 60)} h)
          </span>
        )}
      </div>

      {/* Ações */}
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 pb-1">
        <button
          type="button"
          onClick={() => onLock(true)}
          className="nvw-btn mx-auto flex flex-col items-center gap-1 text-[11px] font-semibold text-white/75"
        >
          <span className="grid size-14 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur">
            <Lock size={20} />
          </span>
          Bloquear
        </button>
        <button
          type="button"
          onClick={onTogglePause}
          aria-label={paused ? "Retomar treino" : "Pausar treino"}
          className="nvw-btn relative grid size-[5.5rem] place-items-center rounded-full text-emerald-950 shadow-[0_14px_40px_-10px_rgba(52,211,153,.75)]"
          style={{ background: paused ? "#34d399" : "#fff" }}
        >
          {!paused && live && (
            <span
              aria-hidden="true"
              className="nvw-anim absolute inset-0 rounded-full ring-4 ring-emerald-300/70"
              style={{ animation: "nvw-ring 1.8s ease-out infinite" }}
            />
          )}
          {paused ? (
            <Play size={34} fill="currentColor" />
          ) : (
            <Pause size={34} fill="currentColor" className="text-slate-900" />
          )}
        </button>
        <button
          type="button"
          onClick={onStop}
          className="nvw-btn mx-auto flex flex-col items-center gap-1 text-[11px] font-semibold text-white/75"
        >
          <span className="grid size-14 place-items-center rounded-full bg-rose-500 text-white shadow-[0_10px_30px_-10px_rgba(244,63,94,.8)]">
            <Square size={18} fill="currentColor" />
          </span>
          Encerrar
        </button>
      </div>

      {/* Bloqueio de tela */}
      {locked && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-end bg-black/45 pb-[max(env(safe-area-inset-bottom),24px)] backdrop-blur-[2px]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p className="mb-5 text-sm font-semibold text-white/80">
            Tela bloqueada · o treino continua
          </p>
          <HoldButton
            ms={1200}
            onDone={() => onLock(false)}
            label="Segure para desbloquear"
            ringColor="#34d399"
            className="grid size-20 place-items-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur"
          >
            <LockOpen size={26} />
          </HoldButton>
          <p className="mt-4 text-xs text-white/60">Segure para desbloquear</p>
        </div>
      )}

      {/* Inatividade */}
      {stillPrompt !== null && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/70 p-5 backdrop-blur-sm">
          <div className="nvw-in w-full max-w-sm rounded-3xl bg-[#0d1626] p-5 text-center ring-1 ring-white/15">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-amber-400/15 text-amber-300">
              <TriangleAlert size={26} />
            </span>
            <h3 className="mt-3 text-xl font-extrabold">Ainda está treinando?</h3>
            <p className="mt-1 text-sm text-white/70">
              Você está parado há um tempo. Se não responder, o treino será encerrado em{" "}
              <strong className="tabular-nums text-white">{stillPrompt}s</strong> para não ficar
              ligado à toa.
            </p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={onStillHere}
                className="nvw-btn h-12 rounded-2xl bg-emerald-400 font-extrabold text-emerald-950"
              >
                Continuar treino
              </button>
              <button
                type="button"
                onClick={onFinishNow}
                className="nvw-btn h-11 rounded-2xl bg-white/10 font-semibold"
              >
                Encerrar agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
