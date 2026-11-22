import type { ReactNode } from "react";
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
  preview: ReactNode;
};

/** Moldura das mini telas: a mesma superfície em todas, para a seção ler como um conjunto. */
function Screen({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-[15.5rem] rounded-xl bg-card p-3 shadow-[0_14px_30px_-20px_rgba(0,0,0,.6)] ring-1 ring-border">
      <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
        <Icon size={13} aria-hidden="true" /> {title}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

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
    preview: (
      <Screen title="Hidratação de hoje" icon={Droplets}>
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 44 44" className="size-14 -rotate-90" aria-hidden="true">
            <circle cx="22" cy="22" r="18" fill="none" strokeWidth="5" className="stroke-muted" />
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="113"
              strokeDashoffset="32"
              className="stroke-primary"
            />
          </svg>
          <p className="leading-tight">
            <strong className="block text-lg font-extrabold tabular-nums">1,8 L</strong>
            <span className="text-[11px] text-muted-foreground">de 2,5 L</span>
          </p>
        </div>
        <p className="mt-2 rounded-md bg-muted px-2 py-1 text-[11px] font-medium">
          Próximo copo às 15:30
        </p>
      </Screen>
    ),
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
    preview: (
      <Screen title="Doses de hoje" icon={Pill}>
        <ul className="grid gap-1.5 text-[12px]">
          {[
            ["08:00", "Vitamina D3", true],
            ["12:00", "Ômega 3", true],
            ["20:00", "Magnésio", false],
          ].map(([h, n, done]) => (
            <li key={String(h)} className="flex items-center gap-2">
              <span
                className={`grid size-4 shrink-0 place-items-center rounded-full ${done ? "bg-primary text-primary-foreground" : "ring-1 ring-border"}`}
              >
                {done && <Check size={10} strokeWidth={3} aria-hidden="true" />}
              </span>
              <span className="tabular-nums text-muted-foreground">{h}</span>
              <span className="truncate font-medium">{n}</span>
            </li>
          ))}
        </ul>
      </Screen>
    ),
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
    preview: (
      <Screen title="Medidas deste mês" icon={Ruler}>
        <dl className="grid gap-1.5 text-[12px]">
          {[
            ["Cintura", "82 cm", "−1,5"],
            ["Braço", "34 cm", "+0,5"],
            ["Quadril", "98 cm", "−1,0"],
          ].map(([k, v, d]) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="flex items-baseline gap-1.5 tabular-nums">
                <strong className="font-semibold">{v}</strong>
                <span className="text-[10.5px] font-semibold text-primary">{d}</span>
              </dd>
            </div>
          ))}
        </dl>
      </Screen>
    ),
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
    preview: (
      <Screen title="Ao vivo · 58 bpm" icon={HeartPulse}>
        <svg viewBox="0 0 200 50" className="h-10 w-full" aria-hidden="true">
          <polyline
            fill="none"
            strokeWidth="2.2"
            strokeLinejoin="round"
            className="stroke-primary"
            points="0,30 34,30 44,30 52,8 60,44 68,25 78,30 112,30 122,30 130,10 138,42 146,27 156,30 200,30"
          />
        </svg>
        <p className="text-[11px] text-muted-foreground">
          Nota da noite <strong className="text-foreground">86</strong> · 7h42 dormidas
        </p>
      </Screen>
    ),
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
    preview: (
      <Screen title="Água nesta semana" icon={BarChart3}>
        <div className="flex h-14 items-end gap-1.5" aria-hidden="true">
          {[45, 62, 50, 78, 70, 88, 95].map((h, i) => (
            <span
              key={i}
              className={`flex-1 rounded-t-[3px] ${i === 6 ? "bg-primary" : "bg-primary/45"}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">Meta batida em 6 de 7 dias</p>
      </Screen>
    ),
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

/**
 * Ferramentas gratuitas do app: cinco cartões com a mini tela de cada uma, um cartão para instalar
 * o app e, embaixo, os atalhos para todas as áreas. Mesma superfície e uma única cor de destaque.
 */
export function HomeToolAds({ client }: { client: boolean }) {
  return (
    <section
      aria-labelledby="tool-ads-title"
      className="nv-dark relative isolate grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 overflow-hidden rounded-3xl bg-[#0c1a3a] p-4 text-white max-sm:-mx-3 max-sm:rounded-none sm:p-7"
    >
      <img
        src="/images/caredigital-care-hero.webp"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 -z-20 size-full object-cover opacity-25"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0c1a3a]/95 via-[#0c1a3a]/85 to-[#0b3b3a]/80"
      />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div className="min-w-0">
          <h2
            id="tool-ads-title"
            className="font-display text-xl font-extrabold tracking-tight sm:text-2xl"
          >
            Ferramentas grátis do app
          </h2>
          <p className="mt-0.5 max-w-[60ch] text-[13px] text-white/75 sm:text-sm">
            Para organizar água, remédios, medidas, sono e treinos. Sem custo, no celular ou no
            computador.
          </p>
        </div>
      </header>

      <div
        role="region"
        aria-label="Ferramentas do app"
        tabIndex={0}
        className="-mx-3 flex snap-x snap-mandatory scroll-px-3 gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden"
      >
        {tools.map((t) => (
          <article
            key={t.id}
            className="flex w-[78vw] max-w-[21rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur sm:w-auto sm:max-w-none"
          >
            <div
              className="grid h-40 place-items-center border-b border-white/10 px-5"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${t.color} 38%, #0c1a3a), color-mix(in srgb, ${t.color} 10%, #0c1a3a))`,
              }}
              aria-hidden="true"
            >
              {t.preview}
            </div>
            <div className="flex flex-1 flex-col p-4 sm:p-5">
              <h3 className="flex items-center gap-2 font-display text-[1.05rem] font-bold leading-snug">
                <t.icon
                  size={17}
                  className="shrink-0"
                  style={{ color: t.color }}
                  aria-hidden="true"
                />
                {t.title}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/75">{t.text}</p>
              <a
                href={client ? t.client : t.to}
                className="mt-4 inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-white/30 px-4 text-[13px] font-semibold transition-colors hover:bg-white/10 sm:mt-auto"
              >
                {client ? t.clientCta : t.cta}
                <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>
          </article>
        ))}

        <article className="flex w-[78vw] max-w-[21rem] shrink-0 snap-start flex-col justify-between gap-5 rounded-2xl border border-[#3fe0c8]/30 bg-[#3fe0c8]/10 p-4 sm:w-auto sm:max-w-none sm:p-5">
          <div>
            <span className="grid size-10 place-items-center rounded-xl bg-[#3fe0c8]/15 text-[#3fe0c8]">
              <Smartphone size={20} aria-hidden="true" />
            </span>
            <h3 className="mt-3 font-display text-[1.05rem] font-bold leading-snug">
              Instale no celular e receba os lembretes
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
              Abre com um toque, avisa na hora da água e de cada dose e não ocupa espaço.
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
        </article>
      </div>

      <nav
        aria-label="Todas as áreas do app"
        className="flex flex-wrap items-center gap-x-1 gap-y-1.5"
      >
        <span className="mr-2 text-[13px] font-semibold text-white">Todas as áreas:</span>
        {areas.map((a) => (
          <a
            key={a.to}
            href={client ? a.client : a.to}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <a.icon size={14} aria-hidden="true" />
            {a.label}
          </a>
        ))}
      </nav>
    </section>
  );
}
