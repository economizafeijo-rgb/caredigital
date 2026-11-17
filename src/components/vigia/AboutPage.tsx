import { Link } from "@tanstack/react-router";
import { ArrowRight, Code2, LineChart, Mail, MapPin, MessageCircle, Phone, Smartphone, Sparkles } from "lucide-react";
import { LogoMark } from "./Logo";

const EMAIL = "aplicativosfj@gmail.com";
const PHONE_LABEL = "(68) 99203-1340";
const PHONE_DIGITS = "5568992031340";
const WHATSAPP = `https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent("Olá! Vi o NextVita e gostaria de conversar sobre um projeto.")}`;

const values = [
  { icon: Sparkles, title: "8 áreas, um só app", text: "Medicação, hidratação, alimentação, suplementos, peso, treinos, sono e métricas no mesmo lugar.", tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  { icon: LineChart, title: "Evolução que dá para ver", text: "Registros com hora real, por dia, mês e ano, com metas e gráficos interativos.", tone: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
  { icon: Smartphone, title: "No celular, como app", text: "Instale na tela inicial e use onde estiver, com acesso individual e protegido.", tone: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
];

/** Página "Sobre": o projeto, o desenvolvedor e o contato para novos projetos. */
export function AboutPage() {
  return (
    <div className="mx-auto grid w-full max-w-[1500px] gap-3 lg:min-h-[max(34rem,calc(100%-49px))] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-4">
      <section aria-labelledby="about-title" className="relative isolate flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-3xl bg-slate-950 text-white shadow-pop lg:min-h-0 lg:row-span-1">
        <img src="/images/sobre-acre.webp" alt="" aria-hidden="true" width={1500} height={1000} loading="eager" decoding="async" className="absolute inset-0 -z-20 size-full object-cover object-[55%_30%]" />
        <div aria-hidden="true" className="nv-shade-b absolute inset-0 -z-10" />
        <div className="relative flex max-w-[40rem] flex-col gap-3 p-5 sm:p-8 lg:p-[clamp(1.25rem,3.2vh,2.5rem)]">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur"><MapPin size={13} className="text-emerald-300" /> Feijó · Acre · Brasil</span>
          <p className="text-[11px] font-bold uppercase tracking-[.22em] text-emerald-200">Sobre o NextVita</p>
          <h1 id="about-title" className="nv-h1">Cuidado digital, feito no coração do Acre.</h1>
          <p className="nv-lead max-w-[36rem] text-white/85">O NextVita nasceu em Feijó para reunir num só lugar o que faz diferença no dia a dia: medicação, água, alimentação, treinos, sono e a sua evolução.</p>
          <div className="mt-1"><a href="/entrar?mode=signup" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-emerald-800 shadow-lg transition hover:-translate-y-0.5">Testar grátis por 7 dias <ArrowRight size={17} /></a></div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-4">
        <section aria-label="O desenvolvedor" className="rounded-3xl border border-border bg-card p-5 shadow-card lg:p-6">
          <div className="flex items-center gap-4">
            <span className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
              <LogoMark size={40} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">O desenvolvedor</p>
              <h2 className="font-display text-2xl font-extrabold leading-tight">Franc D&apos;nis</h2>
              <p className="text-xs text-muted-foreground">Aplicativos e sites · Feijó, Acre</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Criador do NextVita. Do interior do Acre, transforma ideias em aplicativos e sites pensados para o uso real: simples de usar, bonitos e confiáveis.
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {["Aplicativos", "Sites", "Sistemas sob medida"].map((tag) => (
              <li key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary"><Code2 size={12} /> {tag}</li>
            ))}
          </ul>
        </section>

        <section aria-label="Contato para projetos" className="relative isolate flex flex-col justify-between gap-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#041f1d] via-[#0a3f39] to-[#0e6b5c] p-5 text-white shadow-card lg:p-6">
          <MapPin aria-hidden="true" size={220} strokeWidth={1.2} className="pointer-events-none absolute -right-10 top-1/2 -z-10 -translate-y-1/2 text-white/[.07]" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-200">Contato para projetos</p>
            <h2 className="mt-1 font-display text-xl font-extrabold leading-tight sm:text-2xl">Tem uma ideia de aplicativo ou site? Vamos conversar.</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-emerald-50/80">Conte o que você precisa. O atendimento é por e-mail, ligação ou WhatsApp, direto com o desenvolvedor.</p>
          </div>
          <div className="grid gap-2.5">
            <a href={`mailto:${EMAIL}?subject=${encodeURIComponent("Projeto de aplicativo ou site")}`} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold ring-1 ring-white/20 transition hover:bg-white/20">
              <span className="grid size-9 place-items-center rounded-xl bg-white/15"><Mail size={17} /></span><span className="min-w-0 break-all">{EMAIL}</span>
            </a>
            <div className="grid gap-2.5 min-[420px]:grid-cols-2">
              <a href={`tel:+${PHONE_DIGITS}`} className="flex items-center gap-2.5 rounded-2xl bg-white/10 px-3.5 py-3 text-sm font-semibold ring-1 ring-white/20 transition hover:bg-white/20">
                <Phone size={16} className="shrink-0 text-emerald-300" /><span className="whitespace-nowrap tabular-nums">{PHONE_LABEL}</span>
              </a>
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-3.5 py-3 text-sm font-extrabold text-slate-950 transition hover:brightness-110">
                <MessageCircle size={17} /> WhatsApp
              </a>
            </div>
          </div>
        </section>
      </div>

      <ul className="grid gap-3 sm:grid-cols-3 lg:col-span-2 lg:gap-4">
        {values.map(({ icon: Icon, title, text, tone }) => (
          <li key={title} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={20} /></span>
            <div className="min-w-0"><p className="font-bold leading-tight">{title}</p><p className="mt-1 text-xs leading-snug text-muted-foreground">{text}</p></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
