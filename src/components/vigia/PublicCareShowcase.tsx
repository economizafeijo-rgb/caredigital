import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BedDouble,
  Bluetooth,
  Moon,
  BarChart3,
  BellRing,
  CalendarClock,
  Check,
  ClipboardCheck,
  ClipboardList,
  Droplets,
  Dumbbell,
  HeartPulse,
  LockKeyhole,
  MapPin,
  Pill,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  UserRoundCheck,
  Utensils,
  type LucideIcon,
} from "lucide-react";

/** Apresentação pública e explicativa: nunca lê nem altera registros pessoais de um usuário. */
export type ShowcaseKind =
  | "hydration"
  | "medication"
  | "sports"
  | "diet"
  | "protocols"
  | "metrics"
  | "weight"
  | "supplements"
  | "training"
  | "sleep";

type Showcase = {
  icon: LucideIcon;
  tone: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  preview: readonly string[];
  benefits: readonly { icon: LucideIcon; title: string; text: string }[];
  steps: readonly { name: string; detail: string }[];
  privacy: string;
};

const copy: Record<ShowcaseKind, Showcase> = {
  hydration: {
    icon: Droplets,
    tone: "text-water bg-water/10",
    eyebrow: "Hidratação",
    title: "Hidratação com meta diária e o horário do próximo copo.",
    description:
      "Defina sua meta pelo peso e pela rotina, registre cada copo com um toque e veja quanto falta. A cada registro, o NextVita calcula o horário e o volume sugeridos para a próxima ingestão.",
    cta: "Acessar minha hidratação",
    preview: ["Meta diária", "Consumo registrado", "Próximo lembrete"],
    benefits: [
      {
        icon: UserRoundCheck,
        title: "Meta personalizada",
        text: "O perfil e a orientação profissional ajudam a definir o acompanhamento.",
      },
      {
        icon: CalendarClock,
        title: "Lembretes por horário",
        text: "Copos e etapas do dia organizados de maneira visual.",
      },
      {
        icon: ClipboardCheck,
        title: "Confirmação de consumo",
        text: "O usuário informa se bebeu e consulta seus registros.",
      },
    ],
    steps: [
      { name: "Perfil", detail: "Informações pessoais" },
      { name: "Meta", detail: "Quantidade orientativa" },
      { name: "Lembretes", detail: "Horários do dia" },
      { name: "Registro", detail: "Histórico individual" },
    ],
    privacy:
      "Metas, volumes e horários pessoais são exibidos somente na área autorizada do usuário.",
  },
  medication: {
    icon: Pill,
    tone: "text-med bg-med/10",
    eyebrow: "Medicamentos",
    title: "Medicamentos no horário certo, com timer e confirmação.",
    description:
      "Cadastre seus medicamentos, defina os horários de cada dose e confirme o que tomou. O timer mostra a próxima dose e o histórico guarda cada registro com data e hora reais.",
    cta: "Acessar minhas medicações",
    preview: ["Doses programadas", "Tomadas registradas", "Histórico pessoal"],
    benefits: [
      {
        icon: UserRoundCheck,
        title: "Rotina individual",
        text: "Cada pessoa acessa apenas sua própria rotina de medicamentos.",
      },
      {
        icon: CalendarClock,
        title: "Horários e alertas",
        text: "Os lembretes ajudam a acompanhar doses programadas.",
      },
      {
        icon: ClipboardCheck,
        title: "Registro verificável",
        text: "A confirmação fica associada à data e à hora do sistema.",
      },
    ],
    steps: [
      { name: "Prescrição", detail: "Orientação profissional" },
      { name: "Agenda", detail: "Doses e horários" },
      { name: "Confirmação", detail: "Tomada registrada" },
      { name: "Histórico", detail: "Histórico privado" },
    ],
    privacy:
      "Nomes, dosagens, rotinas pessoais e horários reais não são exibidos nesta apresentação pública.",
  },
  sports: {
    icon: Dumbbell,
    tone: "text-activity bg-activity/10",
    eyebrow: "Nutrição esportiva",
    title: "Nutrição esportiva alinhada ao seu objetivo.",
    description:
      "Metas de calorias e proteínas para emagrecer, manter, ganhar peso ou hipertrofiar. Registre as refeições e veja os macronutrientes calculados automaticamente, ao lado dos seus treinos.",
    cta: "Acessar meu acompanhamento",
    preview: ["Plano alimentar", "Rotina de treino", "Acompanhamento"],
    benefits: [
      {
        icon: UserRoundCheck,
        title: "Objetivos individuais",
        text: "O planejamento considera o contexto e as necessidades de cada pessoa.",
      },
      {
        icon: CalendarClock,
        title: "Refeições e rotina",
        text: "Horários organizados ajudam a acompanhar a alimentação do dia.",
      },
      {
        icon: ClipboardCheck,
        title: "Revisão e evolução",
        text: "Registros apoiam conversas com a equipe responsável pelo cuidado.",
      },
    ],
    steps: [
      { name: "Objetivo", detail: "Contexto individual" },
      { name: "Orientação", detail: "Plano individual" },
      { name: "Rotina", detail: "Refeições e horários" },
      { name: "Acompanhamento", detail: "Revisão individual" },
    ],
    privacy:
      "Planos e objetivos pessoais ficam na área privada. Suplementos não substituem alimentação nem orientação profissional.",
  },
  diet: {
    icon: Utensils,
    tone: "text-meal bg-meal/10",
    eyebrow: "Alimentação",
    title: "Alimentação registrada, nutrientes calculados.",
    description:
      "Descreva o que comeu e o NextVita estima calorias, proteínas, carboidratos, gorduras, fibras, vitaminas e minerais. Cardápios, receitas regionais e uma biblioteca de alimentos apoiam o seu plano.",
    cta: "Acessar minha rotina",
    preview: ["Refeições do dia", "Alimentos registrados", "Metas de macros"],
    benefits: [
      {
        icon: UserRoundCheck,
        title: "Plano individual",
        text: "A alimentação é orientada conforme a rotina e as necessidades de cada pessoa.",
      },
      {
        icon: CalendarClock,
        title: "Horários organizados",
        text: "Refeições e lembretes aparecem na agenda pessoal, na sequência do dia.",
      },
      {
        icon: ClipboardList,
        title: "Acompanhamento simples",
        text: "O usuário consulta o planejado e registra o que foi consumido.",
      },
    ],
    steps: [
      { name: "Orientação", detail: "Definição individual" },
      { name: "Agenda", detail: "Horários de refeição" },
      { name: "Registro", detail: "Confirmações do usuário" },
      { name: "Histórico", detail: "Acompanhamento privado" },
    ],
    privacy: "Orientações e registros pessoais ficam disponíveis somente na conta do usuário.",
  },
  protocols: {
    icon: HeartPulse,
    tone: "text-primary bg-accent",
    eyebrow: "Como funciona",
    title: "Toda a sua rotina de saúde em uma única plataforma.",
    description:
      "Agenda do dia, medicamentos, hidratação, alimentação, suplementos, peso e treinos, com timers, gráficos interativos e histórico completo. Comece com 7 dias grátis e um roteiro guiado.",
    cta: "Acessar meu acompanhamento",
    preview: ["Lembretes do dia", "Cuidados confirmados", "Histórico auditável"],
    benefits: [
      {
        icon: BellRing,
        title: "Lembretes claros",
        text: "Consulte os horários previstos e saiba o que está pendente.",
      },
      {
        icon: CalendarClock,
        title: "Rotina por horários",
        text: "Medicação, refeições e hidratação organizadas em um só lugar.",
      },
      {
        icon: ClipboardCheck,
        title: "Registros verificáveis",
        text: "As confirmações ficam associadas à atividade, com data e hora reais.",
      },
    ],
    steps: [
      { name: "Vinculação", detail: "Perfil pessoal" },
      { name: "Programação", detail: "Rotina e horários" },
      { name: "Confirmação", detail: "Ação do usuário" },
      { name: "Histórico", detail: "Acompanhamento" },
    ],
    privacy: "Protocolos e registros pessoais não são exibidos nesta página pública.",
  },
  metrics: {
    icon: BarChart3,
    tone: "text-primary bg-primary/10",
    eyebrow: "Métricas e gráficos",
    title: "Seus números de saúde em gráficos claros.",
    description:
      "Calorias, proteínas, água, peso e atividade viram indicadores e gráficos fáceis de ler, comparados com a meta do seu objetivo. Um painel só para entender como está a sua semana.",
    cta: "Ver minhas métricas",
    preview: ["Calorias e macronutrientes", "Hidratação do dia", "Atividade da semana"],
    benefits: [
      { icon: TrendingUp, title: "Evolução visual", text: "Gráficos de tendência mostram o que mudou nos últimos dias e meses." },
      { icon: Target, title: "Metas por objetivo", text: "Emagrecer, manter, ganhar peso ou hipertrofia: cada meta se ajusta ao seu objetivo." },
      { icon: BarChart3, title: "Tudo em um painel", text: "Nutrição, água, peso e treinos reunidos na mesma tela." },
    ],
    steps: [
      { name: "Registrar", detail: "Refeições, água e peso" },
      { name: "Calcular", detail: "Nutrientes automáticos" },
      { name: "Comparar", detail: "Com a sua meta" },
      { name: "Evoluir", detail: "Ajustes semanais" },
    ],
    privacy: "Os gráficos mostram apenas os seus registros, na sua área protegida. Valores são estimativas educativas.",
  },
  weight: {
    icon: Scale,
    tone: "text-activity bg-activity/10",
    eyebrow: "Controle de peso",
    title: "Acompanhe seu peso e veja a evolução de verdade.",
    description:
      "Registre seu peso por data e acompanhe a linha de evolução, a média móvel, o IMC e a distância até a sua meta. Simples para registrar, claro para entender.",
    cta: "Registrar meu peso",
    preview: ["Peso e variação", "IMC e classificação", "Distância da meta"],
    benefits: [
      { icon: TrendingUp, title: "Gráfico de evolução", text: "Linha do peso, média móvel e faixa de peso adequado em um só gráfico." },
      { icon: Scale, title: "IMC automático", text: "Cálculo e classificação a cada registro, com a sua altura." },
      { icon: Target, title: "Meta de peso", text: "Veja quanto falta para chegar ao objetivo definido." },
    ],
    steps: [
      { name: "Pesar", detail: "Informe peso e data" },
      { name: "Registrar", detail: "Um toque para salvar" },
      { name: "Gráfico", detail: "Evolução atualizada" },
      { name: "Meta", detail: "Acompanhe o objetivo" },
    ],
    privacy: "Peso e medidas são dados pessoais e ficam apenas na sua área protegida. Não substitui avaliação profissional.",
  },
  supplements: {
    icon: Sparkles,
    tone: "text-primary bg-primary/10",
    eyebrow: "Controle de suplementação",
    title: "Suplementos com dose, horário e timer.",
    description:
      "Programe creatina, whey, ômega 3, vitamina D e outros com a dose e os horários do seu plano. Receba o timer da próxima dose, registre o que tomou e consulte dicas de uso.",
    cta: "Programar meus suplementos",
    preview: ["Programação do dia", "Timer da próxima dose", "Biblioteca com dicas"],
    benefits: [
      { icon: Timer, title: "Timer da próxima dose", text: "Contagem regressiva até o horário de cada suplemento." },
      { icon: ClipboardCheck, title: "Registro de doses", text: "Marque o que tomou e acompanhe sua constância no dia." },
      { icon: Sparkles, title: "Biblioteca de referência", text: "Doses usuais, melhor horário, dicas e cuidados de cada suplemento." },
    ],
    steps: [
      { name: "Escolher", detail: "Na biblioteca" },
      { name: "Programar", detail: "Dose e horários" },
      { name: "Tomar", detail: "Com timer" },
      { name: "Registrar", detail: "Constância diária" },
    ],
    privacy: "Suplementos não substituem alimentação nem orientação profissional. Doses reais devem ser definidas por quem acompanha você.",
  },
  training: {
    icon: Activity,
    tone: "text-activity bg-activity/10",
    eyebrow: "Treinos e corridas",
    title: "Caminhadas, corridas e treinos com rastreio por GPS.",
    description:
      "Acompanhe distância, tempo e ritmo da sua caminhada ou corrida em tempo real, com resumo ao final. Registre também musculação, ciclismo e natação.",
    cta: "Registrar um treino",
    preview: ["Distância e ritmo ao vivo", "Resumo da sessão", "Histórico de treinos"],
    benefits: [
      { icon: MapPin, title: "Rastreio por GPS", text: "Métricas ao vivo de caminhadas e corridas, também em tela cheia." },
      { icon: Activity, title: "Vários esportes", text: "Corrida, caminhada, ciclismo, musculação, natação e mais." },
      { icon: TrendingUp, title: "Evolução semanal", text: "Minutos de atividade somados na semana, com a meta de referência da OMS." },
    ],
    steps: [
      { name: "Escolher", detail: "O tipo de treino" },
      { name: "Iniciar", detail: "Com GPS ou manual" },
      { name: "Acompanhar", detail: "Métricas ao vivo" },
      { name: "Resumo", detail: "Salvo no histórico" },
    ],
    privacy: "A localização só é usada durante o treino, com a sua permissão, e o percurso fica na sua área privada.",
  },
  sleep: {
    icon: BedDouble,
    tone: "text-primary bg-primary/10",
    eyebrow: "Monitoramento do sono",
    title: "Durma melhor com dados de verdade, noite após noite.",
    description:
      "Registre suas noites e receba uma nota do sono com horas dormidas, regularidade e débito acumulado. Conecte uma cinta ou relógio com Bluetooth e acompanhe seus batimentos em tempo real enquanto dorme.",
    cta: "Monitorar meu sono",
    preview: ["Nota do sono de 0 a 100", "Batimentos ao vivo", "Evolução de 30 dias"],
    benefits: [
      { icon: Moon, title: "Nota do sono", text: "Duração, qualidade e despertares resumidos em um número fácil de acompanhar." },
      { icon: Bluetooth, title: "Sensor em tempo real", text: "Compatível com aparelhos que transmitem frequência cardíaca por Bluetooth." },
      { icon: TrendingUp, title: "Evolução e regularidade", text: "Gráficos interativos mostram suas horas, seus horários e o débito de sono." },
    ],
    steps: [
      { name: "Conectar", detail: "Sensor opcional" },
      { name: "Dormir", detail: "Iniciar a noite" },
      { name: "Acordar", detail: "Encerrar e avaliar" },
      { name: "Evoluir", detail: "Nota e orientações" },
    ],
    privacy: "Os registros de sono ficam na sua área privada. A nota é educativa e não substitui avaliação médica nem exame do sono.",
  },
};

/** Fotografias ilustrativas (Unsplash, licença livre) servidas localmente em /public/images. */
const showcaseImage: Record<ShowcaseKind, { src: string; position: string }> = {
  hydration: { src: "/images/caredigital-hidratacao.webp", position: "50% 45%" },
  medication: { src: "/images/caredigital-medicamentos.webp", position: "50% 50%" },
  sports: { src: "/images/caredigital-esporte.webp", position: "50% 40%" },
  diet: { src: "/images/caredigital-alimentacao.webp", position: "50% 50%" },
  protocols: { src: "/images/caredigital-care-hero.webp", position: "70% 25%" },
  metrics: { src: "/images/show-metricas.webp", position: "50% 55%" },
  weight: { src: "/images/show-peso.webp", position: "60% 22%" },
  supplements: { src: "/images/show-suplementos.webp", position: "50% 60%" },
  sleep: { src: "/images/show-sono.webp", position: "50% 35%" },
  training: { src: "/images/show-treinos.webp", position: "40% 45%" },
};

const related: Record<ShowcaseKind, { to: string; label: string }> = {
  protocols: { to: "/protocolos", label: "Como funciona" },
  medication: { to: "/medicamentos", label: "Medicamentos" },
  hydration: { to: "/hidratacao", label: "Hidratação" },
  diet: { to: "/dietas", label: "Dietas" },
  sports: { to: "/nutricao-esportiva", label: "Nutrição esportiva" },
  supplements: { to: "/suplementos", label: "Suplementos" },
  weight: { to: "/peso", label: "Peso" },
  sleep: { to: "/sono", label: "Sono" },
  training: { to: "/treinos", label: "Treinos" },
  metrics: { to: "/metricas", label: "Métricas" },
};

export function PublicCareShowcase({ kind }: { kind: ShowcaseKind }) {
  const info = copy[kind];
  const Icon = info.icon;
  const image = showcaseImage[kind];
  const others = (Object.keys(related) as ShowcaseKind[]).filter((key) => key !== kind);
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1320px] flex-col gap-4 lg:h-[calc(100%-49px)] lg:min-h-0 lg:gap-3">
      {/* Destaque: foto do serviço, título, descrição e ações */}
      <section className="showcase-hero relative isolate flex overflow-hidden rounded-3xl bg-[#062c2b] text-white shadow-pop lg:min-h-0 lg:flex-1">
        <img
          src={image.src}
          alt=""
          aria-hidden="true"
          width={1600}
          height={900}
          loading="eager"
          decoding="async"
          style={{ objectPosition: image.position }}
          className="absolute inset-y-0 right-0 -z-20 h-full w-full object-cover lg:w-[58%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-[#062c2b] from-45% via-[#062c2b]/85 to-[#062c2b]/10 max-lg:bg-[#062c2b]/85"
        />
        <div className="grid w-full gap-6 p-6 sm:p-9 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-10 lg:py-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.14em] backdrop-blur">
              <Icon size={15} /> {info.eyebrow}
            </span>
            <h1 className="mt-4 max-w-[18ch] text-balance font-display text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl xl:text-[2.75rem]">
              {info.title}
            </h1>
            <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-emerald-50/90">
              {info.description}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href="/entrar?mode=signup"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 px-6 text-sm font-extrabold text-slate-950 shadow-lg transition hover:brightness-110"
              >
                Testar grátis por 7 dias <ArrowRight size={17} />
              </a>
              <Link
                to="/cliente"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-bold backdrop-blur transition hover:bg-white/20"
              >
                <LockKeyhole size={16} /> {info.cta}
              </Link>
            </div>
          </div>

          {/* Prévia do recurso, no mesmo estilo dos cartões do painel */}
          <div
            aria-hidden="true"
            className="w-full max-w-sm justify-self-center rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-md lg:justify-self-end"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-300 text-slate-950">
                <Icon size={24} />
              </span>
              <div>
                <p className="font-display text-base font-bold">{info.eyebrow}</p>
                <p className="text-xs text-white/70">O que você acompanha</p>
              </div>
            </div>
            <ul className="mt-4 grid gap-2">
              {info.preview.map((item, index) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-2xl bg-white/10 px-3.5 py-3"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-400 text-slate-950">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="flex-1 text-sm font-semibold">{item}</span>
                  <span className="h-1.5 w-12 overflow-hidden rounded-full bg-white/20">
                    <i
                      className="block h-full rounded-full bg-emerald-300"
                      style={{ width: `${55 + index * 20}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section aria-label="Recursos" className="grid shrink-0 gap-3 md:grid-cols-3">
        {info.benefits.map(({ icon: BenefitIcon, title, text }) => (
          <article
            key={title}
            className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/40"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-sm">
              <BenefitIcon size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold leading-tight">{title}</h2>
              <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{text}</p>
            </div>
          </article>
        ))}
      </section>

      {/* Passo a passo */}
      <section
        aria-label="Como funciona"
        className="shrink-0 rounded-2xl border border-border bg-card p-4 shadow-card"
      >
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {info.steps.map((step, index) => (
            <li key={step.name} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 font-display text-base font-extrabold text-white">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <strong className="block text-sm">{step.name}</strong>
                <span className="text-xs text-muted-foreground">{step.detail}</span>
              </span>
              {index < info.steps.length - 1 && (
                <ArrowRight size={16} className="hidden shrink-0 text-muted-foreground lg:block" />
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Outros recursos, privacidade e chamada final */}
      <section className="grid shrink-0 gap-3 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-bold">Outros recursos:</span>
            {others.map((key) => {
              const OtherIcon = copy[key].icon;
              return (
                <Link
                  key={key}
                  to={related[key].to}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-semibold transition hover:border-primary/50 hover:text-primary"
                >
                  <OtherIcon size={13} /> {related[key].label}
                </Link>
              );
            })}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
            {info.privacy}
          </p>
        </div>
        <a
          href="/entrar?mode=signup"
          className="group flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 p-4 text-white shadow-card transition hover:brightness-105"
        >
          <span>
            <strong className="block font-display text-lg font-extrabold leading-tight">
              Comece hoje, grátis por 7 dias
            </strong>
            <span className="text-sm text-white/90">Painel completo, sem cartão.</span>
          </span>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/20 transition group-hover:translate-x-1">
            <ArrowRight size={20} />
          </span>
        </a>
      </section>
    </div>
  );
}
