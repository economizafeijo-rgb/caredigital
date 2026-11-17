import { Link } from "@tanstack/react-router";
import type { ReactElement, ReactNode } from "react";
import {
  Activity, ArrowRight, BedDouble, Bike, BookOpen, CalendarClock, Check, CheckCircle2, ClipboardCheck, Droplets, Dumbbell,
  Flame, Gauge, HeartPulse, LockKeyhole, MapPin, Moon, Pill, Scale, ShieldCheck, Target, Timer, TrendingDown, TrendingUp,
  Utensils, Waves, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ShowcaseKind } from "./PublicCareShowcase";

/* ------------------------------------------------------------------ */
/* Peças comuns                                                        */
/* ------------------------------------------------------------------ */

const CARD = "rounded-3xl border border-border bg-card shadow-card";
const BTN_PRIMARY = "inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold shadow-lg transition hover:-translate-y-0.5";
const BTN_GHOST = "inline-flex h-11 items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20";
const FEATURE_ROW = "grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-3";

/** A página ocupa toda a janela em telas largas; em telas baixas ou no celular ela rola normalmente. */
function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto grid w-full max-w-[1760px] gap-3 lg:min-h-[max(30rem,calc(100%-49px))] lg:gap-4 ${className}`}>{children}</div>;
}

function Cta({ label, tone }: { label: string; tone: string }) {
  return (
    <div className="mt-1 flex flex-wrap gap-2.5">
      <a href="/entrar?mode=signup" className={`${BTN_PRIMARY} ${tone}`}>Testar grátis por 7 dias <ArrowRight size={17} /></a>
      <Link to="/cliente" className={BTN_GHOST}><LockKeyhole size={16} /> {label}</Link>
    </div>
  );
}

type HeroProps = {
  photo: string; pos?: string; eyebrow: string; eyebrowTone: string; title: string; lead: string;
  cta: string; tone: string; shade?: "b" | "r"; children?: ReactNode; aside?: ReactNode; className?: string;
};

/** Destaque com foto profissional: o texto fica sempre sobre um véu escuro e nunca é cortado. */
function Hero({ photo, pos = "50% 50%", eyebrow, eyebrowTone, title, lead, cta, tone, shade = "b", children, aside, className = "" }: HeroProps) {
  return (
    <section className={`relative isolate flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-3xl bg-slate-950 text-white shadow-pop lg:min-h-0 ${aside ? "lg:flex-row lg:items-end lg:justify-between" : ""} ${className}`}>
      <img src={photo} alt="" aria-hidden="true" width={1600} height={900} loading="eager" decoding="async"
        style={{ objectPosition: pos }} className="absolute inset-0 -z-10 size-full object-cover" />
      <div aria-hidden="true" className={`absolute inset-0 -z-10 ${shade === "b" ? "nv-shade-b" : "nv-shade-r"}`} />
      <div className="relative flex min-w-0 max-w-[44rem] flex-col gap-3 p-5 sm:p-7 lg:gap-[clamp(0.5rem,1.5vh,1rem)] lg:p-[clamp(1.25rem,3.2vh,2.5rem)]">
        <p className={`text-[11px] font-bold uppercase tracking-[.22em] ${eyebrowTone}`}>{eyebrow}</p>
        <h1 className="nv-h1">{title}</h1>
        <p className="nv-lead max-w-[38rem] text-white/85">{lead}</p>
        {children}
        <Cta label={cta} tone={tone} />
      </div>
      {aside && <div className="nv-aside relative p-5 pt-0 sm:p-7 sm:pt-0 lg:p-[clamp(1.25rem,3.2vh,2.5rem)] lg:pl-0">{aside}</div>}
    </section>
  );
}

function Feature({ icon: Icon, title, text, tone }: { icon: LucideIcon; title: string; text: string; tone: string }) {
  return (
    <div className={`${CARD} flex items-start gap-3 p-4`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={19} /></span>
      <div className="min-w-0">
        <p className="font-bold leading-tight">{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

/** Gráfico de área que preenche o espaço sem distorcer: o traço tem espessura fixa e os pontos são HTML. */
function AreaChart({ values, min, max, color, id }: { values: number[]; min: number; max: number; color: string; id: string }) {
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 100 - ((v - min) / (max - min)) * 84 - 8] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <div className="relative size-full">
      {[0, 1, 2, 3].map((i) => <div key={i} className="absolute inset-x-0 border-t border-dashed border-border" style={{ top: `${8 + i * 28}%` }} />)}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".38" /><stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L100 100 L0 100 Z`} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-md" style={{ left: `${last[0]}%`, top: `${last[1]}%`, background: color }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1 · Hidratação: copo que enche e o horário do próximo copo          */
/* ------------------------------------------------------------------ */

function Hydration() {
  return (
    <Page className="lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Hero photo="/images/caredigital-hidratacao.webp" pos="50% 45%" eyebrow="Hidratação" eyebrowTone="text-sky-200"
        title="Beber água nunca foi tão simples."
        lead="Sua meta do dia, o que já foi bebido e o horário do próximo copo, sempre à vista. A cada registro, o NextVita recalcula quanto e quando beber, até as 22h."
        cta="Acessar minha hidratação" tone="text-sky-800">
        <p className="flex items-center gap-1.5 text-xs text-white/70"><ShieldCheck size={14} className="shrink-0" /> Metas orientativas: consulte sempre a orientação profissional.</p>
      </Hero>
      <div className="grid gap-3 lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-4">
        <section className={`${CARD} grid min-h-[20rem] items-stretch gap-5 overflow-hidden bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5 dark:from-sky-950/40 dark:via-card dark:to-cyan-950/30 sm:grid-cols-[auto_1fr] lg:p-7`}>
          <div className="relative mx-auto h-64 w-44 self-center sm:h-72 sm:w-48 lg:h-full lg:max-h-[32rem] lg:w-56">
            <div className="absolute inset-0 overflow-hidden rounded-b-[3rem] rounded-t-xl border-[3px] border-sky-200 bg-white/60 shadow-inner dark:border-sky-800 dark:bg-sky-950/30">
              <div className="absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-sky-600 to-cyan-300">
                <svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true" className="nv-wave absolute -top-3 left-0 h-4 w-[200%]">
                  <path d="M0 10 Q25 0 50 10 T100 10 T150 10 T200 10 V20 H0 Z" fill="#67e8f9" />
                </svg>
              </div>
              <span className="absolute inset-0 grid place-items-center text-3xl font-extrabold text-sky-950 drop-shadow">68%</span>
            </div>
          </div>
          <div className="grid gap-4 self-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-700 dark:text-sky-300">Hoje</p>
              <p className="nv-stat tabular-nums text-sky-900 dark:text-sky-100">1.700 <span className="text-base font-bold text-muted-foreground">de 2.500 ml</span></p>
            </div>
            <div className="rounded-2xl bg-sky-600 p-4 text-white shadow-md">
              <p className="text-[11px] font-bold uppercase tracking-widest text-sky-100">Próximo copo</p>
              <p className="nv-stat tabular-nums">15:40 <span className="text-base font-semibold text-sky-100">· cerca de 230 ml</span></p>
              <p className="mt-1 text-xs text-sky-100/90">Calculado pelo seu ritmo do dia e pela meta restante.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["+150 ml", "+250 ml", "+500 ml"].map((b) => <span key={b} className="rounded-xl bg-white py-2.5 text-center text-sm font-bold text-sky-700 dark:text-sky-300 shadow-sm ring-1 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-800">{b}</span>)}
            </div>
          </div>
        </section>
        <div className={FEATURE_ROW}>
          <Feature icon={Droplets} title="Meta personalizada" text="Calculada pelo seu peso, rotina e orientação profissional." tone="bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300" />
          <Feature icon={Timer} title="Timer do próximo copo" text="Uma contagem regressiva mostra a hora de beber." tone="bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300" />
          <Feature icon={CheckCircle2} title="Um toque para registrar" text="Confirme o copo e veja o total do dia mudar na hora." tone="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" />
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* 2 · Medicação: linha do dia com as doses                            */
/* ------------------------------------------------------------------ */

function Medication() {
  const doses: { time: string; name: string; note: string; state: "ok" | "next" | "todo" }[] = [
    { time: "07:00", name: "Omeprazol 20 mg", note: "1 cápsula · em jejum", state: "ok" },
    { time: "08:00", name: "Losartana 50 mg", note: "1 comprimido · com água", state: "ok" },
    { time: "14:00", name: "Amoxicilina 500 mg", note: "1 cápsula · após o almoço", state: "next" },
    { time: "20:00", name: "Metformina 850 mg", note: "1 comprimido · após o jantar", state: "todo" },
  ];
  const label = { ok: "Tomado", next: "Tomar agora", todo: "Agendado" } as const;
  const chip = { ok: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300", next: "bg-rose-600 text-white", todo: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200" } as const;
  return (
    <Page className="lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <Hero photo="/images/caredigital-medicamentos.webp" pos="50% 50%" eyebrow="Medicação" eyebrowTone="text-rose-200"
        title="Cada dose no horário certo, sem esquecer."
        lead="Cadastre seus remédios com dose e horários, veja o timer da próxima tomada e confirme cada dose. O histórico guarda a data e a hora reais."
        cta="Acessar meus medicamentos" tone="text-rose-700" />
      <div className="grid gap-3 lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-4">
        <section className={`${CARD} flex min-h-[20rem] flex-col p-5 lg:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-600">Linha do dia</p>
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">2 de 4 doses tomadas</span>
          </div>
          <ol className="relative mt-4 grid flex-1 grid-rows-4 gap-3 border-l-2 border-rose-200 pl-7">
            {doses.map(({ time, name, note, state }) => (
              <li key={time} className="relative flex min-h-0 items-stretch">
                <span className={`absolute -left-[39px] top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full ring-4 ring-card ${state === "ok" ? "bg-emerald-500" : state === "next" ? "animate-pulse bg-rose-600" : "bg-slate-300"}`}>
                  {state === "ok" && <Check size={14} className="text-white" strokeWidth={3} />}
                </span>
                <div className="flex w-full items-center justify-between gap-3 rounded-2xl bg-rose-50/70 px-4 py-2 dark:bg-white/[.05] dark:ring-1 dark:ring-white/10">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300">{time}</p>
                    <p className="truncate text-base font-bold">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">{note}</p>
                  </div>
                  <span className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${chip[state]}`}>{label[state]}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <div className={FEATURE_ROW}>
          <Feature icon={Pill} title="Biblioteca de remédios" text="Dor, estômago, pressão, diabetes, alergia e antibióticos." tone="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300" />
          <Feature icon={Timer} title="Timer da dose" text="Contagem regressiva até a próxima tomada." tone="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" />
          <Feature icon={ClipboardCheck} title="Esqueceu de confirmar?" text="Regularize doses passadas com uma confirmação." tone="bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300" />
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* 3 · Dietas: descreva a refeição e veja a análise                    */
/* ------------------------------------------------------------------ */

function Diet() {
  const macros = [
    { label: "Proteína", g: 42, pct: 27, bar: "bg-rose-500", stroke: "#f43f5e" },
    { label: "Carboidrato", g: 78, pct: 51, bar: "bg-amber-500", stroke: "#f59e0b" },
    { label: "Gordura", g: 14, pct: 22, bar: "bg-violet-500", stroke: "#8b5cf6" },
  ];
  const micros = [["Vitamina C", 82], ["Ferro", 64], ["Cálcio", 41], ["Potássio", 58]] as const;
  const C = 2 * Math.PI * 46;
  let acc = 0;
  return (
    <Page className="lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Hero photo="/images/caredigital-alimentacao.webp" pos="50% 50%" eyebrow="Alimentação e dietas" eyebrowTone="text-emerald-200"
        title="Você descreve o que comeu. O resto é calculado."
        lead="Escreva a refeição em texto natural. O NextVita reconhece os alimentos, estima calorias, macronutrientes, fibras e vitaminas e compara com o seu objetivo."
        cta="Acessar minha rotina" tone="text-emerald-800">
        <p className="rounded-2xl border border-white/25 bg-black/35 px-4 py-3 font-mono text-sm text-emerald-50 backdrop-blur">“150 g de arroz, feijão, frango e 2 ovos”</p>
      </Hero>
      <div className="grid gap-3 lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-4">
        <section className={`${CARD} flex min-h-[20rem] flex-col justify-between gap-4 p-5 lg:p-6`}>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Análise da refeição</p>
          <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,15rem)_1fr]">
            <div className="relative mx-auto aspect-square w-full max-w-[15rem]">
              <svg viewBox="0 0 120 120" aria-hidden="true" className="size-full -rotate-90">
                <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="13" className="text-muted" />
                {macros.map((m) => {
                  const len = (m.pct / 100) * C;
                  const el = <circle key={m.label} cx="60" cy="60" r="46" fill="none" stroke={m.stroke} strokeWidth="13" strokeDasharray={`${len - 2} ${C}`} strokeDashoffset={-acc} />;
                  acc += len;
                  return el;
                })}
              </svg>
              <div className="absolute inset-0 grid place-content-center text-center">
                <p className="nv-stat">612</p><p className="text-xs font-semibold text-muted-foreground">kcal no prato</p>
              </div>
            </div>
            <div className="grid gap-3">
              {macros.map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-sm font-semibold"><span>{m.label}</span><span className="tabular-nums">{m.g} g</span></div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-muted"><i className={`block h-full rounded-full ${m.bar}`} style={{ width: `${m.pct * 1.6}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between text-sm font-semibold"><span>Meta do dia</span><span className="tabular-nums text-muted-foreground">1.250 de 2.000 kcal</span></div>
            <div className="flex h-4 overflow-hidden rounded-full bg-muted" role="img" aria-label="Café 320, almoço 612 e lanche 318 kcal de uma meta de 2.000">
              <i className="h-full bg-emerald-400" style={{ width: "16%" }} /><i className="h-full bg-emerald-600" style={{ width: "30.6%" }} /><i className="h-full bg-lime-500" style={{ width: "15.9%" }} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-emerald-400" />Café · 320</span>
              <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-emerald-600" />Almoço · 612</span>
              <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-lime-500" />Lanche · 318</span>
              <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full border border-dashed border-muted-foreground" />Jantar · pendente</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 border-t border-border pt-4 sm:grid-cols-4">
            {micros.map(([name, pct]) => (
              <div key={name}>
                <div className="flex justify-between text-xs font-semibold"><span>{name}</span><span className="tabular-nums text-muted-foreground">{pct}%</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
        <div className="grid gap-3 sm:grid-cols-2">
          <Feature icon={BookOpen} title="Cardápios e receitas" text="Planos por objetivo e receitas regionais com macros calculados." tone="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" />
          <Feature icon={Utensils} title="Vitaminas e minerais" text="Vitamina C, ferro, cálcio e potássio conferidos a cada refeição." tone="bg-lime-100 dark:bg-lime-500/20 text-lime-700 dark:text-lime-300" />
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* 4 · Nutrição esportiva: metas por objetivo e desempenho             */
/* ------------------------------------------------------------------ */

function Sports() {
  const goals = ["Emagrecer", "Manter", "Ganhar peso", "Hipertrofia"];
  const tiles = [["1.920", "kcal por dia"], ["138 g", "proteína · 1,8 g/kg"], ["210 g", "carboidrato"]];
  const cards = [
    { img: "/images/show-suplementos.webp", pos: "50% 60%", title: "Treino e refeição", text: "Proteína e carboidrato se ajustam aos dias de treino." },
    { img: "/images/painel-atividade.webp", pos: "50% 45%", title: "Metas por objetivo", text: "Cada objetivo tem seus números de referência." },
    { img: "/images/painel-peso.webp", pos: "50% 40%", title: "Recuperação", text: "Acompanhe a constância da alimentação na semana." },
  ];
  return (
    <Page className="lg:grid-rows-[minmax(0,1fr)_auto]">
      <Hero photo="/images/caredigital-esporte.webp" pos="50% 40%" eyebrow="Nutrição esportiva" eyebrowTone="text-amber-200" shade="r"
        title="Alimente o treino com a meta certa para o seu objetivo."
        lead="O NextVita calcula calorias e macronutrientes para o que você quer alcançar e ajusta a rotina aos dias de treino."
        cta="Acessar meu acompanhamento" tone="text-orange-800"
        aside={
          <div className="grid w-full gap-2.5 sm:min-w-[20rem] lg:w-[min(26rem,34vw)]">
            <div className="flex flex-wrap gap-1.5">
              {goals.map((g, i) => <span key={g} className={`rounded-full px-3 py-1.5 text-xs font-bold ${i === 3 ? "bg-white text-orange-800" : "bg-white/15 text-white backdrop-blur"}`}>{g}</span>)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {tiles.map(([v, l]) => (
                <div key={l} className="rounded-2xl border border-white/20 bg-black/40 p-3 backdrop-blur">
                  <p className="nv-stat tabular-nums">{v}</p><p className="mt-0.5 text-[11px] leading-tight text-white/75">{l}</p>
                </div>
              ))}
            </div>
          </div>
        } />
      <div className={FEATURE_ROW}>
        {cards.map((c) => (
          <div key={c.title} className={`${CARD} flex overflow-hidden`}>
            <img src={c.img} alt="" aria-hidden="true" width={400} height={300} loading="lazy" decoding="async" style={{ objectPosition: c.pos }} className="w-28 shrink-0 object-cover" />
            <div className="min-w-0 p-4"><p className="font-bold leading-tight">{c.title}</p><p className="mt-1 text-xs leading-snug text-muted-foreground">{c.text}</p></div>
          </div>
        ))}
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* 5 · Suplementos: vitrine de produtos com dose e horário             */
/* ------------------------------------------------------------------ */

function Supplements() {
  // Cada cartão mostra o frasco certo: tamanho e posição do fundo calculados para centralizá-lo.
  const items = [
    { name: "Creatina", dose: "3 g", time: "08:00", img: "/images/show-suplementos.webp", size: "230% auto", pos: "72% 100%" },
    { name: "Whey protein", dose: "30 g", time: "16:00", img: "/images/show-suplementos.webp", size: "230% auto", pos: "100% 100%" },
    { name: "Pré-treino", dose: "1 scoop", time: "17:30", img: "/images/show-suplementos.webp", size: "230% auto", pos: "83% 0%" },
    { name: "Multivitamínico", dose: "1 cápsula", time: "12:00", img: "/images/painel-suplementos.webp", size: "cover", pos: "50% 50%" },
  ];
  return (
    <Page className="lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.3fr)]">
      <Hero photo="/images/show-suplementos.webp" pos="40% 60%" eyebrow="Controle de suplementação" eyebrowTone="text-violet-200"
        title="Dose, horário e timer para cada suplemento."
        lead="Programe o que você usa, marque o que já tomou e veja a próxima dose. A biblioteca traz dicas de uso e cuidados."
        cta="Programar meus suplementos" tone="text-violet-800" />
      <div className="grid gap-3 lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-4">
        <div className="grid min-h-0 gap-3 sm:grid-cols-2 sm:grid-rows-2 lg:gap-4">
          {items.map((it) => (
            <article key={it.name} className="relative isolate flex min-h-[11rem] flex-col justify-end overflow-hidden rounded-3xl bg-slate-900 text-white shadow-card">
              <div aria-hidden="true" className="absolute inset-0 -z-10 bg-no-repeat"
                style={{ backgroundImage: `url(${it.img})`, backgroundSize: it.size, backgroundPosition: it.pos }} />
              <div aria-hidden="true" className="nv-shade-b absolute inset-0 -z-10" />
              <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 font-mono text-xs font-bold backdrop-blur">{it.time}</span>
              <div className="flex items-end justify-between gap-3 p-4">
                <div className="min-w-0"><p className="text-lg font-extrabold leading-tight">{it.name}</p><p className="text-sm text-white/80">{it.dose}</p></div>
                <span className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-violet-800">Marcar dose</span>
              </div>
            </article>
          ))}
        </div>
        <section className={`${CARD} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300"><Timer size={21} /></span>
            <div><p className="font-bold leading-tight">Próxima dose: Whey protein às 16:00</p><p className="text-xs text-muted-foreground">em 1h20 · timer na tela inicial</p></div>
          </div>
          <div className="flex items-center gap-1.5" aria-label="3 de 5 doses de hoje">
            {[1, 1, 1, 0, 0].map((d, i) => <i key={i} className={`block size-3 rounded-full ${d ? "bg-violet-600" : "bg-muted"}`} />)}
            <span className="ml-1.5 text-xs font-semibold text-muted-foreground">3 de 5 hoje</span>
          </div>
        </section>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* 6 · Controle de peso: evolução, IMC e meta                          */
/* ------------------------------------------------------------------ */

function Weight() {
  const values = [82.4, 82.1, 81.9, 81.2, 81.0, 80.6, 80.3, 79.9, 79.7, 79.2];
  const imc = 26.1;
  const imcPos = ((imc - 15) / (40 - 15)) * 100;
  return (
    <Page className="lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.15fr)]">
      <Hero photo="/images/show-peso.webp" pos="60% 22%" eyebrow="Controle de peso" eyebrowTone="text-fuchsia-200"
        title="Veja a sua evolução, não só o número de hoje."
        lead="Registre o peso por data. O gráfico mostra a tendência, o IMC e quanto falta para a meta, com a data estimada de chegada."
        cta="Inserir meu peso" tone="text-fuchsia-800">
        <p className="flex items-end gap-3"><span className="nv-stat !text-[clamp(2.2rem,min(4vw,8vh),4rem)] tabular-nums">79,2<span className="ml-1 text-lg font-bold text-fuchsia-200">kg</span></span><span className="pb-1.5 text-sm text-white/80">−3,2 kg em 10 semanas</span></p>
      </Hero>
      <div className="grid gap-3 lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-4">
        <section className={`${CARD} flex min-h-[18rem] flex-col p-5 lg:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">Evolução do peso</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-100 dark:bg-fuchsia-500/20 px-2.5 py-1 text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300"><TrendingDown size={13} /> −0,35 kg por semana</span>
          </div>
          <div className="mt-3 min-h-0 flex-1"><AreaChart values={values} min={78} max={83} color="#c026d3" id="area-peso" /></div>
          <div className="mt-2 flex justify-between text-[11px] font-semibold text-muted-foreground"><span>há 10 semanas</span><span>5 sem.</span><span>hoje</span></div>
        </section>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className={`${CARD} p-4`}>
            <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground"><Scale size={14} className="text-fuchsia-600" /> IMC</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums">26,1 <span className="text-xs font-semibold text-amber-600">sobrepeso</span></p>
            <div className="relative mt-2 h-2 rounded-full bg-gradient-to-r from-sky-400 via-emerald-500 via-40% to-red-600">
              <i className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-amber-500 shadow" style={{ left: `${imcPos}%` }} />
            </div>
          </div>
          <div className={`${CARD} p-4`}>
            <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground"><Target size={14} className="text-violet-600" /> Meta de 75 kg</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums">4,2 kg <span className="text-xs font-semibold text-muted-foreground">faltam</span></p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full w-[57%] rounded-full bg-violet-500" /></div>
          </div>
          <div className={`${CARD} p-4`}>
            <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground"><TrendingUp size={14} className="text-emerald-600" /> Previsão</p>
            <p className="mt-1 text-xl font-extrabold">12 semanas</p>
            <p className="mt-1 text-xs text-muted-foreground">no ritmo atual, meta em fevereiro</p>
          </div>
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* 7 · Sono: nota da noite e estágios                                  */
/* ------------------------------------------------------------------ */

function Sleep() {
  // Sequência da noite, em % da duração: A acordado, R REM, L leve, P profundo.
  const night: ["A" | "R" | "L" | "P", number][] = [["A", 3], ["L", 8], ["P", 12], ["L", 6], ["R", 8], ["L", 7], ["P", 10], ["L", 6], ["R", 10], ["A", 2], ["L", 7], ["R", 9], ["L", 12]];
  const rows = { A: 0, R: 1, L: 2, P: 3 } as const;
  const color = { A: "bg-amber-400", R: "bg-violet-400", L: "bg-sky-400", P: "bg-indigo-500" } as const;
  const names = ["Acordado", "REM", "Sono leve", "Profundo"];
  let at = 0;
  const blocks = night.map(([stage, width]) => { const b = { stage, left: at, width }; at += width; return b; });
  return (
    <Page className="lg:grid-rows-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Hero photo="/images/show-sono.webp" pos="50% 38%" eyebrow="Monitoramento do sono" eyebrowTone="text-indigo-200" shade="r"
        title="Descanse melhor com dados de verdade."
        lead="Registre a noite, veja a nota de 0 a 100 e acompanhe a regularidade. Com um sensor Bluetooth, os batimentos aparecem ao vivo."
        cta="Monitorar meu sono" tone="text-indigo-900"
        aside={
          <div className="grid w-full gap-2.5 sm:min-w-[19rem] lg:w-[min(22rem,30vw)]">
            <div className="flex items-center gap-4 rounded-3xl border border-white/20 bg-black/40 p-4 backdrop-blur">
              <div className="relative grid size-24 shrink-0 place-items-center">
                <svg viewBox="0 0 120 120" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="12" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#818cf8" strokeWidth="12" strokeLinecap="round" strokeDasharray="314" strokeDashoffset="56" />
                </svg>
                <b className="text-3xl">82</b>
              </div>
              <div><p className="font-bold leading-tight">Nota da última noite</p><p className="mt-0.5 text-xs text-white/75">7h20 de sono, 1 despertar</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-black/40 px-4 py-3 backdrop-blur">
              <HeartPulse className="shrink-0 text-rose-300" size={22} /><b className="text-2xl tabular-nums">54</b><span className="text-xs text-white/75">bpm ao vivo, com cinta ou relógio</span>
            </div>
          </div>
        } />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] lg:gap-4">
        <section className="flex min-h-[15rem] flex-col rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-5 text-white shadow-card lg:p-6">
          <div className="flex items-center justify-between"><p className="font-bold">Estágios da noite</p><span className="font-mono text-xs text-indigo-200">23:10 → 06:30</span></div>
          <div className="mt-3 grid min-h-0 flex-1 grid-cols-[4.5rem_1fr] gap-x-3">
            <div className="grid grid-rows-4 text-[11px] font-semibold text-indigo-200">{names.map((n) => <span key={n} className="flex items-center">{n}</span>)}</div>
            <div className="relative grid grid-rows-4 gap-1">
              {names.map((n) => <div key={n} className="rounded-md bg-white/5" />)}
              {blocks.map((b, i) => (
                <i key={i} className={`absolute rounded-md ${color[b.stage]}`} style={{ left: `${b.left}%`, width: `calc(${b.width}% - 2px)`, top: `calc(${rows[b.stage] * 25}% + 2px)`, height: "calc(25% - 4px)" }} />
              ))}
            </div>
          </div>
        </section>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:grid-rows-3 lg:gap-4">
          {([[Moon, "Duração", "7h20", "meta de 8 horas", "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"], [BedDouble, "Regularidade", "±18 min", "no horário de dormir", "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300"], [Waves, "Despertares", "1", "na última noite", "bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300"]] as [LucideIcon, string, string, string, string][]).map(([Icon, label, value, note, tone]) => (
            <div key={label} className={`${CARD} flex items-center gap-4 p-4`}>
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tone}`}><Icon size={21} /></span>
              <div className="min-w-0 flex-1"><p className="font-bold leading-tight">{label}</p><p className="text-xs text-muted-foreground">{note}</p></div>
              <p className="nv-stat tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* 8 · Treinos: mapa da rota com GPS                                   */
/* ------------------------------------------------------------------ */

function Training() {
  const route = "M12 82 C 38 56, 52 94, 78 66 S 116 18, 130 48 S 146 72, 150 28";
  return (
    <Page className="lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.25fr)]">
      <Hero photo="/images/painel-atividade.webp" pos="50% 45%" eyebrow="Treinos e corridas" eyebrowTone="text-emerald-300"
        title="Cada passo registrado pelo GPS do seu aparelho."
        lead="Veja o percurso sendo desenhado em tempo real, com velocidade, ritmo e tempo por quilômetro. Um corredor animado acompanha o seu ritmo."
        cta="Registrar um treino" tone="text-slate-900" />
      <div className="grid gap-3 lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-4">
        <section className="relative isolate flex min-h-[20rem] flex-col overflow-hidden rounded-3xl bg-slate-950 text-white shadow-card">
          <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.055) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
          <div className="flex flex-wrap items-start gap-3 p-4 lg:p-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold backdrop-blur"><MapPin size={13} className="text-emerald-300" /> GPS ao vivo</span>
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
              {[["24:38", "tempo"], ["4,12 km", "distância"], ["5:58", "min/km"], ["10,1", "km/h"]].map(([v, l]) => (
                <div key={l} className="rounded-2xl border border-white/15 bg-black/50 p-3 backdrop-blur"><p className="nv-stat tabular-nums">{v}</p><p className="text-[11px] text-white/70">{l}</p></div>
              ))}
            </div>
          </div>
          <div className="relative min-h-[12rem] flex-1">
            <div className="absolute inset-0 px-4 pb-4 lg:px-5 lg:pb-5">
            <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Rota de uma corrida no mapa" className="size-full">
              <defs><linearGradient id="trk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#38bdf8" /></linearGradient></defs>
              <ellipse cx="30" cy="80" rx="30" ry="15" fill="rgba(16,185,129,.13)" />
              <ellipse cx="132" cy="26" rx="26" ry="15" fill="rgba(56,189,248,.13)" />
              <path d={route} fill="none" stroke="rgba(0,0,0,.6)" strokeWidth="5.5" strokeLinecap="round" />
              <path d={route} fill="none" stroke="url(#trk)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="82" r="3" fill="#fff" stroke="#34d399" strokeWidth="1.4" />
              <circle cx="150" cy="28" r="3.2" fill="#0ea5e9" stroke="#fff" strokeWidth="1.4" />
              <circle cx="150" cy="28" r="3.2" fill="none" stroke="#38bdf8" strokeWidth="1">
                <animate attributeName="r" values="3.2;9;3.2" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values=".9;0;.9" dur="1.8s" repeatCount="indefinite" />
              </circle>
            </svg>
            </div>
          </div>
        </section>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
          {([[Activity, "Corrida"], [Waves, "Natação"], [Bike, "Ciclismo"], [Dumbbell, "Musculação"], [Zap, "Caminhada"]] as [LucideIcon, string][]).map(([Icon, t]) => (
            <div key={t} className={`${CARD} flex items-center gap-2 px-3 py-3`}><Icon size={18} className="shrink-0 text-emerald-600" /><span className="whitespace-nowrap text-sm font-bold">{t}</span></div>
          ))}
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* 9 · Métricas: indicadores e gráfico da semana                       */
/* ------------------------------------------------------------------ */

function Metrics() {
  const kpis = [
    { v: "2.050", l: "kcal por dia", c: "text-orange-600", bar: "bg-orange-500", spark: [40, 60, 52, 74, 66, 82, 70] },
    { v: "2,0 L", l: "água por dia", c: "text-sky-600", bar: "bg-sky-500", spark: [50, 44, 66, 58, 72, 64, 80] },
    { v: "148 min", l: "de treino", c: "text-emerald-600", bar: "bg-emerald-500", spark: [30, 70, 20, 80, 60, 90, 45] },
    { v: "7h20", l: "sono médio", c: "text-indigo-600", bar: "bg-indigo-500", spark: [64, 70, 58, 76, 72, 68, 78] },
  ];
  const week = [60, 82, 48, 90, 70, 95, 64];
  const days = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
  return (
    <Page className="lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.3fr)]">
      <Hero photo="/images/show-metricas.webp" pos="50% 55%" eyebrow="Métricas e gráficos" eyebrowTone="text-cyan-200"
        title="Todos os seus números de saúde em um único painel."
        lead="Calorias, proteína, água, peso, treino e sono lado a lado, com metas e tendências. Toque em um dia para ver os detalhes."
        cta="Ver minhas métricas" tone="text-indigo-900" />
      <div className="grid gap-3 lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.l} className={`${CARD} flex flex-col gap-2 p-4`}>
              <div><p className={`nv-stat tabular-nums ${k.c}`}>{k.v}</p><p className="text-xs text-muted-foreground">{k.l}</p></div>
              <div className="flex h-8 items-end gap-1">{k.spark.map((h, i) => <i key={i} className={`flex-1 rounded-sm ${k.bar} ${i === k.spark.length - 1 ? "" : "opacity-35"}`} style={{ height: `${h}%` }} />)}</div>
            </div>
          ))}
        </div>
        <section className={`${CARD} flex min-h-[16rem] flex-col p-5 lg:p-6`}>
          <div className="flex items-center justify-between gap-2"><p className="font-bold">Calorias da semana</p><span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300"><Flame size={13} /> meta 2.000 kcal</span></div>
          <div className="relative mt-4 min-h-0 flex-1">
            <div className="absolute inset-x-0 border-t-2 border-dashed border-orange-400/70" style={{ top: "26%" }} />
            <div className="absolute inset-0 flex items-end gap-2 sm:gap-3">
              {week.map((h, i) => <div key={i} className="flex h-full flex-1 items-end justify-center"><i className="block w-full max-w-[5rem] rounded-t-xl bg-gradient-to-t from-indigo-600 to-cyan-400" style={{ height: `${h}%` }} /></div>)}
            </div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
              <polyline points={week.map((h, i) => `${((i + 0.5) / week.length) * 100},${100 - h}`).join(" ")} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div className="mt-2 flex gap-2 sm:gap-3">{days.map((d) => <span key={d} className="flex-1 text-center text-[11px] font-semibold text-muted-foreground">{d}</span>)}</div>
        </section>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* 10 · Como funciona: jornada em quatro passos                        */
/* ------------------------------------------------------------------ */

function Journey() {
  const steps = [
    { n: "1", img: "/images/painel-visao.webp", pos: "50% 22%", t: "Vinculação", d: "Seu perfil e o acesso ao acompanhamento." },
    { n: "2", img: "/images/painel-agenda.webp", pos: "30% 50%", t: "Programação", d: "Medicamentos, água, refeições e treinos nos horários certos." },
    { n: "3", img: "/images/caredigital-historico.webp", pos: "50% 40%", t: "Confirmação", d: "Você confirma o que fez, no momento em que fez." },
    { n: "4", img: "/images/show-metricas.webp", pos: "50% 55%", t: "Histórico", d: "Tudo guardado com data e hora reais." },
  ];
  const agenda: [string, string, boolean][] = [["08:00", "Losartana", true], ["10:30", "Água · 250 ml", true], ["12:30", "Almoço", false], ["21:00", "Magnésio", false]];
  return (
    <Page className="lg:grid-rows-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Hero photo="/images/caredigital-care-hero.webp" pos="70% 28%" eyebrow="Como funciona" eyebrowTone="text-emerald-200" shade="r"
        title="Da programação ao histórico, em quatro passos."
        lead="O NextVita organiza a sua rotina de cuidado e guarda cada confirmação com data e hora reais."
        cta="Acessar meu acompanhamento" tone="text-emerald-800"
        aside={
          <div className="w-full rounded-3xl border border-white/20 bg-black/40 p-4 backdrop-blur sm:min-w-[19rem] lg:w-[min(21rem,28vw)]">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-200"><CalendarClock size={13} /> Sua agenda de hoje</p>
            <ul className="mt-2.5 grid gap-1.5">
              {agenda.map(([t, n, ok]) => (
                <li key={t} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2">
                  <span className="font-mono text-xs font-bold text-white/70">{t}</span><span className="flex-1 text-sm font-semibold">{n}</span>
                  {ok ? <CheckCircle2 size={17} className="text-emerald-300" /> : <Gauge size={16} className="text-amber-300" />}
                </li>
              ))}
            </ul>
          </div>
        } />
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {steps.map((s) => (
          <li key={s.n} className={`${CARD} flex min-h-[14rem] flex-col overflow-hidden`}>
            <div className="relative min-h-[7rem] flex-1">
              <img src={s.img} alt="" aria-hidden="true" width={600} height={400} loading="lazy" decoding="async" style={{ objectPosition: s.pos }} className="absolute inset-0 size-full object-cover" />
              <span className="absolute left-3 top-3 grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 text-base font-extrabold text-white shadow-lg">{s.n}</span>
            </div>
            <div className="p-4"><p className="text-lg font-extrabold leading-tight">{s.t}</p><p className="mt-1 text-sm leading-snug text-muted-foreground">{s.d}</p></div>
          </li>
        ))}
      </ol>
    </Page>
  );
}

const pages: Record<ShowcaseKind, () => ReactElement> = {
  hydration: Hydration, medication: Medication, diet: Diet, sports: Sports, supplements: Supplements,
  weight: Weight, sleep: Sleep, training: Training, metrics: Metrics, protocols: Journey,
};

/** Cada área tem a sua própria composição: nada de um modelo único repetido. */
export function AreaShowcase({ kind }: { kind: ShowcaseKind }) {
  const View = pages[kind];
  return <View />;
}
