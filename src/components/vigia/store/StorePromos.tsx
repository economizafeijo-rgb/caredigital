import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Gift, ShoppingCart, Snowflake, Zap } from "lucide-react";
import { cart, money, products } from "@/lib/store";
import {
  countdownParts,
  nextCampaignTeaser,
  productBadges,
  type Campaign,
} from "@/lib/store-promos";
import { openProduct } from "../StoreViews";

/** Blocos de campanha da loja (Black Friday, Natal, ofertas relâmpago), exibidos na página inicial. */

export function useTicker(ms = 1000) {
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
