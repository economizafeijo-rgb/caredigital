import { useEffect, useRef, useState } from "react";
import { LogoMark } from "./Logo";

const KEY = "nv-intro-seen";
const SHOW = 1500;
const OUT = 450;

const CSS = `
@keyframes nv-sp-in{from{opacity:0}to{opacity:1}}
@keyframes nv-sp-out{to{opacity:0;transform:scale(1.03)}}
@keyframes nv-sp-pop{0%{opacity:0;transform:scale(.82) translateY(6px)}100%{opacity:1;transform:none}}
@keyframes nv-sp-up{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:none}}
@keyframes nv-sp-ring{to{stroke-dashoffset:0}}
@keyframes nv-sp-bar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes nv-sp-glow{0%,100%{opacity:.55}50%{opacity:.9}}
.nv-sp{animation:nv-sp-in .2s ease both}
.nv-sp-out{animation:nv-sp-out ${OUT}ms cubic-bezier(.23,1,.32,1) both;pointer-events:none}
.nv-sp-logo{animation:nv-sp-pop .55s cubic-bezier(.23,1,.32,1) .05s both}
.nv-sp-name{animation:nv-sp-up .5s cubic-bezier(.23,1,.32,1) .3s both}
.nv-sp-tag{animation:nv-sp-up .5s cubic-bezier(.23,1,.32,1) .45s both}
.nv-sp-ring{stroke-dasharray:1;stroke-dashoffset:1;animation:nv-sp-ring ${SHOW - 200}ms cubic-bezier(.65,0,.35,1) .1s forwards}
.nv-sp-bar{transform-origin:left;animation:nv-sp-bar ${SHOW}ms cubic-bezier(.65,0,.35,1) both}
.nv-sp-halo{animation:nv-sp-glow 1.6s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){
  .nv-sp-logo,.nv-sp-name,.nv-sp-tag{animation:nv-sp-in .3s ease both}
  .nv-sp-ring{animation:none;stroke-dashoffset:0}
  .nv-sp-halo{animation:none}
}
`;

/**
 * Abertura: uma vez por sessão, cerca de 1,5 s, toque para entrar.
 * Marca com anel que se completa, nome, frase e barra fina de carregamento.
 */
export function SiteIntro() {
  const [phase, setPhase] = useState<"off" | "on" | "out">("off");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* sem storage: mostra */
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reduce ? 700 : SHOW;
    setPhase("on");
    timers.current = [
      window.setTimeout(() => setPhase("out"), total),
      window.setTimeout(() => setPhase("off"), total + OUT),
    ];
    return () => timers.current.forEach(window.clearTimeout);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="NextVita"
      onClick={skip}
      className={`nv-sp fixed inset-0 z-[13000] grid place-items-center overflow-hidden bg-[#060b17] text-white ${phase === "out" ? "nv-sp-out" : ""}`}
    >
      <style>{CSS}</style>
      <div
        aria-hidden
        className="nv-sp-halo absolute left-1/2 top-[42%] size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(63,224,200,.28),rgba(99,102,241,.14)_45%,transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[.35] [background-image:radial-gradient(rgba(255,255,255,.09)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,#000,transparent_68%)]"
      />

      <div className="relative flex flex-col items-center text-center">
        <div className="nv-sp-logo relative grid size-32 place-items-center">
          <svg aria-hidden viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="56"
              fill="none"
              stroke="rgba(255,255,255,.08)"
              strokeWidth="2"
            />
            <circle
              className="nv-sp-ring"
              cx="60"
              cy="60"
              r="56"
              fill="none"
              stroke="url(#nv-sp-g)"
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={1}
            />
            <defs>
              <linearGradient id="nv-sp-g" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#3fe0c8" />
                <stop offset="1" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <span className="grid place-items-center rounded-[24px] bg-[#0a1226]/90 p-3 shadow-[0_0_60px_-10px_rgba(63,224,200,.6)] ring-1 ring-white/10">
            <LogoMark size={58} />
          </span>
        </div>
        <h1 className="nv-sp-name mt-6 font-display text-[2.3rem] font-extrabold leading-none tracking-tight">
          Next<span className="text-[#3fe0c8]">Vita</span>
        </h1>
        <p className="nv-sp-tag mt-2.5 max-w-[24ch] text-balance text-[13px] text-white/60">
          Sua rotina de saúde, em um só lugar
        </p>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-8"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        <div className="h-[3px] w-full max-w-[14rem] overflow-hidden rounded-full bg-white/10">
          <div className="nv-sp-bar h-full rounded-full bg-gradient-to-r from-[#3fe0c8] to-[#6366f1]" />
        </div>
        <p className="text-[11px] text-white/40">Toque para entrar</p>
      </div>
    </div>
  );
}
