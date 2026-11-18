import { useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, CheckCircle2, CreditCard, FileText, Minus, Plus, QrCode, ShieldCheck, ShoppingBag, ShoppingCart, Store, Trash2, Truck, X, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cart, categories, categoryLabel, money, orderTotal, paymentMethods, products, STORE_WHATSAPP, useCart, type PaymentKey, type Product, type StoreCategory } from "@/lib/store";
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

function ProductCard({ p }: { p: Product }) {
  const [added, setAdded] = useState(false);
  const off = p.oldPriceCents ? Math.round((1 - p.priceCents / p.oldPriceCents) * 100) : 0;
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted md:aspect-square">
        <img src={p.img} alt={p.name} loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-105" />
        {p.tag && <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">{p.tag}</span>}
        {off > 0 && <span className="absolute bottom-2 left-2 rounded-full bg-rose-600 px-2 py-1 text-[11px] font-extrabold text-white">-{off}%</span>}
        <ShareButton className="absolute right-2 top-2" title={p.name} text={`Olha esse produto na Loja NextVita: ${p.name} por ${money(p.priceCents)}.`} path="/loja" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{categoryLabel[p.category]}</span>
        <h3 className="text-sm font-bold leading-snug">{p.name}</h3>
        <p className="line-clamp-2 text-xs text-muted-foreground">{p.text}</p>
        <div className="mt-auto pt-2">
          {p.oldPriceCents && <span className="mr-2 text-xs text-muted-foreground line-through">{money(p.oldPriceCents)}</span>}
          <strong className="text-lg font-extrabold">{money(p.priceCents)}</strong>
          <span className="block text-[11px] text-emerald-700 dark:text-emerald-300">{money(Math.round(p.priceCents * 0.95))} no Pix</span>
          <button type="button" onClick={() => { cart.add(p.id); setAdded(true); window.setTimeout(() => setAdded(false), 1200); }}
            className={`mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition active:scale-95 ${added ? "bg-emerald-600" : "bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110"}`}>
            {added ? <><CheckCircle2 size={16} /> Adicionado</> : <><ShoppingCart size={16} /> Adicionar</>}
          </button>
        </div>
      </div>
    </article>
  );
}

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
  const [category, setCategory] = useState<StoreCategory | "todos">("todos");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const { count } = useCart();
  const list = useMemo(() => (category === "todos" ? products : products.filter((p) => p.category === category)), [category]);
  return (
    <div className="mx-auto flex w-full flex-col gap-4">
      <StoreDevBanner />
      <section aria-labelledby="loja-title" className="relative isolate overflow-hidden rounded-3xl bg-slate-950 text-white shadow-pop">
        <img src="/loja/gym2.webp" alt="" aria-hidden="true" className="absolute inset-0 -z-20 size-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/80 to-emerald-900/30" />
        <div className="grid gap-5 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-slate-950"><BadgeCheck size={14} /> Loja NextVita</span>
            <h1 id="loja-title" className="mt-3 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Treine melhor. <span className="text-emerald-300">Cuide-se mais.</span></h1>
            <p className="mt-3 max-w-xl text-base text-slate-200">Suplementos, vitaminas, nutrição e moda fitness para homens e mulheres, tudo no mesmo lugar do seu acompanhamento.</p>
            <a href="#vitrine" className="mt-5 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-base font-extrabold text-slate-950">Ver produtos <ArrowRight size={18} /></a>
          </div>
          <ul className="grid gap-2 text-sm font-semibold sm:grid-cols-3 lg:grid-cols-1">
            {[[QrCode, "5% de desconto no Pix"], [CreditCard, "Cartão em até 3x sem juros"], [Truck, "Entrega combinada com a equipe"]].map(([Icon, text]) => { const I = Icon as typeof QrCode; return <li key={text as string} className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur"><I size={20} className="text-emerald-300" />{text as string}</li>; })}
          </ul>
        </div>
      </section>

      <nav id="vitrine" aria-label="Categorias" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {categories.map((c) => <button key={c.key} type="button" onClick={() => setCategory(c.key)} aria-pressed={category === c.key} className={`h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition ${category === c.key ? "border-transparent bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow" : "border-border bg-card text-muted-foreground"}`}>{c.label}</button>)}
      </nav>

      <section aria-label="Produtos" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </section>

      <aside className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4 sm:p-5">
        <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white"><Store size={24} /></span><div><strong className="block text-base">Tem uma loja ou vende produtos de saúde e fitness?</strong><span className="text-sm text-muted-foreground">Venda na NextVita com vitrine própria, selo da loja, avaliações e painel de vendas.</span></div></div>
        <Link to="/lojista" className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow">Quero vender aqui <ArrowRight size={16} /></Link>
      </aside>

      <button type="button" onClick={() => setCartOpen(true)} aria-label={`Abrir carrinho, ${count} itens`} className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[90] inline-flex h-14 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-extrabold text-white shadow-xl ring-4 ring-white/70 dark:ring-slate-900/70">
        <ShoppingCart size={22} /> Carrinho{count > 0 && <span className="grid size-6 place-items-center rounded-full bg-emerald-400 text-xs text-slate-950">{count}</span>}
      </button>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onCheckout={() => { setCartOpen(false); setCheckout(true); }} />
      {checkout && <Checkout onClose={() => setCheckout(false)} />}
    </div>
  );
}
