import { Area, AreaChart, Bar, BarChart, Cell, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  Activity, BedDouble, Check, CheckCircle2, ChevronRight, Droplets, Flame, HeartPulse, MapPin, Pill, Scale, Sparkles, Target, Timer, TrendingDown, UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { ShowcaseKind } from "./PublicCareShowcase";

/** Prévias de tela: miniaturas fiéis das áreas do painel, com dados de exemplo. Não leem nenhum dado real. */
const frame = "w-full max-w-[440px] overflow-hidden rounded-3xl border border-white/20 bg-white text-slate-900 shadow-[0_30px_80px_rgba(0,0,0,.45)]";

function Bar_({ icon: Icon, title, from, to, tag }: { icon: LucideIcon; title: string; from: string; to: string; tag: string }) {
  return <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }}>
    <span className="grid size-9 place-items-center rounded-xl bg-white/20"><Icon size={18}/></span>
    <div className="leading-tight"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/75">{tag}</p><p className="text-sm font-extrabold">{title}</p></div>
    <span className="ml-auto flex gap-1"><i className="size-2 rounded-full bg-white/40"/><i className="size-2 rounded-full bg-white/40"/><i className="size-2 rounded-full bg-white/40"/></span>
  </div>;
}
const Stat = ({ label, value, note, color }: { label: string; value: string; note?: string; color: string }) =>
  <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] font-semibold text-slate-500">{label}</p><p className="text-lg font-extrabold leading-tight tabular-nums" style={{ color }}>{value}</p>{note && <p className="text-[10px] text-slate-500">{note}</p>}</div>;
const Ring = ({ pct, color, size = 92, children }: { pct: number; color: string; size?: number; children: React.ReactNode }) => {
  const r = size / 2 - 8, c = 2 * Math.PI * r;
  return <div className="relative shrink-0" style={{ width: size, height: size }}><svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="9"/><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}/></svg><div className="absolute inset-0 grid place-items-center text-center">{children}</div></div>;
};

const hours = [5, 7, 6.5, 8, 4.5, 7.5, 8.5, 6, 7, 8];
const water = [1.2, 1.8, 2.1, 1.5, 2.4, 2.0, 1.9, 2.5].map((v, i) => ({ d: i + 1, v }));
const weight = [82.4, 82.1, 81.9, 81.2, 81.0, 80.6, 80.3, 79.9, 79.7, 79.2].map((v, i) => ({ d: i + 1, v, m: v + 0.3 }));
const kcal = [1850, 2100, 1950, 2300, 2050, 2200, 1900].map((v, i) => ({ d: "SDTQQSS"[i] + i, v, p: v / 28 }));

function Hydration() {
  return <div className={frame}><Bar_ icon={Droplets} title="Minha hidratação" tag="Controle de líquidos" from="#075985" to="#0891b2"/>
    <div className="p-4"><div className="flex items-center gap-4"><Ring pct={68} color="#0ea5e9"><div><b className="text-xl tabular-nums">68%</b><p className="text-[10px] text-slate-500">da meta</p></div></Ring>
      <div className="flex-1"><p className="text-2xl font-extrabold tabular-nums">1.700<span className="text-sm font-semibold text-slate-500"> / 2.500 ml</span></p>
        <div className="mt-2 rounded-xl bg-sky-50 p-2.5 text-xs"><p className="flex items-center gap-1.5 font-bold text-sky-800"><Timer size={13}/> Próximo copo às 15:40</p><p className="text-slate-600">Beber cerca de 230 ml</p></div></div></div>
      <div className="mt-3 h-[84px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={water} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}><Bar dataKey="v" radius={[6, 6, 0, 0]}>{water.map((e, i) => <Cell key={i} fill={i === 7 ? "#0ea5e9" : "#7dd3fc"}/>)}</Bar></BarChart></ResponsiveContainer></div>
      <div className="mt-2 flex gap-1.5">{["+150 ml", "+250 ml", "+500 ml"].map(b => <span key={b} className="flex-1 rounded-lg bg-sky-600 py-1.5 text-center text-xs font-bold text-white">{b}</span>)}</div></div></div>;
}
function Medication() {
  const rows = [["08:00", "Losartana 50 mg", true], ["14:00", "Omeprazol 20 mg", true], ["20:00", "Metformina 850 mg", false]] as const;
  return <div className={frame}><Bar_ icon={Pill} title="Tratamento e medicamentos" tag="Acompanhamento" from="#9f1239" to="#db2777"/>
    <div className="p-4"><div className="rounded-2xl bg-gradient-to-br from-rose-600 to-pink-500 p-3 text-white"><p className="text-[10px] font-bold uppercase tracking-widest text-white/75">Próxima dose</p>
      <div className="mt-1 flex items-center gap-3"><span className="font-mono text-3xl font-bold tabular-nums">00:42:18</span><span className="text-xs leading-tight"><b className="block">Metformina 850 mg</b>às 20:00</span></div></div>
      <ul className="mt-3 grid gap-1.5">{rows.map(([t, n, done]) => <li key={t} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="font-mono text-xs font-bold text-slate-500">{t}</span><span className="flex-1 font-semibold">{n}</span>{done ? <CheckCircle2 size={18} className="text-emerald-500"/> : <span className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white">Tomar</span>}</li>)}</ul>
      <p className="mt-3 text-[11px] text-slate-500">Adesão em 7 dias</p><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200"><i className="block h-full w-[86%] rounded-full bg-gradient-to-r from-rose-500 to-pink-400"/></div></div></div>;
}
function Diet() {
  return <div className={frame}><Bar_ icon={UtensilsCrossed} title="Nutrição de hoje" tag="Diário alimentar" from="#065f46" to="#65a30d"/>
    <div className="p-4"><p className="text-[11px] italic text-slate-500">“150 g de arroz, feijão, frango e salada”</p>
      <div className="mt-2 grid grid-cols-4 gap-1.5">{[["kcal", "612", "#f97316"], ["Prot.", "42g", "#e11d48"], ["Carb.", "78g", "#f59e0b"], ["Gord.", "14g", "#8b5cf6"]].map(([l, v, c]) => <div key={l} className="rounded-xl bg-slate-50 py-2 text-center"><b className="block text-base tabular-nums" style={{ color: c }}>{v}</b><span className="text-[10px] text-slate-500">{l}</span></div>)}</div>
      <p className="mt-3 text-[11px] font-bold text-slate-600">Vitaminas e minerais</p>
      {[["Vitamina C", 74], ["Ferro", 52], ["Cálcio", 38]].map(([l, p]) => <div key={l as string} className="mt-1.5"><div className="flex justify-between text-[10px] text-slate-500"><span>{l}</span><span>{p}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><i className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400" style={{ width: p + "%" }}/></div></div>)}
      <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-50 p-2 text-[11px] font-semibold text-emerald-800"><Target size={13}/> Objetivo: emagrecimento · faltam 18 g de proteína</p></div></div>;
}
function Sports() {
  return <div className={frame}><Bar_ icon={Flame} title="Meta de hoje" tag="Nutrição esportiva" from="#9a3412" to="#f59e0b"/>
    <div className="p-4"><div className="grid grid-cols-3 gap-2 text-center">{[["Calorias", 64, "#f97316", "1.920"], ["Proteína", 82, "#e11d48", "138 g"], ["Carbo", 55, "#f59e0b", "210 g"]].map(([l, p, c, v]) => <div key={l as string} className="flex flex-col items-center"><Ring pct={p as number} color={c as string} size={74}><b className="text-sm tabular-nums">{p}%</b></Ring><b className="mt-1 text-xs">{v}</b><span className="text-[10px] text-slate-500">{l}</span></div>)}</div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-orange-50 p-2.5 text-xs"><Activity size={16} className="text-orange-600"/><span className="flex-1"><b>Treino de hoje</b> · musculação 55 min</span><span className="font-bold text-orange-700">+420 kcal</span></div>
      <p className="mt-2 text-[11px] text-slate-500">Hipertrofia: 1,8 g de proteína por kg de peso.</p></div></div>;
}
function Supplements() {
  const rows = [["Creatina", "3 g", "08:00", true], ["Whey", "30 g", "16:00", false], ["Magnésio", "300 mg", "22:00", false]] as const;
  return <div className={frame}><Bar_ icon={Sparkles} title="Central de suplementação" tag="Doses e horários" from="#5b21b6" to="#d97706"/>
    <div className="p-4"><div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-violet-700 to-indigo-600 p-3 text-white"><Ring pct={33} color="#fbbf24" size={64}><b className="text-sm">1/3</b></Ring><div><p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Próxima dose</p><b className="text-sm">Whey · 30 g</b><p className="font-mono text-lg font-bold tabular-nums">01:12:40</p></div></div>
      <ul className="mt-3 grid gap-1.5">{rows.map(([n, d, t, done]) => <li key={n} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-amber-500 text-white"><Sparkles size={14}/></span><span className="flex-1"><b>{n}</b> <span className="text-xs text-slate-500">{d} · {t}</span></span>{done ? <Check size={18} className="text-emerald-500"/> : <ChevronRight size={16} className="text-slate-400"/>}</li>)}</ul></div></div>;
}
function Weight() {
  return <div className={frame}><Bar_ icon={Scale} title="Peso e composição" tag="Evolução corporal" from="#86198f" to="#db2777"/>
    <div className="p-4"><div className="grid grid-cols-3 gap-1.5"><Stat label="Peso atual" value="79,2 kg" color="#c026d3"/><Stat label="Variação" value="−3,2 kg" note="em 10 sem." color="#059669"/><Stat label="IMC" value="26,1" note="Sobrepeso" color="#4f46e5"/></div>
      <div className="mt-2 h-[120px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={weight} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}><defs><linearGradient id="pvw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d946ef" stopOpacity={0.4}/><stop offset="1" stopColor="#ec4899" stopOpacity={0.02}/></linearGradient></defs><XAxis dataKey="d" hide/><YAxis hide domain={["dataMin - 1", "dataMax + 1"]}/><Area dataKey="v" type="monotone" stroke="#c026d3" strokeWidth={3} fill="url(#pvw)" isAnimationActive={false}/><Line dataKey="m" type="monotone" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false}/></AreaChart></ResponsiveContainer></div>
      <p className="mt-1 flex items-center gap-1.5 rounded-xl bg-fuchsia-50 p-2 text-[11px] font-semibold text-fuchsia-800"><TrendingDown size={13}/> Ritmo −0,35 kg/semana · meta de 75 kg em 12/01</p></div></div>;
}
function Sleep() {
  const data = hours.map((v, i) => ({ d: i + 1, v }));
  return <div className="w-full max-w-[440px] overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-indigo-950 to-violet-950 text-white shadow-[0_30px_80px_rgba(0,0,0,.5)]">
    <div className="flex items-center gap-4 p-4"><Ring pct={82} color="#818cf8" size={104}><div><b className="text-3xl tabular-nums">82</b><p className="text-[10px] uppercase tracking-widest text-white/70">Bom</p></div></Ring>
      <div><p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Última noite</p><p className="text-3xl font-extrabold tabular-nums">7h20</p><p className="text-xs text-white/70">23:10 → 06:30 · 1 despertar</p></div></div>
    <div className="mx-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3"><span className="relative grid size-10 place-items-center"><span className="absolute inset-0 animate-ping rounded-full bg-rose-500/30"/><HeartPulse size={22} className="relative text-rose-400"/></span><div><b className="text-2xl tabular-nums">54</b><span className="ml-1 text-xs text-white/70">bpm ao vivo</span></div><span className="ml-auto text-[10px] text-white/60">Sensor Bluetooth</span></div>
    <div className="h-[90px] px-2 pb-3 pt-2"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}><Bar dataKey="v" radius={[5, 5, 5, 5]}>{data.map((e, i) => <Cell key={i} fill={e.v >= 7.5 ? "#34d399" : e.v >= 6 ? "#818cf8" : "#fbbf24"}/>)}</Bar></BarChart></ResponsiveContainer></div></div>;
}
function Training() {
  return <div className="w-full max-w-[440px] overflow-hidden rounded-3xl border border-white/15 bg-slate-900 text-white shadow-[0_30px_80px_rgba(0,0,0,.5)]">
    <div className="flex items-center justify-between px-4 pt-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300"><i className="size-1.5 animate-pulse rounded-full bg-emerald-300"/> GPS ativo</span><span className="text-[10px] text-white/60">Corrida em andamento</span></div>
    <div className="grid grid-cols-3 gap-2 p-4 pb-2">{[["Tempo", "24:38"], ["Distância", "4,12 km"], ["Ritmo", "5:58 /km"]].map(([l, v]) => <div key={l} className="rounded-xl bg-white/10 p-2.5"><span className="text-[10px] text-white/60">{l}</span><b className="block text-lg tabular-nums">{v}</b></div>)}</div>
    <div className="relative mx-4 mb-4 h-[150px] overflow-hidden rounded-2xl bg-black/30"><svg viewBox="0 0 400 150" className="h-full w-full"><defs><pattern id="pvg" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#fff" strokeOpacity=".07"/></pattern><linearGradient id="pvr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#34d399"/><stop offset="1" stopColor="#38bdf8"/></linearGradient></defs><rect width="400" height="150" fill="url(#pvg)"/>
      <path d="M30 120 C80 60 120 120 170 80 S250 20 290 60 S350 110 372 40" fill="none" stroke="#000" strokeOpacity=".35" strokeWidth="9" strokeLinecap="round"/><path d="M30 120 C80 60 120 120 170 80 S250 20 290 60 S350 110 372 40" fill="none" stroke="url(#pvr)" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="30" cy="120" r="6" fill="#fff" stroke="#34d399" strokeWidth="3"/><circle cx="372" cy="40" r="11" fill="#38bdf8" opacity=".35"><animate attributeName="r" values="7;16;7" dur="1.6s" repeatCount="indefinite"/></circle><circle cx="372" cy="40" r="7" fill="#38bdf8" stroke="#fff" strokeWidth="2.5"/></svg>
      <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px]"><MapPin size={10}/> Percurso ao vivo</span><span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px]"><Flame size={10} className="text-orange-300"/> ~312 kcal</span></div></div>;
}
function Metrics() {
  return <div className={frame}><Bar_ icon={Target} title="Seus números da semana" tag="Métricas e gráficos" from="#3730a3" to="#0891b2"/>
    <div className="p-4"><div className="grid grid-cols-3 gap-1.5"><Stat label="Calorias" value="2.050" note="média/dia" color="#f97316"/><Stat label="Água" value="2,0 L" note="média/dia" color="#0284c7"/><Stat label="Treino" value="148 min" note="meta 150" color="#ea580c"/></div>
      <div className="mt-2 h-[130px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={kcal} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}><XAxis dataKey="d" hide/><YAxis yAxisId="a" hide/><YAxis yAxisId="b" hide orientation="right"/><Bar yAxisId="a" dataKey="v" radius={[6, 6, 0, 0]} fill="#6366f1" maxBarSize={26}/><Line yAxisId="b" dataKey="p" type="monotone" stroke="#f43f5e" strokeWidth={3} dot={{ r: 3, fill: "#fff", stroke: "#f43f5e", strokeWidth: 2 }} isAnimationActive={false}/></BarChart></ResponsiveContainer></div>
      <div className="flex gap-2 text-[10px] text-slate-500"><span className="inline-flex items-center gap-1"><i className="size-2.5 rounded bg-indigo-500"/>Calorias</span><span className="inline-flex items-center gap-1"><i className="h-0.5 w-3 bg-rose-500"/>Proteína</span><span className="ml-auto">Toque em um dia para ver detalhes</span></div></div></div>;
}
function Protocols() {
  const rows: [string, string, string][] = [["08:00", "Losartana 50 mg", "bg-emerald-500"], ["10:30", "Água · 250 ml", "bg-emerald-500"], ["12:30", "Almoço", "bg-amber-500"], ["21:00", "Magnésio 300 mg", "bg-slate-300"]];
  return <div className={frame}><Bar_ icon={HeartPulse} title="Agenda de cuidados" tag="Seu dia" from="#4c1d95" to="#a21caf"/>
    <div className="p-4"><div className="flex items-center justify-between"><p className="text-sm font-extrabold">Hoje</p><span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">50% concluído</span></div>
      <ul className="mt-2 grid gap-1.5">{rows.map(([t, n, dot]) => <li key={t} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="font-mono text-xs font-bold text-slate-500">{t}</span><span className="flex-1 font-semibold">{n}</span><i className={`size-2.5 rounded-full ${dot}`}/></li>)}</ul>
      <div className="mt-3 flex gap-1.5">{["Água", "Remédio", "Refeição", "Peso", "Sono"].map(c => <span key={c} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{c}</span>)}</div></div></div>;
}

const previews: Record<ShowcaseKind, () => React.ReactElement> = {
  hydration: Hydration, medication: Medication, diet: Diet, sports: Sports, supplements: Supplements,
  weight: Weight, sleep: Sleep, training: Training, metrics: Metrics, protocols: Protocols,
};
export function ScreenPreview({ kind }: { kind: ShowcaseKind }) {
  const View = previews[kind];
  return <div aria-hidden="true" className="relative w-full max-w-[440px] justify-self-center lg:justify-self-end"><div className="origin-top-right [transform:perspective(1400px)_rotateY(-6deg)] transition duration-500 hover:[transform:perspective(1400px)_rotateY(0deg)]"><View/></div></div>;
}
