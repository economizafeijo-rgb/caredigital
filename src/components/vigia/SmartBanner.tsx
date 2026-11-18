import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { money, products, useCart } from "@/lib/store";

type Slide = {
  id: string;
  kicker: string;
  title: string;
  text: string;
  cta: string;
  to: "/loja" | "/sono" | "/parceiros";
  images: string[];
  price?: string;
  tone: string;
};

const DURATION = 6000;
const img = (id: string) => products.find((p) => p.id === id)?.img ?? "";
const priceOf = (id: string) => {
  const p = products.find((x) => x.id === id);
  return p ? money(p.priceCents) : undefined;
};

/** Escolhe a propaganda principal pelo horário: vitaminas de manhã, pré-treino à tarde, proteína à noite. */
function momentSlide(hour: number): Slide {
  if (hour >= 5 && hour < 12)
    return { id: "manha", kicker: "Para começar o dia", title: "Vitaminas para a sua rotina da manhã", text: "Multivitamínico e vitamina D3 junto com o café, sem esquecer: o app lembra o horário.", cta: "Ver vitaminas", to: "/loja", images: [img("multivitaminico"), img("vitamina-d")], price: priceOf("vitamina-d"), tone: "from-[#3b2a06] to-[#a16207]" };
  if (hour >= 12 && hour < 18)
    return { id: "tarde", kicker: "Hora do treino", title: "Energia e foco para o treino da tarde", text: "Pré-treino, coqueteleira e acessórios para render mais na academia ou em casa.", cta: "Ver suplementos", to: "/loja", images: [img("pre-treino"), img("coqueteleira")], price: priceOf("pre-treino"), tone: "from-[#2b0f0a] to-[#b45309]" };
  return { id: "noite", kicker: "Recuperação", title: "Proteína para a recuperação da noite", text: "Whey e proteína vegetal para fechar a meta de proteína do dia.", cta: "Ver proteínas", to: "/loja", images: [img("whey-900"), img("proteina-vegetal")], price: priceOf("whey-900"), tone: "from-[#0b1f3a] to-[#1d4ed8]" };
}

const baseSlides: Slide[] = [
  { id: "moda", kicker: "Moda fitness", title: "Conjuntos e leggings para treinar com conforto", text: "Modelos femininos e masculinos com tecido que seca rápido.", cta: "Ver moda fitness", to: "/loja", images: [img("conjunto-fem-1"), img("conjunto-fem-2"), img("camiseta-regata")], price: priceOf("camiseta-regata"), tone: "from-[#3b0a24] to-[#be185d]" },
  { id: "casa", kicker: "Treino em casa", title: "Halteres, barra e tapete para montar seu espaço", text: "Acessórios resistentes para força, funcional e alongamento.", cta: "Ver acessórios", to: "/loja", images: [img("halteres"), img("kit-barra"), img("tapete")], price: priceOf("tapete"), tone: "from-[#111827] to-[#0e7a5f]" },
  { id: "sono", kicker: "Novo recurso no app", title: "Monitoramento do sono em tempo real", text: "Nota do sono, horas dormidas e batimentos ao vivo com cinta ou relógio Bluetooth.", cta: "Conhecer o recurso", to: "/sono", images: ["/images/show-sono.webp"], tone: "from-[#1e1b4b] to-[#4338ca]" },
  { id: "vender", kicker: "Para lojistas", title: "Venda seus produtos na NextVita", text: "Vitrine própria, avaliações e painel de vendas para lojas de suplementos, moda fitness e produtos naturais.", cta: "Quero vender aqui", to: "/parceiros", images: [img("conjunto-fem-3"), img("halteres")], tone: "from-[#052e2b] to-[#0e7a5f]" },
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

/** Banner inteligente da página inicial: a ordem das propagandas muda com o horário e com o carrinho do visitante. */
export function SmartBanner({ className = "" }: { className?: string }) {
  const { count, subtotal } = useCart();
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);

  const slides = useMemo(() => {
    const list: Slide[] = [];
    if (count > 0)
      list.push({ id: "carrinho", kicker: "Seu carrinho", title: `Você tem ${count} ${count === 1 ? "item" : "itens"} esperando`, text: `Subtotal de ${money(subtotal)}. Pagando com Pix, você ganha 5% de desconto.`, cta: "Finalizar compra", to: "/loja", images: [img("whey-900"), img("conjunto-fem-1")], tone: "from-[#052e2b] to-[#0c8063]" });
    if (hour !== null) list.push(momentSlide(hour));
    return [...list, ...baseSlides];
  }, [count, subtotal, hour]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();
  const playing = !paused && !hover && !reduce;
  const startX = useRef<number | null>(null);
  const safeIndex = index % slides.length;
  const slide = slides[safeIndex];

  const go = useCallback((n: number) => setIndex((n + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => go(safeIndex + 1), DURATION);
    return () => window.clearTimeout(t);
  }, [playing, safeIndex, go]);

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques NextVita"
      className={`nv-dark relative isolate overflow-hidden rounded-2xl bg-gradient-to-br text-white ${slide.tone} ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={() => setHover(false)}
      onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (startX.current === null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        if (Math.abs(dx) > 40) go(safeIndex + (dx < 0 ? 1 : -1));
        startX.current = null;
      }}
    >
      <div key={slide.id} className="nv-fade-in grid h-full min-h-[15rem] grid-cols-[1fr_auto] items-center gap-3 p-5 sm:min-h-[17rem] sm:p-7" aria-live={playing ? "off" : "polite"}>
        <div className="min-w-0 max-w-[34ch]">
          <p className="text-xs font-semibold text-white/75">{slide.kicker}</p>
          <h2 className="mt-1 text-balance font-display text-xl font-extrabold leading-tight sm:text-2xl">{slide.title}</h2>
          <p className="mt-2 line-clamp-3 text-sm leading-snug text-white/85">{slide.text}</p>
          {slide.price && <p className="mt-2 text-sm text-white/80">a partir de <strong className="text-lg font-extrabold text-white tabular-nums">{slide.price}</strong></p>}
          <Link to={slide.to} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-950 hover:bg-white/90">
            {slide.cta} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="relative flex h-full items-center" aria-hidden="true">
          {slide.images.slice(0, 2).map((src, i) => (
            <img
              key={src + i}
              src={src}
              alt=""
              width={360}
              height={360}
              className={`rounded-2xl object-cover shadow-2xl ring-1 ring-white/20 motion-safe:transition motion-safe:duration-700 motion-safe:hover:scale-105 ${i === 0 ? "nv-banner-img size-28 sm:size-40 lg:size-44" : "-ml-10 mt-16 size-20 sm:size-28 lg:size-32"}`}
            />
          ))}
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-3 flex items-center gap-2 sm:inset-x-7">
        <div className="flex flex-1 gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Destaque ${i + 1} de ${slides.length}: ${s.kicker}`}
              aria-current={i === safeIndex ? "true" : undefined}
              className="group relative h-6 flex-1"
            >
              <span className="absolute inset-x-0 top-1/2 block h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25">
                {i === safeIndex && (
                  <span
                    key={`${s.id}-${playing}`}
                    className={`block h-full rounded-full bg-white ${playing ? "nv-progress" : "w-full"}`}
                    style={playing ? { animationDuration: `${DURATION}ms` } : undefined}
                  />
                )}
                {i < safeIndex && <span className="block h-full w-full rounded-full bg-white/70" />}
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => go(safeIndex - 1)} aria-label="Destaque anterior" className="grid size-8 place-items-center rounded-full bg-white/15 hover:bg-white/25"><ChevronLeft size={16} /></button>
        <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Retomar destaques" : "Pausar destaques"} className="grid size-8 place-items-center rounded-full bg-white/15 hover:bg-white/25">{paused ? <Play size={14} /> : <Pause size={14} />}</button>
        <button type="button" onClick={() => go(safeIndex + 1)} aria-label="Próximo destaque" className="grid size-8 place-items-center rounded-full bg-white/15 hover:bg-white/25"><ChevronRight size={16} /></button>
      </div>
    </section>
  );
}
