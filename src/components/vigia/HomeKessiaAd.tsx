import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Megaphone, Sparkles, Store } from "lucide-react";

const kessiaProducts = [
  { ref: "vestido-floresta", name: "Vestido Midi Floresta", price: "R$ 159,90", old: "R$ 189,90" },
  { ref: "cropped-bordado", name: "Cropped Bordado à Mão", price: "R$ 89,90", old: "R$ 109,90" },
  { ref: "bolsa-palha", name: "Bolsa de Palha", price: "R$ 139,90" },
  { ref: "colar-sementes", name: "Colar de Sementes", price: "R$ 49,90" },
];

/** Frases que alternam no destaque da Kessia, para chamar atenção sem poluir. */
const kessiaLines = [
  "Moda feminina com a cara do Acre",
  "Bijuterias artesanais feitas em Feijó",
  "5% de desconto pagando no Pix",
  "Retire na loja ou receba em casa",
];

type Slide = {
  id: string;
  bg: string;
  tint: string;
  render: (line: string) => ReactNode;
};

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[12px] font-semibold backdrop-blur">
      {children}
    </span>
  );
}

const slides: Slide[] = [
  {
    id: "kessia",
    bg: "/loja/bela-vista/banner.jpg",
    tint: "from-[#2a0a22]/95 via-[#4a0f3a]/85 to-[#2a0a22]/60",
    render: (line) => (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.4fr)] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Tag>
              <Sparkles size={13} aria-hidden="true" /> Loja em destaque
            </Tag>
            <Tag>
              <MapPin size={13} aria-hidden="true" /> Inauguração · Feijó, Acre
            </Tag>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <img
              src="/loja/kessia/logo.svg"
              alt=""
              aria-hidden="true"
              className="size-12 rounded-full bg-white object-contain p-1 shadow-lg"
            />
            <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.9rem]">
              Kessia' Digital Store
            </h2>
          </div>
          <p
            key={line}
            aria-live="polite"
            className="nv-rise mt-3 min-h-[3.25rem] max-w-[24ch] text-balance font-display text-xl font-bold leading-snug text-pink-100 sm:text-2xl"
          >
            {line}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <a
              href="/loja?loja=kessia-digital-store"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#6b1450] transition hover:bg-pink-50"
            >
              <Store size={16} aria-hidden="true" /> Entrar na loja
            </a>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {kessiaProducts.map((p) => (
            <li
              key={p.ref}
              className="group overflow-hidden rounded-xl bg-white text-slate-900 shadow-lg"
            >
              <img
                src={`/loja/kessia/${p.ref}.png`}
                alt={p.name}
                loading="lazy"
                className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="p-2.5">
                <p className="truncate text-[12.5px] font-semibold">{p.name}</p>
                <p className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-sm font-extrabold text-[#8a1459]">{p.price}</span>
                  {p.old && <s className="text-[11px] text-slate-400">{p.old}</s>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "empreendedor",
    bg: "/images/hero-metricas.webp",
    tint: "from-[#062321]/95 via-[#0a4a3f]/85 to-[#062321]/60",
    render: (line) => (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <Tag>
            <Megaphone size={13} aria-hidden="true" /> Para empreendedores de Feijó
          </Tag>
          <h2 className="mt-4 text-balance font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[2rem]">
            Sua loja na vitrine de quem já cuida da rotina todo dia
          </h2>
          <p
            key={line}
            className="nv-rise mt-3 min-h-[2.5rem] text-lg font-semibold text-[#3fe0c8]"
          >
            {line}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              to="/parceiros"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#3fe0c8] px-5 text-sm font-bold text-slate-950 transition hover:brightness-110"
            >
              Quero vender aqui <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              to="/lojista"
              className="inline-flex h-11 items-center rounded-xl border border-white/30 px-4 text-sm font-semibold transition hover:bg-white/10"
            >
              Ver como funciona
            </Link>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/15 bg-white/15 text-sm">
          {[
            "Vitrine própria",
            "Pedidos e entrega",
            "Chat com o cliente",
            "Sem mensalidade no início",
          ].map((t) => (
            <li key={t} className="bg-black/35 p-4 font-semibold backdrop-blur">
              {t}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
];

const lines: Record<string, string[]> = {
  kessia: kessiaLines,
  empreendedor: [
    "Cadastro simples e rápido",
    "Seus produtos para toda Feijó",
    "Receba o valor líquido por Pix",
  ],
};

/** Destaques premium da home: carrossel com textos que alternam. A Kessia abre a sequência. */
export function HomeKessiaAd() {
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 3200);
    return () => window.clearInterval(t);
  }, [paused]);
  // A cada 4 trocas de frase passa para o próximo destaque.
  useEffect(() => {
    if (tick > 0 && tick % 4 === 0) setI((n) => (n + 1) % slides.length);
  }, [tick]);
  const slide = slides[i];
  const set = lines[slide.id];
  const line = set[tick % set.length];
  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques das lojas parceiras"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="nv-dark relative isolate overflow-hidden rounded-3xl bg-[#2a0a22] p-5 text-white sm:p-8"
    >
      {slides.map((s, k) => (
        <img
          key={s.id}
          src={s.bg}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className={`absolute inset-0 -z-20 size-full object-cover transition-opacity duration-1000 ${k === i ? "opacity-45" : "opacity-0"}`}
        />
      ))}
      <span
        aria-hidden="true"
        className={`absolute inset-0 -z-10 bg-gradient-to-r ${slide.tint}`}
      />
      <div key={slide.id} className="nv-rise">
        {slide.render(line)}
      </div>
      <div className="mt-5 flex items-center gap-2" role="tablist" aria-label="Escolher destaque">
        {slides.map((s, k) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={k === i}
            aria-label={s.id === "kessia" ? "Kessia' Digital Store" : "Para empreendedores"}
            onClick={() => {
              setI(k);
              setTick(0);
            }}
            className={`h-1.5 rounded-full transition-all ${k === i ? "w-8 bg-white" : "w-4 bg-white/40 hover:bg-white/70"}`}
          />
        ))}
      </div>
    </section>
  );
}
