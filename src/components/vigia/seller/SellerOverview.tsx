import { useMemo } from "react";
import { AlertTriangle, ArrowRight, CircleDollarSign, Clock3, MessageCircle, Package, Receipt, ShoppingBag, TrendingUp } from "lucide-react";
import { COUNTED, money, type Vendor } from "@/lib/marketplace";
import { DeadlineChip, Panel, StatusBadge, useNow } from "./shared";
import type { SellerData } from "./useSellerData";
import type { SellerTab } from "./SellerDashboard";

const dayKey = (d: Date | string) => new Date(d).toLocaleDateString("sv-SE", { timeZone: "America/Rio_Branco" });

export function SellerOverview({ vendor, data, go }: { vendor: Vendor; data: SellerData; go: (t: SellerTab) => void }) {
  const now = useNow();
  const s = useMemo(() => {
    const today = dayKey(new Date());
    const month = today.slice(0, 7);
    const counted = data.orders.filter((o) => COUNTED.includes(o.status));
    const todayOrders = counted.filter((o) => dayKey(o.paid_at ?? o.created_at) === today);
    const monthOrders = counted.filter((o) => dayKey(o.paid_at ?? o.created_at).startsWith(month));
    const gross = monthOrders.reduce((a, o) => a + o.total_cents, 0);
    const commission = monthOrders.reduce((a, o) => a + o.commission_cents, 0);
    const open = data.orders.filter((o) => ["aguardando_pagamento", "pago", "separando", "pronto", "enviado"].includes(o.status));
    const late = open.filter((o) => o.promised_at && new Date(o.promised_at).getTime() < now && o.status !== "aguardando_pagamento");
    const low = data.products.filter((p) => p.active && p.stock <= (p.min_stock ?? 3));
    const threads = new Map<string, { name: string; unread: number; last: string }>();
    data.messages.forEach((m) => {
      const t = threads.get(m.customer_id) ?? { name: m.customer_name ?? "Cliente", unread: 0, last: "" };
      if (!m.from_vendor && !m.read_at) t.unread += 1;
      if (!m.from_vendor && m.customer_name) t.name = m.customer_name;
      t.last = m.body;
      threads.set(m.customer_id, t);
    });
    const unread = [...threads.values()].filter((t) => t.unread > 0);
    const days = Array.from({ length: 14 }, (_, k) => dayKey(new Date(Date.now() - (13 - k) * 86_400_000)));
    const series = days.map((d) => ({ d, v: counted.filter((o) => dayKey(o.paid_at ?? o.created_at) === d).reduce((a, o) => a + o.total_cents, 0) }));
    return {
      todayValue: todayOrders.reduce((a, o) => a + o.total_cents, 0), todayCount: todayOrders.length, gross, commission, net: gross - commission,
      avg: monthOrders.length ? Math.round(gross / monthOrders.length) : 0, open, late, low, unread, series,
    };
  }, [data, now]);
  const max = Math.max(1, ...s.series.map((x) => x.v));

  const kpis = [
    { icon: CircleDollarSign, label: "Vendido hoje", value: money(s.todayValue), hint: `${s.todayCount} ${s.todayCount === 1 ? "pedido" : "pedidos"}` },
    { icon: TrendingUp, label: "Líquido no mês", value: money(s.net), hint: `bruto ${money(s.gross)}` },
    { icon: ShoppingBag, label: "Pedidos em aberto", value: String(s.open.length), hint: s.late.length ? `${s.late.length} atrasado(s)` : "todos no prazo", warn: s.late.length > 0 },
    { icon: Receipt, label: "Ticket médio", value: money(s.avg), hint: `contribuição NextVita ${money(s.commission)}` },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="grid size-7 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, var(--accent-store) 14%, transparent)`, color: "var(--accent-store)" }}><k.icon size={15} /></span>{k.label}</p>
            <p className="mt-2 font-display text-xl font-extrabold tabular-nums sm:text-2xl">{k.value}</p>
            <p className={`mt-0.5 text-[11.5px] ${k.warn ? "font-semibold text-rose-600 dark:text-rose-300" : "text-muted-foreground"}`}>{k.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Vendas dos últimos 14 dias" action={<span className="text-xs text-muted-foreground">pedidos pagos</span>}>
          <div className="flex h-44 items-end gap-1.5 px-4 pb-3 pt-5" role="img" aria-label="Gráfico de vendas por dia">
            {s.series.map((x, i) => (
              <div key={x.d} className="group relative flex h-full flex-1 flex-col justify-end">
                <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background opacity-0 transition group-hover:opacity-100">{money(x.v)}</span>
                <span className="nv-bar block w-full rounded-t-[4px] transition-[filter] group-hover:brightness-110" style={{ height: `${Math.max(2, (x.v / max) * 100)}%`, background: x.v ? "var(--accent-store)" : "color-mix(in srgb, currentColor 10%, transparent)", animationDelay: `${i * 30}ms` }} />
                <span className="mt-1 text-center text-[9.5px] tabular-nums text-muted-foreground">{x.d.slice(8)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Precisa de você" action={<button type="button" onClick={() => go("pedidos")} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Pedidos <ArrowRight size={13} /></button>}>
          <ul className="divide-y divide-border">
            {s.open.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-12 shrink-0 font-mono text-xs font-bold text-muted-foreground">#{o.order_number}</span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-[13px]">{o.customer_name}</strong><span className="flex flex-wrap items-center gap-1.5"><StatusBadge status={o.status} /><DeadlineChip order={o} now={now} /></span></span>
                <span className="text-[13px] font-bold tabular-nums">{money(o.total_cents)}</span>
              </li>
            ))}
            {!s.open.length && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum pedido em aberto agora.</li>}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={<span className="flex items-center gap-2"><AlertTriangle size={15} className="text-amber-500" /> Estoque baixo</span>} action={<button type="button" onClick={() => go("produtos")} className="text-xs font-semibold text-primary hover:underline">Repor</button>}>
          <ul className="divide-y divide-border">
            {s.low.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2">
                {p.image_url ? <img src={p.image_url} alt="" className="size-9 rounded-lg bg-muted object-cover" /> : <span className="grid size-9 place-items-center rounded-lg bg-muted"><Package size={15} /></span>}
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{p.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${p.stock === 0 ? "bg-rose-500/15 text-rose-600 dark:text-rose-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>{p.stock === 0 ? "esgotado" : `${p.stock} ${p.unit ?? "un"}`}</span>
              </li>
            ))}
            {!s.low.length && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Estoque em dia.</li>}
          </ul>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><MessageCircle size={15} className="text-sky-500" /> Mensagens de clientes</span>} action={<button type="button" onClick={() => go("mensagens")} className="text-xs font-semibold text-primary hover:underline">Abrir chat</button>}>
          <ul className="divide-y divide-border">
            {s.unread.slice(0, 5).map((t) => (
              <li key={t.name + t.last} className="flex items-center gap-3 px-4 py-2.5">
                <span className="grid size-8 place-items-center rounded-full bg-sky-500/15 text-xs font-bold text-sky-700 dark:text-sky-300">{t.name.slice(0, 1)}</span>
                <span className="min-w-0 flex-1"><strong className="block text-[13px]">{t.name}</strong><span className="block truncate text-xs text-muted-foreground">{t.last}</span></span>
                <span className="grid min-w-5 place-items-center rounded-full bg-sky-500 px-1.5 text-[11px] font-bold text-white">{t.unread}</span>
              </li>
            ))}
            {!s.unread.length && <li className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground"><Clock3 size={14} /> Nenhuma mensagem esperando resposta.</li>}
          </ul>
        </Panel>
      </div>
      {vendor.status !== "ativo" && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{vendor.status === "pendente" ? "Sua loja está em análise. Cadastre produtos; a vitrine aparece ao público quando a equipe aprovar." : "Sua loja está suspensa e não aparece ao público. Fale com a equipe NextVita."}</p>}
    </div>
  );
}
