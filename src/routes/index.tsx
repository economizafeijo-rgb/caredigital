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
  Sparkles,
  Utensils,
} from "lucide-react";
import { useAccess } from "@/lib/use-access";
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
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-5 lg:gap-6">
      {status === "unlinked" && (
        <p
          role="status"
          className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm"
        >
          Sua conta está conectada, mas ainda não há um prontuário vinculado. Solicite o acesso ao
          administrador.
        </p>
      )}

      <section
        aria-labelledby="home-title"
        className="relative isolate flex min-h-[400px] flex-1 items-center overflow-hidden rounded-3xl bg-slate-950 shadow-pop"
      >
        <img
          src="/images/caredigital-care-hero.webp"
          alt=""
          aria-hidden="true"
          width={1672}
          height={941}
          loading="eager"
          decoding="async"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[72%_25%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/5 max-md:bg-slate-950/75"
        />
        <div className="max-w-xl px-6 py-10 text-white sm:px-10 lg:px-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <ShieldCheck size={14} /> Bem-estar pessoal, organizado e protegido
          </span>
          <h1
            id="home-title"
            className="mt-4 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl"
          >
            {status === "client" ? (
              <>
                Olá, <span className="text-[#9be9da]">{(name || "usuário").split(" ")[0]}</span>.
                <br />
                Veja sua evolução em um só lugar.
              </>
            ) : (
              <>
                Sua rotina de bem-estar,{" "}
                <span className="text-[#9be9da]">organizada em um só lugar.</span>
              </>
            )}
          </h1>
          <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-slate-200">
            {status === "client"
              ? "Acompanhe suas métricas, hábitos, hidratação, alimentação, suplementos e evolução ao longo do tempo."
              : "Nutrição, hidratação, peso, suplementos e hábitos acompanhados com horários, lembretes e registros confiáveis."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {panel ? (
              <Link
                to={panel}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                <LayoutDashboard size={17} /> Voltar ao meu painel <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <a
                  href="/entrar?mode=signup"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 text-sm font-bold text-slate-950 shadow-sm transition hover:brightness-110"
                >
                  <Gift size={17} /> Testar grátis por 7 dias
                </a>
                <Link
                  to="/entrar"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                >
                  <LockKeyhole size={17} /> Acessar minha conta <ArrowRight size={16} />
                </Link>
              </>
            )}
            <Link
              to="/protocolos"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Como funciona
            </Link>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate-200">
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
        {status === "client" && (
          <div className="absolute bottom-6 right-6 hidden w-[380px] lg:block">
            <HomeNextCareCard panel="/cliente" />
          </div>
        )}
      </section>

      {status === "client" && (
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950 to-slate-900 p-1 lg:hidden">
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

      {status === "public" && (
        <section
          aria-labelledby="free-signup-title"
          className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-[#0b302d] via-[#0e5f54] to-[#0e8a6a] px-6 py-6 text-white shadow-pop sm:px-8 sm:py-7"
        >
          <div
            aria-hidden="true"
            className="absolute -right-10 -top-16 size-48 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-emerald-100/80">
                NextVita · acesso gratuito
              </p>
              <h2
                id="free-signup-title"
                className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl"
              >
                Cuide do seu corpo com mais clareza e constância.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-50/85">
                Teste grátis por 7 dias: registre suas métricas iniciais e acompanhe hidratação,
                alimentação, peso, suplementos e evolução em um só lugar.
              </p>
            </div>
            <a
              href="/entrar?mode=signup"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#0a6d58] shadow-sm transition hover:bg-emerald-50"
            >
              <Gift size={17} /> Testar grátis por 7 dias <ArrowRight size={16} />
            </a>
          </div>
        </section>
      )}

      {status === "client" && <HomeClientMetrics />}

      {status === "client" && <SmartMetricsDashboard />}

      <section
        aria-label="Recursos da plataforma"
        className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4"
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

      <footer className="shrink-0 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-5 py-4 text-center text-sm text-slate-300">
        <span className="font-semibold text-white">NextVita</span> · Plataforma desenvolvida por{" "}
        <strong className="bg-gradient-to-r from-sky-300 to-fuchsia-300 bg-clip-text font-extrabold text-transparent">
          Franc D&apos;nis
        </strong>{" "}
        · Feijó, Acre — Brasil · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
