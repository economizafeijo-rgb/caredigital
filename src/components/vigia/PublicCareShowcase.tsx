import { Link } from "@tanstack/react-router";
import { AreaShowcase } from "./AreaShowcases";
import { ScreenPreview } from "./ScreenPreviews";
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

/** Cada página pública tem composição própria (ver AreaShowcases.tsx). */
export function PublicCareShowcase({ kind }: { kind: ShowcaseKind }) {
  return <AreaShowcase kind={kind} />;
}
