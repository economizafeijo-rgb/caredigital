import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Activity, Check, Droplets, Moon, Pill, Ruler, Scale, Search, UtensilsCrossed } from "lucide-react";

/**
 * Demonstração do produto: uma janela do app com altura fixa em que um cursor usa as funções
 * sozinho — registra água, confirma dose, lança refeição, mostra peso, medidas e sono.
 * Cada cena tem a mesma linha do tempo (≈5 s): cursor vai até a ação, clica, o resultado aparece.
 */
const DUR = 5200;

type Scene = { key: string; label: string; icon: typeof Pill; color: string; cursor: [string, string]; render: () => ReactNode };

const Before = ({ children, className = "" }: { children: ReactNode; className?: string }) => <span className={`nv-demo-before ${className}`}>{children}</span>;
const After = ({ children, className = "" }: { children: ReactNode; className?: string }) => <span className={`nv-demo-after ${className}`}>{children}</span>;
const Toast = ({ children, color }: { children: ReactNode; color: string }) => (
  <span className="nv-demo-toast absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold text-slate-950 shadow-lg" style={{ background: color }}>
    <Check size={12} /> {children}
  </span>
);

const SCENES: Scene[] = [
  {
    key: "agua", label: "Hidratação", icon: Droplets, color: "#38bdf8", cursor: ["74%", "70%"],
    render: () => (
      <div className="grid h-full grid-cols-[auto_1fr] items-center gap-6 px-6">
        {/* Copo com água em ondas: a gota cai no clique e o nível sobe */}
        <div className="relative h-36 w-[5.5rem] shrink-0">
          <span aria-hidden className="nv-demo-drop absolute left-1/2 top-0 z-10 block size-3 -translate-x-1/2 rotate-45 rounded-full rounded-tl-none bg-cyan-200 shadow-[0_0_10px_rgba(103,232,249,.8)]" />
          <div className="absolute inset-x-0 bottom-0 top-5 overflow-hidden rounded-b-[1.6rem] rounded-t-lg border-2 border-white/20 bg-white/[.03] shadow-[inset_0_-12px_24px_rgba(56,189,248,.12)]">
            <div className="nv-demo-fill absolute inset-x-0 bottom-0" style={{ ["--from" as string]: "50%", ["--to" as string]: "60%" } as CSSProperties}>
              <svg aria-hidden viewBox="0 0 200 12" preserveAspectRatio="none" className="nv-wave absolute -top-[9px] left-0 h-[10px] w-[200%] opacity-50" style={{ animationDuration: "5s", animationDirection: "reverse" }}><path d="M0 6 Q 12.5 0 25 6 T 50 6 T 75 6 T 100 6 T 125 6 T 150 6 T 175 6 T 200 6 V12 H0Z" fill="#67e8f9" /></svg>
              <svg aria-hidden viewBox="0 0 200 12" preserveAspectRatio="none" className="nv-wave absolute -top-[7px] left-0 h-[8px] w-[200%]" style={{ animationDuration: "3s" }}><path d="M0 6 Q 12.5 0 25 6 T 50 6 T 75 6 T 100 6 T 125 6 T 150 6 T 175 6 T 200 6 V12 H0Z" fill="#22d3ee" /></svg>
              <div className="absolute inset-0 bg-gradient-to-b from-[#22d3ee] via-sky-500 to-sky-700" />
              <span aria-hidden className="nv-demo-bubble absolute bottom-2 left-[30%] size-1.5 rounded-full bg-white/50" />
              <span aria-hidden className="nv-demo-bubble absolute bottom-4 left-[62%] size-1 rounded-full bg-white/40" style={{ animationDelay: "1.2s" }} />
            </div>
            <span aria-hidden className="absolute bottom-5 left-2 top-3 w-1 rounded-full bg-gradient-to-b from-white/35 to-transparent" />
            {[25, 50, 75].map((t) => <span key={t} aria-hidden className="absolute right-0 h-px w-2.5 bg-white/30" style={{ bottom: `${t}%` }} />)}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-white/55">Hoje · meta de 3,0 L</p>
          <p className="flex items-baseline gap-1.5 text-white">
            <span className="relative inline-block h-8 w-[4.6rem] font-display text-[1.6rem] font-extrabold tabular-nums leading-8"><Before className="absolute inset-0">1,50 L</Before><After className="absolute inset-0 text-cyan-200">1,75 L</After></span>
            <span className="text-xs text-white/50">58%</span>
          </p>
          <div aria-hidden className="mt-2 flex gap-1">
            {Array.from({ length: 12 }, (_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < 6 ? "bg-cyan-400" : i === 6 ? "relative overflow-hidden bg-white/10" : "bg-white/10"}`}>{i === 6 && <After className="absolute inset-0 rounded-full bg-cyan-300" />}</span>)}
          </div>
          <p className="mt-2 text-[11px] text-white/60">Próximo copo às <strong className="text-white">15:30</strong></p>
          <div className="mt-2.5 flex gap-1.5">
            {["+150", "+250", "+500"].map((v) => <span key={v} data-target={v === "+250" ? "" : undefined} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${v === "+250" ? "nv-demo-press bg-cyan-300 text-sky-950" : "bg-white/[.07] text-white/75 ring-1 ring-inset ring-white/10"}`}>{v} ml</span>)}
          </div>
        </div>
        <Toast color="#7dd3fc">+250 ml registrados</Toast>
      </div>
    ),
  },
  {
    key: "med", label: "Medicação", icon: Pill, color: "#fb7185", cursor: ["83%", "50%"],
    render: () => (
      <div className="flex h-full flex-col justify-center gap-1.5 px-5">
        {[["08:00", "Vitamina D3", true], ["14:00", "Losartana 50 mg", false], ["20:00", "Magnésio", false]].map(([t, n, done], i) => (
          <div key={String(n)} className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2 ${i === 1 ? "bg-white/[.08] ring-1 ring-rose-400/40" : "bg-white/[.04]"}`}>
            <span className="relative grid size-7 place-items-center rounded-lg bg-rose-500/20 text-rose-300">
              {done ? <Check size={14} className="text-emerald-300" /> : i === 1 ? <><Before className="absolute inset-0 grid place-items-center"><Pill size={13} /></Before><After className="absolute inset-0 grid place-items-center rounded-lg bg-emerald-500 text-white"><Check size={14} /></After></> : <Pill size={13} />}
            </span>
            <span className="text-[11px] font-bold text-rose-300">{t}</span>
            <span className={`flex-1 truncate text-xs ${done ? "text-white/45 line-through" : "text-white"}`}>{n}</span>
            {i === 1 && <span data-target="" className="relative h-6 w-14"><Before className="nv-demo-press absolute inset-0 grid place-items-center rounded-lg bg-rose-500 text-[11px] font-bold text-white">Tomei</Before><After className="absolute inset-0 grid place-items-center text-[11px] font-bold text-emerald-300">feito</After></span>}
          </div>
        ))}
        <Toast color="#fda4af">Dose confirmada às 14:00</Toast>
      </div>
    ),
  },
  {
    key: "comida", label: "Alimentação", icon: UtensilsCrossed, color: "#34d399", cursor: ["78%", "44%"],
    render: () => (
      <div className="flex h-full flex-col justify-center gap-2.5 px-5">
        <div className="flex items-center gap-2 rounded-xl bg-white/[.06] px-3 py-2 text-xs text-white">
          <Search size={13} className="text-white/50" /><span className="nv-demo-type overflow-hidden whitespace-nowrap">arroz, feijão e frango</span>
          <span data-target="" className="nv-demo-press ml-auto rounded-lg bg-emerald-400 px-2.5 py-1 text-[11px] font-bold text-slate-950">Registrar</span>
        </div>
        {[["Proteína", "#fb7185", "62%", "88%"], ["Carboidrato", "#fbbf24", "40%", "61%"], ["Gordura", "#a78bfa", "30%", "38%"]].map(([l, c, a, b]) => (
          <div key={l}>
            <div className="flex justify-between text-[10px] text-white/60"><span>{l}</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><i className="nv-demo-grow block h-full rounded-full" style={{ background: c, ["--from" as string]: a, ["--to" as string]: b } as CSSProperties} /></div>
          </div>
        ))}
        <Toast color="#6ee7b7">Almoço registrado · 612 kcal</Toast>
      </div>
    ),
  },
  {
    key: "peso", label: "Peso", icon: Scale, color: "#e879f9", cursor: ["88%", "52%"],
    render: () => (
      <div className="relative flex h-full flex-col justify-center px-5">
        <p className="text-[11px] text-white/55">Evolução · 30 dias</p>
        <p className="text-2xl font-extrabold text-white">84,4 <span className="text-sm font-semibold text-white/60">kg</span> <span className="text-xs font-bold text-emerald-300">−1,85 kg</span></p>
        <svg viewBox="0 0 300 90" className="mt-2 h-24 w-full">
          <defs><linearGradient id="nv-demo-w" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e879f9" stopOpacity=".45" /><stop offset="1" stopColor="#e879f9" stopOpacity="0" /></linearGradient></defs>
          {[20, 45, 70].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="#fff" strokeOpacity=".07" strokeDasharray="3 5" />)}
          <path d="M0 18 C40 20 70 26 110 34 S190 52 230 58 S280 64 300 66 V90 H0Z" fill="url(#nv-demo-w)" className="nv-demo-after" />
          <path d="M0 18 C40 20 70 26 110 34 S190 52 230 58 S280 64 300 66" fill="none" stroke="#e879f9" strokeWidth="3" strokeLinecap="round" pathLength={1} className="nv-demo-draw" />
          <circle data-target="" cx="300" cy="66" r="5" fill="#e879f9" stroke="#0b1215" strokeWidth="2" className="nv-demo-after" />
        </svg>
        <Toast color="#f0abfc">Meta prevista para 12 de jan</Toast>
      </div>
    ),
  },
  {
    key: "medidas", label: "Medidas", icon: Ruler, color: "#22d3ee", cursor: ["84%", "14%"],
    render: () => (
      <div className="flex h-full flex-col justify-center gap-2 px-5">
        <div className="flex items-center justify-between gap-2"><span className="text-[11px] text-white/55">Medição de hoje</span><span data-target="" className="nv-demo-press rounded-lg bg-cyan-300 px-2.5 py-1 text-[11px] font-bold text-slate-950">Salvar medidas</span></div>
        <div className="grid grid-cols-2 gap-2">
        {[["Cintura", "97,0", "92,5"], ["Abdômen", "101,0", "96,8"], ["Braço", "34,0", "35,5"], ["Coxa", "58,0", "59,2"]].map(([l, a, b], i) => (
          <div key={l} className={`rounded-xl px-3 py-1.5 ${i === 0 ? "bg-cyan-400/10 ring-1 ring-cyan-300/40" : "bg-white/[.05]"}`}>
            <p className="text-[10px] text-white/55">{l}</p>
            <p className="relative h-6 text-base font-extrabold tabular-nums text-white"><Before className="absolute inset-0">{a} cm</Before><After className="absolute inset-0">{b} cm</After></p>
          </div>
        ))}
        </div>
        <Toast color="#67e8f9">−4,5 cm de cintura desde o início</Toast>
      </div>
    ),
  },
  {
    key: "sono", label: "Sono", icon: Moon, color: "#818cf8", cursor: ["86%", "48%"],
    render: () => (
      <div className="flex h-full items-center gap-5 px-5">
        <div>
          <p className="text-[11px] text-white/55">Última noite</p>
          <p className="text-3xl font-extrabold text-white">7h42</p>
          <p className="text-xs font-semibold text-indigo-300">nota 86 · 58 bpm</p>
        </div>
        <div className="flex h-24 flex-1 items-end gap-1.5">
          {[52, 64, 48, 70, 66, 78, 86].map((h, i) => <span key={i} data-target={i === 6 ? "" : undefined} className="nv-demo-bar flex-1 rounded-t-md bg-gradient-to-t from-indigo-600 to-violet-400" style={{ height: `${h}%`, animationDelay: `${300 + i * 90}ms` }} />)}
        </div>
        <Toast color="#a5b4fc">Hora de desacelerar às 22:00</Toast>
      </div>
    ),
  },
  {
    key: "ativ", label: "Atividade", icon: Activity, color: "#fb923c", cursor: ["30%", "78%"],
    render: () => (
      <div className="flex h-full flex-col justify-center gap-2 px-5">
        <div className="flex items-baseline gap-2"><p className="text-3xl font-extrabold text-white tabular-nums"><span className="relative inline-block h-9 w-12 align-bottom"><Before className="absolute inset-0">95</Before><After className="absolute inset-0">125</After></span></p><p className="text-xs text-white/60">de 150 min na semana</p></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><i className="nv-demo-grow block h-full rounded-full bg-gradient-to-r from-orange-500 to-lime-400" style={{ ["--from" as string]: "63%", ["--to" as string]: "83%" } as CSSProperties} /></div>
        <span data-target="" className="nv-demo-press mt-1 w-fit rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-orange-900">Iniciar caminhada com GPS</span>
        <Toast color="#fdba74">30 min · 3,2 km registrados</Toast>
      </div>
    ),
  },
];

export function ProductDemo({ className = "" }: { className?: string }) {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (hold) return;
    const t = window.setTimeout(() => setI((v) => (v + 1) % SCENES.length), DUR);
    return () => window.clearTimeout(t);
  }, [i, hold]);
  const sc = SCENES[i];
  const stage = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<[string, string]>(sc.cursor);
  useLayoutEffect(() => {
    const measure = () => {
      const root = stage.current, el = root?.querySelector("[data-target]");
      if (!root || !el) { setPos(sc.cursor); return; }
      const a = root.getBoundingClientRect(), b = el.getBoundingClientRect();
      setPos([`${Math.round(b.left - a.left + b.width / 2)}px`, `${Math.round(b.top - a.top + b.height / 2)}px`]);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div aria-hidden="true" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1215] shadow-[0_30px_70px_-30px_rgba(0,0,0,.9)] ${className}`} style={{ ["--demo" as string]: `${DUR}ms` } as CSSProperties}>
      <div className="flex h-8 items-center gap-1.5 border-b border-white/[.06] px-3">
        <i className="size-2.5 rounded-full bg-[#ff5f57]" /><i className="size-2.5 rounded-full bg-[#febc2e]" /><i className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="mx-auto rounded-md bg-white/[.06] px-3 py-0.5 text-[10px] text-white/45">nextvita.life/cliente</span>
      </div>
      <div className="grid h-[15.5rem] grid-cols-1 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
        <ul className="hidden flex-col gap-0.5 border-r border-white/[.06] p-2 sm:flex">
          {SCENES.map((s, k) => (
            <li key={s.key}>
              <button type="button" tabIndex={-1} onClick={() => setI(k)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition ${k === i ? "bg-white/[.08] text-white" : "text-white/45 hover:text-white/75"}`}>
                <span className="grid size-5 place-items-center rounded-md" style={{ background: k === i ? s.color : "transparent", color: k === i ? "#0b1215" : s.color }}><s.icon size={12} /></span>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="relative min-w-0">
          <div className="flex h-9 items-center gap-2 px-5 pt-2">
            <span className="grid size-6 place-items-center rounded-lg" style={{ background: `${sc.color}26`, color: sc.color }}><sc.icon size={13} /></span>
            <strong className="text-sm text-white">{sc.label}</strong>
            <span className="ml-auto flex gap-1 sm:hidden">{SCENES.map((s, k) => <i key={s.key} className={`h-1 rounded-full transition-all ${k === i ? "w-4" : "w-1.5 bg-white/20"}`} style={k === i ? { background: s.color } : undefined} />)}</span>
          </div>
          <div key={sc.key} ref={stage} className="nv-demo-scene absolute inset-x-0 bottom-0 top-9">
            {sc.render()}
            <svg className="nv-demo-cursor pointer-events-none absolute z-20 size-5 drop-shadow-[0_2px_4px_rgba(0,0,0,.6)]" style={{ ["--cx" as string]: `calc(${pos[0]} - 5px)`, ["--cy" as string]: `calc(${pos[1]} - 3px)` } as CSSProperties} viewBox="0 0 24 24">
              <path d="M5 3l14 8-6 1.5L10 19z" fill="#fff" stroke="#0b1215" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className="nv-demo-click pointer-events-none absolute z-10 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80" style={{ left: pos[0], top: pos[1] }} />
          </div>
          <i className="nv-demo-progress absolute bottom-0 left-0 h-0.5" key={`p-${sc.key}-${hold}`} style={{ background: sc.color, animationPlayState: hold ? "paused" : "running" }} />
        </div>
      </div>
    </div>
  );
}
