import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  BadgeCheck,
  CircleDollarSign,
  Clock3,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Settings2,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  TrendingUp,
  Truck,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import {
  categoryName,
  centsToInput,
  COUNTED,
  money,
  ORDER_STATUS,
  parseMoney,
  PLANS,
  PRODUCT_CATEGORIES,
  pct,
  segmentLabel,
  type Invoice,
  type OrderStatus,
  type Vendor,
  type VendorOrder,
  type VendorProduct,
} from "@/lib/marketplace";
import { NiceSelect } from "./NiceSelect";

type Tab = "resumo" | "produtos" | "pedidos" | "loja" | "cobrancas";
const field = "mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm";
const dayKey = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { timeZone: "America/Rio_Branco" });
const STATUS_TONE = {
  pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  ativo: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  suspenso: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
} as const;
const STATUS_TEXT = {
  pendente: "Aguardando aprovação",
  ativo: "Loja ativa",
  suspenso: "Loja suspensa",
} as const;

/** Painel do lojista: resumo de vendas, produtos, pedidos, dados da loja e cobranças da plataforma. */
export function LojistaDashboard({ vendor, onChanged }: { vendor: Vendor; onChanged: () => void }) {
  const [tab, setTab] = useState<Tab>("resumo");
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [rating, setRating] = useState<{ avg: number; count: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const db = supabase as any;
    const [p, o, i, r] = await Promise.all([
      db
        .from("care_store_products")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false }),
      db
        .from("care_store_orders")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false })
        .limit(300),
      db
        .from("care_store_vendor_invoices")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("period", { ascending: false })
        .limit(24),
      db
        .from("care_store_vendor_ratings")
        .select("rating_avg,rating_count")
        .eq("vendor_id", vendor.id)
        .maybeSingle(),
    ]);
    if (p.error || o.error)
      setError(
        "Não foi possível carregar todos os dados. Confira se a atualização do banco da loja foi aplicada.",
      );
    else setError("");
    setProducts((p.data ?? []) as VendorProduct[]);
    setOrders((o.data ?? []) as VendorOrder[]);
    setInvoices((i.data ?? []) as Invoice[]);
    setRating(
      r.data ? { avg: Number(r.data.rating_avg), count: Number(r.data.rating_count) } : null,
    );
    setLoaded(true);
  }, [vendor.id]);
  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const counted = orders.filter((o) => COUNTED.includes(o.status));
    const gross = counted.reduce((s, o) => s + o.total_cents - o.delivery_fee_cents, 0);
    const commission = counted.reduce((s, o) => s + o.commission_cents, 0);
    const waiting = orders.filter((o) => o.status === "aguardando_pagamento");
    const days = Array.from({ length: 14 }, (_, k) =>
      dayKey(new Date(Date.now() - (13 - k) * 86_400_000).toISOString()),
    );
    const chart = days.map((d) => ({
      day: d.slice(8) + "/" + d.slice(5, 7),
      vendas:
        counted.filter((o) => dayKey(o.created_at) === d).reduce((s, o) => s + o.total_cents, 0) /
        100,
    }));
    return {
      gross,
      commission,
      net: counted.reduce((s, o) => s + o.vendor_net_cents, 0),
      count: counted.length,
      waiting: waiting.length,
      chart,
    };
  }, [orders]);

  const tabs: { key: Tab; label: string; icon: typeof Store }[] = [
    { key: "resumo", label: "Resumo", icon: TrendingUp },
    { key: "produtos", label: "Produtos", icon: Package },
    {
      key: "pedidos",
      label: `Pedidos${stats.waiting ? ` (${stats.waiting})` : ""}`,
      icon: ShoppingBag,
    },
    { key: "loja", label: "Minha loja", icon: Settings2 },
    { key: "cobrancas", label: "Cobranças", icon: ReceiptText },
  ];

  return (
    <div className="grid gap-4">
      <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#041f1d] via-[#0a3f39] to-[#0e6b5c] p-5 text-white shadow-pop sm:p-7">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-16 place-items-center rounded-2xl bg-white/15 text-2xl font-extrabold ring-1 ring-white/25">
            {vendor.logo_url ? (
              <img src={vendor.logo_url} alt="" className="size-full rounded-2xl object-cover" />
            ) : (
              vendor.name.slice(0, 1).toUpperCase()
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2.5 py-1 font-bold ${STATUS_TONE[vendor.status]}`}>
                {STATUS_TEXT[vendor.status]}
              </span>
              <span className="text-white/70">
                {segmentLabel(vendor.segment)} · {vendor.city}
              </span>
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold">
              {vendor.name}
              {vendor.verified && (
                <BadgeCheck size={22} className="text-emerald-300" aria-label="Loja verificada" />
              )}
            </h1>
            <p className="text-sm text-white/80">
              Plano {PLANS[vendor.plan].label} · comissão {pct(vendor.commission_bps)} por venda ·
              mensalidade {money(vendor.monthly_fee_cents)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-2 text-center ring-1 ring-white/20">
            <p className="flex items-center justify-center gap-1 text-2xl font-extrabold">
              <Star size={20} className="fill-amber-300 text-amber-300" />
              {rating ? rating.avg.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) : "—"}
            </p>
            <p className="text-[11px] text-white/70">
              {rating ? `${rating.count} avaliações` : "sem avaliações"}
            </p>
          </div>
        </div>
        {vendor.status === "pendente" && (
          <p className="mt-4 rounded-xl bg-amber-300/20 p-3 text-sm text-amber-100">
            Sua loja está em análise. Você já pode cadastrar produtos e ajustar os dados; a vitrine
            fica visível ao público assim que for aprovada.
          </p>
        )}
        {vendor.status === "suspenso" && (
          <p className="mt-4 rounded-xl bg-rose-400/20 p-3 text-sm text-rose-100">
            Sua loja está suspensa e não aparece no público. Fale com a equipe NextVita.
          </p>
        )}
      </header>

      <nav
        aria-label="Seções do painel"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition ${tab === t.key ? "border-transparent bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow" : "border-border bg-card text-muted-foreground"}`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </nav>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
        >
          {error}
        </p>
      )}

      {tab === "resumo" && (
        <section className="grid gap-3" aria-label="Resumo de vendas">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi
              icon={CircleDollarSign}
              tone="from-emerald-600 to-teal-500"
              label="Vendido (confirmado)"
              value={money(stats.gross)}
            />
            <Kpi
              icon={ShoppingBag}
              tone="from-indigo-600 to-violet-500"
              label="Pedidos confirmados"
              value={String(stats.count)}
            />
            <Kpi
              icon={Clock3}
              tone="from-amber-500 to-orange-500"
              label="Aguardando pagamento"
              value={String(stats.waiting)}
            />
            <Kpi
              icon={TrendingUp}
              tone="from-sky-600 to-cyan-500"
              label="Você fica com"
              value={money(stats.net)}
              note={`Comissão NextVita ${money(stats.commission)}`}
            />
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <h2 className="text-sm font-bold">Vendas dos últimos 14 dias (R$)</h2>
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => money(Math.round(v * 100))} />
                  <Bar dataKey="vendas" name="Vendas" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {loaded && products.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              Você ainda não tem produtos. Abra a aba <strong>Produtos</strong> e cadastre o
              primeiro.
            </p>
          )}
        </section>
      )}

      {tab === "produtos" && (
        <ProductsTab vendor={vendor} products={products} onChanged={() => void load()} />
      )}
      {tab === "pedidos" && <OrdersTab orders={orders} onChanged={() => void load()} />}
      {tab === "loja" && <ShopTab vendor={vendor} onChanged={onChanged} />}
      {tab === "cobrancas" && <InvoicesTab invoices={invoices} vendor={vendor} />}
    </div>
  );
}

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  note,
}: {
  icon: typeof Store;
  tone: string;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-card">
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white ${tone}`}
      >
        <Icon size={22} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <strong className="block truncate text-base font-extrabold sm:text-xl">{value}</strong>
        {note && <span className="text-[11px] text-muted-foreground">{note}</span>}
      </div>
    </div>
  );
}

/* ------------------------------- produtos -------------------------------- */
type Draft = {
  id?: string;
  name: string;
  category: string;
  description: string;
  price: string;
  old: string;
  image: string;
  stock: string;
  active: boolean;
};
const emptyDraft: Draft = {
  name: "",
  category: "suplementos",
  description: "",
  price: "",
  old: "",
  image: "",
  stock: "1",
  active: true,
};

function ProductsTab({
  vendor,
  products,
  onChanged,
}: {
  vendor: Vendor;
  products: VendorProduct[];
  onChanged: () => void;
}) {
  const dialog = useDialog();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function edit(p: VendorProduct) {
    setError("");
    setDraft({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description ?? "",
      price: centsToInput(p.price_cents),
      old: centsToInput(p.old_price_cents),
      image: p.image_url ?? "",
      stock: String(p.stock),
      active: p.active,
    });
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft || busy) return;
    const price = parseMoney(draft.price);
    const old = draft.old.trim() ? parseMoney(draft.old) : null;
    const stock = Number(draft.stock);
    if (draft.name.trim().length < 2) return setError("Informe o nome do produto.");
    if (!price || price <= 0) return setError("Informe o preço.");
    if (old !== null && old <= price)
      return setError("O preço antigo precisa ser maior que o preço atual.");
    if (!Number.isInteger(stock) || stock < 0) return setError("Informe o estoque (0 ou mais).");
    if (draft.image.trim() && !/^https:\/\//i.test(draft.image.trim()))
      return setError("O link da foto precisa começar com https://");
    setBusy(true);
    setError("");
    const row = {
      name: draft.name.trim(),
      category: draft.category,
      description: draft.description.trim() || null,
      price_cents: price,
      old_price_cents: old,
      image_url: draft.image.trim() || null,
      stock,
      active: draft.active,
      updated_at: new Date().toISOString(),
    };
    const { error: err } = draft.id
      ? await (supabase as any).from("care_store_products").update(row).eq("id", draft.id)
      : await (supabase as any)
          .from("care_store_products")
          .insert({ ...row, vendor_id: vendor.id });
    setBusy(false);
    if (err)
      return setError("Não foi possível salvar o produto. Confira os dados e tente de novo.");
    setDraft(null);
    onChanged();
  }
  async function remove(p: VendorProduct) {
    if (!(await dialog.confirm("Excluir produto?", `${p.name} será removido da sua loja.`, true)))
      return;
    const { error: err } = await (supabase as any)
      .from("care_store_products")
      .delete()
      .eq("id", p.id);
    if (err) setError("Não foi possível excluir. Se já houve pedidos, desative o produto.");
    else onChanged();
  }
  async function toggle(p: VendorProduct) {
    await (supabase as any)
      .from("care_store_products")
      .update({ active: !p.active, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    onChanged();
  }

  return (
    <section className="grid gap-3" aria-label="Produtos">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-extrabold">Meus produtos ({products.length})</h2>
        <button
          type="button"
          onClick={() => {
            setError("");
            setDraft({ ...emptyDraft });
          }}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 px-4 text-sm font-bold text-white shadow"
        >
          <Plus size={17} /> Novo produto
        </button>
      </div>
      {error && !draft && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {draft && (
        <form
          onSubmit={(e) => void save(e)}
          className="grid gap-3 rounded-3xl border border-primary/30 bg-card p-4 shadow-card sm:p-5"
          aria-label="Produto"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold">{draft.id ? "Editar produto" : "Novo produto"}</h3>
            <button
              type="button"
              onClick={() => setDraft(null)}
              aria-label="Fechar"
              className="grid size-9 place-items-center rounded-lg hover:bg-muted"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold sm:col-span-2">
              Nome
              <input
                className={field}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                maxLength={120}
              />
            </label>
            <div className="text-sm font-semibold">
              Categoria
              <NiceSelect
                className="mt-1 h-11"
                ariaLabel="Categoria"
                value={draft.category}
                onChange={(v) => setDraft({ ...draft, category: v })}
                options={PRODUCT_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
              />
            </div>
            <label className="text-sm font-semibold">
              Estoque (unidades)
              <input
                className={field}
                inputMode="numeric"
                value={draft.stock}
                onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
              />
            </label>
            <label className="text-sm font-semibold">
              Preço (R$)
              <input
                className={field}
                inputMode="decimal"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="149,90"
              />
            </label>
            <label className="text-sm font-semibold">
              Preço antigo (R$, opcional)
              <input
                className={field}
                inputMode="decimal"
                value={draft.old}
                onChange={(e) => setDraft({ ...draft, old: e.target.value })}
                placeholder="179,90"
              />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Link da foto (https://, opcional)
              <input
                className={field}
                value={draft.image}
                onChange={(e) => setDraft({ ...draft, image: e.target.value })}
                placeholder="https://…"
              />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Descrição (opcional)
              <textarea
                className={`${field} h-20 py-2`}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                maxLength={600}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                className="size-5 accent-emerald-600"
              />{" "}
              Visível na loja
            </label>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              <Save size={16} /> {busy ? "Salvando…" : "Salvar produto"}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="h-11 rounded-xl border border-border px-4 text-sm font-semibold"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      <ul className="grid gap-2 sm:grid-cols-2">
        {products.map((p) => (
          <li
            key={p.id}
            className={`flex gap-3 rounded-2xl border bg-card p-3 shadow-card ${p.active ? "border-border" : "border-dashed border-border opacity-70"}`}
          >
            <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
              {p.image_url ? (
                <img src={p.image_url} alt="" className="size-full object-cover" />
              ) : (
                <Package size={26} className="text-muted-foreground" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm">{p.name}</strong>
              <span className="text-[11px] text-muted-foreground">
                {categoryName(p.category)} · estoque {p.stock}
              </span>
              <p className="text-sm font-extrabold">
                {money(p.price_cents)}
                {p.old_price_cents && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground line-through">
                    {money(p.old_price_cents)}
                  </span>
                )}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => edit(p)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-bold"
                >
                  <Pencil size={13} /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => void toggle(p)}
                  className="h-8 rounded-lg border border-border px-2.5 text-xs font-bold"
                >
                  {p.active ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(p)}
                  aria-label={`Excluir ${p.name}`}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 text-xs font-bold text-rose-700 dark:text-rose-300"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------- pedidos -------------------------------- */
function OrdersTab({ orders, onChanged }: { orders: VendorOrder[]; onChanged: () => void }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function setStatus(id: string, status: OrderStatus) {
    setBusy(id);
    setError("");
    const { error: err } = await (supabase as any)
      .from("care_store_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    setBusy("");
    if (err) setError("Não foi possível atualizar o pedido.");
    else onChanged();
  }
  if (orders.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nenhum pedido ainda. Quando um cliente comprar na sua loja, ele aparece aqui.
      </p>
    );
  return (
    <section className="grid gap-2" aria-label="Pedidos">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {orders.map((o) => {
        const digits = o.customer_phone.replace(/\D/g, "");
        const wa =
          digits.length >= 10
            ? `https://wa.me/${digits.startsWith("55") ? digits : "55" + digits}`
            : null;
        return (
          <article
            key={o.id}
            className="grid gap-2 rounded-2xl border border-border bg-card p-4 shadow-card"
          >
            <header className="flex flex-wrap items-center gap-2">
              <strong>#{o.id.slice(0, 8)}</strong>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ORDER_STATUS[o.status].tone}`}
              >
                {ORDER_STATUS[o.status].label}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(o.created_at).toLocaleString("pt-BR", { timeZone: "America/Rio_Branco" })}
              </span>
            </header>
            <p className="text-sm">
              <strong>{o.customer_name}</strong> · {o.customer_phone}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Truck size={14} />{" "}
              {o.fulfillment === "entrega"
                ? `Entrega: ${o.address ?? "sem endereço"}`
                : "Retirada na loja"}
            </p>
            <ul className="text-sm">
              {o.items.map((i) => (
                <li key={i.id}>
                  {i.qty}× {i.name}{" "}
                  <span className="text-muted-foreground">({money(i.price_cents)})</span>
                </li>
              ))}
            </ul>
            {o.notes && <p className="rounded-lg bg-muted/60 p-2 text-xs">Obs.: {o.notes}</p>}
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
              <p className="text-sm">
                Total <strong>{money(o.total_cents)}</strong>
                {o.delivery_fee_cents > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    (frete {money(o.delivery_fee_cents)})
                  </span>
                )}{" "}
                · você fica com <strong>{money(o.vendor_net_cents)}</strong>{" "}
                <span className="text-xs text-muted-foreground">
                  (comissão {money(o.commission_cents)})
                </span>
              </p>
              <div className="flex items-center gap-2">
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white"
                  >
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                )}
                <div className="w-52">
                  <NiceSelect
                    ariaLabel={`Andamento do pedido ${o.id.slice(0, 8)}`}
                    value={o.status}
                    disabled={busy === o.id}
                    onChange={(v) => void setStatus(o.id, v as OrderStatus)}
                    options={(Object.keys(ORDER_STATUS) as OrderStatus[]).map((k) => ({
                      value: k,
                      label: ORDER_STATUS[k].label,
                    }))}
                  />
                </div>
              </div>
            </footer>
          </article>
        );
      })}
    </section>
  );
}

/* ------------------------------- minha loja ------------------------------- */
function ShopTab({ vendor, onChanged }: { vendor: Vendor; onChanged: () => void }) {
  const [f, setF] = useState({
    name: vendor.name,
    description: vendor.description ?? "",
    logo: vendor.logo_url ?? "",
    phone: vendor.phone,
    city: vendor.city,
    address: vendor.address ?? "",
    delivery: vendor.offers_delivery,
    pickup: vendor.offers_pickup,
    fee: centsToInput(vendor.delivery_fee_cents),
    free: centsToInput(vendor.free_delivery_from_cents),
    area: vendor.delivery_area ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const fee = f.delivery ? (f.fee.trim() ? parseMoney(f.fee) : 0) : 0;
    const free = f.delivery && f.free.trim() ? parseMoney(f.free) : null;
    if (f.name.trim().length < 2) return setMsg({ ok: false, text: "Informe o nome da loja." });
    if (f.phone.replace(/\D/g, "").length < 10)
      return setMsg({ ok: false, text: "Informe o WhatsApp com DDD." });
    if (!f.delivery && !f.pickup)
      return setMsg({ ok: false, text: "Escolha pelo menos entrega ou retirada." });
    if (fee === null || (f.delivery && f.free.trim() && free === null))
      return setMsg({ ok: false, text: "Confira os valores de frete." });
    if (f.logo.trim() && !/^https:\/\//i.test(f.logo.trim()))
      return setMsg({ ok: false, text: "O link do logo precisa começar com https://" });
    setBusy(true);
    const { error } = await (supabase as any)
      .from("care_store_vendors")
      .update({
        name: f.name.trim(),
        description: f.description.trim() || null,
        logo_url: f.logo.trim() || null,
        phone: f.phone.trim(),
        city: f.city.trim() || "Feijó",
        address: f.address.trim() || null,
        offers_delivery: f.delivery,
        offers_pickup: f.pickup,
        delivery_fee_cents: fee,
        free_delivery_from_cents: free,
        delivery_area: f.delivery ? f.area.trim() || null : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vendor.id);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "Não foi possível salvar agora." });
    setMsg({ ok: true, text: "Dados da loja salvos." });
    onChanged();
  }
  return (
    <form
      onSubmit={(e) => void save(e)}
      aria-label="Dados da loja"
      className="grid gap-3 rounded-3xl border border-border bg-card p-4 shadow-card sm:p-6"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Nome da loja
          <input
            className={field}
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            maxLength={80}
          />
        </label>
        <label className="text-sm font-semibold">
          WhatsApp
          <input
            className={field}
            inputMode="tel"
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
          />
        </label>
        <label className="text-sm font-semibold">
          Cidade
          <input
            className={field}
            value={f.city}
            onChange={(e) => setF({ ...f, city: e.target.value })}
          />
        </label>
        <label className="text-sm font-semibold">
          Endereço
          <input
            className={field}
            value={f.address}
            onChange={(e) => setF({ ...f, address: e.target.value })}
            maxLength={200}
          />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          Link do logo (https://, opcional)
          <input
            className={field}
            value={f.logo}
            onChange={(e) => setF({ ...f, logo: e.target.value })}
          />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          Sobre a loja
          <textarea
            className={`${field} h-24 py-2`}
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            maxLength={500}
          />
        </label>
      </div>
      <fieldset className="grid gap-3 rounded-2xl bg-muted/50 p-4">
        <legend className="px-1 text-sm font-bold">Como o cliente recebe</legend>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={f.pickup}
            onChange={(e) => setF({ ...f, pickup: e.target.checked })}
            className="size-5 accent-emerald-600"
          />{" "}
          Retirada na loja
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={f.delivery}
            onChange={(e) => setF({ ...f, delivery: e.target.checked })}
            className="size-5 accent-emerald-600"
          />{" "}
          Entrega (delivery)
        </label>
        {f.delivery && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold">
              Taxa de entrega (R$)
              <input
                className={field}
                inputMode="decimal"
                value={f.fee}
                onChange={(e) => setF({ ...f, fee: e.target.value })}
              />
            </label>
            <label className="text-xs font-semibold">
              Frete grátis a partir de (R$)
              <input
                className={field}
                inputMode="decimal"
                value={f.free}
                onChange={(e) => setF({ ...f, free: e.target.value })}
              />
            </label>
            <label className="text-xs font-semibold">
              Área atendida
              <input
                className={field}
                value={f.area}
                onChange={(e) => setF({ ...f, area: e.target.value })}
                maxLength={200}
              />
            </label>
          </div>
        )}
      </fieldset>
      {msg && (
        <p
          role={msg.ok ? "status" : "alert"}
          className={`rounded-xl p-3 text-sm ${msg.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}
        >
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 text-base font-bold text-white disabled:opacity-60"
      >
        <Save size={17} /> {busy ? "Salvando…" : "Salvar dados da loja"}
      </button>
      <p className="text-xs text-muted-foreground">
        Plano, mensalidade, comissão e selo de loja verificada são definidos pela NextVita.
      </p>
    </form>
  );
}

/* -------------------------------- cobranças ------------------------------- */
function InvoicesTab({ invoices, vendor }: { invoices: Invoice[]; vendor: Vendor }) {
  return (
    <section className="grid gap-3" aria-label="Cobranças">
      <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-card">
        <p>
          Seu plano: <strong>{PLANS[vendor.plan].label}</strong> · mensalidade{" "}
          <strong>{money(vendor.monthly_fee_cents)}</strong> · comissão{" "}
          <strong>{pct(vendor.commission_bps)}</strong> sobre vendas confirmadas.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          A fatura do mês é emitida pela NextVita no início do mês seguinte, somando a mensalidade e
          a comissão.
        </p>
      </div>
      {invoices.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma fatura emitida ainda.
        </p>
      ) : (
        <ul className="grid gap-2">
          {invoices.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div>
                <strong>
                  {i.period.slice(5)}/{i.period.slice(0, 4)}
                </strong>
                <p className="text-xs text-muted-foreground">
                  {i.orders_count} pedidos · vendas {money(i.gross_sales_cents)} · comissão{" "}
                  {money(i.commission_cents)} · mensalidade {money(i.monthly_fee_cents)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Vence em {i.due_date.split("-").reverse().join("/")}
                </p>
              </div>
              <div className="text-right">
                <strong className="text-lg">{money(i.total_due_cents)}</strong>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${i.status === "pago" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : i.status === "cancelado" ? "bg-muted text-muted-foreground" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}
                >
                  {i.status === "pago"
                    ? "Paga"
                    : i.status === "cancelado"
                      ? "Cancelada"
                      : "Pendente"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
