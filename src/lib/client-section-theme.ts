import {
  Activity, BookOpen, CalendarDays, Droplets, History, LayoutDashboard, Pill, Scale, Target, UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { ClientSection } from "./client-pages";

/**
 * Identidade visual de cada área do painel: foto ilustrativa (Unsplash, licença livre),
 * gradiente de destaque, ícone e cor de apoio. Mantido fora dos componentes para que
 * menu, cabeçalho e cartões usem exatamente as mesmas cores.
 */
export type SectionTheme = {
  label: string;
  icon: LucideIcon;
  image: string;
  position: string;
  /** Gradiente aplicado sobre a foto do cabeçalho. */
  overlay: string;
  /** Pílula do menu quando ativa. */
  pill: string;
  /** Ícone em destaque (fundo + cor). */
  chip: string;
};

export const clientSectionTheme: Record<ClientSection, SectionTheme> = {
  hoje: { label: "Visão geral", icon: LayoutDashboard, image: "/images/caredigital-care-hero.webp", position: "55% 20%",
    overlay: "from-indigo-950 via-indigo-900/80 to-blue-700/10", pill: "bg-gradient-to-r from-indigo-600 to-blue-500", chip: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300" },
  agenda: { label: "Agenda", icon: CalendarDays, image: "/images/painel-agenda.webp", position: "30% 50%",
    overlay: "from-violet-950 via-violet-900/80 to-fuchsia-600/10", pill: "bg-gradient-to-r from-violet-600 to-fuchsia-500", chip: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  historico: { label: "Histórico", icon: History, image: "/images/caredigital-historico.webp", position: "50% 50%",
    overlay: "from-slate-950 via-slate-900/85 to-slate-600/10", pill: "bg-gradient-to-r from-slate-700 to-slate-500", chip: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
  medicacao: { label: "Medicação", icon: Pill, image: "/images/caredigital-medicamentos.webp", position: "50% 50%",
    overlay: "from-rose-950 via-rose-900/80 to-pink-600/10", pill: "bg-gradient-to-r from-rose-600 to-pink-500", chip: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
  hidratacao: { label: "Hidratação", icon: Droplets, image: "/images/caredigital-hidratacao.webp", position: "50% 45%",
    overlay: "from-sky-950 via-sky-900/80 to-cyan-500/10", pill: "bg-gradient-to-r from-sky-600 to-cyan-500", chip: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
  alimentacao: { label: "Alimentação", icon: UtensilsCrossed, image: "/images/caredigital-alimentacao.webp", position: "50% 50%",
    overlay: "from-emerald-950 via-emerald-900/80 to-lime-500/10", pill: "bg-gradient-to-r from-emerald-600 to-lime-500", chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  atividade: { label: "Atividade", icon: Activity, image: "/images/painel-atividade.webp", position: "50% 60%",
    overlay: "from-orange-950 via-orange-900/80 to-amber-500/10", pill: "bg-gradient-to-r from-orange-600 to-amber-500", chip: "bg-orange-500/15 text-orange-600 dark:text-orange-300" },
  peso: { label: "Peso", icon: Scale, image: "/images/painel-peso.webp", position: "50% 50%",
    overlay: "from-fuchsia-950 via-purple-900/80 to-pink-500/10", pill: "bg-gradient-to-r from-fuchsia-600 to-pink-500", chip: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300" },
  indicadores: { label: "Indicadores", icon: Target, image: "/images/painel-indicadores.webp", position: "50% 50%",
    overlay: "from-teal-950 via-teal-900/80 to-emerald-500/10", pill: "bg-gradient-to-r from-teal-600 to-emerald-500", chip: "bg-teal-500/15 text-teal-600 dark:text-teal-300" },
  cardapios: { label: "Cardápios", icon: BookOpen, image: "/images/painel-cardapios.webp", position: "50% 50%",
    overlay: "from-amber-950 via-amber-900/80 to-yellow-500/10", pill: "bg-gradient-to-r from-amber-600 to-yellow-500", chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
};

export const clientSectionOrder: ClientSection[] =
  ["hoje", "agenda", "historico", "medicacao", "hidratacao", "alimentacao", "atividade", "peso", "indicadores", "cardapios"];
