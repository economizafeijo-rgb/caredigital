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
import { SmartBanner } from "@/components/vigia/SmartBanner";
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

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-4">
        <section aria-labelledby="home-title-m" className="nv-dark relative isolate overflow-hidden rounded-3xl bg-slate-950 text-white sm:hidden">
          <img src="/images/caredigital-care-hero.webp" alt="" aria-hidden="true" width={1200} height={752} className="absolute inset-0 -z-20 size-full object-cover object-[68%_20%]" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/30 via-slate-950/75 to-[#04140f]" />
          <div className="flex min-h-[30rem] flex-col justify-end gap-3 p-5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur"><ShieldCheck size={13} className="text-emerald-300" aria-hidden="true" /> Grátis e protegido</span>
            <h1 id="home-title-m" className="text-balance font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight">
              {client ? `Olá, ${firstName}. Sua evolução em um só lugar.` : "Sua saúde e sua rotina, organizadas num só app."}
            </h1>
            <ul className="grid grid-cols-4 gap-2">
              {areas.slice(0, 8).map((a) => (
                <li key={a.to}>
                  <a href={client ? a.client : a.to} className="flex flex-col items-center gap-1 rounded-2xl border border-white/15 bg-white/10 px-1 py-2.5 text-[11px] font-semibold backdrop-blur active:scale-95">
                    <span className="grid size-8 place-items-center rounded-xl" style={{ background: `${a.color}33`, color: "#fff" }}><a.icon size={17} aria-hidden="true" /></span>
                    <span className="max-w-full text-center text-[10px] leading-tight">{a.label}</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2">
              {panel ? (
                <Link to={panel} className="col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-[15px] font-bold text-slate-950"><LayoutDashboard size={17} aria-hidden="true" /> Abrir meu painel</Link>
              ) : (
                <>
                  <a href="/entrar?mode=signup" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-[15px] font-bold text-slate-950"><Gift size={17} aria-hidden="true" /> Criar conta</a>
                  <Link to="/entrar" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/30 text-[15px] font-semibold"><LockKeyhole size={17} aria-hidden="true" /> Entrar</Link>
                </>
              )}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="home-title"
          className="nv-dark relative isolate hidden flex-col justify-center overflow-hidden rounded-2xl sm:flex bg-gradient-to-br from-[#041f1d] via-[#0a3f39] to-[#0e6b5c] p-5 text-white sm:p-7"
        >
          <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 -z-10 size-72 rounded-full bg-emerald-400/20 blur-3xl" />
          <h1 id="home-title" className="text-balance font-display text-[1.7rem] font-extrabold leading-[1.1] tracking-tight sm:text-[2.1rem] xl:text-[2.4rem]">
            {client ? `Olá, ${firstName}. Sua evolução em um só lugar.` : "Sua rotina de bem-estar, organizada em um só lugar."}
          </h1>
          <p className="mt-2.5 max-w-[46ch] text-sm leading-relaxed text-slate-200 sm:text-[15px]">
            {client
              ? "Acompanhe métricas, hidratação, alimentação, suplementos e sono ao longo do tempo."
              : "Nutrição, hidratação, peso, suplementos e hábitos com horários, lembretes e registros confiáveis."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {panel ? (
              <>
                <Link to={panel} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-bold text-slate-950 hover:bg-emerald-300">
                  <LayoutDashboard size={16} aria-hidden="true" /> Voltar ao meu painel
                </Link>
                {client && <LiveModeLauncher className="!h-10 !px-4 !text-sm" />}
              </>
            ) : (
              <>
                <a href="/entrar?mode=signup" className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-bold text-slate-950 hover:bg-emerald-300">
                  <Gift size={16} aria-hidden="true" /> Criar conta grátis
                </a>
                <Link to="/entrar" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/30 px-4 text-sm font-semibold text-white hover:bg-white/10">
                  <LockKeyhole size={16} aria-hidden="true" /> Entrar
                </Link>
              </>
            )}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-slate-200">
            <li className="inline-flex items-center gap-1.5"><CalendarCheck size={14} aria-hidden="true" /> Rotina por horários</li>
            <li className="inline-flex items-center gap-1.5"><Clock3 size={14} aria-hidden="true" /> Registro com hora real</li>
            <li className="inline-flex items-center gap-1.5"><ShieldCheck size={14} aria-hidden="true" /> Dados protegidos</li>
          </ul>
        </section>

        <SmartBanner />
      </div>

      <nav aria-label="Áreas da plataforma" className="hidden gap-2 sm:grid sm:grid-cols-5 lg:grid-cols-9">
        {areas.map((a) => (
          <a
            key={a.to}
            href={client ? a.client : a.to}
            style={{ "--tile": a.color } as React.CSSProperties}
            className="nv-tile flex shrink-0 items-center gap-2 overflow-hidden rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] font-semibold sm:flex-col sm:gap-1.5 sm:py-3 sm:text-center"
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
