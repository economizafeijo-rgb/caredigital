import { useEffect, useRef, useState } from "react";
import { Check, Droplets, Dumbbell, Pill } from "lucide-react";
import { LogoMark } from "./Logo";

const KEY = "nv-intro-seen";
const TOTAL = 4200;
const OUT = 800;
const R = 62;
const CIRC = 2 * Math.PI * R;

/** Linha de pulso: reta, três batidas e reta. Desenha-se da esquerda para a direita. */
const PULSE =
  "M0 60 H430 L452 60 L466 22 L484 84 L500 12 L518 60 H575 L592 60 L604 40 L616 60 H1200";

const BARS = [38, 56, 44, 70, 52, 82, 64];

/**
 * Abertura do site e do aplicativo: uma vez por sessão, cerca de 4 s, pode ser pulada.
 * Aurora em movimento, linha de pulso que se desenha, marca com anel de progresso,
 * nome revelado em máscara, três cartões de vidro com gráficos e saída em íris.
 */
export function SiteIntro() {
  const [phase, setPhase] = useState<"off" | "on" | "out">("off");
  const [pct, setPct] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* sem storage: mostra */
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reduce ? 1200 : TOTAL;
    setPhase("on");
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / (total - 500));
      // easeInOut: começa devagar, acelera no meio e assenta no fim.
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setPct(Math.round(e * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    timers.current = [
      window.setTimeout(() => setPhase("out"), total),
      window.setTimeout(() => setPhase("off"), total + OUT),
    ];
    return () => {
      cancelAnimationFrame(raf);
      timers.current.forEach(window.clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (phase === "off") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [phase]);

  function skip() {
    timers.current.forEach(window.clearTimeout);
    setPhase("out");
    timers.current = [window.setTimeout(() => setPhase("off"), OUT)];
  }
  if (phase === "off") return null;

  const word = "NextVita";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Abertura NextVita"
      onClick={skip}
      className={`nv-op fixed inset-0 z-[13000] overflow-hidden bg-[#050b18] text-white ${phase === "out" ? "nv-op-out" : ""}`}
    >
      {/* Aurora */}
      <div aria-hidden className="nv-op-aurora absolute inset-0">
        <i className="nv-op-blob nv-op-b1" />
        <i className="nv-op-blob nv-op-b2" />
        <i className="nv-op-blob nv-op-b3" />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,#000_0%,transparent_70%)]"
      />

      {/* Linha de pulso */}
      <svg
        aria-hidden
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-1/2 h-24 w-full -translate-y-[3.4rem] sm:h-32"
      >
        <defs>
          <linearGradient id="nv-op-line" x1="0" x2="1">
            <stop offset="0" stopColor="#3fe0c8" stopOpacity="0" />
            <stop offset=".35" stopColor="#3fe0c8" />
            <stop offset=".7" stopColor="#6366f1" />
            <stop offset="1" stopColor="#e8368f" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className="nv-op-pulse-glow"
          d={PULSE}
          fill="none"
          stroke="url(#nv-op-line)"
          strokeWidth="6"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
        />
        <path
          className="nv-op-pulse"
          d={PULSE}
          fill="none"
          stroke="url(#nv-op-line)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
        />
      </svg>

      {/* Cartões de vidro com gráficos */}
      <div
        aria-hidden
        className="nv-op-card nv-op-c1 absolute left-[6%] top-[16%] hidden w-44 rounded-2xl border border-white/10 bg-white/[.06] p-3.5 shadow-2xl backdrop-blur-xl sm:block lg:left-[14%]"
      >
        <div className="flex items-center justify-between text-[11px] font-semibold text-white/70">
          <span className="inline-flex items-center gap-1.5">
            <Droplets size={13} className="text-sky-300" /> Hidratação
          </span>
          <span className="tabular-nums text-white">72%</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <svg viewBox="0 0 44 44" className="size-12 -rotate-90">
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke="rgba(255,255,255,.12)"
              strokeWidth="5"
            />
            <circle
              className="nv-op-mini-ring"
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="5"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset=".28"
            />
          </svg>
          <p className="text-[11px] leading-tight text-white/60">
            <b className="block text-base font-bold text-white">1,8 L</b>meta de 2,5 L
          </p>
        </div>
      </div>

      <div
        aria-hidden
        className="nv-op-card nv-op-c2 absolute right-[6%] top-[22%] hidden w-48 rounded-2xl border border-white/10 bg-white/[.06] p-3.5 shadow-2xl backdrop-blur-xl sm:block lg:right-[14%]"
      >
        <div className="flex items-center justify-between text-[11px] font-semibold text-white/70">
          <span className="inline-flex items-center gap-1.5">
            <Dumbbell size={13} className="text-[#3fe0c8]" /> Treinos
          </span>
          <span className="text-white">5 dias</span>
        </div>
        <div className="mt-3 flex h-14 items-end gap-1.5">
          {BARS.map((h, i) => (
            <i
              key={i}
              className="nv-op-bar block flex-1 rounded-sm bg-gradient-to-t from-[#3fe0c8]/40 to-[#3fe0c8]"
              style={{ height: `${h}%`, animationDelay: `${1500 + i * 90}ms` }}
            />
          ))}
        </div>
      </div>

      <div
        aria-hidden
        className="nv-op-card nv-op-c3 absolute inset-x-0 bottom-[19%] mx-auto w-[17.5rem] rounded-2xl border border-white/10 bg-white/[.06] p-3 shadow-2xl backdrop-blur-xl sm:bottom-[16%] sm:left-[10%] sm:right-auto sm:mx-0 sm:w-60 lg:left-[20%]"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e8368f]/20 text-pink-200">
            <Pill size={17} />
          </span>
          <p className="min-w-0 flex-1 text-[11px] leading-tight text-white/60">
            <b className="block text-[13px] font-bold text-white">Vitamina D · 08:00</b>
            lembrete confirmado
          </p>
          <span className="grid size-6 place-items-center rounded-full bg-emerald-400 text-slate-950">
            <Check size={14} strokeWidth={3} />
          </span>
        </div>
      </div>

      {/* Centro */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center text-center">
          <div className="nv-op-logo relative grid size-36 place-items-center sm:size-40">
            <svg
              aria-hidden
              viewBox="0 0 150 150"
              className="absolute inset-0 size-full -rotate-90"
            >
              <circle
                cx="75"
                cy="75"
                r={R}
                fill="none"
                stroke="rgba(255,255,255,.1)"
                strokeWidth="3"
              />
              <circle
                cx="75"
                cy="75"
                r={R}
                fill="none"
                stroke="url(#nv-op-ring)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - pct / 100)}
              />
              <defs>
                <linearGradient id="nv-op-ring" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#3fe0c8" />
                  <stop offset="1" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <span className="grid place-items-center rounded-[26px] bg-[#0a1226]/80 p-3 shadow-[0_0_70px_-8px_rgba(63,224,200,.65)] ring-1 ring-white/15">
              <LogoMark size={64} />
            </span>
          </div>

          <h1
            aria-label={word}
            className="mt-7 flex font-display text-[2.6rem] font-extrabold leading-none tracking-tight sm:text-6xl"
          >
            {word.split("").map((c, i) => (
              <span key={i} aria-hidden className="inline-block overflow-hidden pb-1">
                <span
                  className={`nv-op-letter inline-block ${i >= 4 ? "text-[#3fe0c8]" : ""}`}
                  style={{ animationDelay: `${900 + i * 60}ms` }}
                >
                  {c}
                </span>
              </span>
            ))}
          </h1>
          <p className="nv-op-tag mt-3 max-w-[26ch] text-balance text-[13px] text-white/70 sm:max-w-none sm:text-base">
            Rotina, saúde e as lojas de Feijó em um só app
          </p>
          <p
            aria-hidden
            className="mt-5 w-12 text-center text-xs font-semibold tabular-nums tracking-wider text-white/50"
          >
            {pct}%
          </p>
        </div>
      </div>

      <p className="nv-op-sign absolute inset-x-0 bottom-5 text-center text-[11px] text-white/45">
        Desenvolvido por <strong className="font-semibold text-white/75">Franc D&apos;nis</strong> ·
        Feijó, Acre
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          skip();
        }}
        className="absolute right-4 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/70 backdrop-blur transition hover:bg-white/15 hover:text-white"
        style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        Pular
      </button>
    </div>
  );
}
