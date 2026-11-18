import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { openProduct, VendorStorePage } from "./StoreViews";
import { ArrowRight, CheckCircle2, CreditCard, FileText, Minus, Plus, QrCode, ShieldCheck, ShoppingBag, ShoppingCart, Store, Trash2, X, MessageCircle, Heart, Zap, Gift, Flame, Dumbbell, Pill, Leaf, Shirt, Sparkles, Apple, Snowflake, Tag } from "lucide-react";
import { countdownParts, currentCampaign, nextCampaignTeaser, productBadges, type Campaign } from "@/lib/store-promos";
import { supabase } from "@/integrations/supabase/client";
import { cart, categories, categoryLabel, money, orderTotal, paymentMethods, products, STORE_WHATSAPP, useCart, vendorById, type PaymentKey, type Product, type StoreCategory, type VendorId } from "@/lib/store";
import { useAccess } from "@/lib/use-access";
import { ShareButton } from "./ShareButton";

const payIcon = { pix: QrCode, cartao: CreditCard, boleto: FileText } as const;

export function StoreDevBanner({ className = "" }: { className?: string }) {
  return (
    <p role="note" className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground ${className}`}>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-foreground">
        <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" /> Pré-lançamento
      </span>
      Produtos, preços e lojas são ilustrativos. Pedidos feitos agora são apenas de teste, sem cobrança; nossa equipe confirma qualquer compra com você.
    </p>
  );
}

function useWishlist() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { try { setIds(JSON.parse(localStorage.getItem("nv-wish") || "[]")); } catch { /* ok */ } }, []);
  const toggle = (id: string) => setIds((cur) => { const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]; try { localStorage.setItem("nv-wish", JSON.stringify(next)); } catch { /* ok */ } return next; });
  return { ids, toggle };
}

function useTicker(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), ms); return () => window.clearInterval(t); }, [ms]);
  return now;
}

function ProductCard({ p, campaign, wished, onWish }: { p: Product; campaign: Campaign; wished: boolean; onWish: () => void }) {
  const [added, setAdded] = useState(false);
  const b = productBadges(p, campaign);
  const add = () => { cart.add(p.id); setAdded(true); window.setTimeout(() => setAdded(false), 1300); };
  return (
    <article className="nv-prod group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-[box-shadow,border-color] duration-300 hover:border-primary/30 hover:shadow-pop">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#e9eaec] md:aspect-square">
        <button type="button" onClick={() => openProduct(p.id)} aria-label={`Ver detalhes de ${p.name}`} className="block size-full cursor-zoom-in"><img src={p.img} alt={p.name} loading="lazy" className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]" /></button>
        {b.ribbon && (
          <span className={`absolute -left-9 top-4 w-36 -rotate-45 py-1 text-center text-[9px] font-extrabold tracking-[.14em] shadow-md ${campaign.id === "black-friday" ? "bg-[#0a0a0a] text-yellow-300" : campaign.id === "natal" ? "bg-rose-700 text-white" : "bg-emerald-600 text-white"}`}>{b.ribbon}</span>
        )}
        {!b.ribbon && p.tag && <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">{p.tag}</span>}
        {b.off > 0 && (
          <span className="nv-sticker absolute bottom-2 left-2 grid size-14 place-items-center rounded-full bg-rose-600 text-center leading-none text-white shadow-lg ring-2 ring-white/80">
            <span><strong className="block text-base font-extrabold">-{b.off}%</strong><span className="text-[8px] font-bold uppercase">off</span></span>
          </span>
        )}
        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button type="button" onClick={onWish} aria-pressed={wished} aria-label={wished ? `Remover ${p.name} dos favoritos` : `Favoritar ${p.name}`}
            className={`grid size-9 place-items-center rounded-full shadow-sm backdrop-blur transition active:scale-90 ${wished ? "bg-rose-600 text-white" : "bg-white/90 text-slate-700 hover:text-rose-600"}`}>
            <Heart size={16} className={wished ? "nv-heart-pop fill-current" : ""} />
          </button>
          <ShareButton title={p.name} text={`Olha esse produto na Loja NextVita: ${p.name} por ${money(p.priceCents)}.`} path="/loja" />
        </div>
        <button type="button" onClick={add} className="absolute inset-x-2 bottom-2 hidden h-10 translate-y-14 items-center justify-center gap-2 rounded-xl bg-slate-950/90 text-sm font-bold text-white opacity-0 backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:inline-flex" style={{ left: b.off ? "4.5rem" : undefined }}>
          <ShoppingCart size={15} /> Compra rápida
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{categoryLabel[p.category]}</span>
          <span className="truncate rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{b.perk}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-bold leading-snug"><button type="button" onClick={() => openProduct(p.id)} className="text-left hover:underline">{p.name}</button></h3>
        <p className="line-clamp-2 text-xs text-muted-foreground">{p.text}</p>
        {vendorById(p.vendorId) && <p className="truncate text-[11px] text-muted-foreground">Vendido por <strong className="font-semibold text-foreground">{vendorById(p.vendorId)!.name}</strong></p>}
        <div className="mt-auto pt-2">
          {p.oldPriceCents && <p className="flex items-center gap-2 text-xs"><span className="text-muted-foreground line-through">{money(p.oldPriceCents)}</span><span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-700 dark:text-emerald-300">economize {money(p.oldPriceCents - p.priceCents)}</span></p>}
          <strong className="text-xl font-extrabold tabular-nums">{money(p.priceCents)}</strong>
          <span className="block text-[11px] text-muted-foreground">ou 3x de {money(b.installments)} sem juros</span>
          <span className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">{money(Math.round(p.priceCents * 0.95))} no Pix (5% off)</span>
          {b.lowStock && <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400"><Flame size={12} /> Restam só {b.lowStock} unidades</p>}
          <button type="button" onClick={add}
            className={`mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition active:scale-95 ${added ? "nv-added bg-emerald-600" : "bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110"}`}>
            {added ? <><CheckCircle2 size={16} /> Adicionado</> : <><ShoppingCart size={16} /> Adicionar</>}
          </button>
        </div>
      </div>
    </article>
  );
}

function Countdown({ until, light = false }: { until: number; light?: boolean }) {
  const now = useTicker();
  const c = countdownParts(until - now);
  const box = light ? "bg-white/15 text-white" : "bg-[#0a0a0a] text-yellow-300";
  return (
    <div className="flex items-center gap-1.5" aria-label={`${c.d} dias, ${c.h} horas e ${c.m} minutos`}>
      {([[c.d, "dias"], [c.h, "h"], [c.m, "min"], [c.s, "s"]] as const).map(([v, l], i) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className={`grid min-w-[3rem] place-items-center rounded-xl px-2 py-1.5 text-center leading-none ring-1 ring-white/10 ${box}`}>
            <strong key={v} className="nv-tick block font-mono text-2xl font-extrabold tabular-nums">{String(v).padStart(2, "0")}</strong>
            <span className="mt-0.5 text-[9px] font-bold uppercase opacity-70">{l}</span>
          </span>
          {i < 3 && <span className="text-lg font-bold opacity-50">:</span>}
        </span>
      ))}
    </div>
  );
}

function CampaignHero({ campaign }: { campaign: Campaign }) {
  const bf = campaign.id === "black-friday", xmas = campaign.id === "natal";
  const stars = products.filter((p) => p.oldPriceCents).slice(0, 3);
  const maxOff = Math.max(0, ...products.filter((p) => p.oldPriceCents).map((p) => Math.round((1 - p.priceCents / p.oldPriceCents!) * 100)));
  return (
    <section aria-labelledby="loja-title" className={`nv-dark relative isolate overflow-hidden rounded-3xl bg-gradient-to-br ${campaign.theme.bg} text-white shadow-pop`}>
      <div aria-hidden className="absolute inset-0 -z-10 opacity-[.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />
      <div aria-hidden className="nv-bf-glow absolute -right-24 -top-24 -z-10 size-[28rem] rounded-full blur-3xl" style={{ background: `${campaign.theme.accent}33` }} />
      {xmas && Array.from({ length: 14 }, (_, i) => <Snowflake key={i} aria-hidden size={10 + (i % 4) * 4} className="nv-snow absolute -top-6 text-white/40" style={{ left: `${(i * 7.3) % 100}%`, animationDelay: `${i * 0.7}s`, animationDuration: `${8 + (i % 5)}s` }} />)}
      <div className="grid items-center gap-6 p-6 sm:p-9 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest" style={{ background: campaign.theme.accent, color: campaign.theme.ink }}>
            {bf ? <Zap size={13} /> : xmas ? <Gift size={13} /> : <Tag size={13} />} {campaign.name}
          </span>
          {bf ? (
            <h1 id="loja-title" className="mt-4 font-display text-5xl font-black uppercase leading-[.9] tracking-tight sm:text-7xl">
              <span className="nv-bf-shine block bg-[linear-gradient(110deg,#fff_40%,#facc15_50%,#fff_60%)] bg-[length:250%_100%] bg-clip-text text-transparent">Black</span>
              <span className="block text-yellow-300">Friday</span>
            </h1>
          ) : (
            <h1 id="loja-title" className="mt-4 text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">{campaign.headline}</h1>
          )}
          <p className="mt-3 max-w-xl text-base text-white/80">{bf ? `${campaign.headline} ${campaign.sub}` : campaign.sub}</p>
          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-white/60">{campaign.untilLabel}</p>
          <div className="mt-2"><Countdown until={campaign.until} light={!bf} /></div>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href="#ofertas" className="nv-cta-pulse inline-flex h-12 items-center gap-2 rounded-xl px-6 text-base font-extrabold shadow-lg transition hover:brightness-110 active:scale-[.98]" style={{ background: campaign.theme.accent, color: campaign.theme.ink }}>Ver ofertas <ArrowRight size={18} /></a>
            <a href="#vitrine" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 text-base font-bold text-white backdrop-blur transition hover:bg-white/15">Toda a loja</a>
          </div>
        </div>
        <div aria-hidden className="relative hidden h-80 lg:block">
          {stars.map((p, i) => {
            const off = Math.round((1 - p.priceCents / p.oldPriceCents!) * 100);
            const pos = [["left-[8%] top-6 w-52 -rotate-6", "0s"], ["right-[6%] top-0 w-48 rotate-6", "1.1s"], ["left-[34%] bottom-0 w-56 rotate-[-2deg]", "2.2s"]][i];
            return (
              <div key={p.id} className={`nv-float absolute overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-white/20 transition-transform duration-500 hover:z-10 hover:scale-105 ${pos[0]}`} style={{ animationDelay: pos[1] }}>
                <img src={p.img} alt="" className="aspect-square w-full object-cover" />
                <span className="absolute right-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-extrabold text-white">-{off}%</span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-xs font-bold text-white">{money(p.priceCents)}</span>
              </div>
            );
          })}
          {bf && <span className="nv-spin-slow absolute -right-2 bottom-6 grid size-24 place-items-center rounded-full bg-yellow-300 text-center text-[11px] font-black uppercase leading-tight text-black shadow-xl">até<br /><span className="text-2xl">-{maxOff}%</span></span>}
        </div>
      </div>
    </section>
  );
}

const catIcons: Record<string, typeof Pill> = { todos: Sparkles, suplementos: Dumbbell, vitaminas: Pill, nutricao: Apple, fitoterapicos: Leaf, "roupas-masculinas": Shirt, "roupas-femininas": Shirt, acessorios: Dumbbell };

function CartDrawer({ open, onClose, onCheckout }: { open: boolean; onClose: () => void; onCheckout: () => void }) {
  const { lines, subtotal } = useCart();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-slate-950/55 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Carrinho" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3"><h2 className="flex items-center gap-2 text-lg font-extrabold"><ShoppingBag size={20} className="text-primary" /> Meu carrinho</h2><button type="button" onClick={onClose} aria-label="Fechar carrinho" className="grid size-9 place-items-center rounded-xl hover:bg-muted"><X size={18} /></button></header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {lines.length === 0 ? <p className="grid h-full place-items-center text-center text-sm text-muted-foreground">Seu carrinho está vazio.<br />Escolha produtos na vitrine.</p> : (
            <ul className="grid gap-3">
              {lines.map(({ product, qty }) => (
                <li key={product.id} className="flex gap-3 rounded-2xl border border-border bg-card p-2.5">
                  <img src={product.img} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <strong className="truncate text-sm">{product.name}</strong>
                    <span className="text-sm font-bold">{money(product.priceCents * qty)}</span>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="inline-flex items-center rounded-lg border border-border">
                        <button type="button" aria-label="Diminuir" onClick={() => cart.setQty(product.id, qty - 1)} className="grid size-8 place-items-center"><Minus size={14} /></button>
                        <span className="w-7 text-center text-sm font-bold">{qty}</span>
                        <button type="button" aria-label="Aumentar" onClick={() => cart.setQty(product.id, qty + 1)} className="grid size-8 place-items-center"><Plus size={14} /></button>
                      </div>
                      <button type="button" aria-label={`Remover ${product.name}`} onClick={() => cart.remove(product.id)} className="grid size-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-500/10"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="border-t border-border p-4">
          <div className="flex items-center justify-between text-sm"><span>Subtotal</span><strong className="text-xl">{money(subtotal)}</strong></div>
          <p className="mt-1 text-[11px] text-muted-foreground">Pix tem 5% de desconto no fechamento do pedido.</p>
          <button type="button" disabled={lines.length === 0} onClick={onCheckout} className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-base font-extrabold text-white disabled:opacity-50">Finalizar pedido <ArrowRight size={18} /></button>
        </footer>
      </aside>
    </div>
  );
}

function Checkout({ onClose }: { onClose: () => void }) {
  const { lines, subtotal } = useCart();
  const access = useAccess();
  const [method, setMethod] = useState<PaymentKey>("pix");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id: string; total: number; text: string } | null>(null);
  const total = orderTotal(subtotal, method);
  const signedIn = access.status === "client" || access.status === "admin" || access.status === "unlinked";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || lines.length === 0) return;
    if (name.trim().length < 3 || phone.replace(/\D/g, "").length < 10 || address.trim().length < 8) { setError("Preencha nome, telefone com DDD e endereço de entrega."); return; }
    setBusy(true); setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) { setError("Entre na sua conta para finalizar o pedido."); return; }
      const items = lines.map((l) => ({ id: l.product.id, name: l.product.name, qty: l.qty, price_cents: l.product.priceCents }));
      const { data, error: err } = await (supabase as any).from("care_store_orders").insert({ customer_name: name.trim(), customer_email: user.email ?? null, customer_phone: phone.trim(), address: address.trim(), items, total_cents: total, payment_method: method, notes: notes.trim() || null }).select("id").single();
      if (err) throw err;
      const resume = lines.map((l) => `${l.qty}x ${l.product.name}`).join("; ");
      const text = `Olá! Fiz o pedido ${String(data.id).slice(0, 8)} na loja NextVita: ${resume}. Total ${money(total)} no ${paymentMethods.find((m) => m.key === method)?.label}.`;
      cart.clear();
      setDone({ id: String(data.id), total, text });
    } catch {
      setError("Não foi possível registrar o pedido agora. A loja está em desenvolvimento: tente novamente em instantes ou fale pelo WhatsApp.");
    } finally { setBusy(false); }
  }

  const input = "mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm";
  return (
    <div className="fixed inset-0 z-[210] grid place-items-end bg-slate-950/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Finalizar pedido" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3"><h2 className="text-lg font-extrabold">{done ? "Pedido registrado" : "Finalizar pedido"}</h2><button type="button" onClick={onClose} aria-label="Fechar" className="grid size-9 place-items-center rounded-xl hover:bg-muted"><X size={18} /></button></header>
        {done ? (
          <div className="grid gap-3 overflow-y-auto p-5 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckCircle2 size={34} /></span>
            <h3 className="text-xl font-extrabold">Recebemos o seu pedido!</h3>
            <p className="text-sm text-muted-foreground">Pedido <strong className="text-foreground">#{done.id.slice(0, 8)}</strong> · {money(done.total)}. Como a loja ainda está em desenvolvimento, nossa equipe confirma o pagamento e a entrega pelo WhatsApp.</p>
            <a href={`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(done.text)}`} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-base font-bold text-white"><MessageCircle size={18} /> Confirmar pelo WhatsApp</a>
            <button type="button" onClick={onClose} className="h-11 rounded-xl border border-border text-sm font-semibold">Voltar à loja</button>
          </div>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="grid min-h-0 gap-4 overflow-y-auto p-4 sm:grid-cols-2">
            <div className="grid content-start gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Seus dados</h3>
              <label className="text-xs font-semibold">Nome completo<input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
              <label className="text-xs font-semibold">Telefone / WhatsApp<input className={input} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(68) 90000-0000" autoComplete="tel" /></label>
              <label className="text-xs font-semibold">Endereço de entrega<textarea className={`${input} h-20 py-2`} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro, cidade" /></label>
              <label className="text-xs font-semibold">Observações (opcional)<input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
            </div>
            <div className="grid content-start gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Forma de pagamento</h3>
              <div role="radiogroup" aria-label="Forma de pagamento" className="grid gap-2">
                {paymentMethods.map((m) => { const Icon = payIcon[m.key]; const on = method === m.key; return (
                  <button key={m.key} type="button" role="radio" aria-checked={on} onClick={() => setMethod(m.key)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${on ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30" : "border-border bg-card"}`}>
                    <span className={`grid size-10 place-items-center rounded-xl ${on ? "bg-emerald-600 text-white" : "bg-muted"}`}><Icon size={20} /></span>
                    <span><strong className="block text-sm">{m.label}</strong><span className="text-xs text-muted-foreground">{m.note}</span></span>
                  </button>); })}
              </div>
              <p className="rounded-xl bg-muted/60 p-2.5 text-[11px] text-muted-foreground">O pagamento online está sendo criado. Por enquanto o pedido fica registrado e a equipe envia a chave Pix, o link do cartão ou o boleto pelo WhatsApp.</p>
              <div className="rounded-2xl border border-border bg-card p-3 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                {method === "pix" && <div className="flex justify-between text-emerald-700 dark:text-emerald-300"><span>Desconto Pix (5%)</span><span>-{money(subtotal - total)}</span></div>}
                <div className="mt-1 flex justify-between border-t border-border pt-2 text-lg font-extrabold"><span>Total</span><span>{money(total)}</span></div>
              </div>
              {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">{error}</p>}
              {!signedIn && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs">Para finalizar, <Link to="/entrar" className="font-bold underline">entre na sua conta</Link> (o carrinho fica guardado).</p>}
              <button type="submit" disabled={busy || lines.length === 0 || !signedIn} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-base font-extrabold text-white disabled:opacity-50"><ShieldCheck size={18} /> {busy ? "Registrando…" : "Confirmar pedido"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function StorePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const vendorParam = (location.search as Record<string, unknown> | undefined)?.loja;
  const vendorId = typeof vendorParam === "string" && vendorById(vendorParam as VendorId) ? (vendorParam as VendorId) : null;
  const [category, setCategory] = useState<StoreCategory | "todos">("todos");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const { count } = useCart();
  const wish = useWishlist();
  const campaign = useMemo(() => currentCampaign(), []);
  const teaser = nextCampaignTeaser();
  const list = useMemo(() => (category === "todos" ? products : products.filter((p) => p.category === category)), [category]);
  const deals = useMemo(() => products.filter((p) => p.oldPriceCents).sort((a, b) => (b.oldPriceCents! - b.priceCents) / b.oldPriceCents! - (a.oldPriceCents! - a.priceCents) / a.oldPriceCents!), []);
  const endOfDay = Date.parse(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Rio_Branco" }).format(new Date()) + "T23:59:59-05:00");
  const ticker = ["5% OFF no Pix", "3x sem juros no cartão", campaign.name, "Frete grátis acima de R$ 199", "Produtos da Amazônia", "Lojas parceiras do Acre", "Troca fácil"];
  if (vendorId) return (
    <div className="mx-auto flex w-full flex-col gap-4">
      <StoreDevBanner />
      <VendorStorePage vendorId={vendorId} onBack={() => void navigate({ to: "/loja" })} />
      <button type="button" onClick={() => setCartOpen(true)} aria-label={`Abrir carrinho, ${count} itens`} className="nv-fab fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[90] inline-flex h-14 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-extrabold text-white shadow-xl ring-4 ring-white/70 dark:ring-slate-900/70">
        <ShoppingCart size={22} /> Carrinho{count > 0 && <span key={count} className="nv-heart-pop grid size-6 place-items-center rounded-full bg-emerald-400 text-xs text-slate-950">{count}</span>}
      </button>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onCheckout={() => { setCartOpen(false); setCheckout(true); }} />
      {checkout && <Checkout onClose={() => setCheckout(false)} />}
    </div>
  );
  return (
    <div className="mx-auto flex w-full flex-col gap-4">
      <StoreDevBanner />
      <CampaignHero campaign={campaign} />

      <div className={`nv-marquee overflow-hidden rounded-2xl py-2.5 ${campaign.id === "black-friday" ? "bg-yellow-300 text-black" : "bg-primary text-primary-foreground"}`} aria-hidden>
        <ul className="nv-marquee-track flex w-max gap-8 px-4 text-sm font-extrabold uppercase tracking-wide">
          {[...ticker, ...ticker].map((t, i) => <li key={i} className="flex items-center gap-8 whitespace-nowrap">{t}<Zap size={14} /></li>)}
        </ul>
      </div>

      <section id="ofertas" aria-labelledby="ofertas-title" className="scroll-mt-4 rounded-3xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="nv-bolt grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-rose-600 to-orange-500 text-white shadow-lg"><Zap size={20} /></span>
            <div><h2 id="ofertas-title" className="text-lg font-extrabold leading-tight">Ofertas relâmpago</h2><p className="text-xs text-muted-foreground">Preço especial só hoje · acabam à meia-noite</p></div>
          </div>
          <div className="[&_strong]:text-lg [&_span.grid]:min-w-[2.6rem]"><Countdown until={endOfDay} /></div>
        </div>
        <div className="-mx-1 mt-4 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
          {deals.map((p) => {
            const b = productBadges(p, campaign);
            return (
              <article key={p.id} className="group relative w-56 shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-background transition-shadow hover:shadow-pop">
                <div className="relative aspect-square overflow-hidden bg-[#e9eaec]"><button type="button" onClick={() => openProduct(p.id)} aria-label={`Ver detalhes de ${p.name}`} className="block size-full cursor-zoom-in"><img src={p.img} alt={p.name} loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" /></button>
                  <span className="absolute left-2 top-2 rounded-lg bg-rose-600 px-2 py-1 text-xs font-extrabold text-white shadow">-{b.off}%</span></div>
                <div className="p-3">
                  <h3 className="line-clamp-1 text-sm font-bold">{p.name}</h3>
                  <p className="mt-0.5 text-xs"><span className="text-muted-foreground line-through">{money(p.oldPriceCents!)}</span> <strong className="text-base font-extrabold text-rose-600 dark:text-rose-400">{money(p.priceCents)}</strong></p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><i className="nv-stock block h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-600" style={{ width: `${b.sold}%` }} /></div>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{b.sold}% vendido</p>
                  <button type="button" onClick={() => cart.add(p.id)} className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-950 text-xs font-bold text-white transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-950"><ShoppingCart size={14} /> Garantir</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <nav id="vitrine" aria-label="Categorias" className="-mx-1 flex scroll-mt-4 gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {categories.map((c) => {
          const Icon = catIcons[c.key] ?? Sparkles;
          const on = category === c.key;
          return (
            <button key={c.key} type="button" onClick={() => setCategory(c.key)} aria-pressed={on}
              className={`group inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-bold transition active:scale-95 ${on ? "border-transparent bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
              <Icon size={16} className="transition-transform group-hover:-rotate-12 group-hover:scale-110" />{c.label}
            </button>
          );
        })}
      </nav>

      <section aria-label="Produtos" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
        {list.map((p) => <ProductCard key={p.id} p={p} campaign={campaign} wished={wish.ids.includes(p.id)} onWish={() => wish.toggle(p.id)} />)}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {teaser && (
          <aside className="nv-dark relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a0508] via-[#5b0a12] to-[#0d3b26] p-5 text-white sm:p-6">
            {Array.from({ length: 10 }, (_, i) => <Snowflake key={i} aria-hidden size={10 + (i % 3) * 5} className="nv-snow absolute -top-6 text-white/35" style={{ left: `${(i * 11) % 100}%`, animationDelay: `${i * 0.9}s`, animationDuration: `${9 + (i % 4)}s` }} />)}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest"><Gift size={13} /> {teaser.when}</span>
            <h2 className="mt-3 font-display text-2xl font-extrabold">{teaser.name}</h2>
            <p className="mt-1 max-w-md text-sm text-white/80">{teaser.text}</p>
            <a href="#vitrine" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-rose-900 transition hover:bg-white/90">Ver presentes <ArrowRight size={16} /></a>
          </aside>
        )}
        <aside className={`flex flex-col justify-between gap-3 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-5 sm:p-6 ${teaser ? "" : "lg:col-span-2"}`}>
          <div className="flex items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white"><Store size={24} /></span><div><strong className="block text-base">Tem uma loja ou vende produtos de saúde e fitness?</strong><span className="text-sm text-muted-foreground">Venda na NextVita com vitrine própria, selo da loja, avaliações e painel de vendas.</span></div></div>
          <Link to="/lojista" className="inline-flex h-11 w-fit items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow transition hover:brightness-110">Quero vender aqui <ArrowRight size={16} /></Link>
        </aside>
      </div>

      <button type="button" onClick={() => setCartOpen(true)} aria-label={`Abrir carrinho, ${count} itens`} className="nv-fab fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[90] inline-flex h-14 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-extrabold text-white shadow-xl ring-4 ring-white/70 dark:ring-slate-900/70">
        <ShoppingCart size={22} /> Carrinho{count > 0 && <span key={count} className="nv-heart-pop grid size-6 place-items-center rounded-full bg-emerald-400 text-xs text-slate-950">{count}</span>}
      </button>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onCheckout={() => { setCartOpen(false); setCheckout(true); }} />
      {checkout && <Checkout onClose={() => setCheckout(false)} />}
    </div>
  );
}
