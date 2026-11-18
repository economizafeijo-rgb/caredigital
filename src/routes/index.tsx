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
  { to: "/medicamentos", client: "/cliente#medicacao", label: "Medicação", icon: Pill, tone: "text-rose-600 bg-rose-500/10" },
  { to: "/hidratacao", client: "/cliente#minha-hidratacao", label: "Hidratação", icon: Droplets, tone: "text-sky-600 bg-sky-500/10" },
  { to: "/dietas", client: "/cliente#alimentacao", label: "Alimentação", icon: Utensils, tone: "text-emerald-700 bg-emerald-500/10" },
  { to: "/suplementos", client: "/suplementos", label: "Suplementos", icon: Sparkles, tone: "text-violet-600 bg-violet-500/10" },
  { to: "/peso", client: "/peso", label: "Peso", icon: Scale, tone: "text-fuchsia-600 bg-fuchsia-500/10" },
  { to: "/treinos", client: "/treinos", label: "Treinos", icon: Activity, tone: "text-orange-600 bg-orange-500/10" },
  { to: "/sono", client: "/cliente#sono", label: "Sono", icon: BedDouble, tone: "text-indigo-600 bg-indigo-500/10" },
  { to: "/metricas", client: "/metricas", label: "Métricas", icon: BarChart3, tone: "text-teal-700 bg-teal-500/10" },
  { to: "/protocolos", client: "/protocolos", label: "Como funciona", icon: HeartPulse, tone: "text-primary bg-primary/10" },
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
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 lg:gap-4">
      {status === "unlinked" && (
        <p role="status" className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          Sua conta está conectada, mas ainda não há um prontuário vinculado. Solicite o acesso ao administrador.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-4">
        <section
          aria-labelledby="home-title"
          className="nv-dark relative isolate flex flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#041f1d] via-[#0a3f39] to-[#0e6b5c] p-5 text-white sm:p-7"
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

      <nav aria-label="Áreas da plataforma" className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0 lg:grid-cols-9 [&::-webkit-scrollbar]:hidden">
        {areas.map((a) => (
          <a
            key={a.to}
            href={client ? a.client : a.to}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] font-semibold hover:border-primary/40 sm:flex-col sm:gap-1.5 sm:py-3 sm:text-center"
          >
            <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${a.tone}`}>
              <a.icon size={17} aria-hidden="true" />
            </span>
            {a.label}
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

      <footer className="grid gap-4 rounded-2xl border border-border bg-card p-5 text-sm md:grid-cols-[1.2fr_1fr_1.3fr] md:items-center">
        <div>
          <p className="font-display text-base font-extrabold">NextVita</p>
          <p className="mt-1 max-w-[40ch] text-muted-foreground">Bem-estar organizado: rotina, lembretes e loja no mesmo app. Gratuito para usar.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Desenvolvido por <Link to="/sobre" className="font-semibold text-foreground hover:underline">Franc D&apos;nis</Link> · Feijó, Acre · © {new Date().getFullYear()}
          </p>
        </div>
        <nav aria-label="Links do rodapé" className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Link to="/loja" className="text-muted-foreground hover:text-foreground">Loja NextVita</Link>
          <Link to="/protocolos" className="text-muted-foreground hover:text-foreground">Como funciona</Link>
          <Link to="/lojista" className="text-muted-foreground hover:text-foreground">Seja lojista</Link>
          <Link to="/metricas" className="text-muted-foreground hover:text-foreground">Métricas</Link>
          <Link to="/sobre" className="text-muted-foreground hover:text-foreground">Sobre</Link>
          {!panel && <a href="/entrar?mode=signup" className="font-semibold text-primary hover:underline">Criar conta grátis</a>}
        </nav>
        <QrShareCard variant="footer" className="w-full" />
      </footer>
    </div>
  );
}
