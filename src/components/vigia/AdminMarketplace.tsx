import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  CircleDollarSign,
  Percent,
  ReceiptText,
  RefreshCw,
  Save,
  Star,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  COUNTED,
  money,
  PLANS,
  pct,
  segmentLabel,
  type Invoice,
  type PlanKey,
  type Vendor,
  type VendorOrder,
  type VendorStatus,
} from "@/lib/marketplace";
import { NiceSelect } from "./NiceSelect";
import { AdminVendorDetail } from "./AdminVendorDetail";
import { AdminModerationSettings } from "./AdminModerationSettings";

const inputCls = "mt-1 block h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm";
const monthNow = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 7);
const STATUS_TONE = {
  pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  ativo: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  suspenso: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
} as const;

type Rating = { vendor_id: string; rating_avg: number; rating_count: number };

/** Gestão do marketplace pelo administrador: lojas, planos, comissão, selo, cobranças e receita da plataforma. */
export function AdminMarketplace() {
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(monthNow());
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const db = supabase as any;
    const [v, o, i, r] = await Promise.all([
      db.from("care_store_vendors").select("*").order("created_at", { ascending: false }),
      db
        .from("care_store_orders")
        .select("*")
        .not("vendor_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1000),
      db
        .from("care_store_vendor_invoices")
        .select("*")
        .order("period", { ascending: false })
        .limit(300),
      db.from("care_store_vendor_ratings").select("*"),
    ]);
    if (v.error) {
      setError(
        "Não foi possível carregar o marketplace. Aplique a atualização do banco (marketplace) no Supabase.",
      );
      setVendors([]);
      return;
    }
    setError("");
    setVendors((v.data ?? []) as Vendor[]);
    setOrders((o.data ?? []) as VendorOrder[]);
    setInvoices((i.data ?? []) as Invoice[]);
    setRatings(Object.fromEntries(((r.data ?? []) as Rating[]).map((x) => [x.vendor_id, x])));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const bySales = useMemo(() => {
    const map = new Map<string, { gross: number; commission: number; count: number }>();
    orders
      .filter((o) => COUNTED.includes(o.status) && o.vendor_id)
      .forEach((o) => {
        const cur = map.get(o.vendor_id as string) ?? { gross: 0, commission: 0, count: 0 };
        map.set(o.vendor_id as string, {
          gross: cur.gross + o.total_cents - o.delivery_fee_cents,
          commission: cur.commission + o.commission_cents,
          count: cur.count + 1,
        });
      });
    return map;
  }, [orders]);

  const kpi = useMemo(() => {
    const list = vendors ?? [];
    const gmv = [...bySales.values()].reduce((s, x) => s + x.gross, 0);
    const commission = [...bySales.values()].reduce((s, x) => s + x.commission, 0);
    const active = list.filter((v) => v.status === "ativo");
    const mrr = active.reduce((s, v) => s + v.monthly_fee_cents, 0);
    const received = invoices
      .filter((i) => i.status === "pago")
      .reduce((s, i) => s + i.total_due_cents, 0);
    const toReceive = invoices
      .filter((i) => i.status === "pendente")
      .reduce((s, i) => s + i.total_due_cents, 0);
    return {
      gmv,
      commission,
      active: active.length,
      pending: list.filter((v) => v.status === "pendente").length,
      mrr,
      received,
      toReceive,
    };
  }, [vendors, bySales, invoices]);

  async function generate() {
    setBusy("gen");
    setNotice("");
    const { data, error: err } = await (supabase as any).rpc("care_store_generate_invoices", {
      p_period: period,
    });
    setBusy("");
    if (err) return setNotice("Não foi possível gerar as cobranças agora.");
    setNotice(
      Number(data) > 0
        ? `${data} cobrança(s) gerada(s) para ${period.slice(5)}/${period.slice(0, 4)}.`
        : "Nenhuma cobrança nova para este mês (já geradas ou sem valores).",
    );
    void load();
  }
  async function setInvoice(id: string, status: "pendente" | "pago" | "cancelado") {
    setBusy(id);
    const { error: err } = await (supabase as any).rpc("care_store_admin_set_invoice_status", {
      p_invoice: id,
      p_status: status,
    });
    setBusy("");
    if (err) setNotice("Não foi possível atualizar a cobrança.");
    else void load();
  }
  const kp = (Icon: typeof Store, label: string, value: string, tone: string, note?: string) => (
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
  const vendorName = (id: string) => vendors?.find((v) => v.id === id)?.name ?? "Loja";

  return (
    <section
      aria-label="Marketplace"
      className="grid gap-3 rounded-3xl border border-border bg-card/60 p-3 shadow-card sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-500 text-white">
            <Users size={20} />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Marketplace
            </p>
            <h2 className="text-lg font-extrabold leading-tight">
              Lojistas, vendas e receita da plataforma
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-bold"
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </header>
      <AdminModerationSettings />
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs"
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {kp(
          CircleDollarSign,
          "Vendido pelos lojistas",
          money(kpi.gmv),
          "from-emerald-600 to-teal-500",
          "pedidos pagos, enviados e entregues",
        )}
        {kp(Percent, "Comissões geradas", money(kpi.commission), "from-indigo-600 to-violet-500")}
        {kp(
          CalendarClock,
          "Mensalidades (recorrente)",
          money(kpi.mrr),
          "from-sky-600 to-cyan-500",
          `${kpi.active} loja(s) ativa(s)`,
        )}
        {kp(
          TrendingUp,
          "Cobranças a receber",
          money(kpi.toReceive),
          "from-amber-500 to-orange-500",
          `Já recebido: ${money(kpi.received)}`,
        )}
      </div>

      {kpi.pending > 0 && (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-semibold">
          {kpi.pending} loja(s) aguardando a sua aprovação.
        </p>
      )}

      <div className="grid gap-2">
        <h3 className="text-sm font-bold">Lojas cadastradas ({vendors?.length ?? 0})</h3>
        {vendors === null ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : vendors.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            Nenhuma loja cadastrada ainda. Divulgue a página <strong>/lojista</strong> para os
            comerciantes da cidade.
          </p>
        ) : (
          vendors.map((v) => (
            <VendorRow
              key={v.id}
              v={v}
              stats={bySales.get(v.id)}
              rating={ratings[v.id]}
              onSaved={() => void load()}
            />
          ))
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <ReceiptText size={16} className="text-primary" /> Cobranças dos lojistas
          </h3>
          <div className="flex items-end gap-2">
            <label className="text-[11px] font-semibold">
              Mês
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="mt-0.5 block h-10 rounded-lg border border-border bg-surface px-2 text-sm"
              />
            </label>
            <button
              type="button"
              disabled={busy === "gen" || !period}
              onClick={() => void generate()}
              className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 px-4 text-xs font-extrabold text-white disabled:opacity-50"
            >
              {busy === "gen" ? "Gerando…" : "Gerar cobranças do mês"}
            </button>
          </div>
        </div>
        {notice && (
          <p role="status" className="mt-2 rounded-lg bg-muted/60 p-2 text-xs">
            {notice}
          </p>
        )}
        {invoices.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Nenhuma cobrança gerada ainda.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {invoices.slice(0, 60).map((i) => (
              <li
                key={i.id}
                className="grid gap-2 rounded-xl border border-border bg-surface p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <strong>{vendorName(i.vendor_id)}</strong>{" "}
                  <span className="text-xs text-muted-foreground">
                    · {i.period.slice(5)}/{i.period.slice(0, 4)} · vence{" "}
                    {i.due_date.split("-").reverse().join("/")}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {i.orders_count} pedidos · vendas {money(i.gross_sales_cents)} · comissão{" "}
                    {money(i.commission_cents)} + mensalidade {money(i.monthly_fee_cents)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <strong>{money(i.total_due_cents)}</strong>
                  <div className="w-36">
                    <NiceSelect
                      ariaLabel={`Situação da cobrança de ${vendorName(i.vendor_id)}`}
                      value={i.status}
                      disabled={busy === i.id}
                      onChange={(v) =>
                        void setInvoice(i.id, v as "pendente" | "pago" | "cancelado")
                      }
                      options={[
                        { value: "pendente", label: "Pendente" },
                        { value: "pago", label: "Paga" },
                        { value: "cancelado", label: "Cancelada" },
                      ]}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function VendorRow({
  v,
  stats,
  rating,
  onSaved,
}: {
  v: Vendor;
  stats?: { gross: number; commission: number; count: number };
  rating?: Rating;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<VendorStatus>(v.status);
  const [plan, setPlan] = useState<PlanKey>(v.plan);
  const [fee, setFee] = useState((v.monthly_fee_cents / 100).toFixed(2).replace(".", ","));
  const [bps, setBps] = useState(String(v.commission_bps / 100).replace(".", ","));
  const [verified, setVerified] = useState(v.verified);
  const [featured, setFeatured] = useState(v.featured_until ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [detail, setDetail] = useState(false);

  function pickPlan(next: PlanKey) {
    setPlan(next);
    setFee((PLANS[next].feeCents / 100).toFixed(2).replace(".", ","));
    setBps(String(PLANS[next].bps / 100).replace(".", ","));
  }
  async function save() {
    const feeCents = Math.round(Number(fee.replace(/\./g, "").replace(",", ".")) * 100);
    const bp = Math.round(Number(bps.replace(",", ".")) * 100);
    if (!Number.isFinite(feeCents) || feeCents < 0 || !Number.isFinite(bp) || bp < 0 || bp > 5000)
      return setMsg({ ok: false, text: "Confira a mensalidade e a comissão (0 a 50%)." });
    setBusy(true);
    setMsg(null);
    const { error } = await (supabase as any).rpc("care_store_admin_update_vendor", {
      p_vendor: v.id,
      p_status: status,
      p_plan: plan,
      p_monthly_fee_cents: feeCents,
      p_commission_bps: bp,
      p_verified: verified,
      p_featured_until: featured || null,
    });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "Não foi possível salvar." });
    setMsg({ ok: true, text: "Alterações salvas." });
    onSaved();
  }
  return (
    <article className="grid gap-3 rounded-2xl border border-border bg-card p-3 shadow-card sm:p-4">
      <header className="flex flex-wrap items-center gap-2">
        <strong className="flex items-center gap-1.5 text-base">
          {v.name}
          {v.verified && (
            <BadgeCheck size={17} className="text-emerald-500" aria-label="Verificada" />
          )}
        </strong>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[v.status]}`}>
          {v.status}
        </span>
        <span className="text-xs text-muted-foreground">
          {segmentLabel(v.segment)} · {v.city} · {v.phone}
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs font-semibold">
          <Star size={14} className="fill-amber-400 text-amber-400" />
          {rating
            ? `${Number(rating.rating_avg).toLocaleString("pt-BR", { minimumFractionDigits: 1 })} (${rating.rating_count})`
            : "sem avaliações"}
        </span>
        <span className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setDetail(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-bold hover:border-primary/40"
          >
            Detalhes e acesso
          </button>
          <a
            href={`/lojista?loja=${v.id}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground"
          >
            Abrir painel
          </a>
        </span>
      </header>
      {detail && (
        <AdminVendorDetail
          vendor={v}
          onClose={() => {
            setDetail(false);
            onSaved();
          }}
        />
      )}
      <p className="text-xs text-muted-foreground">
        Vendas confirmadas <strong className="text-foreground">{money(stats?.gross ?? 0)}</strong> ·{" "}
        {stats?.count ?? 0} pedidos · comissão gerada{" "}
        <strong className="text-foreground">{money(stats?.commission ?? 0)}</strong> · atual:{" "}
        {PLANS[v.plan].label}, {pct(v.commission_bps)} + {money(v.monthly_fee_cents)}/mês ·{" "}
        {v.offers_delivery ? "entrega" : ""}
        {v.offers_delivery && v.offers_pickup ? " e " : ""}
        {v.offers_pickup ? "retirada" : ""}
      </p>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <div className="text-[11px] font-semibold">
          Situação
          <NiceSelect
            className="mt-1"
            ariaLabel={`Situação de ${v.name}`}
            value={status}
            onChange={(x) => setStatus(x as VendorStatus)}
            options={[
              { value: "pendente", label: "Pendente" },
              { value: "ativo", label: "Ativa" },
              { value: "suspenso", label: "Suspensa" },
            ]}
          />
        </div>
        <div className="text-[11px] font-semibold">
          Plano
          <NiceSelect
            className="mt-1"
            ariaLabel={`Plano de ${v.name}`}
            value={plan}
            onChange={(x) => pickPlan(x as PlanKey)}
            options={(Object.keys(PLANS) as PlanKey[]).map((k) => ({
              value: k,
              label: PLANS[k].label,
              hint: `${money(PLANS[k].feeCents)}/mês + ${pct(PLANS[k].bps)}`,
            }))}
          />
        </div>
        <label className="text-[11px] font-semibold">
          Mensalidade (R$)
          <input
            className={inputCls}
            inputMode="decimal"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
        </label>
        <label className="text-[11px] font-semibold">
          Comissão (%)
          <input
            className={inputCls}
            inputMode="decimal"
            value={bps}
            onChange={(e) => setBps(e.target.value)}
          />
        </label>
        <label className="text-[11px] font-semibold">
          Destaque até
          <input
            type="date"
            className={inputCls}
            value={featured}
            onChange={(e) => setFeatured(e.target.value)}
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
            className="size-5 accent-emerald-600"
          />{" "}
          Selo de loja verificada
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white disabled:opacity-60"
        >
          <Save size={14} /> {busy ? "Salvando…" : "Salvar"}
        </button>
        {msg && (
          <span
            role={msg.ok ? "status" : "alert"}
            className={`text-xs font-semibold ${msg.ok ? "text-emerald-600" : "text-destructive"}`}
          >
            {msg.text}
          </span>
        )}
      </div>
    </article>
  );
}
