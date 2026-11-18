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
} from "lucide-react";
import { useAccess } from "@/lib/use-access";
import { LiveModeLauncher } from "@/components/vigia/LiveMode";
import { HomeStore } from "@/components/vigia/HomeStore";
import { SmartBanner, ToolDemo } from "@/components/vigia/SmartBanner";
import { AppShowcase } from "@/components/vigia/AppShowcase";
import { QrShareCard } from "@/components/vigia/QrShareCard";
import { PartnerCommercial } from "@/components/vigia/PartnerCommercial";
import { HomeBottomArt, HomeSideArt } from "@/components/vigia/HomeDecor";
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

/** Áreas da plataforma: atalhos compactos. Para clientes, levam direto à seção do painel. */
const areas = [
  { to: "/medicamentos", client: "/cliente#medicacao", label: "Medicação", hint: "Doses e horários", icon: Pill, tone: "text-rose-600 bg-rose-500/10", color: "#e11d48" },
  { to: "/hidratacao", client: "/cliente#minha-hidratacao", label: "Hidratação", hint: "Meta de água", icon: Droplets, tone: "text-sky-600 bg-sky-500/10", color: "#0284c7" },
  { to: "/dietas", client: "/cliente#alimentacao", label: "Alimentação", hint: "Refeições e macros", icon: Utensils, tone: "text-emerald-700 bg-emerald-500/10", color: "#059669" },
  { to: "/suplementos", client: "/suplementos", label: "Suplementos", hint: "Timer de doses", icon: Sparkles, tone: "text-violet-600 bg-violet-500/10", color: "#7c3aed" },
  { to: "/peso", client: "/peso", label: "Peso", hint: "Evolução e IMC", icon: Scale, tone: "text-fuchsia-600 bg-fuchsia-500/10", color: "#c026d3" },
  { to: "/treinos", client: "/treinos", label: "Treinos", hint: "Corridas com GPS", icon: Activity, tone: "text-orange-600 bg-orange-500/10", color: "#ea580c" },
  { to: "/sono", client: "/cliente#sono", label: "Sono", hint: "Batimentos ao vivo", icon: BedDouble, tone: "text-indigo-600 bg-indigo-500/10", color: "#4f46e5" },
  { to: "/metricas", client: "/metricas", label: "Métricas", hint: "Gráficos do mês", icon: BarChart3, tone: "text-teal-700 bg-teal-500/10", color: "#0d9488" },
  { to: "/protocolos", client: "/protocolos", label: "Como funciona", hint: "Passo a passo", icon: HeartPulse, tone: "text-primary bg-primary/10", color: "#0c8063" },
] as const;

function Homepage() {
  const { status, name } = useAccess();

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
    <div className="relative z-10 mx-auto flex w-full flex-col gap-3 lg:gap-4 min-[1280px]:px-[4.25rem]">
      {status === "unlinked" && (
        <p role="status" className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          Sua conta está conectada, mas ainda não há um prontuário vinculado. Solicite o acesso ao administrador.
        </p>
      )}

      <SmartBanner intro={{
        id: "intro", kicker: "NextVita", chapter: "A plataforma", title: "", text: "", cta: "", to: "/entrar", images: [],
        bg: "/images/show-treinos.webp", tone: "from-[#041f1d] via-[#0a3f39] to-[#0e6b5c]",
        custom: (
          <>
            <p className="nv-rise inline-flex w-fit items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur"><ShieldCheck size={13} className="text-emerald-300" aria-hidden="true" /> Grátis e protegido</p>
            <h1 id="home-title" style={{ animationDelay: "150ms" }} className="nv-rise mt-3 text-balance font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight sm:text-[2.4rem] xl:text-[2.9rem]">
              {client ? `Olá, ${firstName}. Sua evolução em um só lugar.` : "Sua rotina de bem-estar, organizada em um só lugar."}
            </h1>
            <p style={{ animationDelay: "300ms" }} className="nv-rise mt-3 max-w-[46ch] text-sm leading-relaxed text-slate-200 sm:text-base">
              {client ? "Acompanhe métricas, hidratação, alimentação, suplementos e sono ao longo do tempo." : "Nutrição, hidratação, peso, suplementos e hábitos com horários, lembretes e registros confiáveis."}
            </p>
            <div style={{ animationDelay: "450ms" }} className="nv-rise mt-5 flex flex-wrap gap-2">
              {panel ? (
                <>
                  <Link to={panel} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-slate-950 hover:bg-emerald-300"><LayoutDashboard size={16} aria-hidden="true" /> Abrir meu painel</Link>
                  {client && <LiveModeLauncher className="!h-11 !px-4 !text-sm" />}
                </>
              ) : (
                <>
                  <a href="/entrar?mode=signup" className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-slate-950 hover:bg-emerald-300"><Gift size={16} aria-hidden="true" /> Criar conta grátis</a>
                  <Link to="/entrar" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-5 text-sm font-semibold text-white backdrop-blur hover:bg-white/15"><LockKeyhole size={16} aria-hidden="true" /> Entrar</Link>
                </>
              )}
            </div>
            <ul style={{ animationDelay: "600ms" }} className="nv-rise mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-slate-200">
              <li className="inline-flex items-center gap-1.5"><CalendarCheck size={14} aria-hidden="true" /> Rotina por horários</li>
              <li className="inline-flex items-center gap-1.5"><Clock3 size={14} aria-hidden="true" /> Registro com hora real</li>
              <li className="inline-flex items-center gap-1.5"><ShieldCheck size={14} aria-hidden="true" /> Dados protegidos</li>
            </ul>
          </>
        ),
        art: (
          <div className="relative hidden pr-6 sm:block">
            <div className="nv-float"><ToolDemo kind="agua" /></div>
            <div className="nv-float absolute -bottom-14 -left-24 hidden lg:block" style={{ animationDelay: "1.4s" }}><ToolDemo kind="medicacao" /></div>
          </div>
        ),
      }} />

      <nav aria-label="Áreas da plataforma" className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        {areas.map((a) => (
          <a
            key={a.to}
            href={client ? a.client : a.to}
            style={{ "--tile": a.color } as React.CSSProperties}
            className="nv-tile flex shrink-0 flex-col items-center gap-1.5 overflow-hidden rounded-xl border border-border bg-card px-2 py-2.5 text-center text-[12px] font-semibold sm:px-3 sm:py-3 sm:text-[13px]"
          >
            <span className={`nv-tile-icon grid size-8 shrink-0 place-items-center rounded-lg ${a.tone}`}>
              <a.icon size={17} aria-hidden="true" />
            </span>
            <span className="flex flex-col">
              {a.label}
              <span className="nv-tile-hint hidden text-[11px] font-medium text-muted-foreground sm:block">{a.hint}</span>
            </span>
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
      {client && <HomeClientMetrics />}
      {client && <SmartMetricsDashboard />}

      <HomeBottomArt />

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-border bg-card px-5 py-3.5 text-sm">
        <div className="min-w-0">
          <p className="font-display text-base font-extrabold leading-tight">NextVita</p>
          <p className="text-xs text-muted-foreground">Bem-estar organizado: rotina, lembretes e loja no mesmo app.</p>
        </div>
        <nav aria-label="Links do rodapé" className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          <Link to="/loja" className="text-muted-foreground hover:text-foreground">Loja</Link>
          <Link to="/protocolos" className="text-muted-foreground hover:text-foreground">Como funciona</Link>
          <Link to="/lojista" className="text-muted-foreground hover:text-foreground">Seja lojista</Link>
          <Link to="/metricas" className="text-muted-foreground hover:text-foreground">Métricas</Link>
          <Link to="/sobre" className="text-muted-foreground hover:text-foreground">Sobre</Link>
          {!panel && <a href="/entrar?mode=signup" className="font-semibold text-primary hover:underline">Criar conta grátis</a>}
        </nav>
        <QrShareCard variant="footer" className="ml-auto w-full sm:w-auto" />
        <p className="w-full border-t border-border pt-2.5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} NextVita · Desenvolvido por <Link to="/sobre" className="font-semibold text-foreground hover:underline">Franc D&apos;nis</Link> · Feijó, Acre
        </p>
      </footer>
    </div>
    </>
  );
}
