import {
  Activity,
  BarChart3,
  BedDouble,
  Droplets,
  Pill,
  Ruler,
  Scale,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { InstallAppButton } from "./InstallApp";

type Feature = {
  to: string;
  client: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  from: string;
  via: string;
};

/** Funcionalidades do app, cada uma com o próprio ícone de aplicativo. */
const features: Feature[] = [
  {
    to: "/hidratacao",
    client: "/cliente#minha-hidratacao",
    label: "Hidratação",
    hint: "Meta de água",
    icon: Droplets,
    from: "#38bdf8",
    via: "#2563eb",
  },
  {
    to: "/medicamentos",
    client: "/cliente#medicacao",
    label: "Medicação",
    hint: "Doses e horários",
    icon: Pill,
    from: "#fb7185",
    via: "#e11d48",
  },
  {
    to: "/dietas",
    client: "/cliente#alimentacao",
    label: "Alimentação",
    hint: "Diário e cardápio",
    icon: Utensils,
    from: "#34d399",
    via: "#059669",
  },
  {
    to: "/suplementos",
    client: "/suplementos",
    label: "Suplementos",
    hint: "Vitaminas",
    icon: Sparkles,
    from: "#a78bfa",
    via: "#6d28d9",
  },
  {
    to: "/peso",
    client: "/peso",
    label: "Peso",
    hint: "Evolução",
    icon: Scale,
    from: "#e879f9",
    via: "#a21caf",
  },
  {
    to: "/entrar?mode=signup",
    client: "/cliente#medidas",
    label: "Medidas",
    hint: "Corpo e gráfico",
    icon: Ruler,
    from: "#fbbf24",
    via: "#d97706",
  },
  {
    to: "/treinos",
    client: "/treinos",
    label: "Treinos",
    hint: "Seus registros",
    icon: Activity,
    from: "#fb923c",
    via: "#ea580c",
  },
  {
    to: "/sono",
    client: "/cliente#sono",
    label: "Sono",
    hint: "Nota da noite",
    icon: BedDouble,
    from: "#818cf8",
    via: "#4338ca",
  },
  {
    to: "/metricas",
    client: "/metricas",
    label: "Métricas",
    hint: "Seus gráficos",
    icon: BarChart3,
    from: "#2dd4bf",
    via: "#0e7490",
  },
];

/** Ferramentas gratuitas do app: faixa compacta com uma linha por ferramenta e o convite para instalar. */
export function HomeToolAds({ client }: { client: boolean }) {
  return (
    <section
      aria-labelledby="tool-ads-title"
      className="nv-dark relative isolate grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 overflow-hidden rounded-3xl bg-[#0c1a3a] p-4 text-white max-sm:-mx-3 max-sm:rounded-none sm:p-6"
    >
      <img
        src="/images/caredigital-care-hero.webp"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 -z-20 size-full object-cover opacity-40"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0c1a3a]/90 via-[#0c1a3a]/70 to-[#0b3b3a]/55"
      />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h2
            id="tool-ads-title"
            className="font-display text-xl font-extrabold tracking-tight sm:text-2xl"
          >
            Ferramentas grátis do app
          </h2>
          <p className="mt-0.5 text-[13px] text-white/80">
            Toque em uma funcionalidade para começar. Sem custo, no celular ou no computador.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InstallAppButton />
          {!client && (
            <a
              href="/entrar?mode=signup"
              className="inline-flex h-10 items-center rounded-xl bg-[#3fe0c8] px-4 text-[13px] font-bold text-slate-950 transition hover:brightness-110"
            >
              Criar conta grátis
            </a>
          )}
        </div>
      </header>

      <ul className="grid grid-cols-3 gap-x-3 gap-y-5 pt-1 md:grid-cols-9">
        {features.map((f) => (
          <li key={f.label}>
            <a
              href={client ? f.client : f.to}
              className="group flex flex-col items-center gap-2 text-center"
            >
              <span
                className="relative grid size-[4.25rem] place-items-center overflow-hidden rounded-[1.35rem] transition duration-200 group-hover:-translate-y-1 group-active:scale-95 motion-reduce:transition-none"
                style={{
                  background: `linear-gradient(145deg, ${f.from} 0%, ${f.via} 100%)`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,.5), inset 0 -10px 18px rgba(0,0,0,.2), 0 12px 26px -10px ${f.via}, 0 0 0 1px rgba(255,255,255,.12)`,
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent"
                />
                <f.icon
                  size={30}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className="relative text-white drop-shadow-[0_2px_3px_rgba(0,0,0,.35)]"
                />
              </span>
              <span className="min-w-0 leading-tight">
                <strong className="block text-[13px] font-bold">{f.label}</strong>
                <span className="block text-[11px] text-white/60">{f.hint}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
