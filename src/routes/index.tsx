import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, Clock3, Droplets, History, LayoutDashboard, LockKeyhole, Pill, ShieldCheck, Utensils } from "lucide-react";
import { useAccess } from "@/lib/use-access";
import { HomeNextCareCard } from "@/components/vigia/CareTimer";

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
  { to: "/medicamentos", title: "Medicações", description: "Cartela interativa, horários e confirmação de cada dose.", icon: Pill, tone: "text-med bg-med/10", image: "/images/caredigital-medicamentos.webp" },
  { to: "/hidratacao", title: "Hidratação", description: "Meta diária calculada e registro de cada copo.", icon: Droplets, tone: "text-water bg-water/10", image: "/images/caredigital-hidratacao.webp" },
  { to: "/dietas", title: "Alimentação", description: "Refeições programadas, cardápios e macros.", icon: Utensils, tone: "text-meal bg-meal/10", image: "/images/caredigital-alimentacao.webp" },
  { to: "/protocolos", title: "Histórico", description: "Tudo fica registrado com data e hora reais.", icon: History, tone: "text-activity bg-activity/10", image: "/images/caredigital-historico.webp" },
] as const;

function Homepage() {
  const { status } = useAccess();

  if (status === "loading") return <div role="status" className="grid h-full place-items-center text-sm text-muted-foreground">Preparando sua página…</div>;
  const panel = status === "client" ? "/cliente" : status === "admin" ? "/admin" : null;

  return <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-5 lg:gap-6">
    {status === "unlinked" && <p role="status" className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
      Sua conta está conectada, mas ainda não há um prontuário vinculado. Solicite o acesso ao administrador.
    </p>}

    <section aria-labelledby="home-title" className="relative isolate flex min-h-[400px] flex-1 items-center overflow-hidden rounded-3xl bg-slate-950 shadow-pop">
      <img src="/images/caredigital-care-hero.webp" alt="" aria-hidden="true" width={1672} height={941} loading="eager" decoding="async"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[72%_25%]"/>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/5 max-md:bg-slate-950/75"/>
      <div className="max-w-xl px-6 py-10 text-white sm:px-10 lg:px-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
          <ShieldCheck size={14}/> Acompanhamento individual e protegido
        </span>
        <h1 id="home-title" className="mt-4 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
          Sua rotina de cuidados, <span className="text-[#8fb2ff]">organizada em um só lugar.</span>
        </h1>
        <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-slate-200">
          Medicações, refeições e hidratação com horários, lembretes e registros confiáveis — para você e para quem acompanha o seu tratamento.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {panel
            ? <Link to={panel} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110">
                <LayoutDashboard size={17}/> Voltar ao meu painel <ArrowRight size={16}/>
              </Link>
            : <Link to="/entrar" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110">
                <LockKeyhole size={17}/> Acessar minha conta <ArrowRight size={16}/>
              </Link>}
          <Link to="/protocolos" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
            Como funciona
          </Link>
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate-200">
          <li className="inline-flex items-center gap-1.5"><CalendarCheck size={15}/> Rotina por horários</li>
          <li className="inline-flex items-center gap-1.5"><Clock3 size={15}/> Registro com hora real</li>
          <li className="inline-flex items-center gap-1.5"><ShieldCheck size={15}/> Acesso individual</li>
        </ul>
      </div>
      {status === "client" && <div className="absolute bottom-6 right-6 hidden w-[380px] lg:block"><HomeNextCareCard panel="/cliente"/></div>}
    </section>

    {status === "client" && <div className="rounded-3xl bg-gradient-to-br from-indigo-950 to-slate-900 p-1 lg:hidden"><HomeNextCareCard panel="/cliente"/></div>}

    <section aria-label="Recursos da plataforma" className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {features.map(({ to, title, description, icon: Icon, tone, image }) => (
        <Link key={title} to={to} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:border-primary/40">
          <span className="relative block aspect-[16/9] overflow-hidden bg-muted">
            <img src={image} alt="" width={1200} height={750} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>
          </span>
          <span className="flex items-start gap-3 p-4">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={20}/></span>
            <span className="min-w-0">
              <strong className="flex items-center gap-1 font-display text-sm font-bold">{title} <ArrowRight size={14} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"/></strong>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{description}</span>
            </span>
          </span>
        </Link>
      ))}
    </section>

    <footer className="shrink-0 border-t border-border pt-3 text-center text-xs text-muted-foreground">
      CareDigital · Desenvolvido por <strong className="font-semibold text-foreground">Franc D&apos;nis</strong> · Feijó, Acre
    </footer>
  </div>;
}
