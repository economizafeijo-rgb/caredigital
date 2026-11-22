import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Gift, ShoppingCart, Snowflake, Tag, Zap } from "lucide-react";
import { cart, money, products } from "@/lib/store";
import {
  countdownParts,
  nextCampaignTeaser,
  productBadges,
  type Campaign,
} from "@/lib/store-promos";
import { openProduct } from "../StoreViews";

/** Blocos de campanha da loja (Black Friday, Natal, ofertas relâmpago), exibidos na página inicial. */

function useTicker(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}


export function Countdown({ until, light = false }: { until: number; light?: boolean }) {
  const now = useTicker();
  const c = countdownParts(until - now);
  const box = light ? "bg-white/15 text-white" : "bg-[#0a0a0a] text-yellow-300";
  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={`${c.d} dias, ${c.h} horas e ${c.m} minutos`}
    >
      {(
        [
          [c.d, "dias"],
          [c.h, "h"],
          [c.m, "min"],
          [c.s, "s"],
        ] as const
      ).map(([v, l], i) => (
        <span key={l} className="flex items-center gap-1.5">
          <span
            className={`grid min-w-[3rem] place-items-center rounded-xl px-2 py-1.5 text-center leading-none ring-1 ring-white/10 ${box}`}
          >
            <strong
              key={v}
              className="nv-tick block font-mono text-2xl font-extrabold tabular-nums"
            >
              {String(v).padStart(2, "0")}
            </strong>
            <span className="mt-0.5 text-[9px] font-bold uppercase opacity-70">{l}</span>
          </span>
          {i < 3 && <span className="text-lg font-bold opacity-50">:</span>}
        </span>
      ))}
    </div>
  );
}

export function CampaignHero({ campaign }: { campaign: Campaign }) {
  const bf = campaign.id === "black-friday",
    xmas = campaign.id === "natal";
  const stars = products.filter((p) => p.oldPriceCents).slice(0, 3);
  const maxOff = Math.max(
    0,
    ...products
      .filter((p) => p.oldPriceCents)
      .map((p) => Math.round((1 - p.priceCents / p.oldPriceCents!) * 100)),
  );
  return (
    <section
      aria-labelledby="campanha-title"
      className={`nv-dark relative isolate overflow-hidden rounded-3xl bg-gradient-to-br ${campaign.theme.bg} text-white shadow-pop`}
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]"
      />
      <div
        aria-hidden
        className="nv-bf-glow absolute -right-24 -top-24 -z-10 size-[28rem] rounded-full blur-3xl"
        style={{ background: `${campaign.theme.accent}33` }}
      />
      {xmas &&
        Array.from({ length: 14 }, (_, i) => (
          <Snowflake
            key={i}
            aria-hidden
            size={10 + (i % 4) * 4}
            className="nv-snow absolute -top-6 text-white/40"
            style={{
              left: `${(i * 7.3) % 100}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${8 + (i % 5)}s`,
            }}
          />
        ))}
      <div className="grid items-center gap-6 p-6 sm:p-9 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest"
            style={{ background: campaign.theme.accent, color: campaign.theme.ink }}
          >
            {bf ? <Zap size={13} /> : xmas ? <Gift size={13} /> : <Tag size={13} />} {campaign.name}
          </span>
          {bf ? (
            <h2
              id="campanha-title"
              className="mt-4 font-display text-5xl font-black uppercase leading-[.9] tracking-tight sm:text-7xl"
            >
              <span className="nv-bf-shine block bg-[linear-gradient(110deg,#fff_40%,#facc15_50%,#fff_60%)] bg-[length:250%_100%] bg-clip-text text-transparent">
                Black
              </span>
              <span className="block text-yellow-300">Friday</span>
            </h2>
          ) : (
            <h2
              id="campanha-title"
              className="mt-4 text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl"
            >
              {campaign.headline}
            </h2>
          )}
          <p className="mt-3 max-w-xl text-base text-white/80">
            {bf ? `${campaign.headline} ${campaign.sub}` : campaign.sub}
          </p>
          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-white/60">
            {campaign.untilLabel}
          </p>
          <div className="mt-2">
            <Countdown until={campaign.until} light={!bf} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href="#relampago"
              className="nv-cta-pulse inline-flex h-12 items-center gap-2 rounded-xl px-6 text-base font-extrabold shadow-lg transition hover:brightness-110 active:scale-[.98]"
              style={{ background: campaign.theme.accent, color: campaign.theme.ink }}
            >
              Ver ofertas <ArrowRight size={18} />
            </a>
            <a
              href="#ofertas"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 text-base font-bold text-white backdrop-blur transition hover:bg-white/15"
            >
              Mais vendidos
            </a>
          </div>
        </div>
        <div aria-hidden className="relative hidden h-80 lg:block">
          {stars.map((p, i) => {
            const off = Math.round((1 - p.priceCents / p.oldPriceCents!) * 100);
            const pos = [
              ["left-[8%] top-6 w-52 -rotate-6", "0s"],
              ["right-[6%] top-0 w-48 rotate-6", "1.1s"],
              ["left-[34%] bottom-0 w-56 rotate-[-2deg]", "2.2s"],
            ][i];
            return (
              <div
                key={p.id}
                className={`nv-float absolute overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-white/20 transition-transform duration-500 hover:z-10 hover:scale-105 ${pos[0]}`}
                style={{ animationDelay: pos[1] }}
              >
                <img src={p.img} alt="" className="aspect-square w-full object-cover" />
                <span className="absolute right-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-extrabold text-white">
                  -{off}%
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-xs font-bold text-white">
                  {money(p.priceCents)}
                </span>
              </div>
            );
          })}
          {bf && (
            <span className="nv-spin-slow absolute -right-2 bottom-6 grid size-24 place-items-center rounded-full bg-yellow-300 text-center text-[11px] font-black uppercase leading-tight text-black shadow-xl">
              até
              <br />
              <span className="text-2xl">-{maxOff}%</span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}


/** Faixa rolante com os avisos da campanha. */
export function CampaignTicker({ campaign }: { campaign: Campaign }) {
  const items = [
    "5% OFF no Pix",
    "3x sem juros no cartão",
    campaign.name,
    "Frete grátis acima de R$ 199",
    "Produtos da Amazônia",
    "Lojas parceiras do Acre",
    "Troca fácil",
  ];
  return (
    <div
      className={`nv-marquee overflow-hidden rounded-2xl py-2.5 ${campaign.id === "black-friday" ? "bg-yellow-300 text-black" : "bg-primary text-primary-foreground"}`}
      aria-hidden
    >
      <ul className="nv-marquee-track flex w-max gap-8 px-4 text-sm font-extrabold uppercase tracking-wide">
        {[...items, ...items].map((t, i) => (
          <li key={i} className="flex items-center gap-8 whitespace-nowrap">
            {t}
            <Zap size={14} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ofertas relâmpago: produtos com desconto, em ordem de maior desconto, até a meia-noite do Acre. */
export function FlashDeals({ campaign }: { campaign: Campaign }) {
  const deals = products
    .filter((p) => p.oldPriceCents)
    .sort(
      (a, b) =>
        (b.oldPriceCents! - b.priceCents) / b.oldPriceCents! -
        (a.oldPriceCents! - a.priceCents) / a.oldPriceCents!,
    );
  const endOfDay = Date.parse(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Rio_Branco" }).format(new Date()) +
      "T23:59:59-05:00",
  );
  if (!deals.length) return null;
  return (
    <section
      id="relampago"
      aria-labelledby="relampago-title"
      className="scroll-mt-20 rounded-3xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="nv-bolt grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-rose-600 to-orange-500 text-white shadow-lg">
            <Zap size={20} />
          </span>
          <div>
            <h2 id="relampago-title" className="text-lg font-extrabold leading-tight">
              Ofertas relâmpago
            </h2>
            <p className="text-xs text-muted-foreground">
              Preço especial só hoje · acabam à meia-noite
            </p>
          </div>
        </div>
        <div className="[&_strong]:text-lg [&_span.grid]:min-w-[2.6rem]">
          <Countdown until={endOfDay} />
        </div>
      </div>
      <div className="-mx-1 mt-4 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        {deals.map((p) => {
          const b = productBadges(p, campaign);
          return (
            <article
              key={p.id}
              className="group relative w-52 shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-background transition-shadow hover:shadow-pop sm:w-56"
            >
              <div className="relative aspect-square overflow-hidden bg-[#e9eaec]">
                <button
                  type="button"
                  onClick={() => openProduct(p.id)}
                  aria-label={`Ver detalhes de ${p.name}`}
                  className="block size-full cursor-zoom-in"
                >
                  <img
                    src={p.img}
                    alt={p.name}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </button>
                <span className="absolute left-2 top-2 rounded-lg bg-rose-600 px-2 py-1 text-xs font-extrabold text-white shadow">
                  -{b.off}%
                </span>
              </div>
              <div className="p-3">
                <h3 className="line-clamp-1 text-sm font-bold">{p.name}</h3>
                <p className="mt-0.5 text-xs">
                  <span className="text-muted-foreground line-through">
                    {money(p.oldPriceCents!)}
                  </span>{" "}
                  <strong className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                    {money(p.priceCents)}
                  </strong>
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <i
                    className="nv-stock block h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-600"
                    style={{ width: `${b.sold}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                  {b.sold}% vendido
                </p>
                <button
                  type="button"
                  onClick={() => cart.add(p.id)}
                  className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-950 text-xs font-bold text-white transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-950"
                >
                  <ShoppingCart size={14} /> Garantir
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Aviso da próxima campanha (Natal) durante a Black Friday. */
export function CampaignTeaser() {
  const teaser = nextCampaignTeaser();
  if (!teaser) return null;
  return (
    <aside className="nv-dark relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a0508] via-[#5b0a12] to-[#0d3b26] p-5 text-white sm:p-6">
      {Array.from({ length: 10 }, (_, i) => (
        <Snowflake
          key={i}
          aria-hidden
          size={10 + (i % 3) * 5}
          className="nv-snow absolute -top-6 text-white/35"
          style={{
            left: `${(i * 11) % 100}%`,
            animationDelay: `${i * 0.9}s`,
            animationDuration: `${9 + (i % 4)}s`,
          }}
        />
      ))}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
        <Gift size={13} /> {teaser.when}
      </span>
      <h2 className="mt-3 font-display text-2xl font-extrabold">{teaser.name}</h2>
      <p className="mt-1 max-w-md text-sm text-white/80">{teaser.text}</p>
      <Link
        to="/"
        hash="ofertas"
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-rose-900 transition hover:bg-white/90"
      >
        Ver presentes <ArrowRight size={16} />
      </Link>
    </aside>
  );
}
