import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutDashboard, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/marketplace";

type Overview = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  logo_url: string | null;
  plan: string | null;
  is_open: boolean | null;
  verified: boolean | null;
  sales_30d_cents: number;
  orders_30d: number;
  open_orders: number;
  last_order_at: string | null;
};

type Dashboard = {
  vendor: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    status: string;
    plan: string | null;
    phone: string | null;
    logo_url: string | null;
  };
  owner_email: string | null;
  kpis: {
    sales_today_cents: number;
    sales_30d_cents: number;
    orders_30d: number;
    avg_ticket_30d_cents: number;
    delivered_30d: number;
    open_orders: number;
  };
  orders_by_status: Record<string, number>;
  recent_orders: {
    id: string;
    order_number: number | null;
    customer_name: string;
    total_cents: number;
    status: string;
    fulfillment: string | null;
    created_at: string;
  }[];
  low_stock: {
    id: string;
    name: string;
    code: string;
    stock: number;
    min_stock: number | null;
    unit: string | null;
  }[];
  products: { active: number; inactive: number; out_of_stock: number };
  staff: { name: string; email: string; role: string | null; active: boolean }[];
  cash_closings: {
    day: string;
    entradas_cents: number;
    saidas_cents: number;
    expected_cents: number;
    counted_cents: number;
    diff_cents: number;
  }[];
  open_disputes: number;
};

const STATUS_LABEL: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  separando: "Separando",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Rio_Branco",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const rpc = <T,>(name: string, args: Record<string, unknown>) =>
  (
    supabase as unknown as {
      rpc: (
        n: string,
        a: Record<string, unknown>,
      ) => Promise<{ data: T | null; error: { message: string } | null }>;
    }
  ).rpc(name, args);

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

/**
 * Painéis das lojas para o administrador: lista as lojas ativas e mostra o painel de cada uma
 * em modo somente leitura. A conta do administrador não altera nada por aqui.
 */
export function StoreBoards() {
  const [list, setList] = useState<Overview[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [board, setBoard] = useState<Dashboard | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const loadList = useCallback(async () => {
    const { data, error } = await rpc<Overview[]>("care_admin_store_overview", {});
    if (error) return setErr("Não foi possível carregar as lojas.");
    setErr("");
    setList(data ?? []);
    setSelected((cur) => cur ?? data?.[0]?.id ?? null);
  }, []);

  const loadBoard = useCallback(async (id: string) => {
    setLoading(true);
    const { data, error } = await rpc<Dashboard>("care_admin_store_dashboard", { p_vendor: id });
    setLoading(false);
    if (error) {
      setBoard(null);
      return setErr("Não foi possível abrir o painel desta loja.");
    }
    setErr("");
    setBoard(data);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selected) void loadBoard(selected);
  }, [selected, loadBoard]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return list.filter(
      (s) =>
        !term || s.name.toLowerCase().includes(term) || (s.city ?? "").toLowerCase().includes(term),
    );
  }, [list, q]);

  return (
    <section aria-label="Painéis das lojas" className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="grid content-start gap-2 rounded-2xl border border-border bg-card p-2">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar loja ou cidade"
              aria-label="Buscar loja"
              className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadList()}
            aria-label="Atualizar lista"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border hover:bg-muted"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <p className="px-1 text-[11px] text-muted-foreground">{list.length} lojas ativas</p>
        <ul className="grid max-h-[70vh] gap-1 overflow-y-auto pr-1">
          {shown.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelected(s.id)}
                aria-current={selected === s.id ? "true" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition ${selected === s.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {s.logo_url ? (
                  <img
                    src={s.logo_url}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-lg bg-white object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold">
                    {s.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold">{s.name}</span>
                  <span
                    className={`block truncate text-[11px] ${selected === s.id ? "opacity-80" : "text-muted-foreground"}`}
                  >
                    {s.city ?? "—"} · {money(s.sales_30d_cents)} em 30 dias
                  </span>
                </span>
                {s.open_orders > 0 && (
                  <span className="shrink-0 rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-slate-950">
                    {s.open_orders}
                  </span>
                )}
              </button>
            </li>
          ))}
          {!shown.length && (
            <li className="p-3 text-xs text-muted-foreground">Nenhuma loja encontrada.</li>
          )}
        </ul>
      </aside>

      <div className="grid content-start gap-4">
        {err && (
          <p
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300"
          >
            {err}
          </p>
        )}
        {!board && !err && (
          <p className="p-6 text-sm text-muted-foreground">
            {loading ? "Carregando painel…" : "Escolha uma loja para ver o painel."}
          </p>
        )}

        {board && (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex min-w-0 items-center gap-3">
                {board.vendor.logo_url ? (
                  <img
                    src={board.vendor.logo_url}
                    alt=""
                    className="h-12 w-12 rounded-xl bg-white object-cover"
                  />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-muted">
                    <LayoutDashboard size={18} />
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold">{board.vendor.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {board.vendor.city ?? "—"} · plano {board.vendor.plan ?? "—"} · dono{" "}
                    {board.owner_email ?? "—"}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold">
                <ShieldCheck size={13} aria-hidden="true" /> Somente leitura
              </span>
            </header>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <Kpi label="Vendas hoje" value={money(board.kpis.sales_today_cents)} />
              <Kpi label="Vendas em 30 dias" value={money(board.kpis.sales_30d_cents)} />
              <Kpi label="Pedidos em 30 dias" value={String(board.kpis.orders_30d)} />
              <Kpi label="Ticket médio" value={money(board.kpis.avg_ticket_30d_cents)} />
              <Kpi label="Pedidos em aberto" value={String(board.kpis.open_orders)} />
              <Kpi label="Disputas abertas" value={String(board.open_disputes)} />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-2xl border border-border bg-card p-4">
                <h4 className="mb-3 text-sm font-bold">Pedidos por situação (30 dias)</h4>
                <ul className="grid gap-2">
                  {Object.keys(STATUS_LABEL).map((k) => (
                    <li key={k} className="flex items-center justify-between text-[13px]">
                      <span>{STATUS_LABEL[k]}</span>
                      <strong className="tabular-nums">{board.orders_by_status[k] ?? 0}</strong>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-border bg-card p-4">
                <h4 className="mb-3 text-sm font-bold">Produtos</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Ativos</p>
                    <strong className="tabular-nums">{board.products.active}</strong>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Inativos</p>
                    <strong className="tabular-nums">{board.products.inactive}</strong>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Sem estoque</p>
                    <strong className="tabular-nums text-rose-600">
                      {board.products.out_of_stock}
                    </strong>
                  </div>
                </div>
                <h5 className="mb-2 mt-4 text-xs font-bold">Estoque baixo</h5>
                {board.low_stock.length ? (
                  <ul className="grid max-h-56 gap-1 overflow-y-auto text-[13px]">
                    {board.low_stock.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate">
                          {p.name} <span className="text-muted-foreground">{p.code}</span>
                        </span>
                        <strong className="shrink-0 tabular-nums">
                          {p.stock} {p.unit ?? "un"}
                        </strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum produto com estoque baixo.</p>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-card p-4 xl:col-span-2">
                <h4 className="mb-3 text-sm font-bold">Pedidos recentes</h4>
                {board.recent_orders.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead className="text-[11px] text-muted-foreground">
                        <tr>
                          <th className="py-1">Nº</th>
                          <th>Cliente</th>
                          <th>Entrega</th>
                          <th>Total</th>
                          <th>Situação</th>
                          <th>Quando</th>
                        </tr>
                      </thead>
                      <tbody>
                        {board.recent_orders.map((o) => (
                          <tr key={o.id} className="border-t border-border">
                            <td className="py-1.5 tabular-nums">{o.order_number ?? "—"}</td>
                            <td>{o.customer_name}</td>
                            <td>{o.fulfillment ?? "—"}</td>
                            <td className="tabular-nums">{money(o.total_cents)}</td>
                            <td>{STATUS_LABEL[o.status] ?? o.status}</td>
                            <td className="tabular-nums">{dateTime(o.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum pedido ainda.</p>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-card p-4">
                <h4 className="mb-3 text-sm font-bold">Equipe</h4>
                {board.staff.length ? (
                  <ul className="grid gap-2 text-[13px]">
                    {board.staff.map((s) => (
                      <li key={s.email} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate">
                          {s.name} <span className="text-muted-foreground">{s.email}</span>
                        </span>
                        <span
                          className={`shrink-0 rounded px-1.5 text-[11px] ${s.active ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}
                        >
                          {s.active ? (s.role ?? "ativo") : "inativo"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum funcionário cadastrado.</p>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-card p-4">
                <h4 className="mb-3 text-sm font-bold">Fechamentos de caixa (últimos 7)</h4>
                {board.cash_closings.length ? (
                  <ul className="grid gap-2 text-[13px]">
                    {board.cash_closings.map((c) => (
                      <li key={c.day} className="flex items-center justify-between gap-2">
                        <span>{new Date(`${c.day}T12:00:00`).toLocaleDateString("pt-BR")}</span>
                        <span className="tabular-nums">contado {money(c.counted_cents)}</span>
                        <strong className={`tabular-nums ${c.diff_cents ? "text-rose-600" : ""}`}>
                          dif. {money(c.diff_cents)}
                        </strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum fechamento registrado.</p>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
