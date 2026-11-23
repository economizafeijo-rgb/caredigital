import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  CircleDollarSign,
  Clock3,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Store,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money, paymentMethods } from "@/lib/store";

type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: string | null;
  items: { id: string; name: string; qty: number; price_cents: number }[];
  total_cents: number;
  payment_method: string;
  status: string;
  created_at: string;
};
const STATUS: Record<string, { label: string; tone: string }> = {
  aguardando_pagamento: {
    label: "Aguardando pagamento",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  pago: { label: "Pago", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  enviado: { label: "Enviado", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  entregue: { label: "Entregue", tone: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
  cancelado: { label: "Cancelado", tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
};
const PAID = new Set(["pago", "enviado", "entregue"]);
const dayKey = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { timeZone: "America/Rio_Branco" });

/** Painel da loja virtual para o administrador: vendas, pedidos, status e produtos mais pedidos. */
export function StoreAdminDashboard() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setError("");
    const { data, error: err } = await (supabase as any)
      .from("care_store_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (err) {
      setError(
        "Não foi possível carregar os pedidos. Aplique a migração da loja (care_store_orders) no Supabase e confira o acesso do administrador.",
      );
      setOrders([]);
      return;
    }
    setOrders((data ?? []) as Order[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    setBusyId(id);
    const { error: err } = await (supabase as any)
      .from("care_store_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!err) setOrders((list) => (list ?? []).map((o) => (o.id === id ? { ...o, status } : o)));
    else setError("Não foi possível atualizar o status do pedido.");
    setBusyId("");
  }

  const stats = useMemo(() => {
    const list = orders ?? [];
    const revenue = list.filter((o) => PAID.has(o.status)).reduce((s, o) => s + o.total_cents, 0);
    const waiting = list.filter((o) => o.status === "aguardando_pagamento");
    const paid = list.filter((o) => PAID.has(o.status));
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 86_400_000);
      return dayKey(d.toISOString());
    });
    const chart = days.map((day) => ({
      day: day.slice(5).split("-").reverse().join("/"),
      vendas:
        list
          .filter((o) => dayKey(o.created_at) === day && PAID.has(o.status))
          .reduce((s, o) => s + o.total_cents, 0) / 100,
      pedidos: list.filter((o) => dayKey(o.created_at) === day).length,
    }));
    const byProduct = new Map<string, { name: string; qty: number }>();
    list
      .filter((o) => o.status !== "cancelado")
      .forEach((o) =>
        o.items.forEach((i) =>
          byProduct.set(i.id, { name: i.name, qty: (byProduct.get(i.id)?.qty ?? 0) + i.qty }),
        ),
      );
    const top = [...byProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
    return {
      revenue,
      waiting: waiting.length,
      waitingValue: waiting.reduce((s, o) => s + o.total_cents, 0),
      ticket: paid.length ? Math.round(revenue / paid.length) : 0,
      count: list.length,
      chart,
      top,
    };
  }, [orders]);

  const kpi = (Icon: typeof Store, label: string, value: string, tone: string) => (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-card">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-white ${tone}`}>
        <Icon size={22} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <strong className="block truncate text-xl font-extrabold">{value}</strong>
      </div>
    </div>
  );

  return (
    <section
      aria-label="Loja virtual"
      className="grid gap-3 rounded-3xl border border-border bg-card/60 p-3 shadow-card sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-700 to-teal-700 text-white">
            <Store size={20} />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Loja virtual
            </p>
            <h2 className="text-lg font-extrabold leading-tight">Painel de vendas</h2>
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
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs"
        >
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {kpi(
          CircleDollarSign,
          "Receita confirmada",
          money(stats.revenue),
          "bg-gradient-to-br from-emerald-600 to-teal-500",
        )}
        {kpi(
          ShoppingBag,
          "Pedidos",
          String(stats.count),
          "bg-gradient-to-br from-indigo-600 to-violet-500",
        )}
        {kpi(
          Clock3,
          "Aguardando pagamento",
          `${stats.waiting} · ${money(stats.waitingValue)}`,
          "bg-gradient-to-br from-amber-500 to-orange-500",
        )}
        {kpi(
          TrendingUp,
          "Ticket médio",
          money(stats.ticket),
          "bg-gradient-to-br from-sky-600 to-cyan-500",
        )}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-3">
          <h3 className="text-sm font-bold">Vendas confirmadas · 14 dias (R$)</h3>
          <div className="mt-2 h-52">
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
        <div className="rounded-2xl border border-border bg-card p-3">
          <h3 className="flex items-center gap-1.5 text-sm font-bold">
            <PackageCheck size={16} className="text-primary" /> Produtos mais pedidos
          </h3>
          {stats.top.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">Ainda não há pedidos.</p>
          ) : (
            <ol className="mt-2 grid gap-2">
              {stats.top.map((t, i) => (
                <li key={t.name} className="flex items-center gap-2 text-sm">
                  <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  <strong>{t.qty}</strong>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-3">
        <h3 className="text-sm font-bold">Pedidos recentes</h3>
        {orders === null ? (
          <p className="mt-3 text-xs text-muted-foreground">Carregando pedidos…</p>
        ) : orders.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Nenhum pedido ainda. Eles aparecem aqui quando um cliente finalizar a compra na loja.
          </p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {orders.slice(0, 40).map((o) => (
              <li
                key={o.id}
                className="grid gap-2 rounded-xl border border-border bg-surface p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <strong>#{o.id.slice(0, 8)}</strong>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS[o.status]?.tone ?? ""}`}
                    >
                      {STATUS[o.status]?.label ?? o.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("pt-BR", {
                        timeZone: "America/Rio_Branco",
                      })}
                    </span>
                  </p>
                  <p className="truncate text-xs">
                    {o.customer_name} · {o.customer_phone} ·{" "}
                    {paymentMethods.find((m) => m.key === o.payment_method)?.label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <strong className="text-base">{money(o.total_cents)}</strong>
                  <select
                    aria-label={`Status do pedido ${o.id.slice(0, 8)}`}
                    value={o.status}
                    disabled={busyId === o.id}
                    onChange={(e) => void setStatus(o.id, e.target.value)}
                    className="h-9 rounded-lg border border-border bg-card px-2 text-xs font-semibold"
                  >
                    {Object.entries(STATUS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
