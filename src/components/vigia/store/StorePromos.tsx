import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Gift, ShoppingCart, Zap } from "lucide-react";
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

export function Countdown({ until }: { until: number }) {
  const now = useTicker();
  const c = countdownParts(until - now);
  return (
    <p
      className="flex items-center gap-1 font-mono text-sm font-semibold tabular-nums"
      aria-label={`Termina em ${c.h} horas, ${c.m} minutos e ${c.s} segundos`}
    >
      <span className="text-[12px] font-sans font-medium text-white/75">Termina em</span>
      {([c.d ? c.d * 24 + c.h : c.h, c.m, c.s] as const).map((v, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="grid min-w-[2.1rem] place-items-center rounded-md bg-black/40 px-1.5 py-1 ring-1 ring-white/20">
            {String(v).padStart(2, "0")}
          </span>
          {i < 2 && <span className="text-white/60">:</span>}
        </span>
      ))}
    </p>
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
      className="nv-dark grid scroll-mt-20 grid-cols-[minmax(0,1fr)] gap-4 rounded-3xl bg-gradient-to-br from-[#3a1208] via-[#6b1d10] to-[#7c2d12] p-4 text-white max-sm:-mx-3 max-sm:rounded-none sm:p-7"
    >
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h2
            id="relampago-title"
            className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight sm:text-2xl"
          >
            <Zap size={20} className="shrink-0 text-amber-400" aria-hidden="true" />
            Ofertas relâmpago
          </h2>
          <p className="mt-0.5 text-[13px] text-white/75 sm:text-sm">
            Preço especial só hoje, até a meia-noite.
          </p>
        </div>
        <Countdown until={endOfDay} />
      </header>
      <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
        {deals.map((p) => {
          const b = productBadges(p, campaign);
          return (
            <article
              key={p.id}
              className="group flex w-[10.5rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white text-slate-900 ring-1 ring-black/5 sm:w-[12rem]"
            >
              <button
                type="button"
                onClick={() => openProduct(p.id)}
                aria-label={`Ver detalhes de ${p.name}`}
                className="relative block aspect-square cursor-zoom-in overflow-hidden bg-[#eceef0]"
              >
                <img
                  src={p.img}
                  alt={p.name}
                  loading="lazy"
                  className="size-full object-cover motion-safe:transition-transform motion-safe:duration-500 [@media(hover:hover)]:group-hover:scale-105"
                />
                <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-slate-950">
                  −{b.off}%
                </span>
              </button>
              <div className="flex flex-1 flex-col p-2.5">
                <h3 className="line-clamp-1 text-[13px] font-semibold">{p.name}</h3>
                <p className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap tabular-nums">
                  <strong className="text-[15px] font-extrabold">{money(p.priceCents)}</strong>
                  <s className="text-[11px] text-slate-500">{money(p.oldPriceCents!)}</s>
                </p>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"
                  aria-hidden="true"
                >
                  <i
                    className="block h-full rounded-full bg-amber-400"
                    style={{ width: `${b.sold}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{b.sold}% vendido</p>
                <button
                  type="button"
                  onClick={() => cart.add(p.id)}
                  className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-700 text-xs font-bold text-white transition hover:bg-emerald-600 active:scale-[.97] motion-reduce:active:scale-100"
                >
                  <ShoppingCart size={14} aria-hidden="true" /> Adicionar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Aviso da próxima campanha (Natal) durante a Black Friday, discreto e no mesmo padrão da página. */
export function CampaignTeaser() {
  const teaser = nextCampaignTeaser();
  if (!teaser) return null;
  return (
    <aside
      aria-label={`Em breve: ${teaser.name}`}
      className="nv-dark relative isolate overflow-hidden rounded-3xl bg-[#2a0508] p-5 text-white sm:p-6"
    >
      <img
        src="/images/hero-alimentacao.webp"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 -z-20 size-full object-cover opacity-50"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(42,5,8,.94)_0%,rgba(91,10,18,.82)_52%,rgba(13,59,38,.9)_100%)]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[3px] bg-gradient-to-r from-[#e11d48] via-[#fbbf24] to-[#10b981]"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#fb7185] to-[#be123c] shadow-[inset_0_1px_0_rgba(255,255,255,.4),0_10px_24px_-10px_#e11d48]">
            <Gift size={26} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-0.5 text-[12px] font-semibold text-amber-200 ring-1 ring-white/15">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-300" />
              {teaser.when}
            </p>
            <h2 className="mt-1.5 font-display text-[1.6rem] font-extrabold leading-tight tracking-tight">
              {teaser.name}
            </h2>
            <p className="mt-1 text-[14px] leading-snug text-white/85">{teaser.text}</p>
          </div>
        </div>
        <Link
          to="/"
          hash="ofertas"
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 text-[15px] font-bold text-slate-900 shadow-lg transition hover:bg-amber-100 active:scale-[.98] max-sm:w-full"
        >
          Ver presentes <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
