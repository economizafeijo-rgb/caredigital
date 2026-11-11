import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, Check, Clock3, Droplets, History, LockKeyhole, Pill, ShieldCheck, Utensils } from "lucide-react";
import { useAccess } from "@/lib/use-access";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareDigital — Cuidado organizado" },
      { name: "description", content: "Acompanhe tratamentos, medicação, refeições e hidratação em um só lugar." },
      { property: "og:title", content: "CareDigital — Cuidado organizado" },
      { property: "og:description", content: "Um espaço simples e seguro para sua rotina de cuidados." },
    ],
  }),
  component: Homepage,
});

const features = [
  { to: "/medicamentos", title: "Medicações", description: "Cartela interativa, horários e confirmação de cada dose.", icon: Pill, tone: "text-med bg-med/10" },
  { to: "/hidratacao", title: "Hidratação", description: "Meta diária calculada e registro de cada copo.", icon: Droplets, tone: "text-water bg-water/10" },
  { to: "/dietas", title: "Alimentação", description: "Refeições programadas, cardápios e macros.", icon: Utensils, tone: "text-meal bg-meal/10" },
  { to: "/protocolos", title: "Histórico", description: "Tudo fica registrado com data e hora reais.", icon: History, tone: "text-activity bg-activity/10" },
] as const;

// Prévia ilustrativa do painel: valores de exemplo, não são dados de um paciente.
const previewCare = [
  { time: "07:00", title: "Medicação da manhã", icon: Pill, tone: "text-med bg-med/10", done: true },
  { time: "09:30", title: "Água · 250 ml", icon: Droplets, tone: "text-water bg-water/10", done: true },
  { time: "12:00", title: "Almoço", icon: Utensils, tone: "text-meal bg-meal/10", done: false },
  { time: "19:00", title: "Medicação da noite", icon: Pill, tone: "text-med bg-med/10", done: false },
] as const;

function DashboardPreview() {
  return <div aria-hidden="true" className="relative mx-auto w-full max-w-[460px]">
    <div className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-br from-primary/20 via-water/10 to-transparent blur-2xl"/>
    <div className="rounded-2xl border border-border bg-card p-4 shadow-pop">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Hoje</p>
          <p className="font-display text-lg font-bold">Sua rotina de cuidados</p>
        </div>
        <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">2 de 4 concluídos</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-1/2 rounded-full bg-primary"/></div>
      <ul className="mt-3 grid gap-1.5">
        {previewCare.map(({ time, title, icon: Icon, tone, done }) => <li key={time} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
          <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={16}/></span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{title}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{time}</span>
          <span className={`grid size-5 shrink-0 place-items-center rounded-full ${done ? "bg-success text-white" : "border border-input"}`}>{done && <Check size={12} strokeWidth={3}/>}</span>
        </li>)}
      </ul>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-water/10 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-water"><Droplets size={13}/> Água</p>
          <p className="mt-1 font-display text-lg font-bold tabular-nums">1.250<span className="ml-1 text-xs font-medium text-muted-foreground">/ 2.400 ml</span></p>
        </div>
        <div className="rounded-xl bg-med/10 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-med"><Clock3 size={13}/> Próximo cuidado</p>
          <p className="mt-1 font-display text-lg font-bold tabular-nums">12:00<span className="ml-1 text-xs font-medium text-muted-foreground">Almoço</span></p>
        </div>
      </div>
    </div>
    <p className="mt-2 text-center text-[11px] text-muted-foreground">Prévia ilustrativa do painel do paciente</p>
  </div>;
}

function Homepage() {
  const { status } = useAccess();

  if (status === "loading") return <div role="status" className="grid h-full place-items-center text-sm text-muted-foreground">Preparando sua página…</div>;
  if (status === "client") return <Navigate to="/cliente"/>;
  if (status === "admin") return <Navigate to="/admin"/>;

  return <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-5 lg:gap-6">
    {status === "unlinked" && <p role="status" className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
      Sua conta está conectada, mas ainda não há um prontuário vinculado. Solicite o acesso ao administrador.
    </p>}

    <section aria-labelledby="home-title" className="grid flex-1 items-center gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-10">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          <ShieldCheck size={14}/> Acompanhamento individual e protegido
        </span>
        <h1 id="home-title" className="mt-4 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
          Sua rotina de cuidados, <span className="text-primary">organizada em um só lugar.</span>
        </h1>
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
          Medicações, refeições e hidratação com horários, lembretes e registros confiáveis — para você e para quem acompanha o seu tratamento.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to="/entrar" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110">
            <LockKeyhole size={17}/> Acessar minha conta <ArrowRight size={16}/>
          </Link>
          <Link to="/protocolos" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-accent">
            Como funciona
          </Link>
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
          <li className="inline-flex items-center gap-1.5"><CalendarCheck size={15} className="text-primary"/> Rotina por horários</li>
          <li className="inline-flex items-center gap-1.5"><Clock3 size={15} className="text-primary"/> Registro com hora real</li>
          <li className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-primary"/> Acesso individual</li>
        </ul>
      </div>
      <DashboardPreview/>
    </section>

    <section aria-label="Recursos da plataforma" className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {features.map(({ to, title, description, icon: Icon, tone }) => (
        <Link key={title} to={to} className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={20}/></span>
          <span className="min-w-0">
            <strong className="flex items-center gap-1 font-display text-sm font-bold">{title} <ArrowRight size={14} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"/></strong>
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{description}</span>
          </span>
        </Link>
      ))}
    </section>

    <footer className="shrink-0 border-t border-border pt-3 text-center text-xs text-muted-foreground">
      CareDigital · Desenvolvido por <strong className="font-semibold text-foreground">Franc D&apos;nis</strong> · Feijó, Acre
    </footer>
  </div>;
}
