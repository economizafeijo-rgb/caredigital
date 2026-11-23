import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  Inbox,
  Percent,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings2,
  Star,
  Store,
  TrendingUp,
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
import { AdminTestStores } from "./AdminTestStores";
import { NewStoreModal } from "./admin/NewStoreModal";
import { SellerRequestsPanel } from "./admin/SellerRequestsPanel";
import { STATUS_LABEL } from "@/lib/admin-stores";

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

  const [section, setSection] = useState<"lojas" | "solicitacoes" | "cobrancas" | "config">(
    "lojas",
  );
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todas" | VendorStatus>("todas");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const onRequestCount = useCallback((n: number) => setRequestCount(n), []);
  const openVendor = vendors?.find((v) => v.id === openId) ?? null;
  const counts = useMemo(() => {
    const list = vendors ?? [];
    return {
      todas: list.length,
      ativo: list.filter((v) => v.status === "ativo").length,
      pendente: list.filter((v) => v.status === "pendente").length,
      suspenso: list.filter((v) => v.status === "suspenso").length,
    };
  }, [vendors]);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (vendors ?? []).filter(
      (v) =>
        (statusFilter === "todas" || v.status === statusFilter) &&
        (!term ||
          v.name.toLowerCase().includes(term) ||
          v.slug.includes(term) ||
          (v.city ?? "").toLowerCase().includes(term) ||
          (v.phone ?? "").includes(term)),
    );
  }, [vendors, q, statusFilter]);

  async function openAfterCreate(id: string) {
    setCreating(false);
    await load();
    setOpenId(id);
  }

  const SECTIONS = [
    ["lojas", "Lojas", Store, counts.todas],
    ["solicitacoes", "Solicitações", Inbox, requestCount],
    ["cobrancas", "Cobranças", ReceiptText, null],
    ["config", "Configurações", Settings2, null],
  ] as const;

  return (
    <section aria-label="Lojas" className="grid gap-4">
      {creating && (
        <NewStoreModal
          onClose={() => setCreating(false)}
          onCreated={(id) => void openAfterCreate(id)}
        />
      )}
      {openVendor && (
        <AdminVendorDetail
          vendor={openVendor}
          onClose={() => {
            setOpenId(null);
            void load();
          }}
          onDeleted={() => {
            setOpenId(null);
            void load();
          }}
          onChanged={() => void load()}
        />
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

      <div className="rounded-3xl border border-border bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-2 sm:p-3">
          <nav
            aria-label="Seções de lojas"
            className="flex gap-1 overflow-x-auto [scrollbar-width:none]"
          >
            {SECTIONS.map(([k, label, Icon, n]) => (
              <button
                key={k}
                type="button"
                aria-current={section === k ? "page" : undefined}
                onClick={() => setSection(k)}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[13px] font-bold transition ${section === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Icon size={15} /> {label}
                {n ? (
                  <span
                    className={`grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] ${section === k ? "bg-black/15" : k === "solicitacoes" ? "bg-amber-500 text-slate-950" : "bg-muted"}`}
                  >
                    {n}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              aria-label="Atualizar"
              title="Atualizar"
              className="grid size-9 place-items-center rounded-xl border border-border hover:bg-muted"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-[13px] font-bold text-primary-foreground hover:brightness-110"
            >
              <Plus size={16} /> Nova loja
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs"
            >
              {error}
            </p>
          )}

          {section === "lojas" && (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-[14rem] flex-1">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por nome, endereço, cidade ou telefone"
                    aria-label="Buscar lojas"
                    className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm"
                  />
                </label>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ["todas", "Todas"],
                      ["ativo", "Ativas"],
                      ["pendente", "Pendentes"],
                      ["suspenso", "Suspensas"],
                    ] as const
                  ).map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={statusFilter === k}
                      onClick={() => setStatusFilter(k)}
                      className={`h-9 rounded-xl border px-3 text-xs font-semibold transition ${statusFilter === k ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      {l} <span className="tabular-nums opacity-70">{counts[k]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {vendors === null ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Carregando…</p>
              ) : !shown.length ? (
                <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
                  <Store size={24} />
                  {vendors.length
                    ? "Nenhuma loja com esse filtro."
                    : "Nenhuma loja cadastrada ainda."}
                </div>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                  {shown.map((v) => {
                    const st = bySales.get(v.id);
                    const r = ratings[v.id];
                    const accent = v.accent_hex ?? "#0e7a5f";
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => setOpenId(v.id)}
                          className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 bg-card px-3 py-3 text-left transition hover:bg-muted/50 sm:px-4 md:grid-cols-[auto_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                        >
                          <span
                            className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-sm font-black shadow-sm ring-1 ring-border"
                            style={{ color: accent }}
                          >
                            {v.logo_url ? (
                              <img src={v.logo_url} alt="" className="size-full object-cover" />
                            ) : (
                              v.name
                                .split(/\s+/)
                                .map((w) => w[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <strong className="truncate text-[14px]">{v.name}</strong>
                              {v.verified && (
                                <BadgeCheck
                                  size={15}
                                  className="shrink-0 text-emerald-500"
                                  aria-label="Verificada"
                                />
                              )}
                              {v.is_demo && (
                                <span className="rounded bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                                  teste
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {segmentLabel(v.segment)} · {v.city} · /{v.slug}
                            </span>
                          </span>
                          <span className="hidden min-w-0 md:block">
                            <span className="block text-[11px] text-muted-foreground">
                              Vendas confirmadas
                            </span>
                            <strong className="text-[13px] tabular-nums">
                              {money(st?.gross ?? 0)}
                            </strong>
                            <span className="text-[11px] text-muted-foreground">
                              {" "}
                              · {st?.count ?? 0} ped.
                            </span>
                          </span>
                          <span className="hidden min-w-0 md:block">
                            <span className="block text-[11px] text-muted-foreground">
                              {PLANS[v.plan].label} · {pct(v.commission_bps)}
                            </span>
                            <span className="flex items-center gap-1 text-[12px]">
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                              {r
                                ? `${Number(r.rating_avg).toLocaleString("pt-BR", { minimumFractionDigits: 1 })} (${r.rating_count})`
                                : "sem avaliações"}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_TONE[v.status]}`}
                            >
                              {STATUS_LABEL[v.status]}
                            </span>
                            <ChevronRight size={16} className="text-muted-foreground" />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {section === "solicitacoes" && (
            <SellerRequestsPanel
              onCount={onRequestCount}
              onOpenVendor={(id) => {
                void load().then(() => setOpenId(id));
              }}
            />
          )}

          {section === "cobrancas" && (
            <div>
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
                      className="mt-0.5 block h-10 rounded-xl border border-border bg-surface px-2 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy === "gen" || !period}
                    onClick={() => void generate()}
                    className="h-10 rounded-xl bg-primary px-4 text-xs font-extrabold text-primary-foreground disabled:opacity-50"
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
                        <button
                          type="button"
                          onClick={() => setOpenId(i.vendor_id)}
                          className="font-bold hover:underline"
                        >
                          {vendorName(i.vendor_id)}
                        </button>{" "}
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
          )}

          {section === "config" && (
            <div className="grid gap-4">
              <AdminModerationSettings />
              <AdminTestStores />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
