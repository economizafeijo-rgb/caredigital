import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BedDouble,
  CalendarCheck,
  Clock3,
  Droplets,
  Gift,
  HeartPulse,
  LayoutDashboard,
  LockKeyhole,
  Pill,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Utensils,
} from "lucide-react";
import { useAccess } from "@/lib/use-access";
import { HomeStore } from "@/components/vigia/HomeStore";
import { LiveModeLauncher } from "@/components/vigia/LiveMode";
import { TrialAd } from "@/components/vigia/TrialAd";
import { MobileAreas, MobileHero } from "@/components/vigia/MobileHero";
import { HomeNextCareCard } from "@/components/vigia/CareTimer";
import { HomeModalityTimers } from "@/components/vigia/HomeModalityTimers";
import { HomeClientMetrics } from "@/components/vigia/HomeClientMetrics";
import { SmartMetricsDashboard } from "@/components/vigia/SmartMetricsDashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NextVita — Bem-estar organizado" },
      {
        name: "description",
        content:
          "Organize nutrição, hidratação, peso, suplementos e sua rotina de bem-estar em um só lugar.",
      },
      { property: "og:title", content: "NextVita — Bem-estar organizado" },
      {
        property: "og:description",
        content: "Um hub pessoal para acompanhar hábitos, evolução e autocuidado com clareza.",
      },
    ],
  }),
  component: Homepage,
});

const features = [
  {
    to: "/medicamentos",
    title: "Medicações",
    description: "Cartela interativa, horários e confirmação de cada dose.",
    icon: Pill,
    tone: "text-med bg-med/10",
    image: "/images/caredigital-medicamentos.webp",
  },
  {
    to: "/hidratacao",
    title: "Hidratação",
    description: "Meta diária calculada e registro de cada copo.",
    icon: Droplets,
    tone: "text-water bg-water/10",
    image: "/images/caredigital-hidratacao.webp",
  },
  {
    to: "/dietas",
    title: "Alimentação",
    description: "Refeições programadas, cardápios e macros.",
    icon: Utensils,
    tone: "text-meal bg-meal/10",
    image: "/images/caredigital-alimentacao.webp",
  },
  {
    to: "/suplementos",
    title: "Suplementos",
    description: "Dose, horário e timer da próxima dose, com dicas de uso.",
    icon: Sparkles,
    tone: "text-primary bg-primary/10",
    image: "/images/show-suplementos.webp",
  },
  {
    to: "/peso",
    title: "Controle de peso",
    description: "Registre o peso e acompanhe a evolução, o IMC e a meta.",
    icon: Scale,
    tone: "text-activity bg-activity/10",
    image: "/images/show-peso.webp",
  },
  {
    to: "/treinos",
    title: "Treinos e corridas",
    description: "Rastreio por GPS de caminhadas e corridas, com resumo.",
    icon: Activity,
    tone: "text-activity bg-activity/10",
    image: "/images/show-treinos.webp",
  },
  {
    to: "/sono",
    title: "Monitoramento do sono",
    description: "Nota do sono, regularidade e batimentos ao vivo com sensor Bluetooth.",
    icon: BedDouble,
    tone: "text-primary bg-primary/10",
    image: "/images/show-sono.webp",
  },
  {
    to: "/metricas",
    title: "Métricas e gráficos",
    description: "Nutrição, água, peso e atividade em gráficos claros.",
    icon: BarChart3,
    tone: "text-primary bg-primary/10",
    image: "/images/show-metricas.webp",
  },
  {
    to: "/protocolos",
    title: "Como funciona",
    description: "Conheça cada recurso e veja o passo a passo da plataforma.",
    icon: HeartPulse,
    tone: "text-primary bg-primary/10",
    image: "/images/caredigital-care-hero.webp",
  },
] as const;

/** Mosaico das áreas da plataforma: cada foto leva à página da área e mostra tudo o que o NextVita oferece. */
const mosaicAreas = [
  { to: "/dietas", label: "Alimentação", icon: Utensils, img: "/images/hero-alimentacao.webp", cls: "col-span-2 row-span-2", wide: true },
  { to: "/hidratacao", label: "Hidratação", icon: Droplets, img: "/images/hero-hidratacao.webp", cls: "", wide: false },
  { to: "/medicamentos", label: "Medicação", icon: Pill, img: "/images/hero-medicamentos.webp", cls: "", wide: false },
  { to: "/suplementos", label: "Suplementos", icon: Sparkles, img: "/images/hero-suplementos.webp", cls: "", wide: false },
  { to: "/peso", label: "Peso", icon: Scale, img: "/images/hero-peso.webp", cls: "", wide: false },
  { to: "/treinos", label: "Treinos", icon: Activity, img: "/images/hero-treinos.webp", cls: "col-span-2", wide: true },
  { to: "/sono", label: "Sono", icon: BedDouble, img: "/images/hero-sono.webp", cls: "", wide: false },
  { to: "/metricas", label: "Métricas", icon: BarChart3, img: "/images/hero-metricas.webp", cls: "", wide: false },
] as const;

function HeroMosaic() {
  return (
    <div className="relative order-last px-3 pb-4 sm:order-first sm:p-5 sm:pb-0 lg:order-last lg:p-5 lg:pl-0">
      <div className="relative grid grid-cols-4 grid-rows-3 gap-2 max-sm:grid-rows-2 sm:h-[22rem] sm:gap-2.5 lg:h-[min(50vh,28rem)]">
        {mosaicAreas.map((area, i) => (
          <Link key={area.to} to={area.to} aria-label={area.label}
            className={`group relative isolate overflow-hidden rounded-2xl bg-slate-900 shadow-lg ring-1 ring-white/15 max-sm:aspect-[3/4] max-sm:!col-span-1 max-sm:!row-span-1 ${area.cls}`}>
            <img src={area.img} alt="" aria-hidden="true" width={area.wide ? 960 : 640} height={area.wide ? 600 : 400} loading={i < 3 ? "eager" : "lazy"} decoding="async"
              className="absolute inset-0 -z-10 size-full object-cover motion-safe:transition motion-safe:duration-700 motion-safe:group-hover:scale-105" />
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
            <span className="absolute inset-x-1 bottom-1 flex items-center gap-1.5 rounded-xl bg-slate-950/60 px-2 py-1.5 text-xs font-bold text-white backdrop-blur max-sm:flex-col max-sm:gap-0.5 max-sm:px-0.5 sm:inset-x-2 sm:bottom-2 sm:text-[13px]">
              <area.icon size={14} className="shrink-0 text-emerald-300" />
              <span className="max-sm:max-w-full max-sm:truncate">{area.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Homepage() {
  const { status, name } = useAccess();

  if (status === "loading")
    return (
      <div role="status" className="grid h-full place-items-center text-sm text-muted-foreground">
        Preparando sua página…
      </div>
    );
  const panel = status === "client" ? "/cliente" : status === "admin" ? "/admin" : null;
  const clientTargets: Record<string, string> = {
    Medicações: "/cliente#medicacao",
    Hidratação: "/cliente#minha-hidratacao",
    Alimentação: "/cliente#alimentacao",
    Histórico: "/cliente#historico",
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-none flex-col gap-4 lg:gap-5">
      {status === "unlinked" && (
        <p
          role="status"
          className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm"
        >
          Sua conta está conectada, mas ainda não há um prontuário vinculado. Solicite o acesso ao
          administrador.
        </p>
      )}

      <MobileHero client={status === "client"} name={name || ""} panel={panel} />

      <section
        aria-labelledby="home-title"
        className="nv-dark relative isolate hidden overflow-hidden rounded-3xl bg-gradient-to-br from-[#041f1d] via-[#0a3f39] to-[#0e6b5c] shadow-pop sm:grid lg:min-h-[min(58vh,560px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 -z-10 size-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-10 -z-10 size-96 rounded-full bg-teal-300/15 blur-3xl" />
        <div className="px-4 pb-5 pt-4 text-white sm:px-8 sm:py-6 lg:px-10 lg:py-7">
          <Link
            to="/loja"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold text-white backdrop-blur hover:bg-white/15"
          >
            <ShoppingBag size={15} aria-hidden="true" className="text-amber-300" /> Conheça a nova Loja NextVita
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <h1
            id="home-title"
            className="mt-3 text-balance text-[1.8rem] font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-[clamp(2.5rem,4vw,3.75rem)]"
          >
            {status === "client" ? (
              <>
                Olá, <span className="text-[#9be9da]">{(name || "usuário").split(" ")[0]}</span>.
                <br />
                Veja sua evolução em um só lugar.
              </>
            ) : (
              <>
                Sua rotina de <span className="whitespace-nowrap">bem-estar</span>,{" "}
                <span className="text-[#9be9da]">organizada em um só lugar.</span>
              </>
            )}
          </h1>
          <p className="mt-2.5 max-w-[48ch] text-sm leading-snug text-slate-200 sm:mt-3 sm:text-[15px]">
            {status === "client"
              ? "Acompanhe suas métricas, hábitos, hidratação, alimentação, suplementos e evolução ao longo do tempo."
              : "Nutrição, hidratação, peso, suplementos e hábitos acompanhados com horários, lembretes e registros confiáveis."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {panel ? (
              <>
                <Link
                  to={panel}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
                >
                  <LayoutDashboard size={17} aria-hidden="true" /> Voltar ao meu painel <ArrowRight size={16} aria-hidden="true" />
                </Link>
                {status === "client" && <LiveModeLauncher className="!h-11 !px-5 !text-sm" />}
              </>
            ) : (
              <>
                <a
                  href="/entrar?mode=signup"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-emerald-300"
                >
                  <Gift size={17} aria-hidden="true" /> Criar conta grátis
                </a>
                <Link
                  to="/entrar"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <LockKeyhole size={17} aria-hidden="true" /> Entrar
                </Link>
              </>
            )}
            <Link
              to="/loja"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-amber-50"
            >
              <ShoppingBag size={17} aria-hidden="true" /> Visitar a loja
            </Link>
          </div>
          <ul className="mt-6 hidden flex-wrap gap-x-5 sm:flex gap-y-2 text-[13px] text-slate-200">
            <li className="inline-flex items-center gap-1.5">
              <CalendarCheck size={15} /> Rotina por horários
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Clock3 size={15} /> Registro com hora real
            </li>
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck size={15} /> Acesso individual
            </li>
          </ul>
        </div>
        <HeroMosaic />
      </section>

      <HomeStore />

      <MobileAreas />

      {status === "client" && (
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950 to-slate-900 p-1">
          <HomeNextCareCard panel="/cliente" />
        </div>
      )}

      {status === "client" && <HomeModalityTimers />}

      <a
        href={status === "client" ? "/cliente#sono" : "/sono"}
        className="nv-dark group relative isolate flex min-h-[150px] shrink-0 flex-col justify-center overflow-hidden rounded-3xl bg-indigo-950 p-6 text-white shadow-card sm:p-8"
      >
        <img
          src="/images/show-sono.webp"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-y-0 right-0 -z-20 h-full w-full object-cover object-[50%_35%] motion-safe:transition motion-safe:duration-700 motion-safe:group-hover:scale-105 sm:w-3/5"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-950 from-40% via-indigo-950/80 to-violet-900/20"
        />
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          <BedDouble size={14} aria-hidden="true" /> Novo recurso
        </span>
        <strong className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
          Monitoramento do sono em tempo real
        </strong>
        <span className="mt-1 max-w-xl text-sm text-indigo-100">
          Nota do sono, horas dormidas, regularidade e batimentos ao vivo com cinta ou relógio
          Bluetooth.
        </span>
        <span className="mt-3 inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-indigo-950">
          {status === "client" ? "Abrir meu sono" : "Conhecer o recurso"} <ArrowRight size={16} />
        </span>
      </a>

      {status === "public" && <TrialAd />}

      {status === "client" && <HomeClientMetrics />}

      {status === "client" && <SmartMetricsDashboard />}

      <section aria-labelledby="home-features-title" className="shrink-0">
        <div className="mb-3 max-w-[60ch] px-1">
          <h2 id="home-features-title" className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Tudo o que você acompanha no NextVita
          </h2>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Cada área tem lembretes, registro com hora real e histórico para você ver a evolução.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ to, title, description, icon: Icon, tone, image }) => (
          <a
            key={title}
            href={status === "client" ? (clientTargets[title] ?? to) : to}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-colors hover:border-primary/40"
          >
            <span className="relative block aspect-[16/9] overflow-hidden bg-muted">
              <img
                src={image}
                alt=""
                width={1200}
                height={750}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover motion-safe:transition motion-safe:duration-500 motion-safe:group-hover:scale-105"
              />
            </span>
            <span className="flex items-start gap-3 p-4">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}>
                <Icon size={20} />
              </span>
              <span className="min-w-0">
                <strong className="flex items-center gap-1 font-display text-sm font-bold">
                  {title}{" "}
                  <ArrowRight
                    size={14}
                    className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </strong>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                  {description}
                </span>
              </span>
            </span>
          </a>
        ))}
        </div>
      </section>

      <footer className="shrink-0 rounded-2xl border border-border bg-card px-5 py-4 text-center text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">NextVita</span> · Plataforma desenvolvida por{" "}
        <Link to="/sobre" className="font-extrabold text-primary underline-offset-2 hover:underline">Franc D&apos;nis</Link>{" "}
        · Feijó, Acre — Brasil · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
