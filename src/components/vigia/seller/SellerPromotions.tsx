import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import { money, type Vendor } from "@/lib/marketplace";
import {
  OCCASIONS,
  PERCENT_MAX,
  PERCENT_MIN,
  buildCouponPayload,
  couponStatusLabel,
  discountLabel,
  normalizeCode,
  occasionLabel,
  type CouponForm,
  type CouponStatus,
  type OccasionKey,
} from "@/lib/coupons";
import { Panel, inputCls } from "./shared";

type CouponRow = {
  id: string;
  code: string;
  occasion: string;
  kind: "percent" | "fixed";
  value: number;
  starts_at: string;
  ends_at: string;
  min_order_cents: number;
  max_uses: number | null;
  uses_count: number;
  per_customer_limit: number;
  scope: "loja" | "produtos";
  product_ids: string[];
  status: CouponStatus;
};

type PromotionRow = {
  id: string;
  name: string;
  occasion: string;
  percent: number;
  starts_at: string;
  ends_at: string;
  product_ids: string[];
  status: CouponStatus;
};

type ProductLite = { id: string; name: string; price_cents: number };

const EMPTY_COUPON: CouponForm = {
  code: "",
  kind: "percent",
  value: "10",
  startDate: "",
  endDate: "",
  minOrder: "",
  maxUses: "",
  perCustomer: "1",
  scope: "loja",
  productIds: [],
};

/** Data de hoje no fuso do Acre (YYYY-MM-DD). */
function acreToday(offsetDays = 0): string {
  const d = new Date(Date.now() - 5 * 3600 * 1000 + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

/** Calcula início e fim sugeridos para a ocasião. Próximo ano se a data já passou. */
function occasionDates(key: OccasionKey): { startDate: string; endDate: string } | null {
  const o = OCCASIONS.find((x) => x.key === key);
  if (!o?.suggestedStart || !o.suggestedDays) return null;
  const now = new Date(Date.now() - 5 * 3600 * 1000);
  let year = now.getUTCFullYear();
  let start = Date.UTC(year, o.suggestedStart.month - 1, o.suggestedStart.day);
  if (start < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) {
    year += 1;
    start = Date.UTC(year, o.suggestedStart.month - 1, o.suggestedStart.day);
  }
  const end = start + (o.suggestedDays - 1) * 86400000;
  return {
    startDate: new Date(start).toISOString().slice(0, 10),
    endDate: new Date(end).toISOString().slice(0, 10),
  };
}

const STATUS_STYLE: Record<string, string> = {
  Ativo: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Agendado: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  Pausado: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Vencido: "bg-muted text-muted-foreground",
  Encerrado: "bg-muted text-muted-foreground",
};

/** Cupons e promoções: só o dono cria e altera. Funcionários não veem esta aba. */
export function SellerPromotions({ vendor }: { vendor: Vendor }) {
  const { confirm } = useDialog();
  const accent = vendor.accent_hex ?? "#0e7a5f";
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [promos, setPromos] = useState<PromotionRow[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [showCoupon, setShowCoupon] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [occasion, setOccasion] = useState<OccasionKey>("personalizada");
  const [form, setForm] = useState<CouponForm>(EMPTY_COUPON);
  const [promoName, setPromoName] = useState("");
  const [promoOccasion, setPromoOccasion] = useState<OccasionKey>("personalizada");
  const [promoPercent, setPromoPercent] = useState("10");
  const [promoStart, setPromoStart] = useState("");
  const [promoEnd, setPromoEnd] = useState("");
  const [promoProducts, setPromoProducts] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, p, pr] = await Promise.all([
      (supabase as any)
        .from("care_store_coupons")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("care_store_promotions")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("care_store_products")
        .select("id, name, price_cents")
        .eq("vendor_id", vendor.id)
        .eq("active", true)
        .order("name"),
    ]);
    setCoupons((c.data ?? []) as CouponRow[]);
    setPromos((p.data ?? []) as PromotionRow[]);
    setProducts((pr.data ?? []) as ProductLite[]);
    setLoading(false);
  }, [vendor.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const productName = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);

  function pickOccasion(key: OccasionKey) {
    setOccasion(key);
    const o = OCCASIONS.find((x) => x.key === key);
    const dates = occasionDates(key);
    setForm((f) => ({
      ...f,
      code: o?.suggestedCode ?? f.code,
      startDate: dates?.startDate ?? (f.startDate || acreToday()),
      endDate: dates?.endDate ?? (f.endDate || acreToday(7)),
    }));
  }

  async function saveCoupon(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");
    const built = buildCouponPayload(form);
    if (!built.ok) return setErr(built.error);
    const p = built.payload;
    setBusy("coupon");
    const { error } = await (supabase as any).rpc("care_store_coupon_save", {
      p_vendor_id: vendor.id,
      p_id: null,
      p_code: p.code,
      p_occasion: occasion,
      p_kind: p.kind,
      p_value: p.value,
      p_starts_at: p.starts_at,
      p_ends_at: p.ends_at,
      p_min_order_cents: p.min_order_cents,
      p_max_uses: p.max_uses,
      p_per_customer_limit: p.per_customer_limit,
      p_scope: p.scope,
      p_product_ids: p.product_ids,
    });
    setBusy("");
    if (error) {
      const m = String(error.message ?? "");
      return setErr(
        m.includes("duplicate")
          ? `Já existe um cupom com o código ${p.code}.`
          : "Não foi possível salvar o cupom.",
      );
    }
    setOk(`Cupom ${p.code} criado.`);
    setShowCoupon(false);
    setForm(EMPTY_COUPON);
    void load();
  }

  async function savePromo(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");
    const pct = Number(promoPercent);
    if (!promoName.trim() || promoName.trim().length < 3)
      return setErr("Dê um nome para a promoção.");
    if (!Number.isInteger(pct) || pct < PERCENT_MIN || pct > PERCENT_MAX)
      return setErr(`Percentual entre ${PERCENT_MIN}% e ${PERCENT_MAX}%.`);
    if (!promoStart || !promoEnd || promoEnd < promoStart) return setErr("Confira início e fim.");
    if (!promoProducts.length) return setErr("Escolha os produtos da promoção.");
    setBusy("promo");
    const { error } = await (supabase as any).rpc("care_store_promotion_save", {
      p_vendor_id: vendor.id,
      p_id: null,
      p_name: promoName.trim(),
      p_occasion: promoOccasion,
      p_percent: pct,
      p_starts_at: `${promoStart}T00:00:00-05:00`,
      p_ends_at: `${promoEnd}T23:59:59-05:00`,
      p_product_ids: promoProducts,
    });
    setBusy("");
    if (error) return setErr("Não foi possível salvar a promoção.");
    setOk("Promoção criada.");
    setShowPromo(false);
    setPromoName("");
    setPromoProducts([]);
    void load();
  }

  async function setStatus(
    kind: "coupon" | "promo",
    id: string,
    status: CouponStatus,
    label: string,
  ) {
    if (status === "encerrado") {
      const okConfirm = await confirm(
        "Encerrar?",
        `${label} deixa de valer para sempre. O histórico dos pedidos continua correto.`,
        true,
        "Encerrar",
      );
      if (!okConfirm) return;
    }
    setErr("");
    const fn =
      kind === "coupon" ? "care_store_coupon_set_status" : "care_store_promotion_set_status";
    const { error } = await (supabase as any).rpc(fn, { p_id: id, p_status: status });
    if (error) return setErr("Não foi possível alterar o status.");
    void load();
  }

  const field = `${inputCls} mt-1`;
  const btnPrimary =
    "h-10 rounded-lg px-4 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50";

  if (loading) {
    return (
      <div className="grid place-items-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-lg font-bold">Promoções</h2>
        <p className="text-sm text-muted-foreground">
          Cupons para o cliente digitar no carrinho e promoções que aparecem na vitrine sem código.
        </p>
      </div>

      {(err || ok) && (
        <p
          role={err ? "alert" : "status"}
          className={`rounded-lg p-2.5 text-sm ${err ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}
        >
          {err || ok}
        </p>
      )}

      <Panel
        title="Cupons"
        action={
          <button
            type="button"
            onClick={() => {
              setShowCoupon((v) => !v);
              setErr("");
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
          >
            <Plus size={14} /> Novo cupom
          </button>
        }
      >
        {showCoupon && (
          <form
            onSubmit={saveCoupon}
            className="mb-4 grid gap-3 rounded-xl border border-border p-4"
          >
            <label className="text-[13px] font-semibold">
              Ocasião
              <select
                className={field}
                value={occasion}
                onChange={(e) => pickOccasion(e.target.value as OccasionKey)}
              >
                {OCCASIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[13px] font-semibold">
                Código
                <input
                  className={`${field} uppercase`}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: normalizeCode(e.target.value) })}
                  placeholder="MAE10"
                />
              </label>
              <label className="text-[13px] font-semibold">
                Tipo de desconto
                <select
                  className={field}
                  value={form.kind}
                  onChange={(e) =>
                    setForm({ ...form, kind: e.target.value as "percent" | "fixed", value: "" })
                  }
                >
                  <option value="percent">Percentual (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </label>
              <label className="text-[13px] font-semibold">
                {form.kind === "percent" ? "Percentual" : "Valor (R$)"}
                <input
                  className={field}
                  inputMode="decimal"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </label>
              <label className="text-[13px] font-semibold">
                Pedido mínimo (R$)
                <input
                  className={field}
                  inputMode="decimal"
                  value={form.minOrder}
                  onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                  placeholder="0"
                />
              </label>
              <label className="text-[13px] font-semibold">
                Início
                <input
                  type="date"
                  className={field}
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </label>
              <label className="text-[13px] font-semibold">
                Fim
                <input
                  type="date"
                  className={field}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </label>
              <label className="text-[13px] font-semibold">
                Limite de usos total
                <input
                  className={field}
                  inputMode="numeric"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  placeholder="Sem limite"
                />
              </label>
              <label className="text-[13px] font-semibold">
                Usos por cliente
                <input
                  className={field}
                  inputMode="numeric"
                  value={form.perCustomer}
                  onChange={(e) => setForm({ ...form, perCustomer: e.target.value })}
                />
              </label>
            </div>
            <fieldset className="grid gap-2 text-[13px] font-semibold">
              <legend className="mb-1">Vale para</legend>
              <label className="flex items-center gap-2 font-normal">
                <input
                  type="radio"
                  checked={form.scope === "loja"}
                  onChange={() => setForm({ ...form, scope: "loja", productIds: [] })}
                />
                Toda a loja
              </label>
              <label className="flex items-center gap-2 font-normal">
                <input
                  type="radio"
                  checked={form.scope === "produtos"}
                  onChange={() => setForm({ ...form, scope: "produtos" })}
                />
                Produtos escolhidos
              </label>
              {form.scope === "produtos" && (
                <ProductPicker
                  products={products}
                  selected={form.productIds}
                  onChange={(ids) => setForm({ ...form, productIds: ids })}
                />
              )}
            </fieldset>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCoupon(false)}
                className="h-10 rounded-lg px-4 text-sm font-semibold hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy === "coupon"}
                className={btnPrimary}
                style={{ background: accent }}
              >
                {busy === "coupon" ? "Salvando…" : "Criar cupom"}
              </button>
            </div>
          </form>
        )}

        {coupons.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cupom ainda. Crie um para uma data comemorativa.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {coupons.map((c) => {
              const st = couponStatusLabel(c.status, c.starts_at, c.ends_at);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Tag size={16} className="text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-bold">{c.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {occasionLabel(c.occasion)} · {discountLabel(c.kind, c.value)} ·{" "}
                      {c.scope === "loja" ? "toda a loja" : `${c.product_ids.length} produto(s)`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.uses_count} uso(s){c.max_uses ? ` de ${c.max_uses}` : ""}
                      {c.min_order_cents ? ` · mínimo ${money(c.min_order_cents)}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[st] ?? ""}`}
                  >
                    {st}
                  </span>
                  <StatusButtons
                    status={c.status}
                    onSet={(s) => setStatus("coupon", c.id, s, `O cupom ${c.code}`)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Promoções"
        action={
          <button
            type="button"
            onClick={() => {
              setShowPromo((v) => !v);
              setErr("");
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
          >
            <Plus size={14} /> Nova promoção
          </button>
        }
      >
        {showPromo && (
          <form
            onSubmit={savePromo}
            className="mb-4 grid gap-3 rounded-xl border border-border p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[13px] font-semibold">
                Nome
                <input
                  className={field}
                  value={promoName}
                  onChange={(e) => setPromoName(e.target.value)}
                  placeholder="Semana das Mães"
                />
              </label>
              <label className="text-[13px] font-semibold">
                Ocasião
                <select
                  className={field}
                  value={promoOccasion}
                  onChange={(e) => setPromoOccasion(e.target.value as OccasionKey)}
                >
                  {OCCASIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[13px] font-semibold">
                Percentual (%)
                <input
                  className={field}
                  inputMode="numeric"
                  value={promoPercent}
                  onChange={(e) => setPromoPercent(e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[13px] font-semibold">
                  Início
                  <input
                    type="date"
                    className={field}
                    value={promoStart}
                    onChange={(e) => setPromoStart(e.target.value)}
                  />
                </label>
                <label className="text-[13px] font-semibold">
                  Fim
                  <input
                    type="date"
                    className={field}
                    value={promoEnd}
                    onChange={(e) => setPromoEnd(e.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="text-[13px] font-semibold">
              Produtos
              <ProductPicker
                products={products}
                selected={promoProducts}
                onChange={setPromoProducts}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Se o produto tiver preço "de/por", vale o menor entre o preço da promoção e o preço
              atual.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPromo(false)}
                className="h-10 rounded-lg px-4 text-sm font-semibold hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy === "promo"}
                className={btnPrimary}
                style={{ background: accent }}
              >
                {busy === "promo" ? "Salvando…" : "Criar promoção"}
              </button>
            </div>
          </form>
        )}

        {promos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma promoção ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {promos.map((p) => {
              const st = couponStatusLabel(p.status, p.starts_at, p.ends_at);
              const names = p.product_ids.map((id) => productName.get(id) ?? "Produto").join(", ");
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">
                      {p.name} · {p.percent}% off
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{names}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[st] ?? ""}`}
                  >
                    {st}
                  </span>
                  <StatusButtons
                    status={p.status}
                    onSet={(s) => setStatus("promo", p.id, s, `A promoção ${p.name}`)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function StatusButtons({
  status,
  onSet,
}: {
  status: CouponStatus;
  onSet: (s: CouponStatus) => void;
}) {
  if (status === "encerrado") return null;
  const next = status === "ativo" ? "pausado" : "ativo";
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onSet(next)}
        className="h-8 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted"
      >
        {status === "ativo" ? "Pausar" : "Reativar"}
      </button>
      <button
        type="button"
        onClick={() => onSet("encerrado")}
        className="h-8 rounded-lg px-3 text-xs font-semibold text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
      >
        Encerrar
      </button>
    </div>
  );
}

function ProductPicker({
  products,
  selected,
  onChange,
}: {
  products: ProductLite[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (!products.length)
    return (
      <p className="mt-1 text-xs font-normal text-muted-foreground">Cadastre produtos primeiro.</p>
    );
  return (
    <ul className="mt-2 grid max-h-48 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
      {products.map((p) => (
        <li key={p.id}>
          <label className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-normal hover:bg-muted">
            <input
              type="checkbox"
              checked={selected.includes(p.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked ? [...selected, p.id] : selected.filter((x) => x !== p.id),
                )
              }
            />
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {money(p.price_cents)}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
