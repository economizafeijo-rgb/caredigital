import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, BadgeCheck, CalendarCheck, CheckCircle2, Clock3, Droplets, Dumbbell, Gift, History, LayoutDashboard, LockKeyhole, Pill, ShieldCheck, Sparkles, UserPlus, Utensils,
} from "lucide-react";
import { useAccess } from "@/lib/use-access";
import { HomeNextCareCard } from "@/components/vigia/CareTimer";
import { HomeClientMetrics } from "@/components/vigia/HomeClientMetrics";
import { LogoMark } from "@/components/vigia/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareDigital — Cuidado organizado" },
      { name: "description", content: "Acompanhe tratamentos, medicação, refeições e hidratação em um só lugar. Teste grátis por 7 dias." },
      { property: "og:title", content: "CareDigital — Cuidado organizado" },
      { property: "og:description", content: "Um espaço simples e seguro para sua rotina de cuidados." },
    ],
  }),
  component: Homepage,
});

const features = [
  { to: "/medicamentos", title: "Medicações", text: "Cartela interativa, horários com timer e confirmação de cada dose.", icon: Pill, image: "/images/caredigital-medicamentos.webp", gradient: "from-rose-600 to-pink-500" },
  { to: "/hidratacao", title: "Hidratação", text: "Meta diária calculada e o horário do próximo copo.", icon: Droplets, image: "/images/caredigital-hidratacao.webp", gradient: "from-sky-600 to-cyan-500" },
  { to: "/dietas", title: "Alimentação", text: "Refeições, cardápios e cálculo automático de nutrientes.", icon: Utensils, image: "/images/caredigital-alimentacao.webp", gradient: "from-emerald-600 to-lime-500" },
  { to: "/nutricao-esportiva", title: "Suplementos e treino", text: "Doses, horários e dicas para quem treina.", icon: Dumbbell, image: "/images/caredigital-esporte.webp", gradient: "from-violet-600 to-amber-500" },
  { to: "/protocolos", title: "Histórico", text: "Tudo registrado com data e hora reais, sempre à mão.", icon: History, image: "/images/caredigital-historico.webp", gradient: "from-indigo-600 to-blue-500" },
] as const;

const steps = [
  { icon: UserPlus, title: "Crie sua conta", text: "Nome, e-mail e senha. Leva menos de um minuto." },
  { icon: Gift, title: "Ative 7 dias grátis", text: "Painel completo liberado, sem cartão e sem compromisso." },
  { icon: Sparkles, title: "Siga o roteiro", text: "Cinco passos guiados mostram cada recurso na prática." },
] as const;

const numbers = [
  { value: "7 dias", label: "de teste grátis", icon: Gift },
  { value: "10 áreas", label: "de acompanhamento", icon: LayoutDashboard },
  { value: "Hora real", label: "em cada registro (Acre)", icon: Clock3 },
  { value: "Individual", label: "acesso protegido", icon: ShieldCheck },
] as const;

function PreviewCard() {
  const rows = [["08:00", "Losartana 50 mg", "Tomado", "bg-emerald-500"], ["10:30", "Água · 250 ml", "Tomado", "bg-emerald-500"], ["12:30", "Almoço", "Próximo", "bg-amber-500"], ["21:00", "Magnésio 300 mg", "Agendado", "bg-slate-400"]];
  return <div className="rounded-3xl border border-white/15 bg-white/10 p-4 text-white shadow-2xl backdrop-blur-md" aria-hidden="true">
    <div className="flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-white/70">Exemplo · seu dia</p><span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">50%</span></div>
    <ul className="mt-3 grid gap-2">{rows.map(([time, title, state, dot]) => <li key={time} className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5">
      <span className="font-mono text-sm font-bold tabular-nums">{time}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
      <span className="inline-flex items-center gap-1.5 text-xs text-white/80"><i className={`size-2 rounded-full ${dot}`}/>{state}</span></li>)}</ul>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><i className="block h-full w-1/2 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"/></div>
  </div>;
}

function Homepage() {
  const { status } = useAccess();

  if (status === "loading") return <div role="status" className="grid h-full place-items-center text-sm text-muted-foreground">Preparando sua página…</div>;
  const panel = status === "client" ? "/cliente" : status === "admin" ? "/admin" : null;
  const visitor = !panel;
  const cta = "inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold shadow-sm transition hover:brightness-110";

  return <div className="mx-auto flex min-h-full w-full max-w-[1320px] flex-col gap-4 lg:gap-5">
    {status === "unlinked" && <p role="status" className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
      Sua conta está conectada, mas ainda não há um prontuário vinculado. <Link to="/cliente" className="font-bold underline">Ative seu teste grátis</Link> ou solicite o acesso ao administrador.
    </p>}

    <section aria-labelledby="home-title" className="relative isolate grid flex-1 items-center gap-6 overflow-hidden rounded-3xl bg-slate-950 p-6 shadow-pop sm:p-8 lg:min-h-[440px] lg:grid-cols-[1.15fr_.85fr] lg:gap-10 lg:p-12">
      <img src="/images/caredigital-care-hero.webp" alt="" aria-hidden="true" width={1672} height={941} loading="eager" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover object-[72%_25%]"/>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/30 max-lg:bg-slate-950/80"/>
      <div className="text-white">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1 pl-1.5 pr-3 text-xs font-semibold backdrop-blur"><LogoMark size={20}/> Acompanhamento individual e protegido</span>
        <h1 id="home-title" className="mt-4 text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.4rem]">
          Sua rotina de cuidados, <span className="bg-gradient-to-r from-sky-300 to-indigo-300 bg-clip-text text-transparent">organizada em um só lugar.</span>
        </h1>
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-slate-200 sm:text-lg">Medicações, refeições, hidratação, peso e suplementos com horários, timers e registros confiáveis, para você e para quem acompanha o seu tratamento.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {visitor ? <>
            <Link to="/teste-gratis" className={`${cta} bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950`}><Gift size={18}/> Testar grátis por 7 dias</Link>
            <Link to="/entrar" className={`${cta} border border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20`}><LockKeyhole size={17}/> Entrar</Link>
          </> : <Link to={panel} className={`${cta} bg-primary text-white`}><LayoutDashboard size={18}/> Voltar ao meu painel <ArrowRight size={16}/></Link>}
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate-200">
          <li className="inline-flex items-center gap-1.5"><CalendarCheck size={15}/> Rotina por horários</li>
          <li className="inline-flex items-center gap-1.5"><Clock3 size={15}/> Registro com hora real</li>
          <li className="inline-flex items-center gap-1.5"><BadgeCheck size={15}/> Sem cartão no teste</li>
        </ul>
      </div>
      <div className="w-full max-w-md justify-self-center lg:justify-self-end">{status === "client" ? <HomeNextCareCard panel="/cliente"/> : <PreviewCard/>}</div>
    </section>

    {status === "client" && <HomeClientMetrics/>}

    <section aria-label="Números da plataforma" className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
      {numbers.map(({ value, label, icon: Icon }) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-card sm:p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white"><Icon size={20}/></span>
        <span className="min-w-0"><strong className="block font-display text-lg font-extrabold leading-tight sm:text-xl">{value}</strong><span className="block text-xs text-muted-foreground sm:text-sm">{label}</span></span>
      </div>)}
    </section>

    <section aria-label="Recursos da plataforma" className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {features.map(({ to, title, text, icon: Icon, image, gradient }) => <Link key={title} to={to} className="group relative isolate flex min-h-[190px] flex-col justify-end overflow-hidden rounded-3xl p-5 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
        <img src={image} alt="" loading="lazy" decoding="async" width={1200} height={750} className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-500 group-hover:scale-105"/>
        <span aria-hidden="true" className={`absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent`}/>
        <span className={`mb-auto grid size-11 place-items-center rounded-xl bg-gradient-to-br shadow-md ${gradient}`}><Icon size={21}/></span>
        <strong className="mt-6 flex items-center gap-1.5 font-display text-lg font-bold">{title} <ArrowRight size={16} className="opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100"/></strong>
        <span className="text-sm text-slate-200">{text}</span>
      </Link>)}
      {visitor ? <Link to="/teste-gratis" className="group flex min-h-[190px] flex-col justify-between rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-500 p-5 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
        <Gift size={30}/><span><strong className="block font-display text-xl font-extrabold">Comece grátis hoje</strong><span className="text-sm text-white/90">7 dias com tudo liberado.</span></span>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold">Criar minha conta <ArrowRight size={16} className="transition group-hover:translate-x-1"/></span>
      </Link> : <Link to={panel} className="group flex min-h-[190px] flex-col justify-between rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-500 p-5 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
        <LayoutDashboard size={30}/><span><strong className="block font-display text-xl font-extrabold">Meu painel</strong><span className="text-sm text-white/90">Agenda, timers e registros de hoje.</span></span>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold">Abrir painel <ArrowRight size={16} className="transition group-hover:translate-x-1"/></span>
      </Link>}
    </section>

    {visitor && <section aria-label="Como funciona" className="shrink-0 rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
      <h2 className="font-display text-xl font-extrabold sm:text-2xl">Conheça a plataforma em 3 passos</h2>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }, index) => <li key={title} className="flex items-start gap-3 rounded-2xl bg-muted/50 p-4">
          <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white"><Icon size={22}/><b className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-white text-[11px] font-extrabold text-indigo-700 shadow">{index + 1}</b></span>
          <span><strong className="block">{title}</strong><span className="text-sm text-muted-foreground">{text}</span></span>
        </li>)}
      </ol>
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3">{["Sem cartão de crédito", "Cancele quando quiser", "Seus dados só você acessa"].map(item => <li key={item} className="inline-flex items-center gap-2 font-semibold"><CheckCircle2 size={17} className="text-emerald-500"/>{item}</li>)}</ul>
    </section>}

    <footer className="shrink-0 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-5 py-5 text-center text-sm text-slate-300">
      <span className="inline-flex items-center gap-2 font-semibold text-white"><LogoMark size={22}/> CareDigital</span> · Plataforma desenvolvida por <strong className="bg-gradient-to-r from-sky-300 to-fuchsia-300 bg-clip-text font-extrabold text-transparent">Franc D&apos;nis</strong> · Feijó, Acre — Brasil · © {new Date().getFullYear()}
    </footer>
  </div>;
}
