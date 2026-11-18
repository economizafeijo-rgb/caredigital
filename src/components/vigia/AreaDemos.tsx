import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { Check, Minus, Moon, Pause, Pill, Play, Plus, RotateCcw, Sun } from "lucide-react";
import type { ShowcaseKind } from "./PublicCareShowcase";

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Moldura comum das demonstrações: cartão de app com título, selo "experimente" e aviso de simulação. */
function Frame({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="nv-banner-img w-[19rem] max-w-full rounded-2xl bg-white p-4 text-slate-900 shadow-2xl ring-1 ring-black/5 sm:w-80">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold">{title}</p>
        <span className="rounded-full bg-[color-mix(in_srgb,var(--area)_14%,white)] px-2 py-0.5 text-[10px] font-bold text-[var(--area)]">Experimente</span>
      </div>
      <div className="mt-3">{children}</div>
      <p className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
        <span>{footer}</span>
        <span>simulação</span>
      </p>
    </div>
  );
}

const btn = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition active:scale-95";

function MedicationDemo() {
  const doses = ["08:00 · Vitamina D3", "12:00 · Ômega 3", "20:00 · Magnésio"];
  const [done, setDone] = useState<boolean[]>([true, false, false]);
  const [left, setLeft] = useState(2 * 3600 + 14 * 60);
  useEffect(() => {
    if (reduceMotion()) return;
    const t = window.setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, []);
  const next = done.findIndex((d) => !d);
  const hh = String(Math.floor(left / 3600)).padStart(2, "0"), mm = String(Math.floor((left % 3600) / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  return (
    <Frame title="Doses de hoje" footer={`${done.filter(Boolean).length} de 3 confirmadas`}>
      <ul className="grid gap-1.5">
        {doses.map((d, i) => (
          <li key={d}>
            <button type="button" onClick={() => setDone((v) => v.map((x, k) => (k === i ? !x : x)))} aria-pressed={done[i]}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${done[i] ? "border-emerald-200 bg-emerald-50" : "border-slate-200 hover:border-[var(--area)]"}`}>
              <span className={`grid size-6 place-items-center rounded-full transition-all ${done[i] ? "nv-check bg-emerald-500 text-white" : "border-2 border-slate-300"}`}>{done[i] && <Check size={14} />}</span>
              <span className={done[i] ? "text-slate-500 line-through" : "font-semibold"}>{d}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-950 px-3 py-2 text-white">
        <span className="flex items-center gap-1.5 text-xs"><Pill size={14} className="text-[var(--area)]" /> {next === -1 ? "Tudo tomado hoje" : `Próxima: ${doses[next].split(" · ")[1]}`}</span>
        {next !== -1 && <span className="font-mono text-sm font-bold tabular-nums">{hh}:{mm}:{ss}</span>}
      </div>
    </Frame>
  );
}

function HydrationDemo() {
  const goal = 2500;
  const [ml, setMl] = useState(1250);
  const pct = Math.min(1, ml / goal);
  const nextHour = 9 + Math.round((ml / goal) * 11);
  return (
    <Frame title="Hidratação de hoje" footer={`Meta de ${(goal / 1000).toFixed(1).replace(".", ",")} L pelo seu peso`}>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 60 84" className="h-28 w-20" aria-hidden="true">
          <path d="M8 6 H52 L46 78 H14 Z" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinejoin="round" />
          <clipPath id="nv-glass"><path d="M9.5 7.5 H50.5 L44.6 76.5 H15.4 Z" /></clipPath>
          <g clipPath="url(#nv-glass)">
            <rect x="0" width="60" height="84" fill="var(--area)" opacity=".85" style={{ transform: `translateY(${84 - pct * 70}px)`, transition: "transform .8s cubic-bezier(.2,.8,.2,1)" }} />
          </g>
        </svg>
        <div>
          <p className="text-3xl font-extrabold tabular-nums">{(ml / 1000).toFixed(2).replace(".", ",")} L</p>
          <p className="text-xs text-slate-500">{Math.round(pct * 100)}% da meta</p>
          <p className="mt-2 rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-800">{pct >= 1 ? "Meta do dia alcançada" : `Próximo copo às ${String(Math.min(nextHour, 21)).padStart(2, "0")}:30`}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <button type="button" onClick={() => setMl((v) => Math.min(goal + 500, v + 250))} className={`${btn} bg-[var(--area)] text-white`}><Plus size={14} /> Bebi 250 ml</button>
        <button type="button" onClick={() => setMl(1250)} aria-label="Recomeçar" className={`${btn} border border-slate-200`}><RotateCcw size={14} /></button>
      </div>
    </Frame>
  );
}

const foods = [
  { name: "Arroz", p: 3, c: 28, g: 0.3 },
  { name: "Frango", p: 31, c: 0, g: 3.6 },
  { name: "Feijão", p: 9, c: 14, g: 0.5 },
  { name: "Banana", p: 1, c: 23, g: 0.3 },
  { name: "Ovo", p: 13, c: 1, g: 10 },
  { name: "Macaxeira", p: 1, c: 38, g: 0.3 },
];
function DietDemo() {
  const [picked, setPicked] = useState<string[]>(["Arroz", "Frango", "Feijão"]);
  const t = useMemo(() => picked.reduce((a, n) => { const f = foods.find((x) => x.name === n)!; return { p: a.p + f.p, c: a.c + f.c, g: a.g + f.g }; }, { p: 0, c: 0, g: 0 }), [picked]);
  const kcal = Math.round(t.p * 4 + t.c * 4 + t.g * 9);
  const total = t.p + t.c + t.g || 1;
  const seg = [{ v: t.p / total, c: "#059669" }, { v: t.c / total, c: "#f59e0b" }, { v: t.g / total, c: "#ec4899" }];
  let acc = 0;
  return (
    <Frame title="Monte o seu prato" footer="Valores por 100 g">
      <div className="flex flex-wrap gap-1.5">
        {foods.map((f) => {
          const on = picked.includes(f.name);
          return <button key={f.name} type="button" aria-pressed={on} onClick={() => setPicked((v) => (on ? v.filter((x) => x !== f.name) : [...v, f.name]))}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${on ? "border-transparent bg-[var(--area)] text-white" : "border-slate-200 hover:border-[var(--area)]"}`}>{f.name}</button>;
        })}
      </div>
      <div className="mt-3 flex items-center gap-4">
        <svg viewBox="0 0 42 42" className="size-24 -rotate-90" aria-hidden="true">
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="6" />
          {seg.map((s, i) => { const el = <circle key={i} cx="21" cy="21" r="15.9" fill="none" stroke={s.c} strokeWidth="6" pathLength={100} strokeDasharray={`${s.v * 100} ${100 - s.v * 100}`} strokeDashoffset={-acc * 100} style={{ transition: "stroke-dasharray .6s, stroke-dashoffset .6s" }} />; acc += s.v; return el; })}
        </svg>
        <div className="text-xs">
          <p className="text-2xl font-extrabold tabular-nums">{kcal} <span className="text-sm font-semibold text-slate-500">kcal</span></p>
          <p><span className="mr-1 inline-block size-2 rounded-full bg-[#059669]" />Proteína {t.p.toFixed(0)} g</p>
          <p><span className="mr-1 inline-block size-2 rounded-full bg-[#f59e0b]" />Carboidrato {t.c.toFixed(0)} g</p>
          <p><span className="mr-1 inline-block size-2 rounded-full bg-[#ec4899]" />Gordura {t.g.toFixed(0)} g</p>
        </div>
      </div>
    </Frame>
  );
}

function SupplementsDemo() {
  const items = [{ n: "Creatina", d: "5 g" }, { n: "Whey", d: "30 g" }, { n: "Ômega 3", d: "1 cápsula" }];
  const [taken, setTaken] = useState<number[]>([]);
  const [left, setLeft] = useState(14 * 60 + 59);
  useEffect(() => {
    if (reduceMotion()) return;
    const t = window.setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 14 * 60 + 59)), 1000);
    return () => window.clearInterval(t);
  }, []);
  const next = items.findIndex((_, i) => !taken.includes(i));
  return (
    <Frame title="Suplementos de hoje" footer={`${taken.length} de 3 tomados`}>
      <div className="rounded-xl bg-slate-950 p-3 text-center text-white">
        <p className="text-[11px] text-white/60">{next === -1 ? "Rotina completa" : `Próxima dose: ${items[next].n}`}</p>
        <p className="font-mono text-3xl font-bold tabular-nums">{next === -1 ? "✓" : `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`}</p>
      </div>
      <ul className="mt-2 grid gap-1.5">
        {items.map((it, i) => {
          const on = taken.includes(i);
          return <li key={it.n} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
            <span><strong>{it.n}</strong> <span className="text-xs text-slate-500">{it.d}</span></span>
            <button type="button" onClick={() => setTaken((v) => (on ? v.filter((x) => x !== i) : [...v, i]))} className={`${btn} h-7 ${on ? "bg-emerald-500 text-white" : "bg-[var(--area)] text-white"}`}>{on ? <><Check size={13} /> Tomado</> : "Tomar"}</button>
          </li>;
        })}
      </ul>
    </Frame>
  );
}

function WeightDemo() {
  const height = 1.72;
  const [log, setLog] = useState([84.2, 83.6, 83.1, 82.7, 82.0]);
  const [w, setW] = useState(81.6);
  const series = [...log, w];
  const min = Math.min(...series) - 0.8, max = Math.max(...series) + 0.8;
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * 260 + 10},${90 - ((v - min) / (max - min)) * 80}`).join(" ");
  const imc = w / (height * height);
  return (
    <Frame title="Registrar peso" footer={`IMC com altura de ${height.toFixed(2).replace(".", ",")} m`}>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-extrabold tabular-nums">{w.toFixed(1).replace(".", ",")} kg</p>
        <p className="text-right text-xs"><span className="block font-bold text-emerald-600">{(w - log[0]).toFixed(1).replace(".", ",")} kg</span><span className="text-slate-500">IMC {imc.toFixed(1).replace(".", ",")}</span></p>
      </div>
      <svg viewBox="0 0 280 100" className="mt-1 h-24 w-full" aria-hidden="true">
        <polyline points={pts} fill="none" stroke="var(--area)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" style={{ transition: "all .5s" }} />
        {series.map((v, i) => <circle key={i} cx={(i / (series.length - 1)) * 260 + 10} cy={90 - ((v - min) / (max - min)) * 80} r={i === series.length - 1 ? 5 : 3} fill={i === series.length - 1 ? "var(--area)" : "#cbd5e1"} />)}
      </svg>
      <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
        <button type="button" onClick={() => setW((v) => +(v - 0.1).toFixed(1))} aria-label="Diminuir peso" className={`${btn} border border-slate-200 px-2`}><Minus size={14} /></button>
        <input type="range" min={70} max={95} step={0.1} value={w} onChange={(e) => setW(+e.target.value)} aria-label="Peso" className="w-full" style={{ accentColor: "var(--area)" }} />
        <button type="button" onClick={() => setW((v) => +(v + 0.1).toFixed(1))} aria-label="Aumentar peso" className={`${btn} border border-slate-200 px-2`}><Plus size={14} /></button>
        <button type="button" onClick={() => { setLog((l) => [...l.slice(-6), w]); }} className={`${btn} bg-[var(--area)] text-white`}>Salvar</button>
      </div>
    </Frame>
  );
}

function SleepDemo() {
  const [bed, setBed] = useState(23);
  const [wake, setWake] = useState(7);
  const hours = (wake + 24 - bed) % 24 || 24;
  const score = Math.max(30, Math.min(100, Math.round(100 - Math.abs(8 - hours) * 14 - (bed > 24 || bed < 21 ? 6 : 0))));
  const [bpm, setBpm] = useState(58);
  useEffect(() => {
    if (reduceMotion()) return;
    const t = window.setInterval(() => setBpm(56 + Math.round(Math.random() * 5)), 1400);
    return () => window.clearInterval(t);
  }, []);
  const fmt = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
  return (
    <Frame title="Sua noite" footer="Nota educativa, não é exame médico">
      <div className="flex items-center gap-4">
        <div className="relative grid size-24 place-items-center">
          <svg viewBox="0 0 42 42" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="21" cy="21" r="17" fill="none" stroke="#eef2ff" strokeWidth="5" />
            <circle cx="21" cy="21" r="17" fill="none" stroke="var(--area)" strokeWidth="5" strokeLinecap="round" pathLength={100} strokeDasharray={`${score} 100`} style={{ transition: "stroke-dasharray .6s" }} />
          </svg>
          <span className="text-center"><strong className="block text-2xl font-extrabold tabular-nums">{score}</strong><span className="text-[10px] text-slate-500">nota</span></span>
        </div>
        <div className="grid flex-1 gap-1 text-xs">
          <p className="font-semibold">{hours} h de sono</p>
          <p className="flex items-center gap-1 text-rose-600"><span className="nv-live size-2 rounded-full bg-rose-500" /> {bpm} bpm ao vivo</p>
          <svg viewBox="0 0 200 40" className="h-8 w-full" aria-hidden="true"><polyline className="nv-heart" fill="none" stroke="#fb7185" strokeWidth="2" points="0,24 40,24 48,8 56,36 64,20 72,24 120,24 128,8 136,36 144,20 152,24 200,24" /></svg>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <label className="grid gap-1"><span className="flex items-center gap-1 text-slate-500"><Moon size={12} /> Dormir {fmt(bed)}</span><input type="range" min={20} max={26} value={bed} onChange={(e) => setBed(+e.target.value)} aria-label="Hora de dormir" style={{ accentColor: "var(--area)" }} /></label>
        <label className="grid gap-1"><span className="flex items-center gap-1 text-slate-500"><Sun size={12} /> Acordar {fmt(wake)}</span><input type="range" min={4} max={10} value={wake} onChange={(e) => setWake(+e.target.value)} aria-label="Hora de acordar" style={{ accentColor: "var(--area)" }} /></label>
      </div>
    </Frame>
  );
}

function TrainingDemo() {
  const [running, setRunning] = useState(false);
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setSec((s) => (s >= 1800 ? 0 : s + 6)), 200);
    return () => window.clearInterval(t);
  }, [running]);
  const km = sec / 348; // ritmo de 5'48"/km
  const prog = Math.min(1, sec / 1800);
  return (
    <Frame title="Corrida ao ar livre" footer="GPS ativo só durante o treino">
      <svg viewBox="0 0 260 110" className="h-28 w-full rounded-xl bg-[#f1f5f4]" aria-hidden="true">
        <path d="M10 95 C 40 30, 80 100, 120 55 S 190 10, 210 45 S 250 95, 252 20" fill="none" stroke="#d1d5db" strokeWidth="6" strokeLinecap="round" />
        <path d="M10 95 C 40 30, 80 100, 120 55 S 190 10, 210 45 S 250 95, 252 20" fill="none" stroke="var(--area)" strokeWidth="6" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - prog} style={{ transition: "stroke-dashoffset .2s linear" }} />
      </svg>
      <div className="mt-2 grid grid-cols-3 text-center">
        <p><strong className="block text-lg font-extrabold tabular-nums">{km.toFixed(2).replace(".", ",")}</strong><span className="text-[10px] text-slate-500">km</span></p>
        <p><strong className="block text-lg font-extrabold tabular-nums">{String(Math.floor(sec / 60)).padStart(2, "0")}:{String(sec % 60).padStart(2, "0")}</strong><span className="text-[10px] text-slate-500">tempo</span></p>
        <p><strong className="block text-lg font-extrabold">5&apos;48&quot;</strong><span className="text-[10px] text-slate-500">ritmo</span></p>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
        <button type="button" onClick={() => setRunning((r) => !r)} className={`${btn} bg-[var(--area)] text-white`}>{running ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> {sec ? "Continuar" : "Iniciar treino"}</>}</button>
        <button type="button" onClick={() => { setRunning(false); setSec(0); }} aria-label="Zerar treino" className={`${btn} border border-slate-200`}><RotateCcw size={14} /></button>
      </div>
    </Frame>
  );
}

const ranges = {
  Dia: { labels: ["6h", "9h", "12h", "15h", "18h", "21h"], v: [20, 45, 60, 55, 80, 92], note: "Água: 1,8 L até agora" },
  Semana: { labels: ["S", "T", "Q", "Q", "S", "S", "D"], v: [62, 70, 55, 88, 76, 94, 81], note: "Meta de água em 6 de 7 dias" },
  Mês: { labels: ["S1", "S2", "S3", "S4"], v: [58, 66, 79, 90], note: "Constância subiu 32% no mês" },
} as const;
function MetricsDemo() {
  const [r, setR] = useState<keyof typeof ranges>("Semana");
  const d = ranges[r];
  return (
    <Frame title="Suas métricas" footer={d.note}>
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
        {(Object.keys(ranges) as (keyof typeof ranges)[]).map((k) => <button key={k} role="tab" aria-selected={r === k} type="button" onClick={() => setR(k)} className={`rounded-md py-1 text-xs font-bold transition-colors ${r === k ? "bg-white text-[var(--area)] shadow" : "text-slate-500"}`}>{k}</button>)}
      </div>
      <div key={r} className="mt-3 flex h-28 items-end gap-1.5">
        {d.v.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="nv-bar w-full rounded-t-md bg-[var(--area)]" style={{ height: `${v}%`, animationDelay: `${i * 60}ms`, opacity: 0.55 + v / 250 }} />
            <span className="text-[10px] text-slate-500">{d.labels[i]}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function ProtocolsDemo() {
  const steps = [
    { t: "Vinculação", d: "Seu perfil e objetivo", ui: "Perfil criado ✓" },
    { t: "Programação", d: "Horários de cada cuidado", ui: "8 lembretes no dia" },
    { t: "Confirmação", d: "Um toque em cada tarefa", ui: "Dose das 08:00 confirmada" },
    { t: "Histórico", d: "Tudo com data e hora", ui: "92% de constância na semana" },
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduceMotion()) return;
    const t = window.setTimeout(() => setI((v) => (v + 1) % steps.length), 2600);
    return () => window.clearTimeout(t);
  }, [i, steps.length]);
  return (
    <Frame title="Sua jornada no app" footer={`Etapa ${i + 1} de 4`}>
      <ol className="grid gap-1.5">
        {steps.map((s, k) => (
          <li key={s.t}>
            <button type="button" onClick={() => setI(k)} className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${k === i ? "border-[var(--area)] bg-[color-mix(in_srgb,var(--area)_8%,white)]" : "border-slate-200"}`}>
              <span className={`grid size-6 place-items-center rounded-full text-[11px] font-bold ${k <= i ? "bg-[var(--area)] text-white" : "bg-slate-100 text-slate-500"}`}>{k < i ? <Check size={12} /> : k + 1}</span>
              <span className="min-w-0"><strong className="block text-sm">{s.t}</strong><span className="block text-[11px] text-slate-500">{s.d}</span></span>
            </button>
          </li>
        ))}
      </ol>
      <p key={i} className="nv-fade-in mt-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">{steps[i].ui}</p>
    </Frame>
  );
}

const demos: Partial<Record<ShowcaseKind, () => ReactElement>> = {
  medication: MedicationDemo,
  hydration: HydrationDemo,
  diet: DietDemo,
  supplements: SupplementsDemo,
  weight: WeightDemo,
  sleep: SleepDemo,
  training: TrainingDemo,
  metrics: MetricsDemo,
  protocols: ProtocolsDemo,
  sports: DietDemo,
};

/** Demonstração interativa da ferramenta de cada área (dados simulados, nada é salvo). */
export function AreaDemo({ kind }: { kind: ShowcaseKind }) {
  const D = demos[kind];
  return D ? <D /> : null;
}
