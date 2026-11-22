import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Boxes,
  CircleDollarSign,
  BarChart3,
  BookUser,
  Clock3,
  Crown,
  MessageCircle,
  Pencil,
  Store as StoreIcon,
  Tag,
  UserRound,
  Wallet,
  Package,
  Plus,
  Receipt,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { COUNTED, PLANS, money, type Vendor } from "@/lib/marketplace";
import { DeadlineChip, Panel, StatusBadge, useNow } from "./shared";
import { SellerOpenToggle } from "./SellerOpenToggle";
import type { SellerData } from "./useSellerData";
import type { SellerTab } from "./SellerDashboard";

const TZ = "America/Rio_Branco";
const dayKey = (d: Date | string) => new Date(d).toLocaleDateString("sv-SE", { timeZone: TZ });

const last14Of = (series: { v: number }[]) => series.reduce((a, x) => a + x.v, 0);

const greetingFor = (date: Date) => {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "numeric", hour12: false }).format(date),
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

export function SellerOverview({
  vendor,
  data,
  go,
  onChanged,
}: {
  vendor: Vendor;
  data: SellerData;
  go: (t: SellerTab) => void;
  onChanged: () => void;
}) {
  const now = useNow();
  const s = useMemo(() => {
    const today = dayKey(new Date());
    const month = today.slice(0, 7);
    const counted = data.orders.filter((o) => COUNTED.includes(o.status));
    const todayOrders = counted.filter((o) => dayKey(o.paid_at ?? o.created_at) === today);
    const monthOrders = counted.filter((o) => dayKey(o.paid_at ?? o.created_at).startsWith(month));
    const gross = monthOrders.reduce((a, o) => a + o.total_cents, 0);
    const commission = monthOrders.reduce((a, o) => a + o.commission_cents, 0);
    const open = data.orders.filter((o) =>
      ["aguardando_pagamento", "pago", "separando", "pronto", "enviado"].includes(o.status),
    );
    const late = open.filter(
      (o) =>
        o.promised_at &&
        new Date(o.promised_at).getTime() < now &&
        o.status !== "aguardando_pagamento",
    );
    const low = data.products.filter((p) => p.active && p.stock <= (p.min_stock ?? 3));
    const threads = new Map<string, { name: string; unread: number; last: string }>();
    data.messages.forEach((m) => {
      const t = threads.get(m.customer_id) ?? {
        name: m.customer_name ?? "Cliente",
        unread: 0,
        last: "",
      };
      if (!m.from_vendor && !m.read_at) t.unread += 1;
      if (!m.from_vendor && m.customer_name) t.name = m.customer_name;
      t.last = m.body;
      threads.set(m.customer_id, t);
    });
    const unread = [...threads.values()].filter((t) => t.unread > 0);
    const days = Array.from({ length: 14 }, (_, k) =>
      dayKey(new Date(Date.now() - (13 - k) * 86_400_000)),
    );
    const series = days.map((d) => ({
      d,
      v: counted
        .filter((o) => dayKey(o.paid_at ?? o.created_at) === d)
        .reduce((a, o) => a + o.total_cents, 0),
    }));
    const tops = new Map<string, { name: string; qty: number; value: number }>();
    monthOrders.forEach((o) =>
      (o.items ?? []).forEach((it) => {
        const t = tops.get(it.id) ?? { name: it.name, qty: 0, value: 0 };
        t.qty += it.qty;
        t.value += it.qty * it.price_cents;
        tops.set(it.id, t);
      }),
    );
    const prev14 = Array.from({ length: 14 }, (_, k) =>
      dayKey(new Date(Date.now() - (27 - k) * 86_400_000)),
    );
    const prevTotal = counted
      .filter((o) => prev14.includes(dayKey(o.paid_at ?? o.created_at)))
      .reduce((a, o) => a + o.total_cents, 0);
    return {
      top: [...tops.values()].sort((a, b) => b.value - a.value).slice(0, 5),
      prevTotal,
      todayValue: todayOrders.reduce((a, o) => a + o.total_cents, 0),
      todayCount: todayOrders.length,
      gross,
      commission,
      net: gross - commission,
      avg: monthOrders.length ? Math.round(gross / monthOrders.length) : 0,
      open,
      late,
      low,
      unread,
      series,
    };
  }, [data, now]);
  const goalKey = `nv-seller-goal-${vendor.id}`;
  const [goal, setGoal] = useState(0);
  useEffect(() => {
    try {
      setGoal(Number(localStorage.getItem(goalKey)) || 0);
    } catch {
      /* sem armazenamento */
    }
  }, [goalKey]);
  const editGoal = () => {
    const v = window.prompt(
      "Meta de vendas do mês, em reais (ex.: 5000)",
      goal ? String(goal / 100) : "",
    );
    if (v === null) return;
    const cents = Math.round(Number(v.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents < 0) return;
    setGoal(cents);
    try {
      localStorage.setItem(goalKey, String(cents));
    } catch {
      /* sem armazenamento */
    }
  };
  const goalPct = goal ? Math.min(100, Math.round((s.gross / goal) * 100)) : 0;
  const delta = s.prevTotal
    ? Math.round(((last14Of(s.series) - s.prevTotal) / s.prevTotal) * 100)
    : null;
  const max = Math.max(1, ...s.series.map((x) => x.v));
  const last14 = s.series.reduce((a, x) => a + x.v, 0);
  const current = new Date(now);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(current);

  const kpis = [
    {
      icon: CircleDollarSign,
      label: "Vendido hoje",
      value: money(s.todayValue),
      hint: `${s.todayCount} ${s.todayCount === 1 ? "pedido" : "pedidos"} hoje`,
    },
    {
      icon: TrendingUp,
      label: "Líquido no mês",
      value: money(s.net),
      hint: `bruto ${money(s.gross)}`,
    },
    {
      icon: ShoppingBag,
      label: "Pedidos em aberto",
      value: String(s.open.length),
      hint: s.late.length ? `${s.late.length} atrasado(s)` : "todos no prazo",
      warn: s.late.length > 0,
    },
    {
      icon: Receipt,
      label: "Ticket médio",
      value: money(s.avg),
      hint: `comissão NextVita ${money(s.commission)}`,
    },
  ];

  return (
    <div className="mx-auto grid w-full max-w-[88rem] gap-6">
      <SellerOpenToggle vendor={vendor} onChanged={onChanged} />

      {/* Cabeçalho da visão geral */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold capitalize text-muted-foreground">{dateLabel}</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {greetingFor(current)}, {vendor.name.split(/\s+/)[0]}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => go("produtos")}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold transition hover:bg-muted"
          >
            <Plus size={15} /> Produto
          </button>
          <button
            type="button"
            onClick={() => go("pedidos")}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            style={{ background: "var(--accent-store)" }}
          >
            <ShoppingBag size={15} /> Ver pedidos
          </button>
        </div>
      </div>

      {/* Indicadores principais */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: "var(--accent-store)" }}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted-foreground">{k.label}</p>
              <span
                className="grid size-8 place-items-center rounded-lg"
                style={{
                  background: "color-mix(in srgb, var(--accent-store) 24%, transparent)",
                  color: "var(--accent-ink, var(--accent-store))",
                }}
              >
                <k.icon size={16} />
              </span>
            </div>
            <p className="mt-3 font-display text-2xl font-extrabold tabular-nums sm:text-3xl">
              {k.value}
            </p>
            <p
              className={`mt-1 text-xs ${k.warn ? "font-semibold text-rose-600 dark:text-rose-300" : "text-muted-foreground"}`}
            >
              {k.hint}
            </p>
          </div>
        ))}
      </div>

      {/* Central de ferramentas */}
      <nav
        aria-label="Ferramentas da loja"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8"
      >
        {(
          [
            ["produtos", Package, "Estoque"],
            ["pedidos", ShoppingBag, "Pedidos"],
            ["caixa", Wallet, "Caixa"],
            ["relatorios", BarChart3, "Relatórios"],
            ["promocoes", Tag, "Promoções"],
            ["clientes", UserRound, "Clientes"],
            ["cadastros", BookUser, "Cadastros"],
            ["loja", StoreIcon, "Minha loja"],
          ] as const
        ).map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => go(key)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-[12.5px] font-semibold transition hover:border-[var(--accent-store)]"
          >
            <Icon
              size={18}
              style={{ color: "var(--accent-ink, var(--accent-store))" }}
              aria-hidden
            />
            {label}
          </button>
        ))}
      </nav>

      {/* Meta do mês e mais vendidos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Meta do mês"
          action={
            <button
              type="button"
              onClick={editGoal}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Pencil size={12} /> {goal ? "Alterar" : "Definir"}
            </button>
          }
        >
          <div className="p-4">
            {goal ? (
              <>
                <p className="flex items-baseline justify-between gap-2">
                  <strong className="font-display text-2xl font-extrabold tabular-nums">
                    {money(s.gross)}
                  </strong>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    de {money(goal)}
                  </span>
                </p>
                <div
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={goalPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progresso da meta do mês"
                >
                  <span
                    className="block h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${goalPct}%`, background: "var(--accent-store)" }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {goalPct >= 100
                    ? "Meta batida. Parabéns!"
                    : `${goalPct}% da meta. Faltam ${money(Math.max(0, goal - s.gross))}.`}
                  {delta !== null &&
                    ` Últimos 14 dias ${delta >= 0 ? "+" : ""}${delta}% sobre os 14 anteriores.`}
                </p>
              </>
            ) : (
              <p className="py-3 text-sm text-muted-foreground">
                Defina uma meta de vendas para acompanhar o progresso do mês aqui.
              </p>
            )}
          </div>
        </Panel>
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Crown size={15} className="text-amber-500" /> Mais vendidos do mês
            </span>
          }
        >
          <ol className="divide-y divide-border">
            {s.top.map((t, i) => (
              <li key={t.name} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-5 text-center text-xs font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{t.qty} un</span>
                <span className="w-24 text-right text-[13px] font-bold tabular-nums">
                  {money(t.value)}
                </span>
              </li>
            ))}
            {!s.top.length && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                As vendas confirmadas do mês aparecem aqui.
              </li>
            )}
          </ol>
        </Panel>
      </div>

      {/* Vendas e pendências */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Vendas dos últimos 14 dias"
          action={
            <span className="text-xs tabular-nums text-muted-foreground">
              total {money(last14)}
            </span>
          }
        >
          <div
            className="flex h-72 items-end gap-2 px-5 pb-4 pt-8 sm:h-80"
            role="img"
            aria-label="Gráfico de vendas por dia"
          >
            {s.series.map((x, i) => (
              <div key={x.d} className="group relative flex h-full flex-1 flex-col justify-end">
                <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-semibold text-background opacity-0 transition group-hover:opacity-100">
                  {money(x.v)}
                </span>
                <span
                  className="nv-bar block w-full rounded-t-md transition-[filter] group-hover:brightness-110"
                  style={{
                    height: `${Math.max(2, (x.v / max) * 100)}%`,
                    background: x.v
                      ? "var(--accent-store)"
                      : "color-mix(in srgb, currentColor 10%, transparent)",
                    animationDelay: `${i * 30}ms`,
                  }}
                />
                <span className="mt-2 text-center text-[11px] tabular-nums text-muted-foreground">
                  {x.d.slice(8)}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Precisa de você"
          action={
            <button
              type="button"
              onClick={() => go("pedidos")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Pedidos <ArrowRight size={13} />
            </button>
          }
        >
          <ul className="divide-y divide-border">
            {s.open.slice(0, 6).map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-12 shrink-0 font-mono text-xs font-bold text-muted-foreground">
                  #{o.order_number}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[13px]">{o.customer_name}</strong>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={o.status} />
                    <DeadlineChip order={o} now={now} />
                  </span>
                </span>
                <span className="text-[13px] font-bold tabular-nums">{money(o.total_cents)}</span>
              </li>
            ))}
            {!s.open.length && (
              <li className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
                <BadgeCheck size={22} className="text-emerald-500" />
                Nenhum pedido em aberto agora.
              </li>
            )}
          </ul>
        </Panel>
      </div>

      {/* Estoque, mensagens e situação da loja */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" /> Estoque baixo
            </span>
          }
          action={
            <button
              type="button"
              onClick={() => go("produtos")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Repor
            </button>
          }
        >
          <ul className="divide-y divide-border">
            {s.low.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt=""
                    className="size-9 rounded-lg bg-muted object-cover"
                  />
                ) : (
                  <span className="grid size-9 place-items-center rounded-lg bg-muted">
                    <Package size={15} />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{p.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${p.stock === 0 ? "bg-rose-500/15 text-rose-600 dark:text-rose-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}
                >
                  {p.stock === 0 ? "esgotado" : `${p.stock} ${p.unit ?? "un"}`}
                </span>
              </li>
            ))}
            {!s.low.length && (
              <li className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                <Boxes size={14} /> Estoque em dia.
              </li>
            )}
          </ul>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <MessageCircle size={15} className="text-sky-500" /> Mensagens de clientes
            </span>
          }
          action={
            <button
              type="button"
              onClick={() => go("mensagens")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Abrir chat
            </button>
          }
        >
          <ul className="divide-y divide-border">
            {s.unread.slice(0, 5).map((t) => (
              <li key={t.name + t.last} className="flex items-center gap-3 px-4 py-2.5">
                <span className="grid size-8 place-items-center rounded-full bg-sky-500/15 text-xs font-bold text-sky-700 dark:text-sky-300">
                  {t.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-[13px]">{t.name}</strong>
                  <span className="block truncate text-xs text-muted-foreground">{t.last}</span>
                </span>
                <span className="grid min-w-5 place-items-center rounded-full bg-sky-500 px-1.5 text-[11px] font-bold text-white">
                  {t.unread}
                </span>
              </li>
            ))}
            {!s.unread.length && (
              <li className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                <Clock3 size={14} /> Nenhuma mensagem esperando resposta.
              </li>
            )}
          </ul>
        </Panel>

        <Panel title="Situação da loja" className="md:col-span-2 xl:col-span-1">
          <dl className="grid gap-3 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Plano</dt>
              <dd className="font-semibold">{PLANS[vendor.plan].label}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Comissão NextVita (mês)</dt>
              <dd className="font-semibold tabular-nums">{money(s.commission)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Líquido (mês)</dt>
              <dd className="font-semibold tabular-nums">{money(s.net)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Pedidos atrasados</dt>
              <dd
                className={`font-semibold tabular-nums ${s.late.length ? "text-rose-600 dark:text-rose-300" : ""}`}
              >
                {s.late.length}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>

      {vendor.status !== "ativo" && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          {vendor.status === "pendente"
            ? "Sua loja está em análise. Cadastre produtos; a vitrine aparece ao público quando a equipe aprovar."
            : "Sua loja está suspensa e não aparece ao público. Fale com a equipe NextVita."}
        </p>
      )}
    </div>
  );
}
