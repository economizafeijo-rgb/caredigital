import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Code2, Dumbbell, MessageCircle, Package, Pause, Play, RotateCcw, Store, UserRound } from "lucide-react";
import { STORE_WHATSAPP } from "@/lib/store";

type Scene = {
  id: string;
  label: string;
  icon: typeof Store;
  headline: string[];
  text: string;
  images: string[];
  ms: number;
  dev?: boolean;
};

const scenes: Scene[] = [
  { id: "lojas", label: "Lojas", icon: Store, headline: ["Sua", "loja"], text: "Vitrine própria diante de quem já cuida da saúde todos os dias.", images: ["/loja/v2/conjunto-preto.webp", "/loja/v2/whey.webp", "/loja/v2/halteres.webp"], ms: 4200 },
  { id: "academias", label: "Academias", icon: Dumbbell, headline: ["Sua", "academia"], text: "Divulgue planos, aulas e horários para quem acompanha os treinos no app.", images: ["/images/hero-treinos.webp"], ms: 4200 },
  { id: "personal", label: "Personal trainers", icon: UserRound, headline: ["Seu", "trabalho", "como personal"], text: "Apresente sua consultoria e encontre alunos que já registram a própria rotina.", images: ["/images/caredigital-esporte.webp"], ms: 4200 },
  { id: "dev", label: "Seu site ou app", icon: Code2, headline: ["Sua", "ideia", "vira", "site ou app"], text: "Franc D'nis cria sites, aplicativos e plataformas sob medida, como a NextVita. Feito em Feijó, Acre.", images: [], ms: 5200, dev: true },
  { id: "produtos", label: "Produtos", icon: Package, headline: ["Seu", "produto"], text: "Suplementos, fitoterápicos, moda fitness e acessórios com preço e entrega claros.", images: ["/loja/v2/oleo-copaiba.webp", "/loja/v2/guarana-po.webp", "/loja/v2/pre-treino.webp"], ms: 4200 },
];
const END_MS = 7000;
const WHATSAPP = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent("Olá! Quero anunciar na NextVita. Pode me explicar como funciona?")}`;
const DEV_WHATSAPP = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent("Olá, Franc! Tenho uma ideia e quero transformar em site ou aplicativo.")}`;

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

/** Comercial em cenas convidando lojas, academias, personal trainers e marcas a anunciar na NextVita. */
export function PartnerCommercial({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0); // 0..scenes.length (último = tela final)
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const isEnd = step === scenes.length;
  const playing = !paused && !hover && !reduce;
  const duration = isEnd ? END_MS : scenes[step].ms;

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setStep((s) => (s + 1) % (scenes.length + 1)), duration);
    return () => window.clearTimeout(t);
  }, [playing, step, duration]);

  const scene = isEnd ? null : scenes[step];

  return (
    <section
      aria-labelledby="partner-ad-title"
      className={`nv-dark relative isolate overflow-hidden rounded-2xl bg-black text-white ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={() => setHover(false)}
    >
      <h2 id="partner-ad-title" className="sr-only">Anuncie na NextVita: lojas, academias, personal trainers e produtos</h2>

      <div className="relative h-[19rem] sm:h-[20rem] lg:h-[22rem]">
        {scene ? (
          <div key={scene.id} className="absolute inset-0">
            {scene.dev ? (
              <div className="absolute inset-0 bg-gradient-to-br from-[#0b1120] via-[#0f2a2a] to-[#0c8063]" aria-hidden="true">
                <div className="nv-banner-img absolute right-8 top-1/2 hidden w-[24rem] -translate-y-1/2 md:block lg:right-14 lg:w-[28rem]">
                  <span className="absolute -left-3 -top-3 z-10 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-900 shadow-lg">Projeto real: NextVita</span>
                  <div className="rounded-xl bg-slate-900 p-1.5 shadow-2xl ring-1 ring-white/15">
                    <div className="overflow-hidden rounded-md bg-white">
                      <img src="/images/dev-nextvita-desktop.webp" alt="" width={800} height={450} className="nv-kenburns aspect-[16/9] w-full object-cover object-top" style={{ animationDuration: "6000ms" }} />
                    </div>
                  </div>
                  <div className="relative left-1/2 h-2.5 w-[112%] -translate-x-1/2 rounded-b-xl bg-gradient-to-b from-slate-400 to-slate-600 shadow-xl" />
                  <div className="nv-float absolute -bottom-8 -right-6 w-20 rounded-[16px] bg-slate-900 p-1 shadow-2xl ring-1 ring-white/25 lg:w-24">
                    <img src="/images/dev-nextvita-mobile.webp" alt="" width={300} height={560} className="aspect-[9/17] w-full rounded-[12px] object-cover object-top" />
                  </div>
                </div>
              </div>
            ) : scene.images.length === 1 ? (
              <img src={scene.images[0]} alt="" aria-hidden="true" className="nv-kenburns absolute inset-0 size-full object-cover opacity-80" style={{ animationDuration: `${scene.ms + 600}ms` }} />
            ) : (
              <div className="absolute inset-0 grid grid-cols-3 gap-1 bg-black" aria-hidden="true">
                {scene.images.map((src, i) => (
                  <span key={src} className="relative overflow-hidden">
                    <img src={src} alt="" className="nv-ad-tile size-full object-cover" style={{ animationDelay: `${i * 120}ms, ${i * 120}ms`, animationDuration: `600ms, ${scene.ms + 600}ms` }} />
                  </span>
                ))}
              </div>
            )}
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
            <div className="absolute inset-y-0 left-0 flex max-w-[34rem] flex-col justify-center px-6 sm:px-10">
              <span className="nv-rise inline-flex w-fit items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                <scene.icon size={14} aria-hidden="true" /> {scene.dev ? "Franc D'nis · Desenvolvedor" : `Para ${scene.label.toLowerCase()}`}
              </span>
              <p className="mt-3 font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
                {scene.headline.map((w, i) => (
                  <span key={w + i} className="nv-word mr-[0.25em] inline-block" style={{ animationDelay: `${150 + i * 180}ms` }}>
                    {w}
                  </span>
                ))}
                <span className="nv-word inline-block text-emerald-300" style={{ animationDelay: `${150 + scene.headline.length * 180}ms` }}>
                  aqui.
                </span>
              </p>
              <p className="nv-rise mt-3 max-w-[38ch] text-sm text-white/85 sm:text-base" style={{ animationDelay: "700ms" }}>{scene.text}</p>
              {scene.dev && (
                <a href={DEV_WHATSAPP} target="_blank" rel="noopener noreferrer" className="nv-rise mt-4 inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-[#25d366] px-4 text-sm font-bold text-slate-950 hover:brightness-105" style={{ animationDelay: "900ms" }}>
                  <MessageCircle size={16} aria-hidden="true" /> Chamar Franc no WhatsApp
                </a>
              )}
            </div>
          </div>
        ) : (
          <div key="end" className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#041f1d] via-[#0a3f39] to-[#0c8063] px-6 text-center">
            <div className="nv-rise">
              <p className="text-sm font-semibold text-emerald-200">Lojas · academias · personal trainers · marcas</p>
              <p className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Anuncie na NextVita</p>
              <p className="mx-auto mt-2 max-w-[44ch] text-sm text-white/85 sm:text-base">
                Apareça para quem acompanha alimentação, treinos e saúde todos os dias. Plano inicial sem mensalidade.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link to="/parceiros" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 hover:bg-emerald-50">
                  Quero anunciar <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/40 px-5 text-sm font-semibold hover:bg-white/10">
                  <MessageCircle size={16} aria-hidden="true" /> Falar no WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Faixas de cinema e chrome de TV */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-black sm:h-4" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-black sm:h-4" />
        <span className="absolute right-4 top-6 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-[.14em] text-white/80 sm:right-6">PUBLICIDADE</span>
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 bg-black px-4 py-2.5 sm:px-6">
        <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Reproduzir comercial" : "Pausar comercial"} className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20">
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
        <div className="flex flex-1 gap-1.5" role="group" aria-label="Cenas do comercial">
          {[...scenes.map((s) => s.label), "Anuncie"].map((label, i) => (
            <button key={label} type="button" onClick={() => setStep(i)} aria-label={`Ir para a cena: ${label}`} aria-current={i === step ? "true" : undefined} className="group flex-1 text-left">
              <span className="block h-1 overflow-hidden rounded-full bg-white/20">
                {i < step && <span className="block h-full w-full bg-white/70" />}
                {i === step && <span key={`${i}-${playing}`} className={`block h-full bg-white ${playing ? "nv-progress" : "w-full"}`} style={playing ? { animationDuration: `${duration}ms` } : undefined} />}
              </span>
              <span className={`mt-1 hidden truncate text-[11px] sm:block ${i === step ? "font-semibold text-white" : "text-white/55"}`}>{label}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setStep(0)} aria-label="Assistir do começo" className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20">
          <RotateCcw size={14} />
        </button>
      </div>
    </section>
  );
}
