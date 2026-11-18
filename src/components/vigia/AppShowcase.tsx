import type React from "react";
import { useEffect, useState } from "react";
import { BellRing, Check, Droplets, LineChart, Pill, Ruler, ShieldCheck, Smartphone, UtensilsCrossed, WifiOff } from "lucide-react";
import { InstallAppButton } from "./InstallApp";

/** Moldura de celular com a tela desenhada (sempre igual ao app de verdade, sem print desatualizado). */
export function Phone({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`relative rounded-[2.4rem] bg-gradient-to-b from-slate-700 to-slate-900 p-[7px] shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)] ring-1 ring-white/15 ${className}`} style={style}>
      <div className="relative h-full overflow-hidden rounded-[2rem] bg-[#0b1215]">
        <span aria-hidden className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
        <div className="flex items-center justify-between px-5 pt-2.5 text-[9px] font-semibold text-white/70"><span>9:41</span><span>5G ▮▮▮</span></div>
        {children}
      </div>
    </div>
  );
}

function ScreenDay() {
  const items: [string, string, typeof Pill, string, boolean][] = [
    ["07:00", "Café da manhã", UtensilsCrossed, "#10b981", true],
    ["08:00", "Vitamina D3", Pill, "#e11d48", true],
    ["10:30", "Copo de água · 250 ml", Droplets, "#0ea5e9", true],
    ["12:30", "Almoço", UtensilsCrossed, "#10b981", false],
    ["14:00", "Losartana 50 mg", Pill, "#e11d48", false],
  ];
  return (
    <div className="px-3.5 pt-4 text-white">
      <p className="text-[10px] text-white/60">Quarta, 18 de nov</p>
      <p className="text-base font-extrabold">Meu dia</p>
      <div className="mt-2 rounded-2xl bg-gradient-to-br from-violet-700 to-fuchsia-700 p-3">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 40 40" className="size-12 -rotate-90"><circle cx="20" cy="20" r="16" fill="none" stroke="#ffffff33" strokeWidth="5" /><circle cx="20" cy="20" r="16" fill="none" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" pathLength={100} strokeDasharray="60 100" className="nv-ring-draw" /></svg>
          <div><p className="text-lg font-extrabold leading-none">60%</p><p className="text-[10px] text-white/75">3 de 5 feitos</p></div>
        </div>
      </div>
      <ul className="mt-2.5 grid gap-1.5">
        {items.map(([t, l, I, c, done], i) => (
          <li key={l} className="nv-rise flex items-center gap-2 rounded-xl bg-white/[.06] px-2 py-1.5 text-[10px]" style={{ animationDelay: `${300 + i * 120}ms` }}>
            <span className="grid size-6 place-items-center rounded-lg" style={{ background: done ? "#10b981" : `${c}26`, color: done ? "#fff" : c }}>{done ? <Check size={12} /> : <I size={12} />}</span>
            <span className="font-bold" style={{ color: c }}>{t}</span>
            <span className={`truncate ${done ? "text-white/50 line-through" : ""}`}>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScreenWater() {
  return (
    <div className="px-3.5 pt-4 text-white">
      <p className="text-base font-extrabold">Hidratação</p>
      <div className="mt-2 grid place-items-center rounded-2xl bg-gradient-to-br from-[#04263a] to-[#0b5f7a] p-4">
        <div className="relative size-28 overflow-hidden rounded-full ring-4 ring-cyan-300/40">
          <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-sky-500 to-cyan-300"><div className="absolute -top-1.5 left-0 h-3 w-[200%] animate-[care-wave_3s_linear_infinite] rounded-[50%] bg-cyan-200/70" /></div>
          <span className="absolute inset-0 grid place-items-center text-center"><span><strong className="block text-xl font-extrabold">1,8 L</strong><span className="text-[9px] text-white/80">de 3,0 L</span></span></span>
        </div>
        <p className="mt-2 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold">Próximo copo às 15:30</p>
      </div>
      <div className="mt-2 flex h-16 items-end gap-1 rounded-2xl bg-white/[.06] p-2">
        {[30, 55, 40, 70, 62, 85, 60].map((h, i) => <span key={i} className="nv-bar flex-1 rounded-t bg-sky-400" style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }} />)}
      </div>
    </div>
  );
}

function ScreenMetrics() {
  return (
    <div className="px-3.5 pt-4 text-white">
      <p className="text-base font-extrabold">Peso e evolução</p>
      <div className="mt-2 rounded-2xl bg-gradient-to-br from-fuchsia-700 to-pink-600 p-3">
        <p className="text-[10px] text-white/75">Último registro</p>
        <p className="text-2xl font-extrabold leading-none">84,4 <span className="text-xs">kg</span></p>
        <p className="mt-1 text-[10px] text-white/85">−1,85 kg em 10 dias</p>
      </div>
      <svg viewBox="0 0 200 90" className="mt-2 w-full rounded-2xl bg-white/[.06] p-2">
        <defs><linearGradient id="nv-app-w" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#d946ef" stopOpacity=".5" /><stop offset="1" stopColor="#d946ef" stopOpacity="0" /></linearGradient></defs>
        <path d="M5 20 C40 22 60 30 90 40 S150 60 195 66 V88 H5Z" fill="url(#nv-app-w)" />
        <path d="M5 20 C40 22 60 30 90 40 S150 60 195 66" fill="none" stroke="#e879f9" strokeWidth="3" strokeLinecap="round" pathLength={1} className="nv-draw-now" />
        <circle cx="195" cy="66" r="4" fill="#e879f9" className="nv-live" />
      </svg>
    </div>
  );
}

export function ScreenBody() {
  return (
    <div className="px-3.5 pt-4 text-white">
      <p className="text-base font-extrabold">Medidas do corpo</p>
      <div className="relative mt-2 grid h-44 place-items-center overflow-hidden rounded-2xl bg-[#030b14]">
        <svg viewBox="0 0 120 200" className="h-40">
          <defs><linearGradient id="nv-app-b" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity=".5" /><stop offset="1" stopColor="#6366f1" stopOpacity=".3" /></linearGradient></defs>
          <ellipse cx="60" cy="18" rx="10" ry="12" fill="url(#nv-app-b)" stroke="#67e8f9" />
          <path d="M40 38 Q60 32 80 38 L84 44 Q82 70 76 80 Q74 90 80 106 Q60 114 40 106 Q46 90 44 80 Q38 70 36 44 Z" fill="url(#nv-app-b)" stroke="#67e8f9" />
          <path d="M44 104 Q42 140 48 190 L58 190 Q58 150 60 112 Z M76 104 Q78 140 72 190 L62 190 Q62 150 60 112 Z" fill="url(#nv-app-b)" stroke="#67e8f9" />
          <ellipse cx="60" cy="78" rx="17" ry="4" fill="none" stroke="#fde047" strokeWidth="1.5" className="nv-holo-ring" />
          <ellipse cx="60" cy="100" rx="21" ry="5" fill="none" stroke="#a5f3fc" strokeDasharray="2 2" />
        </svg>
        <span className="absolute right-2 top-[38%] rounded-lg bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-yellow-200">Cintura 82 cm</span>
      </div>
      <p className="mt-2 rounded-xl bg-white/[.06] px-2 py-1.5 text-[10px]"><strong className="text-emerald-300">−4,5 cm</strong> de cintura desde o início</p>
    </div>
  );
}

const SCREENS = [
  { key: "dia", label: "Meu dia", el: <ScreenDay /> },
  { key: "agua", label: "Hidratação", el: <ScreenWater /> },
  { key: "medidas", label: "Medidas do corpo", el: <ScreenBody /> },
  { key: "peso", label: "Peso e evolução", el: <ScreenMetrics /> },
];

/** Seção compacta que apresenta o aplicativo: um celular que alterna as telas e a lista de recursos. */
export function AppShowcase() {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (hold || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setI((v) => (v + 1) % SCREENS.length), 5000);
    return () => window.clearTimeout(t);
  }, [i, hold]);
  const feats: [typeof Pill, string][] = [
    [BellRing, "Lembretes com alerta no horário"],
    [LineChart, "Evolução em gráficos claros"],
    [Ruler, "Novo: medidas do corpo"],
    [WifiOff, "Instala como app no celular"],
    [ShieldCheck, "Dados individuais e protegidos"],
  ];
  return (
    <section aria-labelledby="nv-app-title" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} className="nv-dark relative isolate overflow-hidden rounded-2xl border border-white/[.06] bg-[#04110e] text-white">
      <div aria-hidden className="absolute -right-16 -top-16 -z-10 size-72 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="grid items-center gap-6 px-5 py-5 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300"><Smartphone size={13} /> Aplicativo NextVita</span>
          <h2 id="nv-app-title" className="mt-1 text-balance font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.7rem]">Sua rotina de saúde, no bolso.</h2>
          <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-white/75 sm:grid-cols-2">
            {feats.map(([I, t]) => <li key={t} className="flex items-center gap-2"><I size={15} className="shrink-0 text-emerald-300" />{t}</li>)}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a href="/entrar?mode=signup" className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-300">Começar grátis</a>
            <InstallAppButton />
          </div>
        </div>
        <div aria-hidden className="mx-auto flex items-center gap-4">
          <Phone className="h-[19.5rem] w-[9.75rem]">
            {SCREENS.map((s, k) => (
              <div key={s.key} className={`absolute inset-x-0 bottom-0 top-6 transition-opacity duration-700 ${k === i ? "opacity-100" : "opacity-0"}`}>{k === i ? s.el : null}</div>
            ))}
          </Phone>
          <ul className="hidden flex-col gap-1.5 sm:flex">
            {SCREENS.map((s, k) => (
              <li key={s.key}>
                <button type="button" onClick={() => setI(k)} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold transition ${k === i ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}>
                  <i className={`h-1.5 rounded-full transition-all ${k === i ? "w-4 bg-emerald-300" : "w-1.5 bg-white/30"}`} />{s.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
