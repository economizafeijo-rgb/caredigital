import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
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

type AdRow = {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  link_url: string | null;
  image_url: string | null;
  starts_on: string | null;
  ends_on: string | null;
  active: boolean;
};

const safeHref = (u: string | null) =>
  u && (/^https?:\/\//i.test(u) || (u.startsWith("/") && !u.startsWith("//"))) ? u : "/loja";

/** Anúncio cadastrado pelo administrador (care_ads, local "inicio") como destaque patrocinado. */
function adSlide(a: AdRow): Slide {
  return {
    id: `ad-${a.id}`,
    bg: a.image_url || "/images/hero-alimentacao.webp",
    tint: "from-[#0a1226]/95 via-[#0a1226]/80 to-[#0a1226]/50",
    render: () => (
      <div className="max-w-2xl">
        <Tag>
          <Megaphone size={13} aria-hidden="true" /> Patrocinado
        </Tag>
        <h2 className="mt-4 text-balance font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[2rem]">
          {a.title}
        </h2>
        {a.subtitle && <p className="mt-3 text-lg text-white/85">{a.subtitle}</p>}
        <a
          href={safeHref(a.link_url)}
          rel="sponsored noopener"
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
        >
          {a.cta_label || "Saiba mais"} <ArrowRight size={15} aria-hidden="true" />
        </a>
      </div>
    ),
  };
}

/** Destaques premium da home: carrossel com textos que alternam. A Kessia abre a sequência. */
export function HomeKessiaAd() {
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ads, setAds] = useState<AdRow[]>([]);
  useEffect(() => {
    let alive = true;
    const today = new Date().toISOString().slice(0, 10);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void (supabase as any)
        .from("care_ads")
        .select("id,title,subtitle,cta_label,link_url,image_url,starts_on,ends_on,active")
        .eq("placement", "inicio")
        .order("priority", { ascending: false })
        .limit(5)
        .then(
          (r: { data: AdRow[] | null }) => {
            if (!alive) return;
            setAds(
              (r?.data ?? []).filter(
                (a) =>
                  a.active !== false &&
                  (!a.starts_on || a.starts_on <= today) &&
                  (!a.ends_on || a.ends_on >= today),
              ),
            );
          },
          () => undefined,
        );
    } catch {
      /* sem cliente de dados */
    }
    return () => {
      alive = false;
    };
  }, []);
  const all = [...slides.slice(0, 1), ...ads.map(adSlide), ...slides.slice(1)];
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 3200);
    return () => window.clearInterval(t);
  }, [paused]);
  // A cada 4 trocas de frase passa para o próximo destaque.
  useEffect(() => {
    if (tick > 0 && tick % 4 === 0) setI((n) => (n + 1) % all.length);
  }, [tick, all.length]);
  const slide = all[i % all.length];
  const set = lines[slide.id] ?? [""];
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
      {all.map((s, k) => (
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
        {all.map((s, k) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={k === i}
            aria-label={`Destaque ${k + 1}`}
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
