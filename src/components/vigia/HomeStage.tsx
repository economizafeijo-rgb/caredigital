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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAuto(false);
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
    <section
      aria-labelledby="home-title"
      className="nv-dark relative isolate overflow-hidden bg-[#0a1226] text-white ring-1 ring-white/10 max-sm:-mx-5 sm:rounded-3xl"
    >
      {goals.map((g, i) => (
        <img
          key={g.key}
          src={g.bg}
          alt=""
          aria-hidden="true"
          loading={i === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 -z-20 size-full object-cover transition-opacity duration-1000 ${i === idx ? "opacity-40" : "opacity-0"}`}
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
            <p
              style={{ animationDelay: "120ms" }}
              className="nv-rise inline-flex items-center gap-2 rounded-full px-1 py-1.5 text-[12.5px] font-medium text-white/70"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-[#3fe0c8]/70 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-[#3fe0c8]" />
              </span>
              Lojas de Feijó, Acre
            </p>
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
                  className={`col-start-1 row-start-1 grid grid-cols-3 gap-2 transition-opacity duration-700 ease-in-out sm:gap-3 lg:grid-cols-2 lg:grid-rows-2 ${on ? "opacity-100" : "pointer-events-none opacity-0"}`}
                >
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
                        className={`group relative overflow-hidden rounded-2xl bg-[#e9ebee] text-left ring-1 ring-white/20 transition-transform duration-200 [@media(hover:hover)]:hover:-translate-y-1 ${i === 0 ? "aspect-[3/4] lg:row-span-2 lg:aspect-auto lg:min-h-[21rem]" : "aspect-[3/4] lg:aspect-[4/3]"}`}
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
              );
            })}
          </div>
          <a
            href={client ? goal.toolClient : goal.toolTo}
            className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm transition hover:bg-white/[.08]"
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

      <ul className="grid grid-cols-2 border-t border-white/10 sm:grid-cols-4">
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
  );
}
