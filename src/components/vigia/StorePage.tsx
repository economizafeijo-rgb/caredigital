import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "@tanstack/react-router";
import { VendorStorePage } from "./StoreViews";
import { PublicStoreGate } from "./store/PublicStore";
import { MyOrders, OrderTracking } from "./store/OrderTracking";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  cart,
  money,
  orderTotal,
  paymentMethods,
  STORE_LIVE,
  STORE_WHATSAPP,
  useCart,
  vendorById,
  type PaymentKey,
  type VendorId,
} from "@/lib/store";
import { useAccess } from "@/lib/use-access";

const payIcon = { pix: QrCode, cartao: CreditCard, boleto: FileText } as const;

export function CartDrawer({
  open,
  onClose,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
}) {
  const { lines, subtotal } = useCart();
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex justify-end bg-slate-950/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Carrinho"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <ShoppingBag size={20} className="text-primary" /> Meu carrinho
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar carrinho"
            className="grid size-9 place-items-center rounded-xl hover:bg-muted"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {lines.length === 0 ? (
            <p className="grid h-full place-items-center text-center text-sm text-muted-foreground">
              Seu carrinho está vazio.
              <br />
              Escolha produtos na vitrine.
            </p>
          ) : (
            <ul className="grid gap-3">
              {lines.map(({ product, qty }) => (
                <li
                  key={product.id}
                  className="flex gap-3 rounded-2xl border border-border bg-card p-2.5"
                >
                  <img
                    src={product.img}
                    alt=""
                    className="size-20 shrink-0 rounded-xl object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <strong className="truncate text-sm">{product.name}</strong>
                    <span className="text-sm font-bold">{money(product.priceCents * qty)}</span>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="inline-flex items-center rounded-lg border border-border">
                        <button
                          type="button"
                          aria-label="Diminuir"
                          onClick={() => cart.setQty(product.id, qty - 1)}
                          className="grid size-8 place-items-center"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-sm font-bold">{qty}</span>
                        <button
                          type="button"
                          aria-label="Aumentar"
                          onClick={() => cart.setQty(product.id, qty + 1)}
                          className="grid size-8 place-items-center"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remover ${product.name}`}
                        onClick={() => cart.remove(product.id)}
                        className="grid size-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-500/10"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="border-t border-border p-4">
          <div className="flex items-center justify-between text-sm">
            <span>Subtotal</span>
            <strong className="text-xl">{money(subtotal)}</strong>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Pix tem 5% de desconto no fechamento do pedido.
          </p>
          {STORE_LIVE ? (
            <button
              type="button"
              disabled={lines.length === 0}
              onClick={onCheckout}
              className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 text-base font-extrabold text-white disabled:opacity-50"
            >
              Finalizar pedido <ArrowRight size={18} />
            </button>
          ) : (
            <p className="mt-3 rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-center text-xs text-muted-foreground">
              Compras em breve. A loja está em fase de implantação; seu carrinho fica guardado.
            </p>
          )}
        </footer>
      </aside>
    </div>
  );
}

export function Checkout({ onClose }: { onClose: () => void }) {
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
  const signedIn =
    access.status === "client" || access.status === "admin" || access.status === "unlinked";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || lines.length === 0) return;
    if (
      name.trim().length < 3 ||
      phone.replace(/\D/g, "").length < 10 ||
      address.trim().length < 8
    ) {
      setError("Preencha nome, telefone com DDD e endereço de entrega.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        setError("Entre na sua conta para finalizar o pedido.");
        return;
      }
      const items = lines.map((l) => ({
        id: l.product.id,
        name: l.product.name,
        qty: l.qty,
        price_cents: l.product.priceCents,
      }));
      const { data, error: err } = await (supabase as any)
        .from("care_store_orders")
        .insert({
          customer_name: name.trim(),
          customer_email: user.email ?? null,
          customer_phone: phone.trim(),
          address: address.trim(),
          items,
          total_cents: total,
          payment_method: method,
          notes: notes.trim() || null,
        })
        .select("id")
        .single();
      if (err) throw err;
      const resume = lines.map((l) => `${l.qty}x ${l.product.name}`).join("; ");
      const text = `Olá! Fiz o pedido ${String(data.id).slice(0, 8)} na loja NextVita: ${resume}. Total ${money(total)} no ${paymentMethods.find((m) => m.key === method)?.label}.`;
      cart.clear();
      setDone({ id: String(data.id), total, text });
    } catch {
      setError(
        "Não foi possível registrar o pedido agora. A loja está em desenvolvimento: tente novamente em instantes ou fale pelo WhatsApp.",
      );
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm";
  return (
    <div
      className="fixed inset-0 z-[210] grid place-items-end bg-slate-950/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Finalizar pedido"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-extrabold">
            {done ? "Pedido registrado" : "Finalizar pedido"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-9 place-items-center rounded-xl hover:bg-muted"
          >
            <X size={18} />
          </button>
        </header>
        {done ? (
          <div className="grid gap-3 overflow-y-auto p-5 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
              <CheckCircle2 size={34} />
            </span>
            <h3 className="text-xl font-extrabold">Recebemos o seu pedido!</h3>
            <p className="text-sm text-muted-foreground">
              Pedido <strong className="text-foreground">#{done.id.slice(0, 8)}</strong> ·{" "}
              {money(done.total)}. Como a loja ainda está em desenvolvimento, nossa equipe confirma
              o pagamento e a entrega pelo WhatsApp.
            </p>
            <a
              href={`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(done.text)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 text-base font-bold text-white"
            >
              <MessageCircle size={18} /> Confirmar pelo WhatsApp
            </a>
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-border text-sm font-semibold"
            >
              Voltar à loja
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => void submit(e)}
            className="grid min-h-0 gap-4 overflow-y-auto p-4 sm:grid-cols-2"
          >
            <div className="grid content-start gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                Seus dados
              </h3>
              <label className="text-xs font-semibold">
                Nome completo
                <input
                  className={input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </label>
              <label className="text-xs font-semibold">
                Telefone / WhatsApp
                <input
                  className={input}
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(68) 90000-0000"
                  autoComplete="tel"
                />
              </label>
              <label className="text-xs font-semibold">
                Endereço de entrega
                <textarea
                  className={`${input} h-20 py-2`}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade"
                />
              </label>
              <label className="text-xs font-semibold">
                Observações (opcional)
                <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
            </div>
            <div className="grid content-start gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                Forma de pagamento
              </h3>
              <div role="radiogroup" aria-label="Forma de pagamento" className="grid gap-2">
                {paymentMethods.map((m) => {
                  const Icon = payIcon[m.key];
                  const on = method === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setMethod(m.key)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${on ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30" : "border-border bg-card"}`}
                    >
                      <span
                        className={`grid size-10 place-items-center rounded-xl ${on ? "bg-emerald-700 text-white" : "bg-muted"}`}
                      >
                        <Icon size={20} />
                      </span>
                      <span>
                        <strong className="block text-sm">{m.label}</strong>
                        <span className="text-xs text-muted-foreground">{m.note}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="rounded-xl bg-muted/60 p-2.5 text-[11px] text-muted-foreground">
                O pagamento online está sendo criado. Por enquanto o pedido fica registrado e a
                equipe envia a chave Pix, o link do cartão ou o boleto pelo WhatsApp.
              </p>
              <div className="rounded-2xl border border-border bg-card p-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                {method === "pix" && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                    <span>Desconto Pix (5%)</span>
                    <span>-{money(subtotal - total)}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t border-border pt-2 text-lg font-extrabold">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive"
                >
                  {error}
                </p>
              )}
              {!signedIn && (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs">
                  Para finalizar,{" "}
                  <Link to="/entrar" className="font-bold underline">
                    entre na sua conta
                  </Link>{" "}
                  (o carrinho fica guardado).
                </p>
              )}
              <button
                type="submit"
                disabled={busy || lines.length === 0 || !signedIn}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 text-base font-extrabold text-white disabled:opacity-50"
              >
                <ShieldCheck size={18} /> {busy ? "Registrando…" : "Confirmar pedido"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function StorePage({ slug }: { slug?: string } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const vendorParam = slug ?? (location.search as Record<string, unknown> | undefined)?.loja;
  const vendorId =
    typeof vendorParam === "string" && vendorById(vendorParam as VendorId)
      ? (vendorParam as VendorId)
      : null;
  const search = (location.search as Record<string, unknown> | undefined) ?? {};
  const orderParam = typeof search.pedido === "string" ? search.pedido : null;
  const slugParam =
    typeof vendorParam === "string" && /^[a-z0-9-]{2,60}$/.test(vendorParam) ? vendorParam : null;
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const { count } = useCart();
  const staticVendor = vendorId ? (
    <div className="flex w-full flex-col gap-4">
      <VendorStorePage vendorId={vendorId} onBack={() => void navigate({ to: "/loja" })} />
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        aria-label={`Abrir carrinho, ${count} itens`}
        className="nv-fab fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[90] inline-flex h-14 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-extrabold text-white shadow-xl ring-4 ring-white/70 dark:ring-slate-900/70"
      >
        <ShoppingCart size={22} /> Carrinho
        {count > 0 && (
          <span
            key={count}
            className="nv-heart-pop grid size-6 place-items-center rounded-full bg-emerald-400 text-xs text-slate-950"
          >
            {count}
          </span>
        )}
      </button>
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setCheckout(true);
        }}
      />
      {checkout && <Checkout onClose={() => setCheckout(false)} />}
    </div>
  ) : (
    <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
      Loja não encontrada.
    </p>
  );
  if (orderParam)
    return (
      <div className="mx-auto flex w-full flex-col gap-4">
        <OrderTracking id={orderParam} />
      </div>
    );
  if (search.pedidos !== undefined)
    return (
      <div className="mx-auto flex w-full flex-col gap-4">
        <MyOrders />
      </div>
    );
  if (slugParam)
    return (
      <div className="mx-auto flex w-full flex-col gap-4">
        <PublicStoreGate slug={slugParam} fallback={staticVendor} />
      </div>
    );
  // A vitrine completa mora na página inicial; esta página cuida das lojas, pedidos e pagamento.
  return <Navigate to="/" replace />;
}
