import { Link } from "@tanstack/react-router";
import {
  ArrowRight, BellRing, CalendarClock, Check, ClipboardCheck, ClipboardList, Droplets, Dumbbell,
  HeartPulse, LockKeyhole, Pill, ShieldCheck, UserRoundCheck, Utensils, type LucideIcon,
} from "lucide-react";

/** Apresentação pública e explicativa: nunca lê nem altera registros de saúde de um paciente. */
export type ShowcaseKind = "hydration" | "medication" | "sports" | "diet" | "protocols";

type Showcase = {
  icon: LucideIcon; tone: string; eyebrow: string; title: string; description: string; cta: string;
  preview: readonly string[];
  benefits: readonly { icon: LucideIcon; title: string; text: string }[];
  steps: readonly { name: string; detail: string }[];
  privacy: string;
};

const copy: Record<ShowcaseKind, Showcase> = {
  hydration: {
    icon: Droplets, tone: "text-water bg-water/10", eyebrow: "Hidratação",
    title: "Um jeito claro de acompanhar a água ao longo do dia.",
    description: "Metas orientativas, lembretes e copos ilustrados fazem parte da rotina individual. O paciente registra cada consumo na própria área protegida.",
    cta: "Acessar minha hidratação",
    preview: ["Meta diária", "Consumo registrado", "Próximo lembrete"],
    benefits: [
      { icon: UserRoundCheck, title: "Meta personalizada", text: "O perfil e a orientação profissional ajudam a definir o acompanhamento." },
      { icon: CalendarClock, title: "Lembretes por horário", text: "Copos e etapas do dia organizados de maneira visual." },
      { icon: ClipboardCheck, title: "Confirmação de consumo", text: "O paciente informa se bebeu e consulta seus registros." },
    ],
    steps: [
      { name: "Perfil", detail: "Informações pessoais" }, { name: "Meta", detail: "Quantidade orientativa" },
      { name: "Lembretes", detail: "Horários do dia" }, { name: "Registro", detail: "Histórico individual" },
    ],
    privacy: "Metas, volumes e horários pessoais são exibidos somente na área autorizada do paciente.",
  },
  medication: {
    icon: Pill, tone: "text-med bg-med/10", eyebrow: "Medicamentos",
    title: "Horários claros, alertas e registros em um só lugar.",
    description: "O CareDigital reúne as doses programadas para cada paciente, facilita a confirmação da tomada e mantém o histórico vinculado ao prontuário.",
    cta: "Acessar minhas medicações",
    preview: ["Doses programadas", "Tomadas registradas", "Histórico pessoal"],
    benefits: [
      { icon: UserRoundCheck, title: "Tratamento individual", text: "Cada paciente acessa apenas sua própria rotina de medicamentos." },
      { icon: CalendarClock, title: "Horários e alertas", text: "Os lembretes ajudam a acompanhar doses programadas." },
      { icon: ClipboardCheck, title: "Registro verificável", text: "A confirmação fica associada à data e à hora do sistema." },
    ],
    steps: [
      { name: "Prescrição", detail: "Orientação profissional" }, { name: "Agenda", detail: "Doses e horários" },
      { name: "Confirmação", detail: "Tomada registrada" }, { name: "Histórico", detail: "Prontuário privado" },
    ],
    privacy: "Nomes, dosagens, tratamentos e horários reais não são exibidos nesta apresentação pública.",
  },
  sports: {
    icon: Dumbbell, tone: "text-activity bg-activity/10", eyebrow: "Nutrição esportiva",
    title: "Alimentação, treino e acompanhamento com clareza.",
    description: "Organize refeições e horários para acompanhar seus objetivos. Orientações nutricionais e ajustes são individuais e devem ser definidos com profissionais habilitados.",
    cta: "Acessar meu acompanhamento",
    preview: ["Plano alimentar", "Rotina de treino", "Acompanhamento"],
    benefits: [
      { icon: UserRoundCheck, title: "Objetivos individuais", text: "O planejamento considera o contexto e as necessidades de cada pessoa." },
      { icon: CalendarClock, title: "Refeições e rotina", text: "Horários organizados ajudam a acompanhar a alimentação do dia." },
      { icon: ClipboardCheck, title: "Revisão e evolução", text: "Registros apoiam conversas com a equipe responsável pelo cuidado." },
    ],
    steps: [
      { name: "Objetivo", detail: "Contexto individual" }, { name: "Orientação", detail: "Plano profissional" },
      { name: "Rotina", detail: "Refeições e horários" }, { name: "Acompanhamento", detail: "Revisão individual" },
    ],
    privacy: "Planos e objetivos pessoais ficam na área privada. Suplementos não substituem alimentação nem orientação profissional.",
  },
  diet: {
    icon: Utensils, tone: "text-meal bg-meal/10", eyebrow: "Alimentação",
    title: "Refeições e lembretes, no momento certo.",
    description: "O CareDigital reúne os horários de alimentação definidos para cada acompanhamento. O paciente consulta sua rotina e confirma os cuidados realizados em um ambiente protegido.",
    cta: "Acessar minha rotina",
    preview: ["Refeições do dia", "Alimentos registrados", "Metas de macros"],
    benefits: [
      { icon: UserRoundCheck, title: "Plano individual", text: "A alimentação é orientada conforme a rotina e as necessidades de cada pessoa." },
      { icon: CalendarClock, title: "Horários organizados", text: "Refeições e lembretes aparecem na agenda pessoal, na sequência do dia." },
      { icon: ClipboardList, title: "Acompanhamento simples", text: "O paciente consulta o planejado e registra o que foi consumido." },
    ],
    steps: [
      { name: "Orientação", detail: "Definição individual" }, { name: "Agenda", detail: "Horários de refeição" },
      { name: "Registro", detail: "Confirmações do paciente" }, { name: "Histórico", detail: "Acompanhamento privado" },
    ],
    privacy: "Orientações e dietas individuais ficam disponíveis somente na conta vinculada ao acompanhamento.",
  },
  protocols: {
    icon: HeartPulse, tone: "text-primary bg-accent", eyebrow: "Como funciona",
    title: "Uma rotina clara, do lembrete ao histórico.",
    description: "O CareDigital organiza atividades e horários de acompanhamento. Cada paciente consulta suas orientações pessoais somente pelo acesso vinculado ao próprio prontuário.",
    cta: "Acessar meu acompanhamento",
    preview: ["Lembretes do dia", "Cuidados confirmados", "Histórico auditável"],
    benefits: [
      { icon: BellRing, title: "Lembretes claros", text: "Consulte os horários previstos e saiba o que está pendente." },
      { icon: CalendarClock, title: "Rotina por horários", text: "Medicação, refeições e hidratação organizadas em um só lugar." },
      { icon: ClipboardCheck, title: "Registros verificáveis", text: "As confirmações ficam associadas à atividade, com data e hora reais." },
    ],
    steps: [
      { name: "Vinculação", detail: "Prontuário individual" }, { name: "Programação", detail: "Rotina e horários" },
      { name: "Confirmação", detail: "Ação do paciente" }, { name: "Histórico", detail: "Acompanhamento" },
    ],
    privacy: "Protocolos e registros pessoais não são exibidos nesta página pública.",
  },
};

/** Fotografias ilustrativas (Unsplash, licença livre) servidas localmente em /public/images. */
const showcaseImage: Record<ShowcaseKind, { src: string; position: string }> = {
  hydration: { src: "/images/caredigital-hidratacao.webp", position: "50% 40%" },
  medication: { src: "/images/caredigital-medicamentos.webp", position: "50% 50%" },
  sports: { src: "/images/caredigital-esporte.webp", position: "50% 40%" },
  diet: { src: "/images/caredigital-alimentacao.webp", position: "50% 50%" },
  protocols: { src: "/images/caredigital-historico.webp", position: "40% 50%" },
};

export function PublicCareShowcase({ kind }: { kind: ShowcaseKind }) {
  const info = copy[kind];
  const Icon = info.icon;
  return <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-5">
    <section className="grid flex-1 items-center gap-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-10">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold">
          <span className={`grid size-5 place-items-center rounded-full ${info.tone}`}><Icon size={12}/></span>{info.eyebrow}
        </span>
        <h1 className="mt-4 max-w-[20ch] text-balance text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-4xl">{info.title}</h1>
        <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">{info.description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to="/cliente" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"><LockKeyhole size={16}/>{info.cta}<ArrowRight size={16}/></Link>
          <Link to="/" className="inline-flex h-11 items-center rounded-xl border border-border bg-surface px-5 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-accent">Voltar ao início</Link>
        </div>
        <p className="mt-5 flex max-w-[60ch] items-start gap-2 text-[13px] text-muted-foreground"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary"/>{info.privacy}</p>
      </div>

      <div aria-hidden="true" className="relative mx-auto w-full max-w-[400px]">
        <div className="absolute -inset-5 -z-10 rounded-[36px] bg-gradient-to-br from-primary/15 via-transparent to-water/10 blur-2xl"/>
        <img src={showcaseImage[kind].src} alt="" width={1200} height={750} loading="eager" decoding="async"
          style={{ objectPosition: showcaseImage[kind].position }}
          className="aspect-[16/10] w-full rounded-2xl object-cover shadow-pop"/>
        <div className="relative -mt-16 mx-3 rounded-2xl border border-border bg-card/95 p-4 shadow-pop backdrop-blur">
          <div className="flex items-center gap-3">
            <span className={`grid size-12 place-items-center rounded-xl ${info.tone}`}><Icon size={24}/></span>
            <div><p className="font-display text-base font-bold">{info.eyebrow}</p><p className="text-xs text-muted-foreground">Rotina individual de cuidados</p></div>
          </div>
          <ul className="mt-4 grid gap-2">
            {info.preview.map((item, index) => <li key={item} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success text-white"><Check size={12} strokeWidth={3}/></span>
              <span className="flex-1 text-[13px] font-medium">{item}</span>
              <span className="h-1.5 rounded-full bg-muted" style={{ width: `${48 + index * 14}px` }}/>
            </li>)}
          </ul>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">Exemplo visual, sem informações pessoais</p>
      </div>
    </section>

    <section aria-label="Recursos" className="grid shrink-0 gap-3 sm:grid-cols-3">
      {info.benefits.map(({ icon: BenefitIcon, title, text }) => <article key={title} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><BenefitIcon size={19}/></span>
        <div className="min-w-0"><h2 className="text-sm font-bold">{title}</h2><p className="mt-0.5 text-xs leading-snug text-muted-foreground">{text}</p></div>
      </article>)}
    </section>

    <section aria-label="Como funciona" className="shrink-0 rounded-2xl border border-border bg-card p-4 shadow-card">
      <ol className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
        {info.steps.map((step, index) => <li key={step.name} className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">{index + 1}</span>
          <span className="min-w-0 flex-1"><strong className="block text-sm font-semibold leading-tight">{step.name}</strong><span className="block text-xs text-muted-foreground">{step.detail}</span></span>
          {index < info.steps.length - 1 && <ArrowRight size={16} className="hidden shrink-0 text-muted-foreground md:block"/>}
        </li>)}
      </ol>
    </section>
  </div>;
}
