import { Link } from "@tanstack/react-router";
import {
  Activity, ArrowRight, BedDouble, BookOpen, Bike, Check, CheckCircle2, ClipboardCheck, Droplets, Dumbbell, Flame, HeartPulse, LockKeyhole,
  MapPin, Moon, Pill, Scale, ShieldCheck, Sparkles, Star, Target, Timer, TrendingUp, Utensils, Waves,
} from "lucide-react";
import type { ReactElement } from "react";
import type { ShowcaseKind } from "./PublicCareShowcase";

const PRIMARY = "inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-extrabold shadow-lg transition hover:-translate-y-0.5";
const GHOST = "inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20";
const PAGE = "mx-auto grid w-full max-w-[1320px] gap-4 lg:h-[calc(100%-49px)] lg:min-h-0";
const FOOT = "mt-1 flex items-start gap-2 text-xs text-white/70";

const heroPhotos: Record<ShowcaseKind, { src: string; pos: string }> = {
  hydration: { src: "/images/caredigital-hidratacao.webp", pos: "50% 45%" },
  medication: { src: "/images/caredigital-medicamentos.webp", pos: "50% 50%" },
  diet: { src: "/images/caredigital-alimentacao.webp", pos: "50% 50%" },
  sports: { src: "/images/caredigital-esporte.webp", pos: "50% 40%" },
  supplements: { src: "/images/show-suplementos.webp", pos: "50% 60%" },
  weight: { src: "/images/show-peso.webp", pos: "60% 22%" },
  sleep: { src: "/images/show-sono.webp", pos: "50% 35%" },
  training: { src: "/images/show-treinos.webp", pos: "40% 45%" },
  metrics: { src: "/images/show-metricas.webp", pos: "50% 55%" },
  protocols: { src: "/images/caredigital-care-hero.webp", pos: "70% 25%" },
};

/** Foto profissional de fundo do destaque, com véu escuro para o texto. */
function HeroPhoto({ kind }: { kind: ShowcaseKind }) {
  const p = heroPhotos[kind];
  return (
    <>
      <img src={p.src} alt="" aria-hidden="true" width={1600} height={900} loading="eager" decoding="async"
        style={{ objectPosition: p.pos }} className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/30" />
    </>
  );
}

function Cta({ cta, tone }: { cta: string; tone: string }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <a href="/entrar?mode=signup" className={`${PRIMARY} ${tone}`}>Testar grátis por 7 dias <ArrowRight size={17} /></a>
      <Link to="/cliente" className={GHOST}><LockKeyhole size={16} /> {cta}</Link>
    </div>
  );
}

/* 1 · HIDRATAÇÃO — copo que enche, sensação de frescor */
function Hydration() {
  return (
    <div className={`${PAGE} lg:grid-cols-[1.05fr_1fr]`}>
      <section className="relative isolate overflow-hidden relative flex flex-col justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-sky-950 via-sky-900 to-cyan-700 p-8 text-white shadow-pop lg:p-10">
        <HeroPhoto kind="hydration" />
        <p className="text-xs font-bold uppercase tracking-[.2em] text-sky-200">Hidratação</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] lg:text-4xl 2xl:text-5xl">Beber água nunca foi tão simples.</h1>
        <p className="mt-4 max-w-xl text-base text-sky-100/90">Sua meta do dia, o que já foi bebido e o horário do próximo copo, sempre à vista. A cada registro, o NextVita recalcula quanto e quando beber, até as 22h.</p>
        <Cta cta="Acessar minha hidratação" tone="text-sky-900" />
        <p className={FOOT}><ShieldCheck size={14} className="mt-0.5 shrink-0" /> Metas são orientativas e devem considerar a orientação profissional.</p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-rows-[1fr_auto]">
        <div className="relative flex min-h-[260px] items-end justify-center overflow-hidden rounded-3xl border border-sky-200/40 bg-gradient-to-b from-sky-50 to-cyan-100 p-6 shadow-card">
          <div className="relative h-56 w-36 overflow-hidden rounded-b-[2.6rem] rounded-t-xl border-[3px] border-white bg-white/50 shadow-inner">
            <div className="absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-sky-600 to-cyan-300">
              <div className="absolute -top-2 left-0 h-4 w-[200%] animate-[care-wave_3s_linear_infinite] rounded-[50%] bg-cyan-100/80" />
            </div>
            <span className="absolute inset-0 grid place-items-center text-2xl font-extrabold text-sky-900 drop-shadow">68%</span>
          </div>
          <p className="absolute left-5 top-5 text-sm font-bold text-sky-900">1.700 / 2.500 ml</p>
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-3xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Próximo copo</p>
          <p className="text-4xl font-extrabold tabular-nums text-sky-700">15:40</p>
          <p className="text-sm text-muted-foreground">Cerca de 230 ml, calculado pelo seu ritmo do dia.</p>
          <div className="flex gap-1.5">{["+150 ml", "+250 ml", "+500 ml"].map((b) => <span key={b} className="flex-1 rounded-lg bg-sky-600 py-2 text-center text-xs font-bold text-white">{b}</span>)}</div>
        </div>
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
          {[[Droplets, "Meta personal", "Calculada pelo peso, pela rotina e pela orientação profissional."], [Timer, "Lembrete no horário", "Um timer mostra quando é a hora do próximo copo."], [CheckCircle2, "Registro com um toque", "Confirme o copo e veja o total do dia mudar na hora."]].map(([I, t, d]) => {
            const Icon = I as typeof Droplets;
            return <div key={t as string} className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700"><Icon size={19} /></span><div><p className="font-bold">{t as string}</p><p className="text-xs text-muted-foreground">{d as string}</p></div></div>;
          })}
        </div>
      </section>
    </div>
  );
}

/* 2 · MEDICAÇÃO — cartela de doses, linha do tempo do dia */
function Medication() {
  const doses: [string, string, "ok" | "next" | "todo"][] = [["07:00", "Omeprazol 20 mg", "ok"], ["08:00", "Losartana 50 mg", "ok"], ["14:00", "Amoxicilina 500 mg", "next"], ["20:00", "Metformina 850 mg", "todo"]];
  return (
    <div className={`${PAGE} lg:grid-cols-[1fr_1fr]`}>
      <section className="relative isolate overflow-hidden flex flex-col justify-center rounded-3xl bg-gradient-to-br from-rose-900 via-rose-700 to-pink-500 p-8 text-white shadow-pop lg:p-10">
        <HeroPhoto kind="medication" />
        <p className="text-xs font-bold uppercase tracking-[.2em] text-rose-100">Medicação</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] lg:text-4xl 2xl:text-5xl">Cada dose no horário certo, sem esquecer.</h1>
        <p className="mt-4 max-w-xl text-base text-rose-50/90">Cadastre seus remédios com dose e horários, veja o timer da próxima tomada e confirme cada dose. O histórico guarda data e hora reais.</p>
        <Cta cta="Acessar meus medicamentos" tone="text-rose-700" />
      </section>
      <section className="grid gap-4 lg:grid-rows-[auto_1fr]">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-600">Linha do dia</p>
          <ol className="relative mt-4 grid gap-4 border-l-2 border-rose-200 pl-6">
            {doses.map(([time, name, state]) => (
              <li key={time} className="relative">
                <span className={`absolute -left-[33px] top-1 grid size-5 place-items-center rounded-full ${state === "ok" ? "bg-emerald-500" : state === "next" ? "animate-pulse bg-rose-600" : "bg-slate-300"}`}>
                  {state === "ok" && <Check size={12} className="text-white" strokeWidth={3} />}
                </span>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-rose-50/60 px-4 py-3">
                  <div><p className="font-mono text-xs font-bold text-rose-700">{time}</p><p className="font-bold">{name}</p></div>
                  <span className={`rounded-lg px-3 py-1 text-xs font-bold ${state === "ok" ? "bg-emerald-100 text-emerald-700" : state === "next" ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-600"}`}>{state === "ok" ? "Tomado" : state === "next" ? "Tomar agora" : "Agendado"}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[[Pill, "Biblioteca", "Dor, estômago, pressão, diabetes, alergia e antibióticos."], [Timer, "Timer da dose", "Contagem regressiva até a próxima tomada."], [ClipboardCheck, "Esqueceu de confirmar?", "Regularize doses passadas com uma confirmação."]].map(([I, t, d]) => {
            const Icon = I as typeof Pill;
            return <div key={t as string} className="rounded-2xl border border-border bg-card p-4 shadow-card"><Icon size={20} className="text-rose-600" /><p className="mt-2 font-bold">{t as string}</p><p className="text-xs text-muted-foreground">{d as string}</p></div>;
          })}
        </div>
      </section>
    </div>
  );
}

/* 3 · DIETAS — prato dividido, macros e cardápio */
function Diet() {
  return (
    <div className={`${PAGE} lg:grid-cols-[1.1fr_1fr]`}>
      <section className="relative isolate overflow-hidden flex flex-col justify-center rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-lime-600 p-8 text-white shadow-pop lg:p-10">
        <HeroPhoto kind="diet" />
        <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-100">Alimentação e dietas</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] lg:text-4xl 2xl:text-5xl">Você descreve o que comeu. O resto é calculado.</h1>
        <p className="mt-4 max-w-xl text-base text-emerald-50/90">Escreva a refeição em texto natural. O NextVita reconhece os alimentos, estima calorias, macronutrientes, fibras e vitaminas, e compara com o seu objetivo.</p>
        <div className="mt-5 rounded-2xl bg-white/10 p-4 font-mono text-sm text-emerald-50">“150 g de arroz, feijão, frango e 2 ovos”</div>
        <Cta cta="Acessar minha rotina" tone="text-emerald-800" />
      </section>
      <section className="grid gap-4">
        <div className="grid gap-4 rounded-3xl border border-border bg-card p-5 shadow-card sm:grid-cols-[180px_1fr] sm:items-center">
          <div className="relative mx-auto grid size-44 place-items-center rounded-full bg-gradient-to-br from-amber-50 to-white shadow-inner">
            <div className="absolute inset-3 rounded-full border-[10px] border-emerald-500 border-r-orange-400 border-b-rose-400 border-l-lime-400" />
            <div className="text-center"><p className="text-2xl font-extrabold">612</p><p className="text-xs text-slate-500">kcal no prato</p></div>
          </div>
          <div className="grid gap-2">
            {[["Proteína", 42, "bg-rose-500", "42 g"], ["Carboidrato", 78, "bg-amber-500", "78 g"], ["Gordura", 14, "bg-violet-500", "14 g"]].map(([l, p, c, v]) => (
              <div key={l as string}><div className="flex justify-between text-xs font-semibold"><span>{l as string}</span><span className="tabular-nums">{v as string}</span></div><div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100"><i className={`block h-full rounded-full ${c as string}`} style={{ width: `${p}%` }} /></div></div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[[BookOpen, "Cardápios e receitas", "Planos por objetivo e receitas regionais com macros calculados."], [Utensils, "Vitaminas e minerais", "Vitamina C, ferro, cálcio e potássio conferidos a cada refeição."]].map(([I, t, d]) => {
            const Icon = I as typeof BookOpen;
            return <div key={t as string} className="rounded-2xl border border-border bg-card p-4 shadow-card"><Icon size={20} className="text-emerald-600" /><p className="mt-2 font-bold">{t as string}</p><p className="text-xs text-muted-foreground">{d as string}</p></div>;
          })}
        </div>
      </section>
    </div>
  );
}

/* 4 · NUTRIÇÃO ESPORTIVA — metas por objetivo, desempenho */
function Sports() {
  const goals = ["Emagrecer", "Manter", "Ganhar peso", "Hipertrofia"];
  return (
    <div className={`${PAGE} lg:grid-rows-[1fr_auto]`}>
      <section className="relative isolate overflow-hidden relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-950 via-orange-800 to-amber-500 p-8 text-white shadow-pop lg:p-12">
        <HeroPhoto kind="sports" />
        <div aria-hidden="true" className="absolute -right-20 -top-20 size-96 rounded-full bg-amber-300/25 blur-3xl" />
        <p className="relative text-xs font-bold uppercase tracking-[.2em] text-amber-100">Nutrição esportiva</p>
        <h1 className="relative mt-3 max-w-3xl text-4xl font-extrabold leading-[1.05] lg:text-5xl 2xl:text-6xl">Alimente o treino com a meta certa para o seu objetivo.</h1>
        <div className="relative mt-6 flex flex-wrap gap-2">{goals.map((g, i) => <span key={g} className={`rounded-full px-4 py-2 text-sm font-bold ${i === 3 ? "bg-white text-orange-800" : "bg-white/15 text-white"}`}>{g}</span>)}</div>
        <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
          {[["1.920", "kcal por dia"], ["138 g", "de proteína (1,8 g/kg)"], ["210 g", "de carboidrato"]].map(([v, l]) => <div key={l} className="rounded-2xl bg-black/20 p-4"><p className="text-3xl font-extrabold tabular-nums">{v}</p><p className="text-sm text-orange-100">{l}</p></div>)}
        </div>
        <Cta cta="Acessar meu acompanhamento" tone="text-orange-800" />
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        {[[Dumbbell, "Treino e refeição", "A proteína e o carboidrato se ajustam aos dias de treino."], [Target, "Metas por objetivo", "Cada objetivo tem seus números de referência, sem atalhos."], [Flame, "Recuperação", "Acompanhe a constância da alimentação ao longo da semana."]].map(([I, t, d]) => {
          const Icon = I as typeof Dumbbell;
          return <div key={t as string} className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700"><Icon size={20} /></span><div><p className="font-bold">{t as string}</p><p className="text-xs text-muted-foreground">{d as string}</p></div></div>;
        })}
      </section>
    </div>
  );
}

/* 5 · SUPLEMENTOS — vitrine de produtos com dose e horário */
function Supplements() {
  const items = [["Creatina", "3 g", "08:00", "from-violet-500 to-fuchsia-500"], ["Whey protein", "30 g", "16:00", "from-sky-500 to-indigo-500"], ["Ômega 3", "1 cápsula", "12:00", "from-cyan-500 to-teal-500"], ["Magnésio", "300 mg", "22:00", "from-indigo-500 to-purple-600"]] as const;
  return (
    <div className={`${PAGE} lg:grid-rows-[auto_1fr]`}>
      <section className="relative isolate overflow-hidden flex flex-wrap items-end justify-between gap-6 rounded-3xl bg-gradient-to-r from-violet-950 via-violet-800 to-amber-600 p-8 text-white shadow-pop lg:p-10">
        <HeroPhoto kind="supplements" />
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-violet-200">Controle de suplementação</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] lg:text-4xl 2xl:text-5xl">Dose, horário e timer para cada suplemento.</h1>
          <p className="mt-3 text-base text-violet-100/90">Programe o que você usa, marque o que já tomou e veja a próxima dose. A biblioteca traz dicas de uso e cuidados.</p>
        </div>
        <Cta cta="Programar meus suplementos" tone="text-violet-800" />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(([name, dose, time, g]) => (
          <article key={name} className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-pop">
            <div className={`relative grid h-28 place-items-center bg-gradient-to-br ${g}`}>
              <Sparkles size={34} className="text-white/90 transition group-hover:scale-110" />
              <span className="absolute right-3 top-3 rounded-full bg-white/25 px-2.5 py-1 font-mono text-xs font-bold text-white">{time}</span>
            </div>
            <div className="p-4"><p className="font-extrabold">{name}</p><p className="text-sm text-muted-foreground">{dose} · um toque para marcar a dose</p></div>
          </article>
        ))}
      </section>
    </div>
  );
}

/* 6 · CONTROLE DE PESO — número grande e tendência */
function Weight() {
  const pts = [82.4, 82.1, 81.9, 81.2, 81.0, 80.6, 80.3, 79.9, 79.7, 79.2];
  const min = 78, max = 83;
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * 600},${140 - ((v - min) / (max - min)) * 130}`).join(" ");
  return (
    <div className={`${PAGE} lg:grid-cols-[1fr_1.15fr]`}>
      <section className="relative isolate overflow-hidden flex flex-col justify-between rounded-3xl bg-gradient-to-br from-fuchsia-950 via-fuchsia-800 to-pink-500 p-8 text-white shadow-pop lg:p-10">
        <HeroPhoto kind="weight" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-fuchsia-200">Controle de peso</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] lg:text-4xl 2xl:text-5xl">Veja a sua evolução, não só o número de hoje.</h1>
          <p className="mt-4 text-base text-fuchsia-100/90">Registre o peso por data. O gráfico mostra a tendência, o IMC e quanto falta para a sua meta, com a data estimada de chegada.</p>
        </div>
        <div className="mt-6 flex items-end gap-4"><p className="text-6xl font-extrabold tabular-nums">79,2<span className="ml-1 text-xl font-bold text-fuchsia-200">kg</span></p><p className="pb-2 text-sm text-fuchsia-100">−3,2 kg em 10 semanas</p></div>
        <Cta cta="Registrar meu peso" tone="text-fuchsia-800" />
      </section>
      <section className="grid gap-4">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between"><p className="font-bold">Evolução</p><span className="rounded-full bg-fuchsia-100 px-2.5 py-1 text-xs font-bold text-fuchsia-700">−0,35 kg/sem</span></div>
          <svg viewBox="0 0 600 160" className="mt-3 h-40 w-full">
            <defs><linearGradient id="wgf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d946ef" stopOpacity=".35" /><stop offset="1" stopColor="#d946ef" stopOpacity="0" /></linearGradient></defs>
            <path d={`${path} L600,160 L0,160 Z`} fill="url(#wgf)" />
            <path d={path} fill="none" stroke="#c026d3" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[[Scale, "IMC", "26,1 · sobrepeso"], [TrendingUp, "Média móvel", "suaviza variações do dia"], [Target, "Meta", "75 kg até janeiro"]].map(([I, t, d]) => {
            const Icon = I as typeof Scale;
            return <div key={t as string} className="rounded-2xl border border-border bg-card p-4 shadow-card"><Icon size={19} className="text-fuchsia-600" /><p className="mt-2 font-bold">{t as string}</p><p className="text-xs text-muted-foreground">{d as string}</p></div>;
          })}
        </div>
      </section>
    </div>
  );
}

/* 7 · SONO — noite estrelada, nota e batimentos */
function Sleep() {
  return (
    <div className={`${PAGE} lg:grid-cols-[1fr_1fr]`}>
      <section className="relative isolate overflow-hidden relative flex flex-col justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-950 via-violet-950 to-slate-950 p-8 text-white shadow-pop lg:p-10">
        <HeroPhoto kind="sleep" />
        <div aria-hidden="true" className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(1.5px 1.5px at 12% 22%, #fff, transparent), radial-gradient(1px 1px at 38% 12%, #fff, transparent), radial-gradient(1.5px 1.5px at 64% 30%, #fff, transparent), radial-gradient(1px 1px at 84% 16%, #fff, transparent), radial-gradient(1px 1px at 74% 62%, #fff, transparent), radial-gradient(1.5px 1.5px at 22% 70%, #fff, transparent)" }} />
        <Moon className="relative text-indigo-200" size={36} />
        <p className="relative mt-4 text-xs font-bold uppercase tracking-[.2em] text-indigo-200">Monitoramento do sono</p>
        <h1 className="relative mt-3 text-4xl font-extrabold leading-[1.05] lg:text-4xl 2xl:text-5xl">Descanse melhor com dados de verdade.</h1>
        <p className="relative mt-4 text-base text-indigo-100/90">Registre a noite, veja a nota de 0 a 100 e acompanhe a regularidade do horário de dormir. Com um sensor Bluetooth, os batimentos aparecem ao vivo.</p>
        <div className="relative mt-5 flex items-center gap-3 rounded-2xl bg-white/10 p-4"><HeartPulse className="text-rose-300" /><b className="text-2xl tabular-nums">54</b><span className="text-sm text-indigo-100">bpm ao vivo, com cinta ou relógio</span></div>
        <Cta cta="Monitorar meu sono" tone="text-indigo-900" />
      </section>
      <section className="grid gap-4">
        <div className="flex items-center gap-5 rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="relative grid size-28 shrink-0 place-items-center"><svg viewBox="0 0 120 120" className="-rotate-90 absolute inset-0 size-full"><circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="12" /><circle cx="60" cy="60" r="50" fill="none" stroke="#6366f1" strokeWidth="12" strokeLinecap="round" strokeDasharray="314" strokeDashoffset="56" /></svg><b className="text-3xl">82</b></div>
          <div><p className="font-bold">Nota da última noite</p><p className="text-sm text-muted-foreground">7h20 de sono, 1 despertar e horário de dormir estável.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[[Moon, "Duração", "meta de 8 horas"], [BedDouble, "Regularidade", "variação do horário"], [Waves, "Débito de sono", "soma dos dias"]].map(([I, t, d]) => {
            const Icon = I as typeof Moon;
            return <div key={t as string} className="rounded-2xl border border-border bg-card p-4 shadow-card"><Icon size={19} className="text-indigo-600" /><p className="mt-2 font-bold">{t as string}</p><p className="text-xs text-muted-foreground">{d as string}</p></div>;
          })}
        </div>
      </section>
    </div>
  );
}

/* 8 · TREINOS — mapa com rota e esportes */
function Training() {
  return (
    <div className={`${PAGE} lg:grid-rows-[1fr_auto]`}>
      <section className="relative isolate overflow-hidden relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-pop">
        <HeroPhoto kind="training" />
        <svg viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
          <defs><pattern id="tgrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" strokeOpacity=".06" /></pattern><linearGradient id="trg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#38bdf8" /></linearGradient></defs>
          <rect width="1200" height="500" fill="url(#tgrid)" />
          <path d="M80 380 C 220 250 300 430 460 300 S 720 120 820 240 S 1040 380 1120 150" fill="none" stroke="#000" strokeOpacity=".4" strokeWidth="16" strokeLinecap="round" />
          <path d="M80 380 C 220 250 300 430 460 300 S 720 120 820 240 S 1040 380 1120 150" fill="none" stroke="url(#trg)" strokeWidth="8" strokeLinecap="round" />
          <circle cx="80" cy="380" r="10" fill="#fff" stroke="#34d399" strokeWidth="5" />
        </svg>
        <div className="relative flex min-h-[320px] flex-col justify-between gap-6 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent p-8 lg:p-10">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-emerald-300"><MapPin size={14} /> Treinos e corridas</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] lg:text-4xl 2xl:text-5xl">Cada passo registrado pelo GPS do seu aparelho.</h1>
            <p className="mt-4 text-base text-slate-300">Veja o percurso sendo desenhado em tempo real, com velocidade, ritmo e tempo por quilômetro. Um corredor animado acompanha o seu ritmo.</p>
            <Cta cta="Registrar um treino" tone="text-slate-900" />
          </div>
          <div className="grid max-w-xl grid-cols-3 gap-3">
            {[["24:38", "tempo"], ["4,12 km", "distância"], ["5:58", "min/km"]].map(([v, l]) => <div key={l} className="rounded-2xl bg-white/10 p-4 backdrop-blur"><p className="text-2xl font-extrabold tabular-nums">{v}</p><p className="text-xs text-slate-300">{l}</p></div>)}
          </div>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-5">
        {[[Activity, "Corrida"], [Waves, "Natação"], [Bike, "Ciclismo"], [Dumbbell, "Musculação"], [Activity, "Caminhada"]].map(([I, t]) => {
          const Icon = I as typeof Activity;
          return <div key={t as string} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-card"><Icon size={18} className="text-emerald-600" /><span className="font-bold">{t as string}</span></div>;
        })}
      </section>
    </div>
  );
}

/* 9 · MÉTRICAS — painel de indicadores e gráfico */
function Metrics() {
  return (
    <div className={`${PAGE} lg:grid-cols-[1.2fr_1fr] lg:grid-rows-[auto_1fr]`}>
      <section className="relative isolate overflow-hidden flex flex-col justify-center rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-cyan-600 p-8 text-white shadow-pop lg:col-span-2 lg:p-10">
        <HeroPhoto kind="metrics" />
        <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-200">Métricas e gráficos</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.05] lg:text-4xl 2xl:text-5xl">Todos os seus números de saúde em um único painel.</h1>
        <p className="mt-3 max-w-2xl text-base text-indigo-100/90">Calorias, proteína, água, peso, treino e sono lado a lado, com metas e tendências. Toque em um dia para ver os detalhes.</p>
        <Cta cta="Ver minhas métricas" tone="text-indigo-900" />
      </section>
      <section className="grid grid-cols-2 gap-3">
        {[["2.050", "kcal/dia", "text-orange-600"], ["2,0 L", "água/dia", "text-sky-600"], ["148", "min de treino", "text-emerald-600"], ["7h20", "sono médio", "text-indigo-600"]].map(([v, l, c]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-4 shadow-card"><p className={`text-2xl font-extrabold tabular-nums ${c}`}>{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>
        ))}
      </section>
      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <p className="font-bold">Semana em barras</p>
        <div className="mt-4 flex h-40 items-end gap-2">{[60, 82, 48, 90, 70, 95, 64].map((h, i) => <i key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-indigo-600 to-cyan-400" style={{ height: `${h}%` }} />)}</div>
        <p className="mt-3 text-xs text-muted-foreground">Calorias por dia, com a linha de tendência por cima.</p>
      </section>
    </div>
  );
}

/* 10 · COMO FUNCIONA — jornada em quatro passos com a agenda do dia */
function Journey() {
  const steps = [["1", "Vinculação", "Seu perfil e o acesso ao acompanhamento."], ["2", "Programação", "Medicamentos, água, refeições e treinos nos horários certos."], ["3", "Confirmação", "Você confirma o que fez, no momento em que fez."], ["4", "Histórico", "Tudo guardado com data e hora reais."]];
  return (
    <div className={`${PAGE} lg:grid-rows-[auto_1fr]`}>
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-800 to-emerald-600 p-8 text-white shadow-pop lg:p-10">
        <HeroPhoto kind="protocols" />
        <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-100">Como funciona</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.05] lg:text-4xl 2xl:text-5xl">Da programação ao histórico, em quatro passos.</h1>
        <Cta cta="Acessar meu acompanhamento" tone="text-emerald-800" />
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ol className="grid gap-3 sm:grid-cols-2">
          {steps.map(([n, t, d]) => <li key={n} className="rounded-3xl border border-border bg-card p-5 shadow-card"><span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 font-extrabold text-white">{n}</span><p className="mt-3 text-lg font-extrabold">{t}</p><p className="text-sm text-muted-foreground">{d}</p></li>)}
        </ol>
        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Sua agenda de hoje</p>
          <ul className="mt-3 grid gap-2">{[["08:00", "Losartana", true], ["10:30", "Água · 250 ml", true], ["12:30", "Almoço", false], ["21:00", "Magnésio", false]].map(([t, n, ok]) => <li key={t as string} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5"><span className="font-mono text-xs font-bold text-slate-500">{t as string}</span><span className="flex-1 text-sm font-semibold">{n as string}</span>{ok ? <CheckCircle2 size={17} className="text-emerald-500" /> : <Star size={15} className="text-amber-500" />}</li>)}</ul>
        </div>
      </section>
    </div>
  );
}

const pages: Record<ShowcaseKind, () => ReactElement> = {
  hydration: Hydration, medication: Medication, diet: Diet, sports: Sports, supplements: Supplements,
  weight: Weight, sleep: Sleep, training: Training, metrics: Metrics, protocols: Journey,
};

/** Cada área tem sua própria composição: nada de um modelo único repetido. */
export function AreaShowcase({ kind }: { kind: ShowcaseKind }) {
  const View = pages[kind];
  return <View />;
}
