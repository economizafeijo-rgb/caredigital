import { Link } from "@tanstack/react-router";
import { LiveModeLauncher } from "./LiveMode";
import { StoreBannerCarousel } from "./StoreBannerCarousel";
import { Activity, ArrowRight, BarChart3, BedDouble, Droplets, Gift, LayoutDashboard, LockKeyhole, Pill, Scale, ShieldCheck, ShoppingBag, Sparkles, Utensils } from "lucide-react";

const areas = [
  { to: "/loja", label: "Loja virtual", text: "Suplementos, vitaminas e moda fitness", icon: ShoppingBag, img: "/loja/mulher1.webp", tone: "from-amber-500 to-orange-500" },
  { to: "/dietas", label: "Alimentação", text: "Refeições, calorias e proteína do dia", icon: Utensils, img: "/images/caredigital-alimentacao.webp", tone: "from-emerald-500 to-teal-500" },
  { to: "/hidratacao", label: "Hidratação", text: "Meta de água e próximo copo", icon: Droplets, img: "/images/caredigital-hidratacao.webp", tone: "from-sky-500 to-cyan-500" },
  { to: "/medicamentos", label: "Medicação", text: "Doses e horários sem esquecer", icon: Pill, img: "/images/caredigital-medicamentos.webp", tone: "from-rose-500 to-pink-500" },
  { to: "/suplementos", label: "Suplementos", text: "Programação e timer de doses", icon: Sparkles, img: "/images/show-suplementos.webp", tone: "from-violet-500 to-fuchsia-500" },
  { to: "/peso", label: "Peso", text: "Evolução e variação entre medidas", icon: Scale, img: "/images/show-peso.webp", tone: "from-fuchsia-500 to-pink-500" },
  { to: "/treinos", label: "Treinos", text: "Atividade física e rotina", icon: Activity, img: "/images/show-treinos.webp", tone: "from-orange-500 to-amber-500" },
  { to: "/sono", label: "Sono", text: "Nota, horas e batimentos", icon: BedDouble, img: "/images/show-sono.webp", tone: "from-indigo-500 to-violet-500" },
  { to: "/metricas", label: "Métricas", text: "Dia, mês e ano em gráficos", icon: BarChart3, img: "/images/show-metricas.webp", tone: "from-teal-500 to-emerald-500" },
] as const;

/** Abertura da página inicial no celular: foto grande com chamada forte e carrossel de áreas em cartões amplos. */
export function MobileHero({ client, name, panel }: { client: boolean; name: string; panel: string | null }) {
  return (
    <div className="-mx-1 flex flex-col gap-5 sm:hidden">
      <section aria-labelledby="m-hero-title" className="relative isolate flex min-h-[30rem] flex-col justify-end overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-2xl">
        <img src="/images/caredigital-care-hero.webp" alt="" aria-hidden="true" width={1200} height={752} className="absolute inset-0 -z-20 size-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950 via-slate-950/70 to-emerald-950/20" />
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-slate-950/45 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest backdrop-blur"><ShieldCheck size={14} className="text-emerald-300" /> Protegido</span>
        <Link to="/loja" className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-950 shadow-[0_10px_30px_-10px_rgba(251,191,36,.95)]"><span className="relative flex size-2" aria-hidden="true"><span className="absolute inline-flex size-full animate-ping rounded-full bg-slate-900 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-slate-900" /></span> Novidade · Loja</Link>
        <h1 id="m-hero-title" className="text-balance text-[2.6rem] font-extrabold leading-[1.02] tracking-tight">
          {client ? <>Olá, <span className="text-emerald-300">{(name || "usuário").split(" ")[0]}</span>. Sua evolução em um só lugar.</> : <>Sua rotina de bem-estar, <span className="text-emerald-300">organizada.</span></>}
        </h1>
        <p className="mt-3 text-[15px] leading-snug text-slate-200">Nutrição, hidratação, peso, suplementos e hábitos com horários, lembretes e registros confiáveis.</p>
        <div className="mt-5 grid gap-2.5">
          {panel ? (
            <>
              <Link to={panel} className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 text-base font-extrabold text-slate-950 shadow-lg"><LayoutDashboard size={20} /> Abrir meu painel <ArrowRight size={18} /></Link>
              {client && <LiveModeLauncher className="!h-12 justify-center !rounded-2xl !text-[15px]" />}
            </>
          ) : (
            <>
              <a href="/entrar?mode=signup" className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 text-base font-extrabold text-slate-950 shadow-lg"><Gift size={20} /> Grátis para teste</a>
              <Link to="/entrar" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 text-[15px] font-bold backdrop-blur"><LockKeyhole size={18} /> Acessar minha conta</Link>
            </>
          )}
          <Link to="/loja" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-400 text-[15px] font-extrabold text-slate-950 shadow-[0_12px_32px_-12px_rgba(251,191,36,.95)] active:scale-95"><ShoppingBag size={18} /> Visitar a loja</Link>
        </div>
      </section>

      <StoreBannerCarousel />

      <section aria-label="Áreas da plataforma">
        <div className="flex items-end justify-between px-2">
          <div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-primary">Tudo em um só app</p><h2 className="font-display text-2xl font-extrabold leading-tight">Explore as áreas</h2></div>
          <span className="pb-1 text-xs font-semibold text-muted-foreground">Deslize →</span>
        </div>
        <div className="-mx-3 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {areas.map((a) => (
            <Link key={a.to} to={a.to} className="group relative isolate h-[21rem] w-[76vw] max-w-[22rem] shrink-0 snap-center overflow-hidden rounded-[1.75rem] bg-slate-900 text-white shadow-xl">
              <img src={a.img} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 -z-20 size-full object-cover transition duration-700 group-active:scale-105" />
              <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
              <span className={`absolute left-4 top-4 grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${a.tone} shadow-lg ring-1 ring-white/30`}><a.icon size={24} /></span>
              <span className="absolute inset-x-4 bottom-4 block">
                <strong className="block font-display text-2xl font-extrabold">{a.label}</strong>
                <span className="mt-0.5 block text-sm text-slate-200">{a.text}</span>
                <span className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-xs font-bold backdrop-blur">Abrir <ArrowRight size={14} /></span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
