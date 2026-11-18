import type React from "react";
import { BellRing, Check, Droplets, LineChart, Moon, Pill, ShieldCheck, Smartphone, UtensilsCrossed, WifiOff } from "lucide-react";
import { InstallAppButton } from "./InstallApp";

/** Moldura de celular com a tela desenhada (sempre igual ao app de verdade, sem print desatualizado). */
function Phone({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
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

/** Seção que valoriza o aplicativo: três telas em celulares, recursos e instalação. */
export function AppShowcase() {
  const feats: [typeof Pill, string, string][] = [
    [BellRing, "Lembretes no horário", "Remédios, água, refeições e sono com alerta sonoro."],
    [LineChart, "Evolução em gráficos", "Dia, mês e ano, com metas e previsões."],
    [WifiOff, "Abre como app", "Ícone na tela inicial, tela cheia e acesso rápido."],
    [ShieldCheck, "Dados protegidos", "Acesso individual e registros com hora real."],
  ];
  return (
    <section aria-labelledby="nv-app-title" className="nv-dark relative isolate overflow-hidden rounded-3xl bg-[#04110e] text-white">
      <div aria-hidden className="absolute -left-24 top-0 -z-10 size-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div aria-hidden className="absolute -right-24 bottom-0 -z-10 size-96 rounded-full bg-sky-500/15 blur-3xl" />
      <div aria-hidden className="absolute inset-0 -z-10 opacity-[.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(circle_at_70%_50%,#000,transparent_70%)]" />
      <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-emerald-200"><Smartphone size={13} /> Aplicativo NextVita</span>
          <h2 id="nv-app-title" className="mt-3 text-balance font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Sua rotina de saúde, no bolso.</h2>
          <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-white/70 sm:text-base">Tudo o que você precisa para cuidar de si, com lembretes no horário certo e gráficos que mostram sua evolução.</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {feats.map(([I, t, d]) => (
              <li key={t} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white"><I size={17} /></span>
                <span className="min-w-0"><strong className="block text-sm">{t}</strong><span className="text-xs text-white/60">{d}</span></span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <InstallAppButton />
            <a href="/entrar?mode=signup" className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300">Começar grátis</a>
          </div>
        </div>
        <div aria-hidden className="relative mx-auto h-[25rem] w-full max-w-[30rem] sm:h-[28rem]">
          <Phone className="nv-float absolute left-0 top-10 h-[21rem] w-[10.5rem] -rotate-6 opacity-90 sm:h-[24rem] sm:w-[12rem]" style={{ animationDelay: "1s" }}><ScreenWater /></Phone>
          <Phone className="nv-float absolute right-0 top-10 h-[21rem] w-[10.5rem] rotate-6 opacity-90 sm:h-[24rem] sm:w-[12rem]" style={{ animationDelay: "2s" }}><ScreenMetrics /></Phone>
          <Phone className="nv-float absolute left-1/2 top-0 z-10 h-[23rem] w-[11.5rem] -translate-x-1/2 sm:h-[26.5rem] sm:w-[13rem]"><ScreenDay /></Phone>
          <span className="absolute bottom-2 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-xl"><Moon size={13} className="text-indigo-600" /> Funciona no celular e no computador</span>
        </div>
      </div>
    </section>
  );
}
