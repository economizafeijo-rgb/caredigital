import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageCircle,
  Pause,
  Play,
  ShoppingBag,
  Store,
} from "lucide-react";
import { ShareButton } from "./ShareButton";
import { money, products, type StoreCategory } from "@/lib/store";

const EMAIL = "aplicativosfj@gmail.com";
const PHONE_DIGITS = "5568992031340";
const WHATSAPP = `https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent("Olá! Quero vender meus produtos na NextVita. Pode me explicar como funciona?")}`;
const DURATION = 6500;

const from = (...cats: StoreCategory[]) =>
  money(Math.min(...products.filter((p) => cats.includes(p.category)).map((p) => p.priceCents)));

type Cta = {
  label: string;
  to?: "/loja" | "/lojista" | "/parceiros";
  href?: string;
  icon?: typeof Store;
  ghost?: boolean;
};
type Slide = {
  id: string;
  tone: string;
  badge: string;
  title: string;
  text: string;
  price?: string;
  priceNote?: string;
  chips?: string[];
  images: string[];
  ctas: Cta[];
};

const slides: Slide[] = [
  {
    id: "intro",
    tone: "from-[#03211f] via-[#0a4a41] to-[#0e8a6a]",
    badge: "Novidade · Loja NextVita",
    title: "Além de tecnologia para o seu corpo e saúde, agora você também compra aqui.",
    text: "Suplementos, vitaminas, moda fitness e acessórios no mesmo app em que você acompanha a sua rotina.",
    chips: ["Pix com 5% de desconto", "Cartão em até 3x", "Entrega ou retirada"],
    images: ["/loja/whey2.webp", "/loja/mulher1.webp", "/loja/homem2.webp"],
    ctas: [{ label: "Conhecer a loja", to: "/loja", icon: ShoppingBag }],
  },
  {
    id: "suplementos",
    tone: "from-[#1e1b4b] via-[#3730a3] to-[#7c3aed]",
    badge: "Suplementos",
    title: "Whey, pré-treino e coqueteleira para render mais no treino.",
    text: "Proteína de alto valor biológico e energia para os dias mais puxados.",
    price: from("suplementos", "nutricao"),
    priceNote: "a partir de",
    chips: ["Pix com 5% de desconto"],
    images: ["/loja/whey2.webp", "/loja/pre.webp", "/loja/whey.webp"],
    ctas: [{ label: "Ver suplementos", to: "/loja", icon: ShoppingBag }],
  },
  {
    id: "vitaminas",
    tone: "from-[#431407] via-[#9a3412] to-[#f59e0b]",
    badge: "Vitaminas",
    title: "Vitaminas para a sua rotina de saúde.",
    text: "Multivitamínico, vitamina D3 e mais, para completar o cuidado que você já faz no app.",
    price: from("vitaminas"),
    priceNote: "a partir de",
    chips: ["Cartão em até 3x"],
    images: ["/loja/vit2.webp", "/loja/vit1.webp", "/loja/whey3.webp"],
    ctas: [{ label: "Ver vitaminas", to: "/loja", icon: ShoppingBag }],
  },
  {
    id: "feminina",
    tone: "from-[#500724] via-[#9d174d] to-[#ec4899]",
    badge: "Moda fitness feminina",
    title: "Conjuntos e leggings para treinar com estilo.",
    text: "Top, legging e conjuntos com conforto e modelagem que acompanha o movimento.",
    price: from("roupas-femininas"),
    priceNote: "a partir de",
    chips: ["Novidades toda semana"],
    images: ["/loja/mulher1.webp", "/loja/mulher2.webp", "/loja/mulher3.webp"],
    ctas: [{ label: "Ver moda feminina", to: "/loja", icon: ShoppingBag }],
  },
  {
    id: "masculina",
    tone: "from-[#082f49] via-[#075985] to-[#0ea5e9]",
    badge: "Moda fitness masculina",
    title: "Regatas, camisetas e conjuntos dry fit.",
    text: "Tecido leve que seca rápido, ideal para musculação, corrida e treino funcional.",
    price: from("roupas-masculinas"),
    priceNote: "a partir de",
    chips: ["Dry fit"],
    images: ["/loja/homem1.webp", "/loja/homem2.webp", "/loja/homem3.webp"],
    ctas: [{ label: "Ver moda masculina", to: "/loja", icon: ShoppingBag }],
  },
  {
    id: "acessorios",
    tone: "from-[#1c1917] via-[#44403c] to-[#0e8a6a]",
    badge: "Acessórios para academia",
    title: "Halteres, tapetes e coqueteleiras para treinar em casa.",
    text: "Monte o seu cantinho de treino com acessórios que duram.",
    price: from("acessorios"),
    priceNote: "a partir de",
    chips: ["Entrega ou retirada"],
    images: ["/loja/halter.webp", "/loja/gym2.webp", "/loja/gym.webp"],
    ctas: [{ label: "Ver acessórios", to: "/loja", icon: ShoppingBag }],
  },
  {
    id: "vender",
    tone: "from-[#022c22] via-[#065f46] to-[#fbbf24]",
    badge: "Para comerciantes e autônomos",
    title: "Quer vender os seus produtos aqui? Fale com o desenvolvedor.",
    text: "Lojas de roupas fitness, suplementos, farmácias e produtos naturais: abra a sua loja na NextVita, com vitrine própria, selo da loja e avaliações do público.",
    chips: ["Planos a partir de R$ 0/mês", "Painel de vendas"],
    images: ["/loja/halter.webp", "/loja/mulher3.webp", "/loja/vit2.webp"],
    ctas: [
      { label: "Quero vender · grátis", to: "/parceiros", icon: Store },
      { label: "WhatsApp", href: WHATSAPP, icon: MessageCircle, ghost: true },
      {
        label: "E-mail",
        href: `mailto:${EMAIL}?subject=${encodeURIComponent("Quero vender na NextVita")}`,
        icon: Mail,
        ghost: true,
      },
    ],
  },
];

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    const f = () => setReduce(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return reduce;
}

/** Banner comercial rotativo: divulga a loja e convida comerciantes a vender na NextVita. Pausa ao tocar/passar o mouse e respeita "reduzir movimento". */
export function StoreBannerCarousel({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();
  const startX = useRef<number | null>(null);
  const playing = !userPaused && !hover && !reduce;
  const go = useCallback(
    (n: number) => setIndex((i) => (i + n + slides.length) % slides.length),
    [],
  );

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => go(1), DURATION);
    return () => window.clearTimeout(t);
  }, [index, playing, go]);

  return (
    <section
      role="region"
      aria-roledescription="carrossel"
      aria-label="Ofertas e novidades da loja NextVita"
      className={`group relative isolate overflow-hidden rounded-3xl bg-slate-950 text-white shadow-pop ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onPointerDown={(e) => {
        startX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="relative min-h-[35rem] sm:min-h-[26rem] lg:min-h-[27rem]">
        {slides.map((s, i) => {
          const active = i === index;
          return (
            <article
              key={s.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${slides.length}`}
              aria-hidden={!active}
              inert={!active}
              className={`absolute inset-0 bg-gradient-to-br ${s.tone} transition-[opacity,transform] duration-700 ${active ? "z-10 translate-x-0 opacity-100" : "pointer-events-none z-0 translate-x-6 opacity-0"}`}
            >
              <img
                src={s.images[0]}
                alt=""
                aria-hidden="true"
                loading={i === 0 ? "eager" : "lazy"}
                className={`nv-kenburns absolute inset-0 -z-10 size-full object-cover opacity-20 blur-[2px] ${active ? "" : "[animation:none]"}`}
                style={
                  active
                    ? { animation: `nv-kenburns ${DURATION * 1.6}ms ease-out forwards` }
                    : undefined
                }
              />
              <div className="grid h-full gap-3 p-4 pb-14 sm:grid-cols-[1.15fr_.85fr] sm:items-center sm:gap-6 sm:p-9 sm:pb-16 lg:p-11 lg:pb-16">
                <div
                  className={`transition-all duration-700 delay-150 ${active ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
                >
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[.16em] text-slate-950 shadow">
                    {s.badge}
                  </span>
                  <h2 className="mt-3 text-balance font-display text-[1.45rem] font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-[2.6rem]">
                    {s.title}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                    {s.text}
                  </p>
                  {s.chips && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {s.chips.map((c) => (
                        <li
                          key={c}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    {s.ctas.map((c) => {
                      const cls = c.ghost
                        ? "border border-white/35 bg-white/10 text-white backdrop-blur hover:bg-white/20"
                        : "bg-white text-slate-950 shadow-lg hover:-translate-y-0.5";
                      const inner = (
                        <>
                          {c.icon && <c.icon size={17} />} {c.label}{" "}
                          {!c.ghost && <ArrowRight size={16} />}
                        </>
                      );
                      const base = `inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-sm font-extrabold transition active:scale-95 ${cls}`;
                      return c.to ? (
                        <Link key={c.label} to={c.to} className={base}>
                          {inner}
                        </Link>
                      ) : (
                        <a
                          key={c.label}
                          href={c.href}
                          target={c.href?.startsWith("http") ? "_blank" : undefined}
                          rel="noreferrer"
                          className={base}
                        >
                          {inner}
                        </a>
                      );
                    })}
                    <ShareButton
                      variant="pill"
                      title={s.title}
                      text={`${s.title} ${s.text}`}
                      path={s.id === "vender" ? "/parceiros" : "/loja"}
                      className="[&>button]:h-12 [&>button]:rounded-2xl"
                    />
                  </div>
                </div>
                <div
                  className={`relative mx-auto grid w-full max-w-md grid-cols-3 gap-2.5 transition-all duration-700 delay-300 sm:grid-cols-2 ${active ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
                  aria-hidden="true"
                >
                  <img
                    src={s.images[0]}
                    alt=""
                    loading="lazy"
                    className="col-span-1 row-span-1 aspect-[4/3] w-full rounded-2xl object-cover shadow-2xl ring-1 ring-white/30 sm:row-span-2 sm:aspect-auto sm:h-full sm:min-h-[15rem]"
                  />
                  <img
                    src={s.images[1]}
                    alt=""
                    loading="lazy"
                    className="aspect-[4/3] w-full rounded-2xl object-cover shadow-2xl ring-1 ring-white/30"
                  />
                  <img
                    src={s.images[2]}
                    alt=""
                    loading="lazy"
                    className="aspect-[4/3] w-full rounded-2xl object-cover shadow-2xl ring-1 ring-white/30"
                  />
                  {s.price && (
                    <span className="absolute -right-1 -top-4 grid size-[5.6rem] -rotate-6 place-items-center rounded-full bg-amber-300 text-center text-slate-950 shadow-2xl ring-4 ring-white/40 sm:-right-3 sm:-top-5 sm:size-28">
                      <span>
                        <span className="block text-[10px] font-bold uppercase leading-none">
                          {s.priceNote}
                        </span>
                        <strong className="block text-base font-extrabold leading-tight sm:text-xl">
                          {s.price}
                        </strong>
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-3 px-4 pb-3 sm:px-8">
        <div
          className="nv-round flex items-center gap-3 rounded-full bg-black/35 py-1 pl-3.5 pr-2 ring-1 ring-white/15 backdrop-blur-md"
          role="tablist"
          aria-label="Escolher anúncio"
        >
          <span className="w-9 text-[11px] font-bold tabular-nums text-white/90" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
            <span className="text-white/45"> / {String(slides.length).padStart(2, "0")}</span>
          </span>
          <div className="flex items-center">
            {slides.map((s, i) => {
              const on = i === index;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-label={`Anúncio ${i + 1}: ${s.badge}`}
                  onClick={() => setIndex(i)}
                  style={{ minHeight: 0, minWidth: 0 }}
                  className="group grid h-8 place-items-center px-[3px]"
                >
                  <span
                    className={`nv-round relative block h-1 overflow-hidden rounded-full transition-all duration-500 ease-out ${on ? "w-10 bg-white/30 sm:w-14" : "w-3.5 bg-white/35 group-hover:bg-white/70 sm:w-4"}`}
                  >
                    {on && (
                      <span
                        key={index}
                        className="nv-progress absolute inset-0 origin-left rounded-full bg-amber-300"
                        style={
                          reduce
                            ? { animation: "none", width: "100%" }
                            : {
                                animation: `nv-progress ${DURATION}ms linear forwards`,
                                animationPlayState: playing ? "running" : "paused",
                              }
                        }
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <span className="ml-1 hidden rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-semibold text-white/80 backdrop-blur md:inline">
          Loja em desenvolvimento · preços de demonstração
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Anúncio anterior"
            onClick={() => go(-1)}
            className="grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/30"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label={userPaused ? "Retomar rotação automática" : "Pausar rotação automática"}
            onClick={() => setUserPaused((v) => !v)}
            className="grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/30"
          >
            {userPaused ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button
            type="button"
            aria-label="Próximo anúncio"
            onClick={() => go(1)}
            className="grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
