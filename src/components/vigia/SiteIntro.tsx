import { useEffect, useState } from "react";
import { Activity, Droplets, HeartPulse, Moon, Pill, Utensils } from "lucide-react";
import { LogoMark } from "./Logo";

const KEY = "nv-intro-seen";
const ORBIT = [Droplets, Pill, Utensils, Activity, Moon, HeartPulse];

/**
 * Abertura do site e do aplicativo: aparece uma vez por sessão, dura cerca de 3 s e pode ser pulada.
 * Grade que se acende, anel que se desenha em volta da marca, ícones das áreas em órbita,
 * nome revelado letra a letra e a assinatura do desenvolvedor.
 */
export function SiteIntro() {
  const [phase, setPhase] = useState<"off" | "on" | "out">("off");
  useEffect(() => {
    try { if (sessionStorage.getItem(KEY)) return; sessionStorage.setItem(KEY, "1"); } catch { /* sem storage: mostra */ }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase("on");
    const total = reduce ? 1200 : 3400;
    const t1 = window.setTimeout(() => setPhase("out"), total);
    const t2 = window.setTimeout(() => setPhase("off"), total + 650);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);
  useEffect(() => {
    if (phase === "off") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  function skip() { setPhase("out"); window.setTimeout(() => setPhase("off"), 650); }
  if (phase === "off") return null;

  const word = "NextVita";
  return (
    <div role="dialog" aria-modal="true" aria-label="Abertura NextVita" onClick={skip}
      className={`nv-intro fixed inset-0 z-[13000] grid place-items-center overflow-hidden bg-[#020b09] text-white ${phase === "out" ? "nv-intro-out" : ""}`}>
      <div aria-hidden className="nv-intro-grid absolute inset-0 opacity-0 [background-image:linear-gradient(rgba(126,240,204,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(126,240,204,.16)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(circle_at_center,#000_0%,transparent_65%)]" />
      <div aria-hidden className="nv-intro-glow absolute left-1/2 top-1/2 size-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,.35),transparent_60%)]" />
      <div aria-hidden className="nv-intro-beam absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />

      <div className="relative flex flex-col items-center text-center">
        <div className="relative grid size-40 place-items-center sm:size-48">
          <svg aria-hidden viewBox="0 0 200 200" className="absolute inset-0 size-full -rotate-90">
            <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="2" />
            <circle className="nv-intro-ring" cx="100" cy="100" r="92" fill="none" stroke="url(#nv-intro-g)" strokeWidth="3" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset="1" />
            <circle cx="100" cy="100" r="72" fill="none" stroke="rgba(126,240,204,.15)" strokeWidth="1" strokeDasharray="2 6" />
            <defs><linearGradient id="nv-intro-g" x1="0" x2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#38bdf8" /></linearGradient></defs>
          </svg>
          <div aria-hidden className="nv-intro-orbit absolute inset-0">
            {ORBIT.map((Icon, i) => {
              const a = (i / ORBIT.length) * Math.PI * 2;
              return (
                <span key={i} className="nv-intro-dot absolute grid size-8 place-items-center rounded-xl border border-white/15 bg-white/[.06] text-emerald-200 backdrop-blur"
                  style={{ left: `calc(50% + ${Math.cos(a) * 46}% - 1rem)`, top: `calc(50% + ${Math.sin(a) * 46}% - 1rem)`, animationDelay: `${700 + i * 90}ms` }}>
                  <Icon size={15} />
                </span>
              );
            })}
          </div>
          <span className="nv-intro-logo grid place-items-center rounded-[28px] bg-white/[.04] p-3 shadow-[0_0_60px_-10px_rgba(52,211,153,.7)] ring-1 ring-white/10">
            <LogoMark size={72} />
          </span>
        </div>

        <h1 className="mt-7 font-display text-4xl font-extrabold tracking-tight sm:text-5xl" aria-label={word}>
          {word.split("").map((c, i) => (
            <span key={i} aria-hidden className={`nv-intro-letter inline-block ${i >= 4 ? "text-[#7ef0cc]" : ""}`} style={{ animationDelay: `${1000 + i * 55}ms` }}>{c}</span>
          ))}
        </h1>
        <p className="nv-intro-tag mt-2 text-sm text-white/70 sm:text-base">Saúde, rotina e bem-estar em um só lugar</p>
        <div aria-hidden className="mt-6 h-[2px] w-44 overflow-hidden rounded-full bg-white/10"><i className="nv-intro-load block h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400" /></div>
      </div>

      <p className="nv-intro-sign absolute inset-x-0 bottom-6 text-center text-xs text-white/55">
        Desenvolvido por <strong className="font-semibold text-white/85">Franc D&apos;nis</strong> · Feijó, Acre
      </p>
      <button type="button" onClick={(e) => { e.stopPropagation(); skip(); }} className="absolute right-4 top-4 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 backdrop-blur transition hover:bg-white/15 hover:text-white">Pular</button>
    </div>
  );
}
