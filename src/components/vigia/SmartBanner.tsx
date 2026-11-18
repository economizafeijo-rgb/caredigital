import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Phone, ScreenBody } from "./AppShowcase";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Check, ChevronLeft, ChevronRight, Droplets, HeartPulse, MessageCircle, Pause, Pill, Play } from "lucide-react";
import { money, products, STORE_WHATSAPP, useCart } from "@/lib/store";

export type Slide = {
  id: string;
  kicker: string;
  title: string;
  text: string;
  cta: string;
  to: "/loja" | "/sono" | "/parceiros" | "/hidratacao" | "/medicamentos" | "/metricas" | "/entrar";
  tool?: "agua" | "medicacao" | "sono" | "metricas" | "dev";
  href?: string;
  chips?: string[];
  images: string[];
  price?: string;
  tone: string;
  /** Conteúdo próprio (cena de abertura) no lugar do texto padrão. */
  custom?: ReactNode;
  /** Arte própria no lado direito. */
  art?: ReactNode;
  /** Foto de fundo da cena. */
  bg?: string;
  /** Rótulo curto do capítulo na barra de progresso. */
  chapter?: string;
};

const DURATION = 9000;
const FADE = 1100;
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

const DEV_WHATSAPP = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent("Olá, Franc! Tenho uma ideia e quero transformar em site ou aplicativo.")}`;
const devSlide: Slide = {
  id: "dev",
  kicker: "Franc D'nis · Sites e aplicativos",
  title: "Sua ideia, no ar para o seu público.",
  text: "Crio sites, apps e lojas virtuais sob medida, como a NextVita que você está usando agora. Feito em Feijó, Acre.",
  cta: "Conversar no WhatsApp",
  chips: ["Sites", "Aplicativos", "Lojas virtuais"],
  to: "/sobre",
  href: DEV_WHATSAPP,
  images: [],
  tool: "dev",
  tone: "from-[#050b18] via-[#0b2b29] to-[#0c8063]",
};

const toolSlides: Slide[] = [
  { id: "t-medidas", kicker: "Novo · Medidas do corpo", chapter: "Medidas do corpo", title: "Acompanhe cada centímetro da sua evolução", text: "Cintura, braços, coxas e mais num corpo interativo, com gráficos, relação cintura-quadril e gordura estimada. Ideal para a academia ou o seu projeto.", cta: "Começar a medir", to: "/entrar", images: [], tone: "from-[#020617] via-[#06283d] to-[#0e7490]",
    art: <Phone className="nv-float h-[19rem] w-[9.5rem]"><div className="absolute inset-x-0 bottom-0 top-6"><ScreenBody /></div></Phone> },
  { id: "t-agua", kicker: "Ferramenta gratuita", title: "Sua meta de água calculada e lembrada", text: "O app calcula quanto beber pelo seu peso e avisa o próximo copo ao longo do dia.", cta: "Usar grátis", to: "/hidratacao", images: [], tool: "agua", tone: "from-[#062a3d] to-[#0369a1]" },
  { id: "t-med", kicker: "Ferramenta gratuita", title: "Nenhuma dose esquecida", text: "Cartela interativa com horários, confirmação de cada dose e histórico completo.", cta: "Usar grátis", to: "/medicamentos", images: [], tool: "medicacao", tone: "from-[#3b0716] to-[#be123c]" },
  { id: "t-sono", kicker: "Ferramenta gratuita", title: "Batimentos e nota do sono ao vivo", text: "Conecte uma cinta ou relógio Bluetooth e acompanhe a noite em tempo real.", cta: "Conhecer", to: "/sono", images: [], tool: "sono", tone: "from-[#140f3a] to-[#4338ca]" },
  { id: "t-metricas", kicker: "Ferramenta gratuita", title: "Sua evolução em gráficos claros", text: "Água, nutrição, peso e atividade no dia, no mês e no ano.", cta: "Usar grátis", to: "/metricas", images: [], tool: "metricas", tone: "from-[#042f2e] to-[#0f766e]" },
];

const baseSlides: Slide[] = [
  { id: "moda", kicker: "Moda fitness", title: "Conjuntos e leggings para treinar com conforto", text: "Modelos femininos e masculinos com tecido que seca rápido.", cta: "Ver moda fitness", to: "/loja", images: [img("conjunto-fem-1"), img("conjunto-fem-2"), img("camiseta-regata")], price: priceOf("camiseta-regata"), tone: "from-[#3b0a24] to-[#be185d]" },
  { id: "casa", kicker: "Treino em casa", title: "Halteres, barra e tapete para montar seu espaço", text: "Acessórios resistentes para força, funcional e alongamento.", cta: "Ver acessórios", to: "/loja", images: [img("halteres"), img("kit-barra"), img("tapete")], price: priceOf("tapete"), tone: "from-[#111827] to-[#0e7a5f]" },
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

/** Vitrine única da página inicial: abre com a apresentação da plataforma e segue com ferramentas,
 *  loja, propagandas do administrador e anúncios — em cenas longas que se dissolvem devagar. */
export function SmartBanner({ className = "", intro }: { className?: string; intro?: Slide }) {
  const { count, subtotal } = useCart();
  const [hour, setHour] = useState<number | null>(null);
  const [ads, setAds] = useState<Slide[]>([]);
  useEffect(() => setHour(new Date().getHours()), []);
  useEffect(() => {
    let active = true;
    try {
      void (supabase as any).from("care_ads").select("id,title,subtitle,cta_label,link_url,image_url").eq("placement", "inicio").order("priority", { ascending: false }).limit(4)
        .then((r: any) => {
          if (!active) return;
          setAds((r?.data ?? []).map((a: any): Slide => ({
            id: "ad-" + a.id, kicker: "Patrocinado", chapter: "Anúncio", title: a.title, text: a.subtitle ?? "", cta: a.cta_label || "Saiba mais", to: "/loja",
            href: a.link_url && /^https?:/i.test(a.link_url) ? a.link_url : undefined, images: [], bg: a.image_url || undefined, tone: "from-[#0b1220] to-[#1e293b]",
          })));
        }, () => undefined);
    } catch { /* sem cliente de dados */ }
    return () => { active = false; };
  }, []);

  const slides = useMemo(() => {
    const list: Slide[] = intro ? [intro] : [];
    if (count > 0)
      list.push({ id: "carrinho", kicker: "Seu carrinho", chapter: "Carrinho", title: `Você tem ${count} ${count === 1 ? "item" : "itens"} esperando`, text: `Subtotal de ${money(subtotal)}. Pagando com Pix, você ganha 5% de desconto.`, cta: "Finalizar compra", to: "/loja", images: [img("whey-900"), img("conjunto-fem-1")], tone: "from-[#052e2b] to-[#0c8063]" });
    const mixed: Slide[] = [];
    const max = Math.max(toolSlides.length, baseSlides.length);
    for (let i = 0; i < max; i++) {
      if (toolSlides[i]) mixed.push(toolSlides[i]);
      if (i === 0 && hour !== null) mixed.push(momentSlide(hour));
      if (ads[i]) mixed.push(ads[i]);
      if (baseSlides[i]) mixed.push(baseSlides[i]);
    }
    mixed.splice(4, 0, devSlide);
    return [...list, ...mixed, ...ads.slice(max)];
  }, [count, subtotal, hour, ads, intro]);

  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();
  const playing = !paused && !hover && !reduce;
  const startX = useRef<number | null>(null);
  const safeIndex = index % slides.length;
  const slide = slides[safeIndex];
  const next = slides[(safeIndex + 1) % slides.length];

  const go = useCallback((n: number) => {
    setIndex((cur) => {
      const target = (n + slides.length) % slides.length;
      if (target !== cur) setPrev(cur);
      return target;
    });
  }, [slides.length]);
  useEffect(() => {
    if (prev === null) return;
    const t = window.setTimeout(() => setPrev(null), FADE);
    return () => window.clearTimeout(t);
  }, [prev, index]);
  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => go(safeIndex + 1), DURATION);
    return () => window.clearTimeout(t);
  }, [playing, safeIndex, go]);

  const layer = (sl: Slide, state: "in" | "out") => (
    <div key={sl.id + state} className={`absolute inset-0 bg-gradient-to-br ${sl.tone} ${state === "in" ? "nv-scene-in" : "nv-scene-out"}`} aria-hidden={state === "out" || undefined}>
      {sl.bg && <img src={sl.bg} alt="" className="nv-kenburns absolute inset-0 size-full object-cover" style={{ animationDuration: `${DURATION + 3000}ms` }} />}
      {sl.bg && <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,8,14,.92)_0%,rgba(2,8,14,.72)_45%,rgba(2,8,14,.2)_100%)] max-sm:bg-[linear-gradient(180deg,rgba(2,8,14,.25)_0%,rgba(2,8,14,.7)_45%,rgba(2,8,14,.95)_100%)]" />}
      <div className="absolute inset-0 opacity-[.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
      <div className="relative grid h-full grid-cols-1 content-center items-center gap-4 p-5 pb-16 sm:grid-cols-[minmax(0,1fr)_auto] sm:content-normal sm:gap-5 sm:p-8 sm:pb-14 lg:px-10">
        <div className="min-w-0 max-w-[40rem]">
          {sl.custom ?? (
            <>
              <p className="nv-rise inline-flex items-center gap-1.5 text-xs font-semibold text-white/80">
                {sl.tool && sl.tool !== "dev" && <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[11px] font-bold text-slate-950">Grátis</span>}
                {sl.kicker}
              </p>
              <h2 style={{ animationDelay: "150ms" }} className="nv-rise mt-1.5 text-balance font-display text-2xl font-extrabold leading-tight sm:text-3xl lg:text-[2.1rem]">{sl.title}</h2>
              {sl.text && <p style={{ animationDelay: "300ms" }} className="nv-rise mt-2 max-w-[46ch] text-sm leading-relaxed text-white/85 sm:text-[15px]">{sl.text}</p>}
              {sl.chips && (
                <ul className="nv-rise mt-3 flex flex-wrap gap-1.5" style={{ animationDelay: "420ms" }}>
                  {sl.chips.map((c) => <li key={c} className="rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">{c}</li>)}
                </ul>
              )}
              {sl.price && <p style={{ animationDelay: "450ms" }} className="nv-rise mt-2 text-sm text-white/80">a partir de <strong className="text-lg font-extrabold text-white tabular-nums">{sl.price}</strong></p>}
              {sl.href ? (
                <a href={sl.href} target="_blank" rel="noopener noreferrer" style={{ animationDelay: "550ms" }} className={`nv-rise mt-4 inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold text-slate-950 hover:brightness-105 ${sl.tool === "dev" ? "bg-[#25d366]" : "bg-white"}`}>
                  {sl.tool === "dev" ? <MessageCircle size={16} aria-hidden="true" /> : null} {sl.cta} {sl.tool !== "dev" && <ArrowRight size={16} aria-hidden="true" />}
                </a>
              ) : (
                <Link to={sl.to} style={{ animationDelay: "550ms" }} className="nv-rise mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 hover:bg-white/90">
                  {sl.cta} <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
            </>
          )}
        </div>
        <div className="relative flex h-full items-center justify-center max-sm:order-first max-sm:h-auto max-sm:min-h-[13rem] max-sm:[&>*]:scale-110" aria-hidden="true">
          {sl.art ?? (sl.tool ? (
            <ToolDemo kind={sl.tool} />
          ) : (
            sl.images.slice(0, 2).map((src, i) => (
              <span key={src + i} className={`relative block overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/20 ${i === 0 ? "nv-banner-img size-44 sm:size-48 lg:size-56" : "nv-float -ml-10 mt-16 size-32 sm:size-36 lg:size-40"}`}>
                <img src={src} alt="" width={360} height={360} className="nv-kenburns size-full object-cover" style={{ animationDuration: `${DURATION + 1500}ms` }} />
              </span>
            ))
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques NextVita"
      className={`nv-dark relative isolate h-[min(40rem,calc(100dvh-7rem))] min-h-[32rem] overflow-hidden rounded-2xl bg-slate-950 text-white shadow-card [contain:layout_paint] sm:h-[23rem] sm:min-h-0 lg:h-[25rem] ${className}`}
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
      {prev !== null && slides[prev] && layer(slides[prev], "out")}
      {layer(slide, "in")}
      <p className="sr-only" aria-live={playing ? "off" : "polite"}>{slide.title}</p>

      <div className="absolute inset-x-5 bottom-3 z-10 flex items-center gap-2 sm:inset-x-8 lg:inset-x-10">
        <div className="flex flex-1 gap-1.5">
          {slides.map((s, i) => (
            <button key={s.id} type="button" onClick={() => go(i)} aria-label={`Destaque ${i + 1} de ${slides.length}: ${s.kicker}`} aria-current={i === safeIndex ? "true" : undefined} className="group relative h-6 flex-1">
              <span className="absolute inset-x-0 top-1/2 block h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/20 transition-[height] group-hover:h-1.5">
                {i === safeIndex && <span key={`${s.id}-${playing}`} className={`block h-full rounded-full bg-white ${playing ? "nv-progress" : "w-full"}`} style={playing ? { animationDuration: `${DURATION}ms` } : undefined} />}
                {i < safeIndex && <span className="block h-full w-full rounded-full bg-white/60" />}
              </span>
            </button>
          ))}
        </div>
        <span className="hidden max-w-[12rem] truncate text-[11px] text-white/60 lg:inline">A seguir: <strong className="text-white/85">{next.chapter ?? next.kicker}</strong></span>
        <button type="button" onClick={() => go(safeIndex - 1)} aria-label="Destaque anterior" className="grid size-8 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25"><ChevronLeft size={16} /></button>
        <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Retomar destaques" : "Pausar destaques"} className="grid size-8 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25">{paused ? <Play size={14} /> : <Pause size={14} />}</button>
        <button type="button" onClick={() => go(safeIndex + 1)} aria-label="Próximo destaque" className="grid size-8 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25"><ChevronRight size={16} /></button>
      </div>
    </section>
  );
}

/** Mini telas animadas das ferramentas gratuitas, como num anúncio em vídeo. */
export function ToolDemo({ kind }: { kind: NonNullable<Slide["tool"]> }) {
  const base = "nv-banner-img w-44 rounded-2xl p-3.5 shadow-2xl sm:w-52";
  const card = `${base} bg-white text-slate-900`;
  if (kind === "dev")
    return (
      <div className="nv-banner-img relative w-56 sm:w-72 lg:w-80">
        <span className="absolute -left-3 -top-3 z-10 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-900 shadow-lg">Projeto real: NextVita</span>
        <div className="rounded-xl bg-slate-900 p-1.5 shadow-2xl ring-1 ring-white/15">
          <div className="overflow-hidden rounded-md bg-white">
            <img src="/images/dev-nextvita-desktop.webp" alt="" width={800} height={450} className="nv-kenburns aspect-[16/9] w-full object-cover object-top" style={{ animationDuration: "7000ms" }} />
          </div>
        </div>
        <div className="relative left-1/2 h-2.5 w-[112%] -translate-x-1/2 rounded-b-xl bg-gradient-to-b from-slate-500 to-slate-700 shadow-xl" />
        <div className="nv-float absolute -bottom-10 -right-5 w-16 rounded-[16px] bg-slate-900 p-1 shadow-2xl ring-1 ring-white/25 sm:w-20">
          <img src="/images/dev-nextvita-mobile.webp" alt="" width={300} height={560} className="aspect-[9/17] w-full rounded-[12px] object-cover object-top" />
        </div>
      </div>
    );
  if (kind === "agua")
    return (
      <div className={card}>
        <p className="flex items-center gap-1.5 text-xs font-bold text-sky-700"><Droplets size={14} /> Hidratação de hoje</p>
        <div className="mt-2 flex items-center gap-3">
          <svg viewBox="0 0 44 44" className="size-16 -rotate-90">
            <circle cx="22" cy="22" r="18" fill="none" stroke="#e0f2fe" strokeWidth="6" />
            <circle className="nv-ring" cx="22" cy="22" r="18" fill="none" stroke="#0284c7" strokeWidth="6" strokeLinecap="round" strokeDasharray="113" />
          </svg>
          <div><strong className="block text-xl font-extrabold tabular-nums">1,8 L</strong><span className="text-[11px] text-slate-500">de 2,5 L</span></div>
        </div>
        <p className="nv-rise mt-2 rounded-lg bg-sky-50 px-2 py-1.5 text-[11px] font-semibold text-sky-800" style={{ animationDelay: "900ms" }}>Próximo copo às 15:30</p>
      </div>
    );
  if (kind === "medicacao")
    return (
      <div className={card}>
        <p className="flex items-center gap-1.5 text-xs font-bold text-rose-700"><Pill size={14} /> Doses de hoje</p>
        <ul className="mt-2 grid gap-1.5 text-[12px]">
          {["08:00 · Vitamina D3", "12:00 · Ômega 3", "20:00 · Magnésio"].map((d, i) => (
            <li key={d} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
              <span className="nv-check grid size-5 place-items-center rounded-full bg-emerald-500 text-white" style={{ animationDelay: `${500 + i * 700}ms` }}><Check size={12} /></span>
              {d}
            </li>
          ))}
        </ul>
      </div>
    );
  if (kind === "sono")
    return (
      <div className={`${base} bg-slate-950 text-white ring-1 ring-white/15`}>
        <p className="flex items-center justify-between text-xs font-bold text-indigo-300"><span className="flex items-center gap-1.5"><HeartPulse size={14} /> Ao vivo</span><span className="flex items-center gap-1"><span className="nv-live size-2 rounded-full bg-rose-500" /> 58 bpm</span></p>
        <svg viewBox="0 0 200 60" className="mt-2 h-14 w-full">
          <polyline className="nv-heart" fill="none" stroke="#fb7185" strokeWidth="2.5" strokeLinejoin="round" points="0,35 30,35 40,35 48,12 56,52 64,30 74,35 110,35 120,35 128,14 136,50 144,32 154,35 200,35" />
        </svg>
        <p className="text-[11px] text-indigo-200">Nota do sono: <strong className="text-white">86</strong> · 7h42 dormidas</p>
      </div>
    );
  return (
    <div className={card}>
      <p className="flex items-center gap-1.5 text-xs font-bold text-teal-700"><BarChart3 size={14} /> Esta semana</p>
      <div className="mt-2 flex h-20 items-end gap-1.5">
        {[45, 62, 50, 78, 70, 88, 95].map((h, i) => (
          <span key={i} className="nv-bar flex-1 rounded-t bg-teal-500" style={{ height: `${h}%`, animationDelay: `${200 + i * 110}ms` }} />
        ))}
      </div>
      <p className="mt-1.5 text-[11px] font-semibold text-teal-800">Meta de água: 6 de 7 dias</p>
    </div>
  );
}
