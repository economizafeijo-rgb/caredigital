import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, CalendarClock, ClipboardCheck, Clock3,
  HeartPulse, LockKeyhole, ShieldCheck, UserRoundCheck,
} from "lucide-react";

export const Route = createFileRoute("/protocolos")({
  head: () => ({
    meta: [
      { title: "Como funcionam os protocolos — CareDigital" },
      { name: "description", content: "Conheça como o CareDigital organiza a rotina individual de cuidados, confirmações e histórico com acesso protegido." },
    ],
  }),
  component: Protocolos,
});

const benefits = [
  {
    icon: UserRoundCheck,
    title: "Acompanhamento individual",
    description: "A agenda e as orientações são vinculadas ao prontuário de cada cliente.",
  },
  {
    icon: CalendarClock,
    title: "Rotina orientada por horários",
    description: "Medicação, refeições e hidratação organizadas em um só lugar.",
  },
  {
    icon: ClipboardCheck,
    title: "Registros verificáveis",
    description: "As confirmações ficam associadas à atividade, com data e hora do registro.",
  },
] as const;

const stages = [
  { number: "01", name: "Vinculação", caption: "Prontuário individual" },
  { number: "02", name: "Programação", caption: "Rotina e horários" },
  { number: "03", name: "Confirmação", caption: "Ação do cliente" },
  { number: "04", name: "Histórico", caption: "Acompanhamento" },
] as const;

function CareFlowIllustration() {
  return (
    <svg role="img" aria-labelledby="care-flow-title care-flow-description"
      viewBox="0 0 570 265" className="mx-auto block h-[170px] w-full max-w-[410px] object-contain sm:h-[195px] lg:h-[205px]"
      xmlns="http://www.w3.org/2000/svg" fill="none">
      <title id="care-flow-title">Rotina de cuidado digital</title>
      <desc id="care-flow-description">Ilustração demonstrativa com agenda, lembrete de medicação, hidratação e confirmação.</desc>
      <defs>
        <linearGradient id="protocol-flow-panel" x1="62" y1="8" x2="449" y2="252" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F9FEFF"/><stop offset="1" stopColor="#E6F5F5"/>
        </linearGradient>
        <linearGradient id="protocol-flow-teal" x1="160" y1="110" x2="340" y2="220" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3CBEB4"/><stop offset="1" stopColor="#147B8A"/>
        </linearGradient>
      </defs>
      <circle cx="288" cy="126" r="123" fill="#8DD7D0" fillOpacity=".18"/>
      <circle cx="84" cy="198" r="45" fill="#8CCADB" fillOpacity=".2"/>
      <circle cx="489" cy="52" r="38" fill="#B3E8E1" fillOpacity=".35"/>
      <rect x="108" y="19" width="350" height="225" rx="26" fill="url(#protocol-flow-panel)" stroke="#A9D5D9" strokeWidth="2.5"/>
      <path d="M108 45q0-26 26-26h298q26 0 26 26v26H108V45Z" fill="#214B5D"/>
      <rect x="133" y="39" width="86" height="11" rx="5.5" fill="#D9F6F5"/>
      <rect x="226" y="41" width="55" height="7" rx="3.5" fill="#8AC8CF"/>
      <circle cx="428" cy="45" r="11" fill="#67D4C4"/>
      <path d="m423 45 4 4 7-8" stroke="#0F4451" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="131" y="88" width="199" height="132" rx="16" fill="#FFFFFF" stroke="#D1E8EA"/>
      <rect x="148" y="103" width="83" height="9" rx="4.5" fill="#8FAFBA"/>
      <rect x="148" y="124" width="164" height="23" rx="9" fill="#E9F5F8"/>
      <circle cx="163" cy="135.5" r="6" fill="#69B9C6"/>
      <rect x="178" y="132" width="112" height="7" rx="3.5" fill="#A2C9D2"/>
      <rect x="148" y="155" width="164" height="23" rx="9" fill="#E9F5F8"/>
      <circle cx="163" cy="166.5" r="6" fill="#69B9C6"/>
      <rect x="178" y="163" width="112" height="7" rx="3.5" fill="#A2C9D2"/>
      <rect x="148" y="186" width="164" height="21" rx="9" fill="#DAF6EC"/>
      <path d="m157 196 4 4 7-9" stroke="#238B6D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="178" y="193" width="112" height="7" rx="3.5" fill="#9BD4BE"/>
      <rect x="343" y="88" width="91" height="132" rx="17" fill="#E3F4F5"/>
      <path d="M365 111h47v69a14 14 0 0 1-14 14h-19a14 14 0 0 1-14-14Z" fill="#FFFFFF" stroke="#72C5C8" strokeWidth="3"/>
      <path d="M369 149c12-4 28-4 39 0v30a10 10 0 0 1-10 10h-19a10 10 0 0 1-10-10Z" fill="url(#protocol-flow-teal)"/>
      <rect x="364" y="202" width="49" height="6" rx="3" fill="#9FC3CA"/>
      <rect x="34" y="108" width="119" height="73" rx="19" fill="#FFFFFF" stroke="#B8D8DE" strokeWidth="2"/>
      <rect x="51" y="127" width="62" height="25" rx="12.5" fill="#C4F0EA" stroke="#68BFB5" strokeWidth="2"/>
      <path d="M82 128v24" stroke="#68BFB5" strokeWidth="2"/>
      <path d="m121 139 7 7 13-17" stroke="#218967" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="422" y="166" width="112" height="64" rx="18" fill="#FFFFFF" stroke="#B8D8DE" strokeWidth="2"/>
      <circle cx="452" cy="199" r="17" fill="#D2F3E6"/>
      <path d="m442 199 7 7 15-17" stroke="#298968" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="476" y="192" width="39" height="7" rx="3.5" fill="#8EB8C3"/>
      <rect x="476" y="204" width="29" height="6" rx="3" fill="#C5DCE2"/>
    </svg>
  );
}

function Protocolos() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1120px] flex-col justify-start py-2 lg:justify-center" aria-label="Apresentação demonstrativa dos protocolos de cuidado">
      <div className="flex w-full shrink-0 flex-col gap-2.5 rounded-3xl border border-border bg-card/95 p-3 shadow-[0_18px_55px_-35px_rgba(17,50,70,.34)] sm:p-4 lg:gap-3 lg:p-4">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <HeartPulse size={21}/>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">CareDigital · Como funciona</p>
              <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">Protocolos de cuidado</h1>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] font-semibold text-primary"><ShieldCheck size={14}/> Área demonstrativa</span>
        </header>

        <section className="grid shrink-0 items-center gap-3 rounded-2xl border border-border/70 bg-muted/35 px-3 py-3 sm:px-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" aria-labelledby="protocols-intro">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Seu cuidado, no seu espaço</p>
            <h2 id="protocols-intro" className="mt-1 max-w-[18ch] text-balance text-xl font-extrabold leading-tight text-foreground sm:text-2xl lg:text-[1.7rem]">
              Uma rotina clara, do lembrete ao histórico.
            </h2>
            <p className="mt-2 max-w-[51ch] text-xs leading-relaxed text-muted-foreground sm:text-sm">
              O CareDigital organiza atividades e horários de acompanhamento. Cada cliente consulta suas orientações pessoais somente pelo acesso vinculado ao próprio prontuário.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Link to="/cliente" className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-foreground transition hover:opacity-90">
                <LockKeyhole size={15}/> Acessar meu acompanhamento <ArrowRight size={14}/>
              </Link>
              <Link to="/entrar" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted">
                Entrar na conta
              </Link>
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-center overflow-hidden" aria-hidden="false">
            <CareFlowIllustration/>
          </div>
        </section>

        <section className="grid shrink-0 gap-2 sm:grid-cols-3" aria-label="Recursos de acompanhamento">
          {benefits.map(({icon:Icon,title,description})=>(
            <article key={title} className="flex min-w-0 items-start gap-2.5 rounded-xl border border-border bg-background/65 p-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={19}/></span>
              <div className="min-w-0"><h3 className="text-xs font-bold text-foreground sm:text-sm">{title}</h3><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p></div>
            </article>
          ))}
        </section>

        <section className="shrink-0 rounded-xl border border-border bg-muted/35 px-3 py-2.5 sm:px-4" aria-labelledby="care-steps-title">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 id="care-steps-title" className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-foreground"><Clock3 size={15} className="text-primary"/> Jornada de acompanhamento</h2>
            <span className="text-[10px] font-medium text-muted-foreground">Exemplo ilustrativo · sem dados de pacientes</span>
          </div>
          <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {stages.map((stage,index)=>(
              <li key={stage.number} className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-extrabold text-primary">{stage.number}</span>
                <span className="min-w-0 flex-1"><strong className="block text-xs leading-tight text-foreground">{stage.name}</strong><span className="block text-[10px] text-muted-foreground">{stage.caption}</span></span>
                {index < stages.length-1 && <ArrowRight size={14} className="hidden shrink-0 text-primary/55 lg:block"/>}
              </li>
            ))}
          </ol>
        </section>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs">
          <span className="inline-flex min-w-0 items-center gap-2 text-foreground"><ShieldCheck size={17} className="shrink-0 text-primary"/> Protocolos e registros pessoais não são exibidos nesta página pública.</span>
          <Link to="/cliente" className="inline-flex items-center gap-1.5 whitespace-nowrap font-bold text-primary hover:underline">Ir para minha área <ArrowRight size={14}/></Link>
        </footer>
      </div>
    </div>
  );
}
