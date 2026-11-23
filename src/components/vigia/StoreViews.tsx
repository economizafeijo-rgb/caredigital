import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { shareProductLink } from "@/lib/share-product";
import type React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Check,
  Share2,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Truck,
  X,
} from "lucide-react";
import {
  cart,
  categoryLabel,
  money,
  products,
  STORE_WHATSAPP,
  vendorById,
  vendors,
  type Product,
  type VendorId,
} from "@/lib/store";

/* ---------- abrir produto de qualquer lugar ---------- */
const EVT = "nv-open-product";
export const openProduct = (id: string) => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVT, { detail: id }));
};
export const PENDING_PRODUCT_KEY = EVT;
export const productByImage = (src: string) => products.find((p) => p.img === src);

const vendorAbout: Record<VendorId, { about: string; hours: string; delivery: string }> = {
  arena: {
    about: "Suplementos esportivos das melhores marcas, com atendimento de quem treina.",
    hours: "Seg a sáb · 8h às 20h",
    delivery: "Entrega em Rio Branco em até 24 h",
  },
  farmavida: {
    about: "Farmácia com vitaminas, minerais e cuidados do dia a dia, com orientação farmacêutica.",
    hours: "Todos os dias · 7h às 22h",
    delivery: "Entrega em Tarauacá no mesmo dia",
  },
  "erva-viva": {
    about: "Fitoterápicos e produtos da floresta, de produtores do Acre e da Amazônia.",
    hours: "Seg a sex · 8h às 18h",
    delivery: "Envio para todo o Acre",
  },
  emporio: {
    about: "Alimentos naturais, proteínas vegetais e opções sem lactose.",
    hours: "Seg a sáb · 8h às 19h",
    delivery: "Retirada na loja ou entrega local",
  },
  "studio-move": {
    about: "Moda fitness feminina com tecidos tecnológicos e modelagem que valoriza.",
    hours: "Seg a sáb · 9h às 19h",
    delivery: "Entrega em Rio Branco em até 48 h",
  },
  "base-athletic": {
    about: "Roupas masculinas para treino, corrida e o dia a dia ativo.",
    hours: "Seg a sáb · 9h às 18h",
    delivery: "Envio para todo o Acre",
  },
  "casa-do-treino": {
    about: "Equipamentos e acessórios para montar o seu espaço de treino.",
    hours: "Seg a sáb · 8h às 18h",
    delivery: "Entrega combinada em Feijó e região",
  },
};

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={13} className={i < Math.round(value) ? "fill-current" : "opacity-30"} />
      ))}
    </span>
  );
}

/** Janela do produto: foto grande, preço, quantidade, carrinho e "Conhecer a loja". */
export function ProductQuickViewHost() {
  const [id, setId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  // Link compartilhado (/p/<id>) guarda o produto para abrir assim que a página carrega.
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(EVT);
      if (pending) {
        sessionStorage.removeItem(EVT);
        if (products.some((x) => x.id === pending)) setId(pending);
      }
    } catch {
      /* sem sessionStorage */
    }
  }, []);
  useEffect(() => {
    const on = (e: Event) => {
      try {
        sessionStorage.removeItem(EVT);
      } catch {
        /* sem sessionStorage */
      }
      setId(String((e as CustomEvent).detail));
      setQty(1);
      setAdded(false);
    };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  useEffect(() => {
    if (!id) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setId(null);
    };
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [id]);
  const p = products.find((x) => x.id === id);
  if (!p) return null;
  const v = vendorById(p.vendorId);
  const off = p.oldPriceCents ? Math.round((1 - p.priceCents / p.oldPriceCents) * 100) : 0;
  const more = products.filter((x) => x.vendorId === p.vendorId && x.id !== p.id).slice(0, 4);
  const share = () => {
    void shareProductLink({
      url: `${window.location.origin}/p/${p.id}`,
      title: `${p.name} · ${money(p.priceCents)}`,
      text: `${p.name} por ${money(p.priceCents)}${v ? ` na ${v.name}` : ""}`,
      image: p.img,
      fileName: p.name,
    }).then((how) => {
      if (how === "copied") {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    });
  };
  const goStore = () => {
    setId(null);
    void navigate({ to: "/loja", search: { loja: p.vendorId } as never });
    window.scrollTo?.({ top: 0 });
  };
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[11500] grid !max-h-none place-items-end bg-slate-950/70 backdrop-blur-sm sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={p.name}
      onClick={(e) => {
        if (e.target === e.currentTarget) setId(null);
      }}
    >
      <div className="nv-pop grid !max-h-[calc(100dvh-env(safe-area-inset-top)-1rem)] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-t-3xl pb-[env(safe-area-inset-bottom)] sm:pb-0 border border-border bg-card shadow-2xl sm:rounded-3xl md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative overflow-hidden bg-[#e9eaec]">
          <img
            src={p.img}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full scale-125 object-cover opacity-70 blur-2xl md:hidden"
          />
          <img
            src={p.img}
            alt={p.name}
            className="relative h-60 w-full object-contain min-[420px]:h-64 md:aspect-square md:h-auto md:object-cover"
          />
          {off > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-3 py-1 text-sm font-extrabold text-white shadow">
              -{off}%
            </span>
          )}
          <div className="absolute right-3 top-3 flex gap-2">
            <button
              type="button"
              onClick={share}
              aria-label={copied ? "Link copiado" : `Compartilhar ${p.name}`}
              title={copied ? "Link copiado" : "Compartilhar"}
              className="nv-tiny grid size-9 place-items-center rounded-full bg-white/90 text-slate-900 shadow transition hover:bg-white"
            >
              {copied ? <Check size={16} /> : <Share2 size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setId(null)}
              aria-label="Fechar"
              className="nv-tiny grid size-9 place-items-center rounded-full bg-white/90 text-slate-900 shadow transition hover:bg-white md:hidden"
            >
              <X size={17} />
            </button>
          </div>
        </div>
        <div className="flex min-w-0 flex-col p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                {categoryLabel[p.category]}
                {p.tag ? ` · ${p.tag}` : ""}
              </p>
              <h2 className="mt-1 text-xl font-extrabold leading-tight sm:text-2xl">{p.name}</h2>
            </div>
            <button
              type="button"
              onClick={() => setId(null)}
              aria-label="Fechar"
              className="hidden size-9 shrink-0 place-items-center rounded-full bg-muted transition hover:bg-muted/70 md:grid"
            >
              <X size={17} />
            </button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
          <div className="mt-3 rounded-2xl bg-muted/50 p-3">
            {p.oldPriceCents && (
              <p className="text-sm">
                <span className="text-muted-foreground line-through">{money(p.oldPriceCents)}</span>{" "}
                <span className="ml-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  economize {money(p.oldPriceCents - p.priceCents)}
                </span>
              </p>
            )}
            <p className="text-2xl font-extrabold tabular-nums sm:text-3xl">
              {money(p.priceCents)}
            </p>
            <p className="text-xs text-muted-foreground">
              ou 3x de {money(Math.round(p.priceCents / 3))} sem juros ·{" "}
              <strong className="text-emerald-700 dark:text-emerald-300">
                {money(Math.round(p.priceCents * 0.95))} no Pix
              </strong>
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex h-11 items-center rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Diminuir"
                className="grid size-11 place-items-center hover:bg-muted"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center font-bold tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                aria-label="Aumentar"
                className="grid size-11 place-items-center hover:bg-muted"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                cart.add(p.id, qty);
                setAdded(true);
                window.setTimeout(() => setAdded(false), 1400);
              }}
              className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition active:scale-[.98] ${added ? "nv-added bg-emerald-700" : "bg-gradient-to-r from-emerald-700 to-teal-700 hover:brightness-110"}`}
            >
              {added ? (
                <>
                  <CheckCircle2 size={17} /> Adicionado ao carrinho
                </>
              ) : (
                <>
                  <ShoppingCart size={17} /> Adicionar · {money(p.priceCents * qty)}
                </>
              )}
            </button>
          </div>
          <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <Truck size={14} className="text-primary" />{" "}
              {v ? vendorAbout[v.id].delivery : "Entrega combinada com a equipe"}
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-primary" /> Compra protegida pela NextVita
            </li>
          </ul>
          {v && (
            <div className="mt-4 rounded-2xl border border-border p-3">
              <div className="flex items-center gap-3">
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-extrabold text-white shadow"
                  style={{ background: v.hex }}
                >
                  {v.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-sm font-bold">
                    {v.name}
                    {v.sampleVerified && <BadgeCheck size={15} className="text-sky-500" />}
                  </p>
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Stars value={v.sampleRating} /> {v.sampleRating.toFixed(1).replace(".", ",")}{" "}
                    <span className="rounded bg-muted px-1">exemplo</span> · <MapPin size={11} />{" "}
                    {v.city}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={goStore}
                className="group mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 text-sm font-bold text-primary transition hover:bg-primary/10"
              >
                <Store size={16} /> Conheça a loja{" "}
                <ArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
              {more.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {more.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setId(m.id);
                        setQty(1);
                      }}
                      title={m.name}
                      className="overflow-hidden rounded-lg bg-[#e9eaec] ring-1 ring-border transition hover:ring-primary"
                    >
                      <img src={m.img} alt={m.name} className="aspect-square w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Página de uma loja parceira (vitrine própria). Depois será alimentada pelo painel de cada lojista. */
type VendorSort = "relevancia" | "menor" | "desconto";
const offOf = (p: Product) =>
  p.oldPriceCents ? Math.round((1 - p.priceCents / p.oldPriceCents) * 100) : 0;

/** Página de uma loja parceira: capa com a vitrine da loja, faixa de confiança, filtros com ordenação e grade compacta. */
export function VendorStorePage({ vendorId, onBack }: { vendorId: VendorId; onBack: () => void }) {
  const v = vendorById(vendorId);
  const [cat, setCat] = useState<string>("todos");
  const [sort, setSort] = useState<VendorSort>("relevancia");
  const [added, setAdded] = useState<string | null>(null);
  const list = useMemo(() => products.filter((p) => p.vendorId === vendorId), [vendorId]);
  const cats = useMemo(() => [...new Set(list.map((p) => p.category))], [list]);
  const shown = useMemo(() => {
    const base = cat === "todos" ? list : list.filter((p) => p.category === cat);
    if (sort === "menor") return [...base].sort((a, b) => a.priceCents - b.priceCents);
    if (sort === "desconto") return [...base].sort((a, b) => offOf(b) - offOf(a));
    return base;
  }, [list, cat, sort]);
  const navigate = useNavigate();
  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(null), 1600);
    return () => window.clearTimeout(t);
  }, [added]);
  if (!v) return null;
  const info = vendorAbout[v.id];
  const showcase = list.slice(0, 3);
  const minPrice = list.length ? Math.min(...list.map((p) => p.priceCents)) : 0;
  const bestOff = list.reduce((m, p) => Math.max(m, offOf(p)), 0);
  const wa = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(`Olá! Vi a loja ${v.name} na NextVita e quero tirar uma dúvida.`)}`;
  const tint = (pct: number, to = "#0b1220") => `color-mix(in srgb, ${v.hex} ${pct}%, ${to})`;
  const facts: [typeof Star, string, string][] = [
    [Star, `${v.sampleRating.toFixed(1).replace(".", ",")} de 5`, "Nota de exemplo"],
    [Truck, info.delivery, "Entrega"],
    [Clock, info.hours, "Atendimento"],
    [ShieldCheck, "5% off no Pix", "Compra protegida"],
  ];
  return (
    <div className="flex flex-col gap-4" style={{ "--v": v.hex } as React.CSSProperties}>
      <nav aria-label="Caminho" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 font-semibold transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={15} /> Loja NextVita
        </button>
        <span aria-hidden>/</span>
        <span className="truncate font-semibold text-foreground">{v.name}</span>
      </nav>

      <section
        className="nv-dark relative isolate overflow-hidden rounded-3xl text-white shadow-pop"
        style={{
          background: `radial-gradient(120% 140% at 0% 0%, ${tint(70)} 0%, ${tint(32)} 45%, #070b14 100%)`,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[.06] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]"
        />
        <div
          aria-hidden
          className="absolute -right-20 -top-24 -z-10 size-80 rounded-full blur-3xl"
          style={{ background: tint(55, "transparent") }}
        />
        <div className="grid items-center gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10 lg:p-8">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <span
                className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white text-xl font-black shadow-xl ring-4 ring-white/10 sm:size-[4.5rem]"
                style={{ color: v.hex }}
              >
                {v.initials}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/65">Loja parceira · {v.sector}</p>
                <h1 className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[2rem]">
                  {v.name}
                  {v.sampleVerified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-[0_0_0_3px_rgba(16,185,129,.25)]">
                      <BadgeCheck size={13} aria-hidden="true" /> Loja verificada
                    </span>
                  )}
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-white/80 sm:text-[15px]">
              {info.about}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/65">
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {v.city}
              </span>
              <span className="inline-flex items-center gap-1">
                <Stars value={v.sampleRating} /> {v.sampleRating.toFixed(1).replace(".", ",")}{" "}
                <span className="rounded bg-white/10 px-1 text-[10px]">exemplo</span>
              </span>
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#25d366] px-4 text-sm font-bold text-slate-950 transition hover:brightness-105 active:scale-[.98]"
              >
                <MessageCircle size={16} /> Falar com a loja
              </a>
              <a
                href="#vendor-products"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-4 text-sm font-semibold backdrop-blur transition hover:bg-white/15"
              >
                Ver {list.length} produtos <ArrowRight size={15} />
              </a>
            </div>
          </div>

          {showcase.length > 0 && (
            <div
              aria-hidden
              className="relative hidden h-56 w-[23rem] sm:block lg:h-60 lg:w-[26rem]"
            >
              {showcase.map((p, i) => (
                <span
                  key={p.id}
                  className={`absolute overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20 transition-transform duration-500 hover:z-10 hover:-translate-y-1 ${
                    i === 0
                      ? "left-1/2 top-0 z-[2] size-48 -translate-x-1/2 lg:size-52"
                      : i === 1
                        ? "left-0 top-10 size-36 -rotate-6 opacity-95 lg:size-40"
                        : "right-0 top-10 size-36 rotate-6 opacity-95 lg:size-40"
                  }`}
                >
                  <img src={p.img} alt="" className="size-full object-cover" />
                </span>
              ))}
              {bestOff > 0 && (
                <span className="absolute bottom-1 right-6 z-[3] rounded-full bg-white px-3 py-1 text-xs font-extrabold text-slate-900 shadow-lg">
                  Até {bestOff}% off
                </span>
              )}
            </div>
          )}
        </div>

        <ul className="grid grid-cols-2 border-t border-white/10 bg-black/20 text-white sm:grid-cols-4">
          {facts.map(([I, value, label], i) => (
            <li
              key={label}
              className={`flex min-w-0 items-center gap-2.5 px-4 py-3 sm:px-5 ${i % 2 ? "border-l border-white/10" : ""} ${i > 1 ? "border-t border-white/10 sm:border-t-0" : ""} sm:border-l sm:first:border-l-0`}
            >
              <span
                className="grid size-8 shrink-0 place-items-center rounded-lg"
                style={{ background: tint(35, "transparent") }}
              >
                <I size={15} />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[10.5px] text-white/55">{label}</span>
                <strong className="block truncate text-[12.5px] font-semibold">{value}</strong>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div
        id="vendor-products"
        className="flex scroll-mt-4 flex-wrap items-center justify-between gap-2"
      >
        <div
          role="group"
          aria-label="Categorias"
          className="flex min-w-0 gap-1.5 overflow-x-auto [scrollbar-width:none]"
        >
          {["todos", ...cats].map((c) => {
            const on = cat === c;
            const n = c === "todos" ? list.length : list.filter((p) => p.category === c).length;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => setCat(c)}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${on ? "border-transparent text-white" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
                style={on ? { background: v.hex } : undefined}
              >
                {c === "todos" ? "Tudo" : categoryLabel[c as Product["category"]]}
                <span
                  className={`rounded-full px-1.5 text-[10.5px] tabular-nums ${on ? "bg-white/20" : "bg-muted"}`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Ordenar
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as VendorSort)}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-[13px] font-semibold text-foreground"
          >
            <option value="relevancia">Relevância</option>
            <option value="menor">Menor preço</option>
            <option value="desconto">Maior desconto</option>
          </select>
        </label>
      </div>

      <section
        aria-label={`Produtos de ${v.name}`}
        className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))]"
      >
        {shown.map((p) => {
          const off = offOf(p);
          const isAdded = added === p.id;
          return (
            <article
              key={p.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,box-shadow] duration-300 hover:border-[color-mix(in_srgb,var(--v)_45%,transparent)] hover:shadow-pop"
            >
              <button
                type="button"
                onClick={() => openProduct(p.id)}
                className="relative aspect-[4/3.6] overflow-hidden bg-gradient-to-b from-[#f2f3f5] to-[#dfe2e6]"
                aria-label={`Ver ${p.name}`}
              >
                <img
                  src={p.img}
                  alt={p.name}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                <span className="absolute left-2 top-2 flex flex-col items-start gap-1">
                  {off > 0 && (
                    <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[11px] font-extrabold text-white shadow">
                      -{off}%
                    </span>
                  )}
                  {p.tag && (
                    <span className="rounded-md bg-white/95 px-1.5 py-0.5 text-[10.5px] font-bold text-slate-900 shadow">
                      {p.tag}
                    </span>
                  )}
                </span>
                <span className="absolute inset-x-2 bottom-2 translate-y-1 rounded-lg bg-black/65 py-1 text-center text-[11px] font-bold text-white opacity-0 backdrop-blur transition group-hover:translate-y-0 group-hover:opacity-100">
                  Ver detalhes
                </span>
              </button>
              <div className="flex flex-1 flex-col p-3">
                <span className="text-[10.5px] font-medium text-muted-foreground">
                  {categoryLabel[p.category]}
                </span>
                <h3 className="mt-0.5 line-clamp-2 min-h-[2.5em] text-[13.5px] font-semibold leading-tight">
                  {p.name}
                </h3>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <strong className="text-[17px] font-extrabold tabular-nums">
                    {money(p.priceCents)}
                  </strong>
                  {p.oldPriceCents && (
                    <span className="text-[11px] text-muted-foreground line-through tabular-nums">
                      {money(p.oldPriceCents)}
                    </span>
                  )}
                </p>
                <p className="text-[11px] font-medium text-emerald-700 tabular-nums dark:text-emerald-300">
                  {money(Math.round(p.priceCents * 0.95))} no Pix
                </p>
                <button
                  type="button"
                  onClick={() => {
                    cart.add(p.id);
                    setAdded(p.id);
                  }}
                  className="mt-2.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold text-white transition hover:brightness-110 active:scale-[.97]"
                  style={{ background: isAdded ? "#059669" : v.hex }}
                >
                  {isAdded ? (
                    <>
                      <CheckCircle2 size={15} /> Adicionado
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={15} /> Adicionar
                    </>
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </section>
      <p className="sr-only" role="status" aria-live="polite">
        {added ? "Produto adicionado ao carrinho." : ""}
      </p>
      {list.length > 0 && (
        <p className="-mt-1 text-xs text-muted-foreground">
          A partir de {money(minPrice)} · produtos e preços ilustrativos durante o pré-lançamento.
        </p>
      )}

      <section
        aria-label="Outras lojas parceiras"
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold">Outras lojas parceiras</h2>
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Ver todas
          </button>
        </div>
        <div className="mt-3 grid grid-flow-col auto-cols-[minmax(13rem,1fr)] gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {vendors
            .filter((o) => o.id !== v.id)
            .map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  void navigate({ to: "/loja", search: { loja: o.id } as never });
                  document.getElementById("care-content")?.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="group flex items-center gap-3 rounded-xl border border-border bg-background p-2.5 text-left transition-colors hover:border-[var(--o)]"
                style={{ "--o": o.hex } as React.CSSProperties}
              >
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-xl text-[13px] font-extrabold text-white transition-transform group-hover:scale-105"
                  style={{
                    background: `linear-gradient(140deg, color-mix(in srgb, ${o.hex} 70%, #fff), ${o.hex} 55%, color-mix(in srgb, ${o.hex} 70%, #000))`,
                  }}
                >
                  {o.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[13px]">{o.name}</strong>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {o.sector} · {o.city.replace(", AC", "")}
                  </span>
                </span>
                <ArrowRight
                  size={14}
                  className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}
