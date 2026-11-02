import { Link } from "@tanstack/react-router";
import {
  ArrowRight, CalendarClock, CheckCircle2, ClipboardCheck,
  Droplets, Dumbbell, HeartPulse, LockKeyhole, Pill, ShieldCheck, UserRoundCheck,
} from "lucide-react";
import { SportsNutritionIllustration } from "./SportsNutritionIllustration";

/** Explanatory-only public showcase: never read or mutate a patient's health records here. */
type ShowcaseKind = "hydration" | "medication" | "sports";

const copy = {
  hydration: {
    eyebrow: "CareDigital · Hidratação",
    title: "Hidratação com acompanhamento",
    lead: "Um jeito claro de acompanhar a água ao longo do dia.",
    description: "Metas orientativas, lembretes e copos ilustrados fazem parte da rotina individual. O paciente registra cada consumo na própria área protegida.",
    cta: "Acessar minha hidratação",
    benefits: [
      { icon: UserRoundCheck, title: "Meta personalizada", text: "O perfil e a orientação profissional ajudam a definir o acompanhamento." },
      { icon: CalendarClock, title: "Lembretes por horário", text: "Copos e etapas do dia organizados de maneira visual." },
      { icon: ClipboardCheck, title: "Confirmação de consumo", text: "O paciente informa se bebeu e consulta seus registros." },
    ],
    steps: [
      { name: "Perfil", detail: "Informações pessoais" },
      { name: "Meta", detail: "Quantidade orientativa" },
      { name: "Lembretes", detail: "Horários do dia" },
      { name: "Registro", detail: "Histórico individual" },
    ],
    privacy: "Metas, volumes e horários pessoais são exibidos somente na área autorizada do cliente.",
  },
  sports: {
    eyebrow: "CareDigital · Nutrição esportiva",
    title: "Nutrição esportiva e rotina",
    lead: "Alimentação, treino e acompanhamento com clareza.",
    description: "Esta página apresenta como orientações alimentares e horários podem compor uma rotina de cuidados. Objetivos, necessidades e ajustes devem ser avaliados individualmente por profissional habilitado.",
    cta: "Acessar meu acompanhamento",
    benefits: [
      { icon: UserRoundCheck, title: "Objetivos individuais", text: "O planejamento considera o contexto e as necessidades de cada pessoa." },
      { icon: CalendarClock, title: "Refeições e rotina", text: "Horários organizados ajudam a acompanhar a alimentação do dia." },
      { icon: ClipboardCheck, title: "Revisão e evolução", text: "Registros apoiam conversas com a equipe responsável pelo cuidado." },
    ],
    steps: [
      { name: "Objetivo", detail: "Contexto individual" },
      { name: "Orientação", detail: "Plano profissional" },
      { name: "Rotina", detail: "Refeições e horários" },
      { name: "Acompanhamento", detail: "Revisão individual" },
    ],
    privacy: "Planos alimentares, objetivos e dados de pacientes não são apresentados nesta página pública. Suplementos não substituem alimentação nem orientação profissional.",
  },
  medication: {
    eyebrow: "CareDigital · Medicamentos",
    title: "Medicação com rotina organizada",
    lead: "Horários claros, alertas e registros em um só lugar.",
    description: "O CareDigital reúne as doses programadas para cada cliente, facilita a confirmação da tomada e mantém o histórico vinculado ao prontuário.",
    cta: "Acessar minhas medicações",
    benefits: [
      { icon: UserRoundCheck, title: "Tratamento individual", text: "Cada cliente acessa apenas sua própria rotina de medicamentos." },
      { icon: CalendarClock, title: "Horários e alertas", text: "Os lembretes ajudam a acompanhar doses programadas." },
      { icon: ClipboardCheck, title: "Registro verificável", text: "A confirmação fica associada à data e à hora do sistema." },
    ],
    steps: [
      { name: "Prescrição", detail: "Orientação profissional" },
      { name: "Agenda", detail: "Doses e horários" },
      { name: "Confirmação", detail: "Tomada registrada" },
      { name: "Histórico", detail: "Prontuário privado" },
    ],
    privacy: "Nomes, dosagens, tratamentos e horários reais não são exibidos nesta apresentação pública.",
  },
} as const;

function HydrationSvg() {
  return <svg role="img" aria-labelledby="public-water-title public-water-desc"
    viewBox="0 0 520 240" xmlns="http://www.w3.org/2000/svg" fill="none"
    className="block h-[166px] w-full max-w-[390px] sm:h-[180px] lg:h-[194px]">
    <title id="public-water-title">Água e registro de hidratação</title>
    <desc id="public-water-desc">Ilustração vetorial com uma garrafa, uma lista de horários e copos confirmados.</desc>
    <defs>
      <linearGradient id="public-water-gradient" x1="205" y1="82" x2="205" y2="203" gradientUnits="userSpaceOnUse"><stop stopColor="#66D8E7"/><stop offset="1" stopColor="#168DB2"/></linearGradient>
    </defs>
    <ellipse cx="263" cy="119" rx="192" ry="109" fill="#9BE0DF" fillOpacity=".21"/>
    <rect x="93" y="17" width="332" height="210" rx="23" fill="#F7FCFF" stroke="#B7D8E0" strokeWidth="2.5"/>
    <path d="M93 41q0-24 24-24h284q24 0 24 24v26H93V41Z" fill="#20475B"/>
    <rect x="115" y="35" width="91" height="10" rx="5" fill="#D0F6F9"/>
    <rect x="214" y="37" width="48" height="6" rx="3" fill="#8BBECA"/>
    <rect x="116" y="80" width="139" height="128" rx="15" fill="#E7F5F8"/>
    <rect x="160" y="89" width="47" height="13" rx="6" fill="#B8DBE3"/>
    <rect x="144" y="103" width="81" height="93" rx="18" fill="#FFFFFF" stroke="#7FC7D3" strokeWidth="3"/>
    <path d="M150 147q32-8 69 0v32a12 12 0 0 1-12 12h-45a12 12 0 0 1-12-12Z" fill="url(#public-water-gradient)"/>
    <path d="M185 116c7 11 12 16 12 24a12 12 0 1 1-24 0c0-8 5-13 12-24Z" fill="#82DCE9"/>
    <rect x="270" y="80" width="132" height="128" rx="15" fill="#FFFFFF" stroke="#D2E9EF"/>
    <rect x="286" y="95" width="82" height="9" rx="4.5" fill="#9BBBC7"/>
    <rect x="285" y="114" width="101" height="23" rx="8" fill="#E9F6F8"/>
    <circle cx="300" cy="125" r="6" fill="#62BBD2"/>
    <rect x="315" y="122" width="57" height="6" rx="3" fill="#9DC4CE"/>
    <rect x="285" y="144" width="101" height="23" rx="8" fill="#E9F6F8"/>
    <circle cx="300" cy="155" r="6" fill="#62BBD2"/>
    <rect x="315" y="152" width="57" height="6" rx="3" fill="#9DC4CE"/>
    <rect x="285" y="174" width="101" height="23" rx="8" fill="#D8F4E6"/>
    <path d="m295 185 5 5 9-11" stroke="#268D6C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="315" y="182" width="57" height="6" rx="3" fill="#8BCFB5"/>
    <rect x="36" y="114" width="101" height="66" rx="18" fill="#FFFFFF" stroke="#B8DCE4" strokeWidth="2"/>
    <circle cx="63" cy="145" r="17" fill="#D9F5FA"/>
    <path d="M63 132c6 10 9 13 9 20a9 9 0 1 1-18 0c0-7 3-10 9-20Z" fill="#35B0D3"/>
    <rect x="86" y="138" width="34" height="7" rx="3.5" fill="#9BC5D0"/>
    <rect x="86" y="151" width="24" height="6" rx="3" fill="#CEE3E8"/>
    <rect x="384" y="167" width="98" height="56" rx="17" fill="#FFFFFF" stroke="#B8DCE4" strokeWidth="2"/>
    <circle cx="411" cy="195" r="16" fill="#D7F5E8"/>
    <path d="m402 195 6 6 13-15" stroke="#248F6A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="436" y="189" width="31" height="7" rx="3.5" fill="#9ABEC9"/>
  </svg>;
}

function MedicationSvg() {
  return <svg role="img" aria-labelledby="public-meds-title public-meds-desc"
    viewBox="0 0 520 240" xmlns="http://www.w3.org/2000/svg" fill="none"
    className="block h-[166px] w-full max-w-[390px] sm:h-[180px] lg:h-[194px]">
    <title id="public-meds-title">Agenda visual de medicamentos</title>
    <desc id="public-meds-desc">Ilustração com cartela de comprimidos, horários e confirmação segura.</desc>
    <defs>
      <linearGradient id="public-meds-gradient" x1="145" y1="35" x2="383" y2="220" gradientUnits="userSpaceOnUse"><stop stopColor="#D9F9FA"/><stop offset="1" stopColor="#EAF1FF"/></linearGradient>
    </defs>
    <ellipse cx="262" cy="121" rx="193" ry="108" fill="#8DDDD6" fillOpacity=".19"/>
    <rect x="92" y="18" width="335" height="207" rx="24" fill="#F7FCFF" stroke="#BCDCE2" strokeWidth="2.5"/>
    <path d="M92 42q0-24 24-24h287q24 0 24 24v26H92V42Z" fill="#1E475C"/>
    <rect x="114" y="34" width="91" height="10" rx="5" fill="#D8F9F9"/>
    <rect x="114" y="50" width="61" height="5" rx="2.5" fill="#8AC8D5"/>
    <circle cx="395" cy="43" r="12" fill="#6CD5C5"/><path d="m389 43 5 5 8-10" stroke="#164B54" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="114" y="84" width="134" height="122" rx="17" fill="url(#public-meds-gradient)" stroke="#C9E3E8"/>
    <g stroke="#A7CDD6" strokeWidth="2">
      <rect x="131" y="98" width="99" height="22" rx="11" fill="#FFFFFF"/>
      <rect x="131" y="127" width="99" height="22" rx="11" fill="#FFFFFF"/>
      <rect x="131" y="156" width="99" height="22" rx="11" fill="#FFFFFF"/>
      <rect x="131" y="185" width="99" height="12" rx="6" fill="#D6F5E9"/>
    </g>
    <path d="M131 109a11 11 0 0 1 11-11h38v22h-38a11 11 0 0 1-11-11Z" fill="#49B7D5"/>
    <path d="M131 138a11 11 0 0 1 11-11h38v22h-38a11 11 0 0 1-11-11Z" fill="#59C9C0"/>
    <path d="M131 167a11 11 0 0 1 11-11h38v22h-38a11 11 0 0 1-11-11Z" fill="#54B8D7"/>
    <circle cx="216" cy="109" r="9" fill="#D5F5E5"/><path d="m212 109 3 3 5-6" stroke="#258D6B" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="216" cy="138" r="9" fill="#D5F5E5"/><path d="m212 138 3 3 5-6" stroke="#258D6B" strokeWidth="2" strokeLinecap="round"/>
    <rect x="263" y="84" width="141" height="122" rx="17" fill="#FFFFFF" stroke="#D2E7EB"/>
    <rect x="279" y="99" width="90" height="10" rx="5" fill="#9DBEC8"/>
    <rect x="279" y="119" width="106" height="23" rx="9" fill="#E9F5F8"/>
    <circle cx="292" cy="130.5" r="6" fill="#6CC1CF"/><rect x="306" y="127" width="62" height="6" rx="3" fill="#A3C7D0"/>
    <rect x="279" y="149" width="106" height="23" rx="9" fill="#E9F5F8"/>
    <circle cx="292" cy="160.5" r="6" fill="#6CC1CF"/><rect x="306" y="157" width="62" height="6" rx="3" fill="#A3C7D0"/>
    <rect x="279" y="179" width="106" height="17" rx="8.5" fill="#D9F5E5"/>
    <path d="m287 187 4 4 7-8" stroke="#208D6C" strokeWidth="3" strokeLinecap="round"/>
    <rect x="306" y="185" width="62" height="5" rx="2.5" fill="#8FCCB5"/>
    <rect x="36" y="119" width="101" height="62" rx="18" fill="#FFFFFF" stroke="#B8DBE3" strokeWidth="2"/>
    <rect x="52" y="141" width="66" height="18" rx="9" fill="#DCF5F5" stroke="#6FBEBE"/>
    <path d="M85 141v18" stroke="#6FBEBE" strokeWidth="2"/>
    <rect x="391" y="169" width="95" height="54" rx="17" fill="#FFFFFF" stroke="#B8DBE3" strokeWidth="2"/>
    <circle cx="418" cy="195" r="16" fill="#D4F4E7"/><path d="m409 195 6 6 13-15" stroke="#258F69" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="442" y="189" width="29" height="7" rx="3.5" fill="#9CC4CB"/>
  </svg>;
}

export function PublicCareShowcase({kind}:{kind:ShowcaseKind}) {
  const info=copy[kind];
  const MainIcon=kind==="hydration"?Droplets:kind==="sports"?Dumbbell:Pill;
  return <div className="mx-auto flex min-h-full w-full max-w-[1080px] flex-col justify-start py-1.5 lg:justify-center" aria-label={"Demonstração pública — "+info.title}>
    <section className="flex w-full shrink-0 flex-col gap-2.5 rounded-3xl border border-border bg-card/95 p-3 shadow-[0_14px_42px_-28px_rgba(26,65,81,.4)] sm:p-4 lg:gap-3">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><MainIcon size={19}/></span>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">{info.eyebrow}</p><h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">{info.title}</h1></div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[10px] font-semibold text-primary"><ShieldCheck size={13}/> Área demonstrativa</span>
      </header>

      <div className="grid shrink-0 items-center gap-3 rounded-2xl border border-border/70 bg-muted/35 px-3 py-2.5 sm:px-4 md:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-primary">Acompanhamento com privacidade</p>
          <h2 className="mt-1 max-w-[22ch] text-balance text-xl font-extrabold leading-tight text-foreground sm:text-2xl">{info.lead}</h2>
          <p className="mt-2 max-w-[56ch] text-xs leading-relaxed text-muted-foreground sm:text-sm">{info.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link to="/cliente" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"><LockKeyhole size={14}/>{info.cta}<ArrowRight size={14}/></Link>
            <Link to="/entrar" className="inline-flex min-h-9 items-center rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">Entrar na conta</Link>
          </div>
        </div>
        <div className="flex min-w-0 items-center justify-center overflow-hidden">
          {kind==="hydration"?<HydrationSvg/>:kind==="sports"?<SportsNutritionIllustration/>:<MedicationSvg/>}
        </div>
      </div>

      <div className="grid shrink-0 gap-2 sm:grid-cols-3" aria-label="Recursos explicativos">
        {info.benefits.map(({icon:Icon,title,text})=><article key={title} className="flex min-w-0 items-start gap-2.5 rounded-xl border border-border bg-background/70 p-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={18}/></span>
          <div className="min-w-0"><h3 className="text-xs font-bold text-foreground sm:text-sm">{title}</h3><p className="mt-1 text-[11px] leading-snug text-muted-foreground">{text}</p></div>
        </article>)}
      </div>

      <div className="shrink-0 rounded-xl border border-border bg-muted/35 px-3 py-2.5" aria-label="Fluxo demonstrativo">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2"><h3 className="inline-flex items-center gap-1.5 text-xs font-extrabold text-foreground"><HeartPulse size={15} className="text-primary"/> Como funciona</h3><span className="text-[10px] text-muted-foreground">Exemplo visual, sem informações pessoais</span></div>
        <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {info.steps.map((step,index)=><li key={step.name} className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-extrabold text-primary">{String(index+1).padStart(2,"0")}</span>
            <span className="min-w-0 flex-1"><strong className="block text-xs leading-tight text-foreground">{step.name}</strong><span className="block text-[10px] text-muted-foreground">{step.detail}</span></span>
          </li>)}
        </ol>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-2 text-foreground"><CheckCircle2 size={16} className="shrink-0 text-primary"/>{info.privacy}</span>
        <Link to="/cliente" className="inline-flex items-center gap-1 whitespace-nowrap font-bold text-primary hover:underline">Minha área <ArrowRight size={14}/></Link>
      </footer>
    </section>
  </div>;
}
