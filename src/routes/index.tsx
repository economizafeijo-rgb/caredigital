import { useEffect } from "react";
import type React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
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
  ArrowUpRight,
} from "lucide-react";
import { useAccess } from "@/lib/use-access";
import { LiveModeLauncher } from "@/components/vigia/LiveMode";
import { HomeStore } from "@/components/vigia/HomeStore";
import { SmartBanner, ToolDemo } from "@/components/vigia/SmartBanner";
import { AppShowcase } from "@/components/vigia/AppShowcase";
import { QrEnlarge } from "@/components/vigia/QrEnlarge";
import { InstallAppButton } from "@/components/vigia/InstallApp";
import { LogoMark } from "@/components/vigia/Logo";
import { PartnerCommercial } from "@/components/vigia/PartnerCommercial";
import { HomeSideArt } from "@/components/vigia/HomeDecor";
import { HomeNextCareCard } from "@/components/vigia/CareTimer";
import { HomeModalityTimers } from "@/components/vigia/HomeModalityTimers";

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

/** Áreas da plataforma: atalhos compactos. Para clientes, levam direto à seção do painel. */
const areas = [
  {
    to: "/medicamentos",
    client: "/cliente#medicacao",
    label: "Medicação",
    hint: "Doses e horários",
    icon: Pill,
    tone: "text-rose-600 bg-rose-500/10",
    color: "#e11d48",
  },
  {
    to: "/hidratacao",
    client: "/cliente#minha-hidratacao",
    label: "Hidratação",
    hint: "Meta de água",
    icon: Droplets,
    tone: "text-sky-600 bg-sky-500/10",
    color: "#0284c7",
  },
  {
    to: "/dietas",
    client: "/cliente#alimentacao",
    label: "Alimentação",
    hint: "Refeições e macros",
    icon: Utensils,
    tone: "text-emerald-700 bg-emerald-500/10",
    color: "#059669",
  },
  {
    to: "/suplementos",
    client: "/suplementos",
    label: "Suplementos",
    hint: "Timer de doses",
    icon: Sparkles,
    tone: "text-violet-600 bg-violet-500/10",
    color: "#7c3aed",
  },
  {
    to: "/peso",
    client: "/peso",
    label: "Peso",
    hint: "Evolução e IMC",
    icon: Scale,
    tone: "text-fuchsia-600 bg-fuchsia-500/10",
    color: "#c026d3",
  },
  {
    to: "/treinos",
    client: "/treinos",
    label: "Treinos",
    hint: "Corridas com GPS",
    icon: Activity,
    tone: "text-orange-600 bg-orange-500/10",
    color: "#ea580c",
  },
  {
    to: "/sono",
    client: "/cliente#sono",
    label: "Sono",
    hint: "Batimentos ao vivo",
    icon: BedDouble,
    tone: "text-indigo-600 bg-indigo-500/10",
    color: "#4f46e5",
  },
  {
    to: "/metricas",
    client: "/metricas",
    label: "Métricas",
    hint: "Gráficos do mês",
    icon: BarChart3,
    tone: "text-teal-700 bg-teal-500/10",
    color: "#0d9488",
  },
  {
    to: "/protocolos",
    client: "/protocolos",
    label: "Como funciona",
    hint: "Passo a passo",
    icon: HeartPulse,
    tone: "text-primary bg-primary/10",
    color: "#0c8063",
  },
] as const;

function Homepage() {
  const { status, name } = useAccess();
  // Ao abrir (inclusive pelo app instalado), a página inicial sempre começa do topo.
  // Link curto das lojas: nextvita.life/?l=nome-da-loja abre a loja.
  useEffect(() => {
    const l = new URLSearchParams(window.location.search).get("l");
    if (l && /^[a-z0-9-]{2,60}$/.test(l)) window.location.replace(`/loja?loja=${l}`);
  }, []);
  useEffect(() => {
    try {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    } catch {
      /* navegador antigo */
    }
    document.getElementById("care-content")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, []);

  if (status === "loading")
    return (
      <div role="status" className="grid h-full place-items-center text-sm text-muted-foreground">
        Preparando sua página…
      </div>
    );
  const client = status === "client";
  const panel = client ? "/cliente" : status === "admin" ? "/admin" : null;
  const firstName = (name || "usuário").split(" ")[0];

  return (
    <>
      <HomeSideArt />
      <div className="relative z-10 mx-auto flex w-full flex-col gap-4 lg:gap-5 min-[1280px]:px-[1.75rem]">
        {status === "unlinked" && (
          <p
            role="status"
            className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm"
          >
            Sua conta está conectada, mas ainda não há um prontuário vinculado. Solicite o acesso ao
            administrador.
          </p>
        )}

        <SmartBanner
          intro={{
            id: "intro",
            kicker: "NextVita",
            chapter: "A plataforma",
            title: "",
            text: "",
            cta: "",
            to: "/entrar",
            images: [],
            bg: "/images/show-treinos.webp",
            tone: "from-[#041f1d] via-[#0a3f39] to-[#0e6b5c]",
            custom: (
              <>
                <h1
                  id="home-title"
                  style={{ animationDelay: "60ms" }}
                  className="nv-rise text-balance font-display text-[1.75rem] font-extrabold leading-[1.05] tracking-tight min-[400px]:text-[2rem] sm:text-[2.4rem] xl:text-[2.9rem]"
                >
                  {client
                    ? `Olá, ${firstName}. Sua evolução em um só lugar.`
                    : "Sua rotina de bem-estar, organizada em um só lugar."}
                </h1>
                <p
                  style={{ animationDelay: "300ms" }}
                  className="nv-rise mt-2.5 max-w-[46ch] text-sm leading-relaxed text-slate-200 sm:text-base"
                >
                  {client
                    ? "Acompanhe métricas, hidratação, alimentação, suplementos e sono ao longo do tempo."
                    : "Nutrição, hidratação, peso, suplementos e hábitos com horários, lembretes e registros confiáveis."}
                </p>
                <div
                  style={{ animationDelay: "450ms" }}
                  className="nv-rise mt-4 flex flex-wrap gap-2"
                >
                  {panel ? (
                    <>
                      <Link
                        to={panel}
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-slate-950 hover:bg-emerald-300"
                      >
                        <LayoutDashboard size={16} aria-hidden="true" /> Abrir meu painel
                      </Link>
                      {client && <LiveModeLauncher className="!h-11 !px-4 !text-sm" />}
                    </>
                  ) : (
                    <>
                      <a
                        href="/entrar?mode=signup"
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-slate-950 hover:bg-emerald-300"
                      >
                        <Gift size={16} aria-hidden="true" /> Criar conta grátis
                      </a>
                      <Link
                        to="/entrar"
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-5 text-sm font-semibold text-white backdrop-blur hover:bg-white/15"
                      >
                        <LockKeyhole size={16} aria-hidden="true" /> Entrar
                      </Link>
                    </>
                  )}
                </div>
                <ul
                  style={{ animationDelay: "600ms" }}
                  className="nv-rise mt-4 hidden flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-slate-200 min-[400px]:flex"
                >
                  <li className="inline-flex items-center gap-1.5">
                    <CalendarCheck size={14} aria-hidden="true" /> Rotina por horários
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <Clock3 size={14} aria-hidden="true" /> Registro com hora real
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <ShieldCheck size={14} aria-hidden="true" /> Dados protegidos
                  </li>
                </ul>
              </>
            ),
            art: (
              <div className="relative hidden pr-6 sm:block">
                <div className="nv-float">
                  <ToolDemo kind="agua" />
                </div>
                <div
                  className="nv-float absolute -bottom-14 -left-24 hidden lg:block"
                  style={{ animationDelay: "1.4s" }}
                >
                  <ToolDemo kind="medicacao" />
                </div>
              </div>
            ),
          }}
        />

        <nav
          aria-label="Áreas da plataforma"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9"
        >
          {areas.map((a) => (
            <a
              key={a.to}
              href={client ? a.client : a.to}
              style={{ "--tile": a.color } as React.CSSProperties}
              className="nv-area group relative flex min-w-0 items-center gap-2.5 overflow-hidden border border-border bg-card py-2.5 pl-3.5 pr-2.5 transition-[border-color,background-color,transform] duration-200 active:translate-y-px xl:flex-col xl:items-start xl:gap-3 xl:pb-3 xl:pt-3.5"
            >
              <span
                aria-hidden="true"
                className="nv-area-bar absolute inset-y-0 left-0 w-[3px]"
                style={{ background: a.color }}
              />
              <span
                className="nv-area-icon grid size-9 shrink-0 place-items-center border transition-colors duration-200"
                style={{
                  color: a.color,
                  borderColor: `color-mix(in srgb, ${a.color} 35%, transparent)`,
                  background: `color-mix(in srgb, ${a.color} 10%, transparent)`,
                }}
              >
                <a.icon size={18} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-[13px] font-bold">{a.label}</span>
                <span className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                  {a.hint}
                </span>
              </span>
              <ArrowUpRight
                size={14}
                aria-hidden="true"
                className="nv-area-go shrink-0 text-muted-foreground xl:absolute xl:right-2 xl:top-2"
              />
            </a>
          ))}
        </nav>

        <HomeStore />

        {!client && <AppShowcase />}

        <PartnerCommercial />

        {client && (
          <div className="rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 p-1">
            <HomeNextCareCard panel="/cliente" />
          </div>
        )}
        {client && <HomeModalityTimers />}

        <footer className="mt-1 border border-border bg-card">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 lg:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <Link to="/" className="inline-flex items-center gap-2">
                <LogoMark size={26} />
                <span className="font-display text-base font-extrabold">
                  Next<span className="text-primary">Vita</span>
                </span>
              </Link>
              <span className="hidden max-w-[16rem] text-xs leading-snug text-muted-foreground xl:block">
                Bem-estar organizado: rotina, lembretes e loja no mesmo app.
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-8 gap-y-2">
              {(
                [
                  [
                    "Ferramentas",
                    [
                      ["/hidratacao", "Hidratação"],
                      ["/medicamentos", "Medicação"],
                      ["/dietas", "Alimentação"],
                      ["/treinos", "Treinos"],
                      ["/sono", "Sono"],
                    ],
                  ],
                  [
                    "Plataforma",
                    [
                      ["/loja", "Loja"],
                      ["/lojista", "Seja lojista"],
                      ["/metricas", "Métricas"],
                      ["/protocolos", "Como funciona"],
                    ],
                  ],
                  [
                    "Empresa",
                    [
                      ["/sobre", "Sobre"],
                      ["/entrar?mode=signup", "Criar conta"],
                      ["/entrar", "Entrar"],
                      ["/parceiros", "Parcerias"],
                    ],
                  ],
                ] as const
              ).map(([title, links]) => (
                <nav key={title} aria-label={title} className="min-w-0">
                  <p className="text-[11px] font-bold text-foreground">{title}</p>
                  <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                    {links.map(([to, label]) => (
                      <li key={to}>
                        <a
                          href={to}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="hidden overflow-hidden rounded-[3px] bg-white sm:block">
                <QrEnlarge
                  variant="footer"
                  thumb={52}
                  big={280}
                  label="Abra o NextVita no celular"
                />
              </span>
              <div className="min-w-0">
                <p className="hidden text-[11px] font-semibold sm:block">Abra no celular</p>
                <div className="sm:mt-1 [&_button]:!h-7 [&_button]:!px-2.5 [&_button]:!text-xs">
                  <InstallAppButton />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-t border-border px-4 py-1.5 text-[11px] text-muted-foreground lg:px-5">
            <span>© {new Date().getFullYear()} NextVita. Todos os direitos reservados.</span>
            <span>
              Desenvolvido por{" "}
              <Link to="/sobre" className="font-semibold text-foreground hover:underline">
                Franc D&apos;nis
              </Link>{" "}
              · Feijó, Acre
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
