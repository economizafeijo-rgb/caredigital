import {
  Activity,
  ArrowRight,
  BarChart3,
  BedDouble,
  Check,
  Droplets,
  HeartPulse,
  Pill,
  Ruler,
  Scale,
  Smartphone,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { InstallAppButton } from "./InstallApp";

type Tool = {
  id: string;
  color: string;
  icon: LucideIcon;
  title: string;
  text: string;
  cta: string;
  to: string;
  client: string;
  clientCta: string;
};

const tools: Tool[] = [
  {
    id: "agua",
    color: "#38bdf8",
    icon: Droplets,
    title: "Meta de água calculada para você",
    text: "Calcula quanto beber pelo seu peso e avisa a hora do próximo copo.",
    cta: "Usar grátis",
    to: "/hidratacao",
    client: "/cliente#minha-hidratacao",
    clientCta: "Registrar água",
  },
  {
    id: "med",
    color: "#fb7185",
    icon: Pill,
    title: "Nenhuma dose esquecida",
    text: "Horários de remédios e suplementos, com confirmação e histórico de cada dose.",
    cta: "Usar grátis",
    to: "/medicamentos",
    client: "/cliente#medicacao",
    clientCta: "Ver minhas doses",
  },
  {
    id: "medidas",
    color: "#fbbf24",
    icon: Ruler,
    title: "Medidas do corpo com gráfico",
    text: "Cintura, braços e quadril, com relação cintura-quadril e gordura estimada.",
    cta: "Começar a medir",
    to: "/entrar?mode=signup",
    client: "/cliente#medidas",
    clientCta: "Abrir minhas medidas",
  },
  {
    id: "sono",
    color: "#a78bfa",
    icon: BedDouble,
    title: "Sono e batimentos ao vivo",
    text: "Conecte uma cinta ou relógio Bluetooth e veja a nota de cada noite.",
    cta: "Conhecer",
    to: "/sono",
    client: "/cliente#sono",
    clientCta: "Ver meu sono",
  },
  {
    id: "metricas",
    color: "#34d399",
    icon: BarChart3,
    title: "Sua evolução em gráficos",
    text: "Água, alimentação, peso e atividade no dia, no mês e no ano.",
    cta: "Usar grátis",
    to: "/metricas",
    client: "/cliente#indicadores",
    clientCta: "Ver meus gráficos",
  },
];

/** Todas as áreas do app, em atalhos discretos logo abaixo das ferramentas. */
const areas: { to: string; client: string; label: string; icon: LucideIcon }[] = [
  { to: "/medicamentos", client: "/cliente#medicacao", label: "Medicação", icon: Pill },
  { to: "/hidratacao", client: "/cliente#minha-hidratacao", label: "Hidratação", icon: Droplets },
  { to: "/dietas", client: "/cliente#alimentacao", label: "Alimentação", icon: Utensils },
  { to: "/suplementos", client: "/suplementos", label: "Suplementos", icon: Sparkles },
  { to: "/peso", client: "/peso", label: "Peso", icon: Scale },
  { to: "/treinos", client: "/treinos", label: "Treinos", icon: Activity },
  { to: "/sono", client: "/cliente#sono", label: "Sono", icon: BedDouble },
  { to: "/metricas", client: "/metricas", label: "Métricas", icon: BarChart3 },
  { to: "/protocolos", client: "/protocolos", label: "Como funciona", icon: HeartPulse },
];

/** Ferramentas gratuitas do app: faixa compacta com uma linha por ferramenta e o convite para instalar. */
export function HomeToolAds({ client }: { client: boolean }) {
  return (
    <section
      aria-labelledby="tool-ads-title"
      className="nv-dark relative isolate grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 overflow-hidden rounded-3xl bg-[#0c1a3a] p-4 text-white max-sm:-mx-3 max-sm:rounded-none sm:p-6"
    >
      <img
        src="/images/caredigital-care-hero.webp"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 -z-20 size-full object-cover opacity-40"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0c1a3a]/90 via-[#0c1a3a]/70 to-[#0b3b3a]/55"
      />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h2
            id="tool-ads-title"
            className="font-display text-xl font-extrabold tracking-tight sm:text-2xl"
          >
            Ferramentas grátis do app
          </h2>
          <p className="mt-0.5 text-[13px] text-white/80">
            Água, remédios, medidas, sono e gráficos. Sem custo, no celular ou no computador.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InstallAppButton />
          {!client && (
            <a
              href="/entrar?mode=signup"
              className="inline-flex h-10 items-center rounded-xl bg-[#3fe0c8] px-4 text-[13px] font-bold text-slate-950 transition hover:brightness-110"
            >
              Criar conta grátis
            </a>
          )}
        </div>
      </header>

      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {tools.map((t) => (
          <li key={t.id}>
            <a
              href={client ? t.client : t.to}
              className="group flex h-full flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 p-3.5 backdrop-blur transition-colors hover:border-white/30 hover:bg-black/55"
            >
              <span
                className="grid size-9 place-items-center rounded-lg"
                style={{
                  color: t.color,
                  background: `color-mix(in srgb, ${t.color} 18%, transparent)`,
                }}
              >
                <t.icon size={18} aria-hidden="true" />
              </span>
              <strong className="text-[13.5px] font-bold leading-snug">{t.title}</strong>
              <span className="text-[12px] leading-snug text-white/70">{t.text}</span>
              <span
                className="mt-auto inline-flex items-center gap-1 pt-1 text-[12px] font-semibold"
                style={{ color: t.color }}
              >
                {client ? t.clientCta : t.cta}
                <ArrowRight
                  size={13}
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </a>
          </li>
        ))}
      </ul>

      <nav
        aria-label="Todas as áreas do app"
        className="flex flex-wrap items-center gap-x-1 gap-y-1.5 border-t border-white/10 pt-3"
      >
        <span className="mr-2 text-[13px] font-semibold text-white">Todas as áreas:</span>
        {areas.map((a) => (
          <a
            key={a.to}
            href={client ? a.client : a.to}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <a.icon size={14} aria-hidden="true" />
            {a.label}
          </a>
        ))}
      </nav>
    </section>
  );
}
