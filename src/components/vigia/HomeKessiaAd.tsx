import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useLiveStores } from "./LiveStores";
import { money } from "@/lib/marketplace";
import {
  ArrowRight,
  BadgeDollarSign,
  MapPin,
  Megaphone,
  MessageCircle,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";

const KESSIA = "kessia-digital-store";

type Card = {
  key: string;
  name: string;
  img: string;
  price: string;
  old?: string;
  off: number;
  note?: string;
  href: string;
};

/** Vitrine de reserva enquanto os produtos reais não chegam do banco. */
const fallbackCards: Card[] = (
  [
    ["vestido-floresta", "Vestido Midi Floresta", 15990, 18990],
    ["cropped-bordado", "Cropped Bordado à Mão", 8990, 10990],
    ["bolsa-palha", "Bolsa de Palha", 13990, 0],
    ["colar-sementes", "Colar de Sementes", 4990, 0],
  ] as const
).map(([ref, name, price, old]) => ({
  key: ref,
  name,
  img: `/loja/kessia/${ref}.png`,
  price: money(price),
  old: old ? money(old) : undefined,
  off: old ? Math.round((1 - price / old) * 100) : 0,
  href: `/loja?loja=${KESSIA}`,
}));

type Ctx = { cards: Card[]; tick: number };

function ProductPages({ cards, tick }: Ctx) {
  const pages: Card[][] = [];
  for (let i = 0; i < cards.length; i += 4) pages.push(cards.slice(i, i + 4));
  const page = pages.length ? Math.floor(tick / 2) % pages.length : 0;
  return (
    <>
      <ul className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
        {cards.map((p) => (
          <li key={p.key} className="w-[9.5rem] shrink-0 snap-start">
            <a
              href={p.href}
              className="relative block overflow-hidden rounded-xl bg-white text-slate-900 shadow-lg"
            >
              <img src={p.img} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
              {p.off > 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-[#c81d6b] px-1.5 py-0.5 text-[10.5px] font-extrabold text-white">
                  −{p.off}%
                </span>
              )}
              <div className="p-2">
                <p className="truncate text-[12px] font-semibold">{p.name}</p>
                <p className="text-[13px] font-extrabold text-[#8a1459]">{p.price}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
      <div className="grid max-sm:hidden">
        {pages.map((pg, k) => (
          <ul
            key={k}
            aria-hidden={k !== page}
            className={`col-start-1 row-start-1 grid grid-cols-2 gap-2.5 transition-opacity duration-700 sm:grid-cols-4 ${k === page ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            {pg.map((p) => (
              <li key={p.key} className="min-w-0">
                <a
                  href={p.href}
                  tabIndex={k === page ? 0 : -1}
                  className="group relative block overflow-hidden rounded-xl bg-white text-slate-900 shadow-lg"
                >
                  <img
                    src={p.img}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  {p.off > 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-[#c81d6b] px-2 py-0.5 text-[11px] font-extrabold text-white">
                      −{p.off}%
                    </span>
                  )}
                  {p.note && (
                    <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-900">
                      {p.note}
                    </span>
                  )}
                  <div className="p-2.5">
                    <p className="truncate text-[12.5px] font-semibold">{p.name}</p>
                    <p className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-sm font-extrabold text-[#8a1459]">{p.price}</span>
                      {p.old && <s className="text-[11px] text-slate-400">{p.old}</s>}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </>
  );
}

type Slide = {
  id: string;
  bg: string;
  tint: string;
  render: (line: string, ctx: Ctx) => ReactNode;
  /** Frases do destaque (lojas em destaque). */
  lines?: string[];
  /** Produtos do destaque. */
  cards?: Card[];
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
          <p className="mt-2 inline-flex items-baseline gap-2 bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
            <strong className="font-display text-2xl font-extrabold text-white tabular-nums">
              R$ 0
            </strong>
            <span className="text-[13px] font-semibold text-white/80">
              de mensalidade no plano inicial
            </span>
          </p>
          <div className="mt-5 grid gap-2.5 max-sm:[&>*]:w-full sm:flex sm:flex-wrap">
            <Link
              to="/parceiros"
              className="inline-flex h-12 items-center justify-center gap-2 bg-[#3fe0c8] px-6 text-[15px] font-extrabold text-slate-950 shadow-[0_10px_30px_-10px_rgba(63,224,200,.8)] transition hover:brightness-110 active:scale-[.98]"
            >
              <Store size={17} aria-hidden="true" /> Quero vender aqui
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              to="/lojista"
              className="inline-flex h-12 items-center justify-center gap-2 bg-white/5 px-5 text-sm font-semibold ring-1 ring-white/30 backdrop-blur transition hover:bg-white/10"
            >
              Ver como funciona
            </Link>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-2 text-sm max-sm:hidden">
          {(
            [
              [Store, "Vitrine própria", "Sua marca e seus preços", "#3fe0c8"],
              [Truck, "Pedidos e entrega", "Retirada ou em casa", "#fbbf24"],
              [MessageCircle, "Chat com o cliente", "Responda na hora", "#60a5fa"],
              [BadgeDollarSign, "Pix no seu bolso", "Valor líquido rápido", "#f472b6"],
            ] as const
          ).map(([Icon, t, s, c]) => (
            <li
              key={t}
              className="relative overflow-hidden bg-black/40 p-3.5 ring-1 ring-white/10 backdrop-blur"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{ background: c }}
              />
              <span
                className="grid size-9 place-items-center"
                style={{ background: `${c}26`, color: c }}
              >
                <Icon size={18} aria-hidden="true" />
              </span>
              <strong className="mt-2.5 block text-[14px] font-extrabold leading-tight">{t}</strong>
              <span className="mt-0.5 block text-[12px] leading-snug text-white/65">{s}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
];

const lines: Record<string, string[]> = {
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

type StoreSlideInput = {
  id: string;
  name: string;
  logo: string;
  bg: string;
  tint: string;
  href: string;
  place: string;
};

/** Slide de loja em destaque: vitrine com os produtos reais e frases que alternam. */
function storeSlide(st: StoreSlideInput, cards: Card[], lines: string[]): Slide {
  return {
    id: st.id,
    bg: st.bg,
    tint: st.tint,
    lines,
    cards,
    render: (line, ctx) => (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.4fr)] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/75">
            <Sparkles size={13} aria-hidden="true" className="text-amber-300" />
            Loja em destaque
            <span aria-hidden="true" className="text-white/40">
              |
            </span>
            <MapPin size={13} aria-hidden="true" /> {st.place}
          </p>
          <div className="mt-3 flex items-center gap-3">
            {st.logo && (
              <img
                src={st.logo}
                alt=""
                aria-hidden="true"
                className="size-14 shrink-0 rounded-2xl bg-white object-contain p-1.5 shadow-lg ring-1 ring-white/30"
              />
            )}
            <h2 className="min-w-0 text-balance font-display text-[1.65rem] font-extrabold leading-[1.05] tracking-tight sm:text-[1.9rem]">
              {st.name}
            </h2>
          </div>
          <p
            key={line}
            aria-live="polite"
            className="nv-rise mt-3 min-h-[2.75rem] max-w-[26ch] text-balance text-[15px] font-medium leading-snug text-white/85 sm:text-lg"
          >
            {line}
          </p>
          <a
            href={st.href}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#6b1450] shadow-lg transition hover:bg-pink-50 active:scale-[.98] sm:w-auto"
          >
            <Store size={16} aria-hidden="true" /> Entrar na loja
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
        <ProductPages {...ctx} />
      </div>
    ),
  };
}

type LiveList = ReturnType<typeof useLiveStores>;

/** Monta a vitrine e as frases de uma loja a partir dos produtos reais (preços, promoções, estoque). */
function buildStore(
  slug: string,
  live: LiveList["products"],
  vendors: LiveList["vendors"],
): { cards: Card[]; lines: string[] } {
  const mine = live.filter((p) => p.vendor.slug === slug && p.stock > 0);
  if (!mine.length) {
    return {
      cards: slug === KESSIA ? fallbackCards : [],
      lines: [
        "Moda feminina com a cara do Acre",
        "Bijuterias artesanais feitas em Feijó",
        "5% de desconto pagando no Pix",
        "Retire na loja ou receba em casa",
      ],
    };
  }
  const offOf = (p: (typeof mine)[number]) =>
    p.old_price_cents && p.old_price_cents > p.price_cents
      ? Math.round((1 - p.price_cents / p.old_price_cents) * 100)
      : 0;
  const sorted = [...mine].sort((a, b) => offOf(b) - offOf(a));
  const cards: Card[] = sorted.slice(0, 12).map((p) => ({
    key: p.id,
    name: p.name,
    img: p.image_url || "/loja/kessia/mark.svg",
    price: money(p.price_cents),
    old: offOf(p) ? money(p.old_price_cents as number) : undefined,
    off: offOf(p),
    note: p.stock <= 3 ? `Últimas ${p.stock}` : undefined,
    href: p.share_code ? `/p/${p.share_code}` : `/loja?loja=${slug}`,
  }));
  const best = sorted[0];
  const open = vendors.find((v) => v.slug === slug)?.is_open;
  const lines = [
    `${mine.length} produtos na vitrine online`,
    offOf(best)
      ? `Até ${offOf(best)}% off: ${best.name}`
      : `${best.name} por ${money(best.price_cents)}`,
    "5% de desconto pagando no Pix",
    open ? "Loja aberta agora" : "Retire na loja ou receba em casa",
  ];
  return { cards, lines };
}

const TINTS = [
  "from-[#2a0a22]/95 via-[#4a0f3a]/85 to-[#2a0a22]/60",
  "from-[#1e0b33]/95 via-[#3b1466]/85 to-[#1e0b33]/60",
  "from-[#0a1f2e]/95 via-[#0f3a52]/85 to-[#0a1f2e]/60",
];

/** Destaques premium da home: carrossel com textos que alternam. A Kessia abre a sequência. */
export function HomeKessiaAd() {
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ads, setAds] = useState<AdRow[]>([]);
  const { products: live, vendors } = useLiveStores();
  // Lojas com o plano Destaque (banner e divulgação na home) entram no rodízio. A Kessia abre a sequência.
  const storeSlides = useMemo(() => {
    const order = [...vendors]
      .filter((v) => v.slug === KESSIA || v.plan === "destaque")
      .sort((a, b) => (a.slug === KESSIA ? -1 : b.slug === KESSIA ? 1 : 0));
    const out: Slide[] = [];
    order.forEach((v, idx) => {
      const { cards, lines } = buildStore(v.slug, live, vendors);
      if (!cards.length && v.slug !== KESSIA) return;
      const isKessia = v.slug === KESSIA;
      out.push(
        storeSlide(
          {
            id: isKessia ? "kessia" : `loja-${v.slug}`,
            name: isKessia ? "Kessia' Digital Store" : v.name,
            logo: isKessia ? "/loja/kessia/logo.svg" : (v.logo_url ?? ""),
            bg: isKessia ? "/loja/bela-vista/banner.jpg" : `/loja/${v.slug}/banner-destaque.webp`,
            tint: TINTS[idx % TINTS.length],
            href: `/loja?loja=${v.slug}`,
            place: isKessia ? "Inauguração · Feijó, Acre" : `${v.city ?? "Feijó"} · Acre`,
          },
          cards,
          lines,
        ),
      );
    });
    return out;
  }, [live, vendors]);
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
  const all = [...storeSlides, ...ads.map(adSlide), ...slides];
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 3200);
    return () => window.clearInterval(t);
  }, [paused]);
  // A cada 6 trocas de frase passa para o próximo destaque.
  useEffect(() => {
    if (tick > 0 && tick % 6 === 0) setI((n) => (n + 1) % all.length);
  }, [tick, all.length]);
  const slide = all[i % all.length];
  const set = slide.lines ?? lines[slide.id] ?? [""];
  const line = set[tick % set.length];
  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques das lojas parceiras"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="nv-dark relative isolate overflow-hidden bg-[#2a0a22] p-5 text-white max-sm:-mx-3 max-sm:rounded-none sm:rounded-3xl sm:p-8"
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
      {/* Todos os destaques ocupam a mesma célula: a altura é a do maior e nunca muda na troca. */}
      <div className="grid">
        {all.map((s, k) => {
          const on = k === i % all.length;
          const sl = s.lines ?? lines[s.id] ?? [""];
          return (
            <div
              key={s.id}
              aria-hidden={!on}
              inert={!on}
              className={`col-start-1 row-start-1 transition-opacity duration-500 ${on ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              {s.render(on ? line : sl[0], { cards: s.cards ?? [], tick })}
            </div>
          );
        })}
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
