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
import { StoreBannerCarousel } from "@/components/vigia/StoreBannerCarousel";
import { StoreHeroSticker } from "@/components/vigia/StoreHeroSticker";
import { LiveModeLauncher } from "@/components/vigia/LiveMode";
import { TrialAd } from "@/components/vigia/TrialAd";
import { MobileHero } from "@/components/vigia/MobileHero";
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
    description: "Novo: nota do sono e batimentos ao vivo com sensor Bluetooth.",
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
    <div className="relative order-last px-4 pb-5 sm:order-first sm:p-6 sm:pb-0 lg:order-last lg:p-8 lg:pl-0">
      <div className="relative grid grid-cols-4 grid-rows-3 gap-2 max-sm:grid-rows-2 sm:h-[26rem] sm:gap-3 lg:h-[min(56vh,31rem)]">
        {mosaicAreas.map((area) => (
          <Link key={area.to} to={area.to} aria-label={area.label}
            className={`group relative isolate overflow-hidden rounded-2xl bg-slate-900 shadow-lg ring-1 ring-white/15 max-sm:aspect-[3/4] max-sm:!col-span-1 max-sm:!row-span-1 ${area.cls}`}>
            <img src={area.img} alt="" aria-hidden="true" width={area.wide ? 960 : 640} height={area.wide ? 600 : 400} loading="eager" decoding="async"
              className="absolute inset-0 -z-10 size-full object-cover transition duration-700 group-hover:scale-105" />
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
            <span className="absolute inset-x-1 bottom-1 flex items-center gap-1.5 rounded-xl bg-slate-950/60 px-2 py-1.5 text-[11px] font-bold text-white backdrop-blur max-sm:flex-col max-sm:gap-0.5 max-sm:px-0.5 max-sm:text-[10px] sm:inset-x-2 sm:bottom-2 sm:text-xs">
              <area.icon size={14} className="shrink-0 text-emerald-300" />
              <span className="max-sm:max-w-full max-sm:truncate">{area.label}</span>
            </span>
          </Link>
        ))}
        <StoreHeroSticker className="-bottom-7 right-1 lg:right-3" />
        <div aria-hidden="true" className="pointer-events-none absolute left-3 top-3 z-10 hidden items-center gap-2.5 rounded-2xl border border-white/30 bg-slate-950/70 px-3 py-2 text-white shadow-2xl backdrop-blur-md sm:flex">
          <svg viewBox="0 0 44 44" className="size-9 -rotate-90"><circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="5" /><circle cx="22" cy="22" r="18" fill="none" stroke="#34d399" strokeWidth="5" strokeLinecap="round" strokeDasharray="113" strokeDashoffset="19" /></svg>
          <div><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Tudo em um só lugar</p><p className="text-sm font-bold">5 de 6 metas hoje</p></div>
        </div>
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
    <div className="mx-auto flex min-h-full w-full max-w-none flex-col gap-5 lg:gap-6">
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
        className="relative isolate hidden overflow-hidden rounded-3xl bg-gradient-to-br from-[#041f1d] via-[#0a3f39] to-[#0e6b5c] shadow-pop sm:grid lg:min-h-[min(68vh,620px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 -z-10 size-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-10 -z-10 size-96 rounded-full bg-teal-300/15 blur-3xl" />
        <div className="px-5 pb-7 pt-5 text-white sm:px-10 sm:py-8 lg:px-12 lg:py-10">
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/loja" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-[0_10px_30px_-10px_rgba(251,191,36,.9)] transition hover:brightness-105">
              <span className="relative flex size-2" aria-hidden="true"><span className="absolute inline-flex size-full animate-ping rounded-full bg-slate-900 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-slate-900" /></span>
              Novidade · Loja NextVita <ArrowRight size={13} />
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <ShieldCheck size={14} /> Bem-estar protegido
            </span>
          </div>
          <h1
            id="home-title"
            className="mt-4 text-balance text-[1.9rem] font-extrabold leading-[1.1] tracking-tight sm:text-5xl"
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
          <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-slate-200 sm:mt-4 sm:text-base">
            {status === "client"
              ? "Acompanhe suas métricas, hábitos, hidratação, alimentação, suplementos e evolução ao longo do tempo."
              : "Nutrição, hidratação, peso, suplementos e hábitos acompanhados com horários, lembretes e registros confiáveis."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch max-sm:[&>a]:justify-center sm:mt-6">
            {panel ? (
              <>
                <Link
                  to={panel}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
                >
                  <LayoutDashboard size={17} /> Voltar ao meu painel <ArrowRight size={16} />
                </Link>
                {status === "client" && <LiveModeLauncher className="!h-11 !px-5 !text-sm" />}
              </>
            ) : (
              <>
                <a
                  href="/entrar?mode=signup"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 text-sm font-bold text-slate-950 shadow-sm transition hover:brightness-110"
                >
                  <Gift size={17} /> Grátis para teste
                </a>
                <Link
                  to="/entrar"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
                >
                  <LockKeyhole size={17} /> Acessar minha conta <ArrowRight size={16} />
                </Link>
              </>
            )}
            <Link
              to="/loja"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-400 px-5 text-sm font-extrabold text-slate-950 shadow-[0_12px_32px_-12px_rgba(251,191,36,.95)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              <ShoppingBag size={17} /> Visitar a loja
            </Link>
            <Link
              to="/protocolos"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Como funciona
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

      <div className="hidden sm:block"><StoreBannerCarousel /></div>

      {status === "client" && (
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950 to-slate-900 p-1">
          <HomeNextCareCard panel="/cliente" />
        </div>
      )}

      {status === "client" && <HomeModalityTimers />}

      <a
        href={status === "client" ? "/cliente#sono" : "/sono"}
        className="group relative isolate flex min-h-[150px] shrink-0 flex-col justify-center overflow-hidden rounded-3xl bg-indigo-950 p-6 text-white shadow-card sm:p-8"
      >
        <img
          src="/images/show-sono.webp"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-y-0 right-0 -z-20 h-full w-full object-cover object-[50%_35%] transition duration-700 group-hover:scale-105 sm:w-3/5"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-950 from-40% via-indigo-950/80 to-violet-900/20"
        />
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-slate-950">
          <BedDouble size={14} /> Novidade
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

      <section
        aria-label="Recursos da plataforma"
        className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {features.map(({ to, title, description, icon: Icon, tone, image }) => (
          <a
            key={title}
            href={status === "client" ? clientTargets[title] : to}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:border-primary/40"
          >
            <span className="relative block aspect-[16/9] overflow-hidden bg-muted">
              <img
                src={image}
                alt=""
                width={1200}
                height={750}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
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
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                  {description}
                </span>
              </span>
            </span>
          </a>
        ))}
      </section>

      <footer className="shrink-0 rounded-2xl border border-border bg-card px-5 py-4 text-center text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">NextVita</span> · Plataforma desenvolvida por{" "}
        <Link to="/sobre" className="font-extrabold text-primary underline-offset-2 hover:underline">Franc D&apos;nis</Link>{" "}
        · Feijó, Acre — Brasil · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
