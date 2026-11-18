import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, Clock, MapPin, MessageCircle, Minus, Plus, ShieldCheck, ShoppingCart, Star, Store, Truck, X } from "lucide-react";
import { cart, categoryLabel, money, products, STORE_WHATSAPP, vendorById, vendors, type Product, type VendorId } from "@/lib/store";

/* ---------- abrir produto de qualquer lugar ---------- */
const EVT = "nv-open-product";
export const openProduct = (id: string) => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVT, { detail: id })); };
export const productByImage = (src: string) => products.find((p) => p.img === src);

const vendorAbout: Record<VendorId, { about: string; hours: string; delivery: string }> = {
  arena: { about: "Suplementos esportivos das melhores marcas, com atendimento de quem treina.", hours: "Seg a sáb · 8h às 20h", delivery: "Entrega em Rio Branco em até 24 h" },
  farmavida: { about: "Farmácia com vitaminas, minerais e cuidados do dia a dia, com orientação farmacêutica.", hours: "Todos os dias · 7h às 22h", delivery: "Entrega em Tarauacá no mesmo dia" },
  "erva-viva": { about: "Fitoterápicos e produtos da floresta, de produtores do Acre e da Amazônia.", hours: "Seg a sex · 8h às 18h", delivery: "Envio para todo o Acre" },
  emporio: { about: "Alimentos naturais, proteínas vegetais e opções sem lactose.", hours: "Seg a sáb · 8h às 19h", delivery: "Retirada na loja ou entrega local" },
  "studio-move": { about: "Moda fitness feminina com tecidos tecnológicos e modelagem que valoriza.", hours: "Seg a sáb · 9h às 19h", delivery: "Entrega em Rio Branco em até 48 h" },
  "base-athletic": { about: "Roupas masculinas para treino, corrida e o dia a dia ativo.", hours: "Seg a sáb · 9h às 18h", delivery: "Envio para todo o Acre" },
  "casa-do-treino": { about: "Equipamentos e acessórios para montar o seu espaço de treino.", hours: "Seg a sáb · 8h às 18h", delivery: "Entrega combinada em Feijó e região" },
};

function Stars({ value }: { value: number }) {
  return <span className="inline-flex items-center gap-0.5 text-amber-400">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={13} className={i < Math.round(value) ? "fill-current" : "opacity-30"} />)}</span>;
}

/** Janela do produto: foto grande, preço, quantidade, carrinho e "Conhecer a loja". */
export function ProductQuickViewHost() {
  const [id, setId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const on = (e: Event) => { setId(String((e as CustomEvent).detail)); setQty(1); setAdded(false); };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  useEffect(() => {
    if (!id) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setId(null); };
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [id]);
  const p = products.find((x) => x.id === id);
  if (!p) return null;
  const v = vendorById(p.vendorId);
  const off = p.oldPriceCents ? Math.round((1 - p.priceCents / p.oldPriceCents) * 100) : 0;
  const more = products.filter((x) => x.vendorId === p.vendorId && x.id !== p.id).slice(0, 4);
  const goStore = () => { setId(null); void navigate({ to: "/loja", search: { loja: p.vendorId } as never }); window.scrollTo?.({ top: 0 }); };
  return (
    <div className="fixed inset-0 z-[11500] grid place-items-end bg-slate-950/70 backdrop-blur-sm sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={p.name} onClick={(e) => { if (e.target === e.currentTarget) setId(null); }}>
      <div className="nv-pop grid max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative bg-[#e9eaec]">
          <img src={p.img} alt={p.name} className="aspect-square w-full object-cover" />
          {off > 0 && <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-3 py-1 text-sm font-extrabold text-white shadow">-{off}%</span>}
          <button type="button" onClick={() => setId(null)} aria-label="Fechar" className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/90 text-slate-900 shadow transition hover:bg-white md:hidden"><X size={18} /></button>
        </div>
        <div className="flex min-w-0 flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{categoryLabel[p.category]}{p.tag ? ` · ${p.tag}` : ""}</p>
              <h2 className="mt-1 text-2xl font-extrabold leading-tight">{p.name}</h2>
            </div>
            <button type="button" onClick={() => setId(null)} aria-label="Fechar" className="hidden size-9 shrink-0 place-items-center rounded-full bg-muted transition hover:bg-muted/70 md:grid"><X size={17} /></button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
          <div className="mt-4 rounded-2xl bg-muted/50 p-3">
            {p.oldPriceCents && <p className="text-sm"><span className="text-muted-foreground line-through">{money(p.oldPriceCents)}</span> <span className="ml-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">economize {money(p.oldPriceCents - p.priceCents)}</span></p>}
            <p className="text-3xl font-extrabold tabular-nums">{money(p.priceCents)}</p>
            <p className="text-xs text-muted-foreground">ou 3x de {money(Math.round(p.priceCents / 3))} sem juros · <strong className="text-emerald-700 dark:text-emerald-300">{money(Math.round(p.priceCents * 0.95))} no Pix</strong></p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex h-11 items-center rounded-xl border border-border">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir" className="grid size-11 place-items-center hover:bg-muted"><Minus size={16} /></button>
              <span className="w-8 text-center font-bold tabular-nums">{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Aumentar" className="grid size-11 place-items-center hover:bg-muted"><Plus size={16} /></button>
            </div>
            <button type="button" onClick={() => { cart.add(p.id, qty); setAdded(true); window.setTimeout(() => setAdded(false), 1400); }}
              className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition active:scale-[.98] ${added ? "nv-added bg-emerald-600" : "bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110"}`}>
              {added ? <><CheckCircle2 size={17} /> Adicionado ao carrinho</> : <><ShoppingCart size={17} /> Adicionar · {money(p.priceCents * qty)}</>}
            </button>
          </div>
          <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-2"><Truck size={14} className="text-primary" /> {v ? vendorAbout[v.id].delivery : "Entrega combinada com a equipe"}</li>
            <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-primary" /> Compra protegida pela NextVita</li>
          </ul>
          {v && (
            <div className="mt-4 rounded-2xl border border-border p-3">
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-extrabold text-white shadow" style={{ background: v.hex }}>{v.initials}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-sm font-bold">{v.name}{v.sampleVerified && <BadgeCheck size={15} className="text-sky-500" />}</p>
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Stars value={v.sampleRating} /> {v.sampleRating.toFixed(1).replace(".", ",")} <span className="rounded bg-muted px-1">exemplo</span> · <MapPin size={11} /> {v.city}</p>
                </div>
              </div>
              <button type="button" onClick={goStore} className="group mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 text-sm font-bold text-primary transition hover:bg-primary/10">
                <Store size={16} /> Conheça a loja <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </button>
              {more.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {more.map((m) => <button key={m.id} type="button" onClick={() => { setId(m.id); setQty(1); }} title={m.name} className="overflow-hidden rounded-lg bg-[#e9eaec] ring-1 ring-border transition hover:ring-primary"><img src={m.img} alt={m.name} className="aspect-square w-full object-cover" /></button>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Página de uma loja parceira (vitrine própria). Depois será alimentada pelo painel de cada lojista. */
export function VendorStorePage({ vendorId, onBack }: { vendorId: VendorId; onBack: () => void }) {
  const v = vendorById(vendorId);
  const [cat, setCat] = useState<string>("todos");
  const list = useMemo(() => products.filter((p) => p.vendorId === vendorId), [vendorId]);
  const cats = useMemo(() => [...new Set(list.map((p) => p.category))], [list]);
  const shown = cat === "todos" ? list : list.filter((p) => p.category === cat);
  const navigate = useNavigate();
  if (!v) return null;
  const info = vendorAbout[v.id];
  const cover = list[0]?.img;
  const wa = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(`Olá! Vi a loja ${v.name} na NextVita e quero tirar uma dúvida.`)}`;
  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={onBack} className="inline-flex w-fit items-center gap-1.5 rounded-xl px-2 py-1 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><ArrowLeft size={16} /> Voltar à Loja NextVita</button>
      <section className="nv-dark relative isolate overflow-hidden rounded-3xl text-white shadow-pop" style={{ background: `linear-gradient(135deg, ${v.hex}, #0b1220 75%)` }}>
        {cover && <img src={cover} alt="" aria-hidden className="absolute inset-y-0 right-0 -z-10 hidden h-full w-1/2 object-cover opacity-40 [mask-image:linear-gradient(90deg,transparent,#000)] md:block" />}
        <div aria-hidden className="absolute inset-0 -z-10 opacity-[.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="flex flex-wrap items-center gap-5 p-6 sm:p-8">
          <span className="grid size-20 shrink-0 place-items-center rounded-3xl bg-white text-2xl font-black shadow-xl" style={{ color: v.hex }}>{v.initials}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white/70">Loja parceira NextVita</p>
            <h1 className="flex flex-wrap items-center gap-2 font-display text-3xl font-extrabold leading-tight">{v.name}{v.sampleVerified && <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/20 px-2.5 py-0.5 text-xs font-bold text-sky-200"><BadgeCheck size={14} /> Verificada</span>}</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">{info.about}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/75">
              <span className="inline-flex items-center gap-1.5"><Stars value={v.sampleRating} /> {v.sampleRating.toFixed(1).replace(".", ",")} <span className="rounded bg-white/15 px-1">exemplo</span></span>
              <span className="inline-flex items-center gap-1"><MapPin size={13} /> {v.city}</span>
              <span className="inline-flex items-center gap-1"><Clock size={13} /> {info.hours}</span>
              <span className="inline-flex items-center gap-1"><Truck size={13} /> {info.delivery}</span>
            </p>
          </div>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#25d366] px-4 text-sm font-bold text-slate-950 transition hover:brightness-105"><MessageCircle size={16} /> Falar com a loja</a>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {["todos", ...cats].map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={`h-9 rounded-full border px-3.5 text-sm font-semibold transition ${cat === c ? "border-transparent text-white shadow" : "border-border bg-card text-muted-foreground hover:text-foreground"}`} style={cat === c ? { background: v.hex } : undefined}>{c === "todos" ? `Tudo (${list.length})` : categoryLabel[c as Product["category"]]}</button>)}
        </div>
        <p className="text-xs text-muted-foreground">{v.sector}</p>
      </div>

      <section aria-label={`Produtos de ${v.name}`} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {shown.map((p) => {
          const off = p.oldPriceCents ? Math.round((1 - p.priceCents / p.oldPriceCents) * 100) : 0;
          return (
            <article key={p.id} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-pop">
              <button type="button" onClick={() => openProduct(p.id)} className="relative aspect-square overflow-hidden bg-[#e9eaec]" aria-label={`Ver ${p.name}`}>
                <img src={p.img} alt={p.name} loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                {off > 0 && <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-extrabold text-white">-{off}%</span>}
              </button>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <h3 className="line-clamp-2 text-sm font-bold">{p.name}</h3>
                <p className="mt-auto pt-1 text-lg font-extrabold tabular-nums">{money(p.priceCents)}</p>
                <button type="button" onClick={() => cart.add(p.id)} className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition hover:brightness-110 active:scale-95" style={{ background: v.hex }}><ShoppingCart size={15} /> Comprar</button>
              </div>
            </article>
          );
        })}
      </section>

      <section aria-label="Outras lojas parceiras" className="rounded-3xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-bold">Outras lojas parceiras</h2>
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {vendors.filter((o) => o.id !== v.id).map((o) => (
            <button key={o.id} type="button" onClick={() => void navigate({ to: "/loja", search: { loja: o.id } as never })} className="flex w-56 shrink-0 items-center gap-3 rounded-2xl border border-border bg-background p-3 text-left transition hover:border-primary/40">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white" style={{ background: o.hex }}>{o.initials}</span>
              <span className="min-w-0"><strong className="block truncate text-sm">{o.name}</strong><span className="block truncate text-[11px] text-muted-foreground">{o.sector}</span></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
