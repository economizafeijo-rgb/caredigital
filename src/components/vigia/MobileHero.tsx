import { Link } from "@tanstack/react-router";
import { LiveModeLauncher } from "./LiveMode";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BedDouble,
  Droplets,
  Gift,
  LayoutDashboard,
  LockKeyhole,
  Pill,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Utensils,
} from "lucide-react";

const areas = [
  {
    to: "/loja",
    label: "Loja virtual",
    text: "Suplementos, vitaminas e moda fitness",
    icon: ShoppingBag,
    img: "/loja/v2/conjunto-preto.webp",
    tone: "from-amber-500 to-orange-500",
  },
  {
    to: "/dietas",
    label: "Alimentação",
    text: "Refeições, calorias e proteína do dia",
    icon: Utensils,
    img: "/images/caredigital-alimentacao.webp",
    tone: "from-emerald-500 to-teal-500",
  },
  {
    to: "/hidratacao",
    label: "Hidratação",
    text: "Meta de água e próximo copo",
    icon: Droplets,
    img: "/images/caredigital-hidratacao.webp",
    tone: "from-sky-500 to-cyan-500",
  },
  {
    to: "/medicamentos",
    label: "Medicação",
    text: "Doses e horários sem esquecer",
    icon: Pill,
    img: "/images/caredigital-medicamentos.webp",
    tone: "from-rose-500 to-pink-500",
  },
  {
    to: "/suplementos",
    label: "Suplementos",
    text: "Programação e timer de doses",
    icon: Sparkles,
    img: "/images/show-suplementos.webp",
    tone: "from-violet-500 to-fuchsia-500",
  },
  {
    to: "/peso",
    label: "Peso",
    text: "Evolução e variação entre medidas",
    icon: Scale,
    img: "/images/show-peso.webp",
    tone: "from-fuchsia-500 to-pink-500",
  },
  {
    to: "/treinos",
    label: "Treinos",
    text: "Atividade física e rotina",
    icon: Activity,
    img: "/images/show-treinos.webp",
    tone: "from-orange-500 to-amber-500",
  },
  {
    to: "/sono",
    label: "Sono",
    text: "Nota, horas e batimentos",
    icon: BedDouble,
    img: "/images/show-sono.webp",
    tone: "from-indigo-500 to-violet-500",
  },
  {
    to: "/metricas",
    label: "Métricas",
    text: "Dia, mês e ano em gráficos",
    icon: BarChart3,
    img: "/images/show-metricas.webp",
    tone: "from-teal-500 to-emerald-500",
  },
] as const;

/** Abertura da página inicial no celular: foto grande com chamada forte e carrossel de áreas em cartões amplos. */
export function MobileHero({
  client,
  name,
  panel,
}: {
  client: boolean;
  name: string;
  panel: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 sm:hidden">
      <section
        aria-labelledby="m-hero-title"
        className="nv-dark relative isolate overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl"
      >
        <img
          src="/images/caredigital-care-hero.webp"
          alt=""
          aria-hidden="true"
          width={1200}
          height={752}
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/70 via-slate-950/85 to-slate-950"
        />
        <div className="flex min-h-[24rem] flex-col justify-end p-5">
          <span className="mb-auto inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] backdrop-blur">
            <ShieldCheck size={12} className="text-emerald-300" aria-hidden="true" /> Dados
            protegidos
          </span>
          <h1
            id="m-hero-title"
            className="mt-6 text-balance text-[1.9rem] font-extrabold leading-[1.08] tracking-tight"
          >
            {client ? (
              <>
                Olá, <span className="text-emerald-300">{(name || "usuário").split(" ")[0]}</span>.
                <br />
                Sua evolução em um só lugar.
              </>
            ) : (
              <>
                Sua rotina de bem-estar, <span className="text-emerald-300">organizada.</span>
              </>
            )}
          </h1>
          <p className="mt-2 max-w-[26ch] text-[13.5px] leading-relaxed text-slate-300">
            Nutrição, hidratação, peso, suplementos e hábitos, com lembretes e registros confiáveis.
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            {panel ? (
              <Link
                to={panel}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 py-3.5 text-[15px] font-extrabold text-slate-950 shadow-lg shadow-emerald-950/40 active:scale-[.98]"
              >
                <LayoutDashboard size={18} /> Abrir meu painel <ArrowRight size={16} />
              </Link>
            ) : (
              <a
                href="/entrar?mode=signup"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 py-3.5 text-[15px] font-extrabold text-slate-950 shadow-lg shadow-emerald-950/40 active:scale-[.98]"
              >
                <Gift size={18} /> Criar conta grátis
              </a>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              {panel && client ? (
                <LiveModeLauncher className="!h-11 justify-center !rounded-xl border border-white/25 !bg-white/10 !px-2 !text-sm backdrop-blur" />
              ) : !panel ? (
                <Link
                  to="/entrar"
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/10 text-sm font-bold backdrop-blur"
                >
                  <LockKeyhole size={16} /> Entrar
                </Link>
              ) : (
                <span />
              )}
              <Link
                to="/loja"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/10 text-sm font-bold backdrop-blur active:scale-[.98]"
              >
                <ShoppingBag size={16} /> Visitar a loja
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Carrossel de áreas da plataforma no celular, exibido logo depois da vitrine da loja. */
export function MobileAreas() {
  return (
    <div className="sm:hidden">
      <section aria-label="Áreas da plataforma">
        <div className="flex items-end justify-between px-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-primary">
              Tudo em um só app
            </p>
            <h2 className="font-display text-2xl font-extrabold leading-tight">Explore as áreas</h2>
          </div>
          <span className="pb-1 text-xs font-semibold text-muted-foreground">Deslize →</span>
        </div>
        <div className="-mx-3 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {areas.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="group relative isolate h-[15rem] w-[72vw] max-w-[18rem] shrink-0 snap-center overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl"
            >
              <img
                src={a.img}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 -z-20 size-full object-cover transition duration-700 group-active:scale-105"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent"
              />
              <span
                className={`absolute left-4 top-4 grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${a.tone} shadow-lg ring-1 ring-white/30`}
              >
                <a.icon size={24} />
              </span>
              <span className="absolute inset-x-4 bottom-4 block">
                <strong className="block font-display text-2xl font-extrabold">{a.label}</strong>
                <span className="mt-0.5 block text-sm text-slate-200">{a.text}</span>
                <span className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-xs font-bold backdrop-blur">
                  Abrir <ArrowRight size={14} />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
