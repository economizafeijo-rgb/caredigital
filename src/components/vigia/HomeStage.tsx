import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CreditCard,
  Dumbbell,
  Gift,
  HeartPulse,
  Home as HomeIcon,
  LayoutDashboard,
  MapPin,
  Percent,
  Scale,
  Shirt,
  ShoppingCart,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { money, PIX_DISCOUNT, products, type Product } from "@/lib/store";
import { countdownParts, currentCampaign } from "@/lib/store-promos";
import { LiveModeLauncher } from "./LiveMode";
import { openProduct } from "./StoreViews";
import { useTicker } from "./store/StorePromos";

type Goal = {
  key: string;
  label: string;
  icon: LucideIcon;
  ids: string[];
  line: string;
  tool: string;
  toolTo: string;
  toolClient: string;
  bg: string;
};

/** Fotos de fundo do destaque principal: cenas reais de rotina, treino e alimentação. */
const heroBg: Record<string, string> = {
  massa: "/loja/gym.webp",
  saude: "/images/caredigital-care-hero.webp",
  peso: "/images/hero-alimentacao.webp",
  moda: "/images/hero-treinos.webp",
  casa: "/images/caredigital-care-hero.webp",
};

/** Ponto de foco de cada foto: mantém rosto e corpo dentro do quadro em qualquer proporção. */
const heroFocus: Record<string, string> = {
  massa: "72% 45%",
  saude: "70% 22%",
  peso: "50% 50%",
  moda: "60% 40%",
  casa: "70% 22%",
};

/** Objetivos que o visitante escolhe: cada um muda a vitrine, o texto e a ferramenta sugerida. */
const goals: Goal[] = [
  {
    key: "massa",
    label: "Ganhar massa",
    icon: Dumbbell,
    ids: ["whey-900", "pre-treino", "coqueteleira"],
    line: "Proteína e pré-treino, com o diário de alimentação para acompanhar a sua meta de proteína.",
    bg: "/images/hero-treinos.webp",
    tool: "Alimentação e treinos",
    toolTo: "/dietas",
    toolClient: "/cliente#alimentacao",
  },
  {
    key: "saude",
    label: "Rotina de saúde",
    icon: HeartPulse,
    ids: ["multivitaminico", "vitamina-d", "oleo-copaiba"],
    line: "Vitaminas e fitoterápicos com lembrete no horário, para não esquecer nenhuma dose.",
    bg: "/images/hero-suplementos.webp",
    tool: "Medicação e suplementos",
    toolTo: "/medicamentos",
    toolClient: "/cliente#medicacao",
  },
  {
    key: "peso",
    label: "Cuidar do peso",
    icon: Scale,
    ids: ["proteina-vegetal", "cha-camomila", "tapete"],
    line: "Registre peso e medidas, veja a evolução em gráficos e monte a rotina que combina com você.",
    bg: "/images/hero-peso.webp",
    tool: "Peso e medidas",
    toolTo: "/peso",
    toolClient: "/cliente#peso",
  },
  {
    key: "moda",
    label: "Moda fitness",
    icon: Shirt,
    ids: ["conjunto-fem-1", "camiseta-regata", "legging"],
    line: "Conjuntos, leggings e camisetas de lojas de Feijó, com 5% de desconto no Pix.",
    bg: "/images/caredigital-esporte.webp",
    tool: "Treinos",
    toolTo: "/treinos",
    toolClient: "/cliente#atividade",
  },
  {
    key: "casa",
    label: "Treino em casa",
    icon: HomeIcon,
    ids: ["halteres", "kit-barra", "tapete"],
    line: "Halteres, barra e tapete para montar o seu espaço, e o app para registrar cada treino.",
    bg: "/images/hero-alimentacao.webp",
    tool: "Registro de treinos",
    toolTo: "/treinos",
    toolClient: "/cliente#atividade",
  },
];

const trust: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Percent, title: "5% off no Pix", text: "Desconto automático" },
  { icon: CreditCard, title: "Até 3x no cartão", text: "Parcele suas compras" },
  { icon: Truck, title: "Entrega ou retirada", text: "Em casa ou na loja" },
  { icon: MapPin, title: "Lojas de Feijó", text: "Compre local" },
];

const offOf = (price: number, old?: number | null) =>
  old ? Math.round((1 - price / old) * 100) : 0;

/** Selo da campanha em andamento, com contagem regressiva que corre sozinha. */
function CampaignPill() {
  const campaign = useMemo(() => currentCampaign(), []);
  const now = useTicker(1000);
  const c = countdownParts(campaign.until - now);
  const bf = campaign.id === "black-friday";
  return (
    <a
      href="#relampago"
      style={{ animationDelay: "40ms" }}
      className="nv-rise inline-flex max-w-full items-center gap-2 rounded-full bg-white/[.08] px-3 py-1.5 text-[12.5px] font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/[.14]"
    >
      <Zap
        size={14}
        aria-hidden="true"
        className={`shrink-0 ${bf ? "text-amber-300" : "text-[#3fe0c8]"}`}
      />
      <span className="truncate">
        {campaign.untilLabel === "Black Friday em"
          ? `${campaign.headline} · começa em`
          : `${campaign.name} · ${campaign.untilLabel.toLowerCase()}`}{" "}
        <span className="tabular-nums">
          {c.d > 0 ? `${c.d}d ` : ""}
          {String(c.h).padStart(2, "0")}h {String(c.m).padStart(2, "0")}min
        </span>
      </span>
    </a>
  );
}

/** Abertura da página inicial no celular: foto em tela cheia, título grande e atalhos por objetivo. */
function MobileHero({
  client,
  panel,
  greet,
  firstName,
  idx,
  choose,
}: {
  client: boolean;
  panel: string | null;
  greet: string;
  firstName: string;
  idx: number;
  choose: (i: number) => void;
}) {
  const goal = goals[idx];
  const picks = goal.ids
    .map((id) => products.find((x) => x.id === id))
    .filter((x): x is Product => !!x);
  return (
    <section
      aria-labelledby="home-title-m"
      className="nv-dark relative isolate -mx-5 -mt-2 overflow-hidden bg-[#0a1226] text-white sm:hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(75% 40% at 90% 0%, rgba(99,102,241,.35), transparent 70%), radial-gradient(70% 38% at 0% 62%, rgba(63,224,200,.20), transparent 70%), radial-gradient(60% 30% at 100% 100%, rgba(232,54,143,.16), transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,#000,transparent_70%)]"
      />

      <div className="px-5 pb-6 pt-5">
        <CampaignPill />

        <p className="nv-rise mt-6 inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#3fe0c8]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#3fe0c8] opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-[#3fe0c8]" />
          </span>
          Feijó, Acre · marketplace local e bem-estar
        </p>
        <h1
          id="home-title-m"
          style={{ animationDelay: "100ms" }}
          className="nv-rise mt-3 text-balance font-display text-[2.45rem] font-extrabold leading-[1.02] tracking-[-0.03em]"
        >
          {client ? (
            `${greet}, ${firstName}.`
          ) : (
            <>
              Compre de quem é <span className="text-[#3fe0c8]">daqui.</span> Cuide de você todo
              dia.
            </>
          )}
        </h1>
        <p
          style={{ animationDelay: "180ms" }}
          className="nv-rise mt-3 max-w-[36ch] text-[15.5px] leading-relaxed text-white/75"
        >
          {client
            ? "Sua rotina em dia e as melhores ofertas de Feijó."
            : "As lojas da sua cidade, com Pix e entrega, e a sua rotina de saúde no mesmo aplicativo."}
        </p>

        <div
          style={{ animationDelay: "260ms" }}
          className="nv-rise mt-5 grid grid-cols-[1fr_auto] gap-2.5"
        >
          <a
            href="#ofertas"
            className="inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-2xl bg-[#3fe0c8] px-5 text-[15px] font-extrabold text-slate-950 shadow-[0_12px_32px_-12px_rgba(63,224,200,.8)] transition active:scale-[.98]"
          >
            <ShoppingCart size={18} aria-hidden="true" /> Ver ofertas
          </a>
          {panel ? (
            <Link
              to={panel}
              aria-label="Abrir meu painel"
              className="inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 text-[14px] font-semibold backdrop-blur transition active:scale-[.98]"
            >
              <LayoutDashboard size={17} aria-hidden="true" /> Meu painel
            </Link>
          ) : (
            <a
              href="/entrar?mode=signup"
              className="inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 text-[14px] font-semibold backdrop-blur transition active:scale-[.98]"
            >
              <Gift size={17} aria-hidden="true" /> Criar conta
            </a>
          )}
        </div>

        {/* Vitrine: foto enquadrada com cartões de vidro sobrepostos */}
        <div style={{ animationDelay: "340ms" }} className="nv-rise relative mt-7 pb-9">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl ring-1 ring-white/15 shadow-[0_30px_60px_-25px_rgba(0,0,0,.8)]">
            {goals.map((g, i) => (
              <img
                key={g.key}
                src={heroBg[g.key]}
                alt=""
                aria-hidden="true"
                loading={i === idx ? "eager" : "lazy"}
                className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0"}`}
              />
            ))}
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#0a1226]/70 via-transparent to-transparent"
            />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11.5px] font-semibold backdrop-blur">
              <goal.icon size={13} aria-hidden="true" className="text-[#3fe0c8]" />
              {goal.label}
            </span>
          </div>

          {picks[0] && (
            <button
              type="button"
              onClick={() => openProduct(picks[0].id)}
              aria-label={`Ver ${picks[0].name}, ${money(picks[0].priceCents)}`}
              className="absolute -bottom-0 right-3 flex w-[11.75rem] items-center gap-2.5 rounded-2xl border border-white/20 bg-[#0a1226]/80 p-2 text-left shadow-2xl backdrop-blur-xl transition active:scale-[.97]"
            >
              <img
                src={picks[0].img}
                alt=""
                width={96}
                height={96}
                className="size-12 shrink-0 rounded-xl bg-[#e9ebee] object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold">{picks[0].name}</span>
                <span className="mt-0.5 block text-[15px] font-extrabold text-[#3fe0c8]">
                  {money(picks[0].priceCents)}
                </span>
              </span>
            </button>
          )}
          <div className="absolute bottom-0 left-3 flex items-center gap-2 rounded-2xl border border-white/20 bg-[#0a1226]/80 p-2 pr-3 shadow-2xl backdrop-blur-xl">
            <svg viewBox="0 0 44 44" className="size-9 -rotate-90" aria-hidden="true">
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="rgba(255,255,255,.14)"
                strokeWidth="5"
              />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="#3fe0c8"
                strokeWidth="5"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset=".28"
              />
            </svg>
            <span className="leading-tight">
              <b className="block text-[13px] font-bold">72%</b>
              <span className="text-[11px] text-white/60">meta de água</span>
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#0a1226]/90 px-5 pb-5 pt-4 backdrop-blur">
        <p className="text-[12.5px] font-semibold text-white/60">O que você quer cuidar agora?</p>
        <div
          role="group"
          aria-label="Escolha um objetivo"
          className="-mx-5 mt-2.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {goals.map((g, i) => {
            const on = i === idx;
            return (
              <button
                key={g.key}
                type="button"
                aria-pressed={on}
                onClick={() => choose(i)}
                className={`relative h-24 w-[8.25rem] shrink-0 snap-start overflow-hidden rounded-2xl text-left transition active:scale-95 ${on ? "ring-2 ring-[#3fe0c8]" : "ring-1 ring-white/15"}`}
              >
                <img
                  src={g.bg}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute inset-0 -z-10 size-full object-cover"
                />
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 -z-10 ${on ? "bg-gradient-to-t from-[#0a1226]/90 to-[#0a1226]/20" : "bg-gradient-to-t from-[#0a1226]/95 to-[#0a1226]/55"}`}
                />
                <span className="flex h-full flex-col justify-between p-2.5">
                  <g.icon
                    size={20}
                    aria-hidden="true"
                    className={on ? "text-[#3fe0c8]" : "text-white/80"}
                  />
                  <span className="text-[13px] font-bold leading-tight">{g.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-[12.5px] font-semibold text-white/60">
          Destaques para {goal.label.toLowerCase()}
        </p>
        <div className="mt-2.5 grid grid-cols-3 gap-2.5">
          {picks.map((p) => {
            const off = offOf(p.priceCents, p.oldPriceCents);
            return (
              <button
                key={`${goal.key}-${p.id}`}
                type="button"
                onClick={() => openProduct(p.id)}
                aria-label={`Ver ${p.name}, ${money(p.priceCents)}`}
                className="relative overflow-hidden rounded-2xl bg-[#e9ebee] text-left ring-1 ring-white/20 transition active:scale-95"
              >
                <img
                  src={p.img}
                  alt=""
                  width={240}
                  height={240}
                  loading="eager"
                  decoding="async"
                  className="aspect-square w-full object-cover"
                />
                {off > 0 && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10.5px] font-extrabold text-slate-950">
                    −{off}%
                  </span>
                )}
                <strong className="block bg-white px-2 py-1.5 text-[13px] font-extrabold tabular-nums text-slate-900">
                  {money(p.priceCents)}
                </strong>
              </button>
            );
          })}
        </div>
      </div>

      <ul className="grid grid-cols-2 border-t border-white/10 bg-black/30">
        {trust.map((b, i) => (
          <li
            key={b.title}
            className={`flex items-center gap-2 px-4 py-2.5 ${i % 2 === 0 ? "border-r border-white/10" : ""} ${i < 2 ? "border-b border-white/10" : ""}`}
          >
            <b.icon size={16} aria-hidden="true" className="shrink-0 text-[#3fe0c8]" />
            <span className="min-w-0 truncate text-[12px] font-bold">{b.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Abertura da página inicial: uma página de vendas que se adapta a quem chega.
 * Muda pelo horário, pela campanha, pelo nome do cliente e pelo objetivo que a pessoa escolhe.
 */
export function HomeStage({
  client,
  panel,
  firstName,
}: {
  client: boolean;
  panel: string | null;
  firstName: string;
}) {
  const [hour, setHour] = useState<number | null>(null);
  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(true);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const h = new Date().getHours();
    setHour(h);
    // Manhã combina com saúde; o resto do dia, com treino.
    setIdx(h >= 5 && h < 12 ? 1 : 0);
    // No celular o destaque não troca sozinho: a página não pode mudar de tamanho enquanto se lê.
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-width: 639px)").matches
    )
      setAuto(false);
  }, []);
  useEffect(() => {
    if (!auto || touched) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % goals.length), 7000);
    return () => window.clearInterval(t);
  }, [auto, touched]);

  const goal = goals[idx];
  const greet =
    hour === null ? "Olá" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const choose = (i: number) => {
    setTouched(true);
    setIdx(i);
  };

  return (
    <>
      <MobileHero
        client={client}
        panel={panel}
        greet={greet}
        firstName={firstName}
        idx={idx}
        choose={choose}
      />
      <section
        aria-labelledby="home-title"
        className="nv-dark relative isolate overflow-hidden bg-[#0a1226] text-white ring-1 ring-white/10 max-sm:hidden sm:rounded-3xl"
      >
        {goals.map((g, i) => (
          <img
            key={g.key}
            src={heroBg[g.key]}
            alt=""
            aria-hidden="true"
            loading={i === 0 ? "eager" : "lazy"}
            style={{ objectPosition: heroFocus[g.key] }}
            className={`absolute inset-0 -z-20 size-full object-cover transition-opacity duration-1000 lg:hidden ${i === idx ? "opacity-60" : "opacity-0"}`}
          />
        ))}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0a1226] via-[#0a1226]/80 to-[#0a1226]/30"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(55% 80% at 92% 0%, rgba(63,224,200,.13), transparent 70%)",
          }}
        />

        <div className="grid items-center gap-6 px-4 pb-5 pt-6 sm:gap-8 sm:p-8 sm:pb-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10 lg:p-10 lg:pb-7 xl:px-12">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CampaignPill />
              <Link
                to="/nossos-parceiros"
                style={{ animationDelay: "120ms" }}
                className="nv-rise inline-flex items-center gap-2 rounded-full bg-white/[.06] px-2.5 py-1.5 text-[12.5px] font-semibold text-white/85 ring-1 ring-white/15 transition hover:bg-white/10 hover:text-white"
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full rounded-full bg-[#3fe0c8]/70 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#3fe0c8]" />
                </span>
                Lojas de Feijó, Acre
                <ArrowRight size={13} aria-hidden="true" className="text-[#3fe0c8]" />
              </Link>
            </div>

            <h1
              id="home-title"
              style={{ animationDelay: "180ms" }}
              className="nv-rise mt-4 text-balance font-display text-[2.15rem] font-extrabold leading-[1.04] tracking-tight min-[400px]:text-[2.5rem] sm:text-[2.9rem] xl:text-[3.4rem]"
            >
              {client ? (
                <>
                  {greet}, {firstName}. Sua rotina em dia e as melhores ofertas de Feijó.
                </>
              ) : (
                <>Compre de quem é daqui e cuide da sua rotina no mesmo lugar.</>
              )}
            </h1>

            <p
              key={goal.key}
              aria-live="polite"
              className="nv-rise mt-3 min-h-[3.4rem] text-[15.5px] leading-relaxed text-slate-100 sm:max-w-[54ch] sm:text-base"
            >
              {goal.line}
            </p>

            <div
              style={{ animationDelay: "320ms" }}
              className="nv-rise mt-4 grid gap-2.5 sm:grid-cols-2 [&>*]:w-full"
            >
              <a
                href="#ofertas"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#3fe0c8] px-5 text-[15px] font-extrabold text-slate-950 transition hover:bg-[#6ae9d6] active:scale-[.98] motion-reduce:active:scale-100"
              >
                <ShoppingCart size={18} aria-hidden="true" /> Ver ofertas da loja
              </a>
              {panel ? (
                <>
                  <Link
                    to={panel}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 px-5 text-[15px] font-semibold text-white backdrop-blur transition hover:bg-white/15"
                  >
                    <LayoutDashboard size={17} aria-hidden="true" /> Abrir meu painel
                  </Link>
                  {client && (
                    <LiveModeLauncher className="!h-12 !justify-center !px-4 !text-sm sm:col-span-2" />
                  )}
                </>
              ) : (
                <a
                  href="/entrar?mode=signup"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 px-5 text-[15px] font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <Gift size={17} aria-hidden="true" /> Criar conta grátis
                </a>
              )}
            </div>

            <div style={{ animationDelay: "420ms" }} className="nv-rise mt-5">
              <p className="text-[12.5px] font-semibold text-white/60">
                O que você quer cuidar agora?
              </p>
              <div
                role="group"
                aria-label="Escolha um objetivo"
                className="-mx-4 mt-2 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
              >
                {goals.map((g, i) => {
                  const on = i === idx;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => choose(i)}
                      className={`relative inline-flex h-11 shrink-0 snap-start items-center justify-center gap-2 overflow-hidden rounded-full border px-4 text-[13.5px] sm:h-[4.25rem] sm:flex-col sm:gap-1.5 sm:rounded-2xl sm:px-2 sm:text-[12.5px] font-semibold transition active:scale-95 motion-reduce:active:scale-100 ${on ? "border-[#3fe0c8]/70 bg-[#3fe0c8]/10 text-white" : "border-white/15 bg-transparent text-white/75 hover:border-white/35 hover:text-white"}`}
                    >
                      <g.icon size={18} aria-hidden="true" />
                      {g.label}
                      {on && auto && !touched && (
                        <span
                          key={g.key}
                          aria-hidden="true"
                          className="nv-progress absolute inset-x-0 bottom-0 block h-[2px] bg-[#3fe0c8]"
                          style={{ animationDuration: "7000ms" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="grid">
              {goals.map((g, gi) => {
                const on = gi === idx;
                const gp = g.ids
                  .map((id) => products.find((x) => x.id === id))
                  .filter((x): x is Product => !!x);
                return (
                  <div
                    key={g.key}
                    aria-hidden={!on}
                    className={`col-start-1 row-start-1 transition-opacity duration-700 ease-in-out ${on ? "opacity-100" : "pointer-events-none opacity-0"}`}
                  >
                    {/* Tablet: vitrine em 3 colunas. */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:hidden">
                      {gp.map((p, i) => {
                        const off = offOf(p.priceCents, p.oldPriceCents);
                        const pix = Math.round(p.priceCents * (1 - PIX_DISCOUNT));
                        return (
                          <button
                            key={p.id}
                            type="button"
                            tabIndex={on ? 0 : -1}
                            onClick={() => openProduct(p.id)}
                            aria-label={`Ver ${p.name}, ${money(p.priceCents)}`}
                            className={`group relative overflow-hidden rounded-2xl bg-[#e9ebee] text-left ring-1 ring-white/20 transition-transform duration-200 [@media(hover:hover)]:hover:-translate-y-1 ${i === 0 ? "aspect-[3/4] " : "aspect-[3/4]"}`}
                          >
                            <img
                              src={p.img}
                              alt=""
                              width={480}
                              height={480}
                              loading="eager"
                              decoding="async"
                              className="size-full object-cover motion-safe:transition motion-safe:duration-500 [@media(hover:hover)]:group-hover:scale-105"
                            />
                            {off > 0 && (
                              <span className="absolute right-1.5 top-1.5 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-slate-950 sm:right-2.5 sm:top-2.5">
                                −{off}%
                              </span>
                            )}
                            <span className="absolute inset-x-1.5 bottom-1.5 rounded-xl bg-white/95 px-2 py-1.5 text-slate-900 shadow sm:inset-x-2.5 sm:bottom-2.5 sm:px-3 sm:py-2">
                              <span className="line-clamp-1 hidden text-[13px] font-semibold leading-tight sm:block">
                                {p.name}
                              </span>
                              <strong className="block text-[13px] font-extrabold tabular-nums text-slate-900 sm:text-base">
                                {money(p.priceCents)}
                              </strong>
                              <span className="hidden text-[11px] font-semibold tabular-nums text-slate-500 sm:block">
                                {money(pix)} no Pix
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {/* Computador: foto da cena em moldura, com os produtos flutuando por cima. */}
                    <div className="relative hidden h-[27rem] lg:block xl:h-[29rem]">
                      <div className="absolute inset-0 overflow-hidden rounded-[1.75rem] ring-1 ring-white/15">
                        <img
                          src={heroBg[g.key]}
                          alt=""
                          aria-hidden="true"
                          loading={gi === 0 ? "eager" : "lazy"}
                          decoding="async"
                          style={{ objectPosition: heroFocus[g.key] }}
                          className={`size-full object-cover transition-transform duration-[6000ms] ease-out ${on ? "scale-105" : "scale-100"}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1226]/85 via-transparent to-[#0a1226]/10" />
                      </div>
                      {gp[0] && (
                        <button
                          type="button"
                          tabIndex={on ? 0 : -1}
                          onClick={() => openProduct(gp[0].id)}
                          aria-label={`Ver ${gp[0].name}, ${money(gp[0].priceCents)}`}
                          className="group absolute -left-5 bottom-6 flex w-[17rem] items-center gap-3 rounded-2xl bg-white p-2.5 pr-3.5 text-left text-slate-900 shadow-[0_24px_50px_-18px_rgba(0,0,0,.75)] transition-transform duration-200 hover:-translate-y-1"
                        >
                          <img
                            src={gp[0].img}
                            alt=""
                            width={96}
                            height={96}
                            className="size-[4.5rem] shrink-0 rounded-xl bg-[#e9ebee] object-cover"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-semibold">
                              {gp[0].name}
                            </span>
                            <strong className="block text-lg font-extrabold tabular-nums">
                              {money(gp[0].priceCents)}
                            </strong>
                            <span className="block text-[11.5px] font-semibold tabular-nums text-emerald-700">
                              {money(Math.round(gp[0].priceCents * (1 - PIX_DISCOUNT)))} no Pix
                            </span>
                          </span>
                          {offOf(gp[0].priceCents, gp[0].oldPriceCents) > 0 && (
                            <span className="absolute -right-2 -top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-slate-950 shadow">
                              −{offOf(gp[0].priceCents, gp[0].oldPriceCents)}%
                            </span>
                          )}
                        </button>
                      )}
                      <ul className="absolute -right-4 top-6 grid w-[13.5rem] gap-2">
                        {gp.slice(1).map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              tabIndex={on ? 0 : -1}
                              onClick={() => openProduct(p.id)}
                              aria-label={`Ver ${p.name}, ${money(p.priceCents)}`}
                              className="flex w-full items-center gap-2.5 rounded-xl bg-white/90 p-1.5 pr-3 text-left text-slate-900 shadow-[0_16px_36px_-16px_rgba(0,0,0,.7)] backdrop-blur transition-transform duration-200 hover:-translate-x-1"
                            >
                              <img
                                src={p.img}
                                alt=""
                                width={64}
                                height={64}
                                className="size-12 shrink-0 rounded-lg bg-[#e9ebee] object-cover"
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-[12px] font-semibold">
                                  {p.name}
                                </span>
                                <strong className="block text-sm font-extrabold tabular-nums">
                                  {money(p.priceCents)}
                                </strong>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
            <a
              href={client ? goal.toolClient : goal.toolTo}
              className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm max-sm:hidden transition hover:bg-white/[.08]"
            >
              <span className="min-w-0">
                <span className="block text-[11.5px] font-semibold text-white/55">
                  Ferramenta grátis para este objetivo
                </span>
                <strong className="block truncate font-bold">{goal.tool}</strong>
              </span>
              <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-[#3fe0c8]" />
            </a>
          </div>
        </div>

        <ul className="grid grid-cols-2 border-t border-white/10 max-sm:hidden sm:grid-cols-4">
          {trust.map((b, i) => (
            <li
              key={b.title}
              className={`flex items-center gap-2.5 px-4 py-3 sm:px-5 ${i % 2 === 0 ? "border-r border-white/10" : ""} ${i < 2 ? "border-b border-white/10 sm:border-b-0" : ""} ${i === 1 ? "sm:border-r" : ""}`}
            >
              <b.icon size={18} aria-hidden="true" className="shrink-0 text-[#3fe0c8]" />
              <span className="min-w-0 leading-tight">
                <strong className="block truncate text-[13px] font-bold">{b.title}</strong>
                <span className="block truncate text-[11.5px] text-white/55">{b.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
