import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, CalendarClock, CheckCircle2, ClipboardList,
  HeartPulse, LockKeyhole, ShieldCheck, Utensils, UserRoundCheck,
} from "lucide-react";

export const Route = createFileRoute("/dietas")({
  head: () => ({
    meta: [
      { title: "Alimentação e rotinas — CareDigital" },
      { name: "description", content: "Entenda como o CareDigital apresenta refeições, lembretes e acompanhamento alimentar individual em um ambiente protegido." },
      { property: "og:title", content: "Alimentação e rotinas — CareDigital" },
      { property: "og:description", content: "Uma visão explicativa e demonstrativa do acompanhamento alimentar personalizado." },
    ],
  }),
  component: Dietas,
});

const topics = [
  {
    icon: UserRoundCheck,
    title: "Plano individual",
    text: "A alimentação é orientada conforme a rotina e as necessidades do cliente.",
  },
  {
    icon: CalendarClock,
    title: "Horários organizados",
    text: "Refeições e lembretes aparecem na agenda pessoal, na sequência do dia.",
  },
  {
    icon: ClipboardList,
    title: "Acompanhamento simples",
    text: "O cliente consulta o planejado e registra as ações realizadas.",
  },
] as const;

const steps = [
  { label:"Orientação", detail:"Definição individual" },
  { label:"Agenda", detail:"Horários de refeição" },
  { label:"Registro", detail:"Confirmações do cliente" },
  { label:"Histórico", detail:"Acompanhamento privado" },
] as const;

function FoodIllustration() {
  return <svg viewBox="0 0 570 278" role="img" aria-labelledby="food-svg-title food-svg-description"
    xmlns="http://www.w3.org/2000/svg" className="mx-auto block h-[170px] w-full max-w-[410px] object-contain sm:h-[195px] lg:h-[205px]" fill="none">
    <title id="food-svg-title">Alimentação e rotina saudável</title>
    <desc id="food-svg-description">Prato ilustrativo com legumes, vegetais e alimentos, acompanhado de um calendário e confirmação.</desc>
    <defs>
      <linearGradient id="nutrition-plate" x1="186" y1="49" x2="419" y2="235" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFFFFF"/><stop offset="1" stopColor="#E7F8F7"/>
      </linearGradient>
      <linearGradient id="nutrition-leaf" x1="192" y1="56" x2="395" y2="232" gradientUnits="userSpaceOnUse">
        <stop stopColor="#90D8A3"/><stop offset="1" stopColor="#3A9B7A"/>
      </linearGradient>
    </defs>
    <circle cx="300" cy="140" r="125" fill="#C4F0ED" fillOpacity=".39"/>
    <circle cx="64" cy="211" r="41" fill="#B7E3EF" fillOpacity=".35"/>
    <circle cx="506" cy="48" r="33" fill="#AFE4DC" fillOpacity=".33"/>
    <circle cx="296" cy="146" r="115" fill="#FFFFFF" stroke="#B4DCE2" strokeWidth="4"/>
    <circle cx="296" cy="146" r="96" fill="url(#nutrition-plate)" stroke="#DAEDEE" strokeWidth="3"/>
    <path d="M296 146 210 102a95 95 0 0 1 180-20Z" fill="#BAE6B4"/>
    <path d="M296 146 390 82a96 96 0 0 1-40 143Z" fill="#F7D7A2"/>
    <path d="M296 146 350 225a94 94 0 0 1-140-123Z" fill="#F6EEE0"/>
    <path d="M296 146 210 102M296 146 390 82M296 146 350 225" stroke="#FFF" strokeWidth="7" strokeLinecap="round"/>
    <ellipse cx="264" cy="91" rx="19" ry="10" fill="#4C9E72" transform="rotate(-28 264 91)"/>
    <ellipse cx="292" cy="99" rx="23" ry="12" fill="#63B787" transform="rotate(30 292 99)"/>
    <ellipse cx="318" cy="78" rx="20" ry="11" fill="url(#nutrition-leaf)" transform="rotate(-35 318 78)"/>
    <path d="M271 114c19-15 39-24 52-40" stroke="#2C805F" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="359" cy="121" r="21" fill="#ED9B73"/><circle cx="359" cy="121" r="12" fill="#F4B690"/>
    <circle cx="332" cy="169" r="19" fill="#E7C871"/><circle cx="378" cy="173" r="17" fill="#D6B45F"/>
    <path d="M231 164c14-27 40-27 56-6 15 24 2 48-22 53-31 7-47-19-34-47Z" fill="#DABF83"/>
    <path d="M234 170c17-20 34-19 45-4" stroke="#F8EBD2" strokeWidth="7" strokeLinecap="round"/>
    <g>
      <rect x="75" y="73" width="133" height="93" rx="20" fill="#FFFFFF" stroke="#BBDCE1" strokeWidth="3"/>
      <path d="M75 91q0-18 18-18h97q18 0 18 18v21H75Z" fill="#22798D"/>
      <path d="M104 65v20M178 65v20" stroke="#4DC9BC" strokeWidth="7" strokeLinecap="round"/>
      <path d="m108 138 13 12 24-27" stroke="#289D7B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="151" y="126" width="38" height="8" rx="4" fill="#A7CED3"/>
      <rect x="151" y="142" width="29" height="7" rx="3.5" fill="#D0E4E7"/>
    </g>
    <g>
      <rect x="399" y="162" width="130" height="81" rx="21" fill="#FFFFFF" stroke="#BBDCE1" strokeWidth="3"/>
      <circle cx="435" cy="201" r="21" fill="#D9F4E7"/>
      <path d="m424 201 8 8 14-17" stroke="#1E9978" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="464" y="189" width="48" height="8" rx="4" fill="#98BFC9"/>
      <rect x="464" y="204" width="38" height="7" rx="3.5" fill="#D0E4E7"/>
    </g>
    <path d="M448 68c18-15 36-12 51 4" stroke="#80CDC7" strokeWidth="3" strokeLinecap="round" strokeDasharray="7 10"/>
  </svg>;
}

function Dietas() {
  return <div className="mx-auto flex min-h-full w-full max-w-[1120px] flex-col justify-start py-2 lg:justify-center" aria-label="Página demonstrativa de alimentação">
    <div className="flex w-full shrink-0 flex-col gap-2.5 rounded-3xl border border-border bg-card/95 p-3 shadow-[0_18px_55px_-35px_rgba(17,50,70,.34)] sm:p-4 lg:gap-3 lg:p-4">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Utensils size={20}/></span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">CareDigital · Alimentação</p>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">Minha alimentação, bem organizada</h1>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] font-semibold text-primary"><ShieldCheck size={14}/> Demonstração pública</span>
      </header>

      <section className="grid shrink-0 items-center gap-3 rounded-2xl border border-border/70 bg-muted/35 px-3 py-3 sm:px-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" aria-labelledby="diet-intro-title">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Rotina alimentar individual</p>
          <h2 id="diet-intro-title" className="mt-1 max-w-[19ch] text-balance text-xl font-extrabold leading-tight text-foreground sm:text-2xl lg:text-[1.7rem]">Refeições e lembretes, no momento certo.</h2>
          <p className="mt-2 max-w-[55ch] text-xs leading-relaxed text-muted-foreground sm:text-sm">
            O CareDigital reúne os horários de alimentação definidos para cada acompanhamento. O cliente consulta sua rotina e confirma os cuidados realizados em um ambiente protegido.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Link to="/cliente" className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-foreground transition hover:opacity-90"><LockKeyhole size={15}/> Acessar minha rotina <ArrowRight size={14}/></Link>
            <Link to="/protocolos" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted">Como funcionam os cuidados</Link>
          </div>
        </div>
        <div className="flex min-w-0 items-center justify-center"><FoodIllustration/></div>
      </section>

      <section className="grid shrink-0 gap-2 sm:grid-cols-3" aria-label="Informações sobre o acompanhamento alimentar">
        {topics.map(({icon:Icon,title,text})=>(
          <article key={title} className="flex min-w-0 items-start gap-2.5 rounded-xl border border-border bg-background/65 p-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={19}/></span>
            <div className="min-w-0"><h3 className="text-xs font-bold text-foreground sm:text-sm">{title}</h3><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{text}</p></div>
          </article>
        ))}
      </section>

      <section className="shrink-0 rounded-xl border border-border bg-muted/35 px-3 py-2.5 sm:px-4" aria-labelledby="diet-steps">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 id="diet-steps" className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-foreground"><HeartPulse size={15} className="text-primary"/> Como funciona</h2>
          <span className="text-[10px] text-muted-foreground">Fluxo ilustrativo · sem dietas ou pacientes reais</span>
        </div>
        <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {steps.map((step,index)=>(
            <li key={step.label} className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-extrabold text-primary">{String(index+1).padStart(2,"0")}</span>
              <span className="min-w-0 flex-1"><strong className="block text-xs leading-tight text-foreground">{step.label}</strong><span className="block text-[10px] text-muted-foreground">{step.detail}</span></span>
              {index<steps.length-1&&<ArrowRight size={14} className="hidden shrink-0 text-primary/55 lg:block"/>}
            </li>
          ))}
        </ol>
      </section>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-2 text-foreground"><CheckCircle2 size={17} className="shrink-0 text-primary"/> Orientações e dietas individuais ficam disponíveis somente na conta vinculada ao acompanhamento.</span>
        <Link to="/cliente" className="inline-flex items-center gap-1.5 whitespace-nowrap font-bold text-primary hover:underline">Minha área <ArrowRight size={14}/></Link>
      </footer>
      <p className="sr-only">Esta página é demonstrativa. Informações nutricionais precisam ser adaptadas por profissional de saúde quando necessário.</p>
    </div>
  </div>;
}
