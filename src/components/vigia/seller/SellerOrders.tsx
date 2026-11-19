import { useMemo, useState, type FormEvent } from "react";
import { Check, ChevronDown, KeyRound, MapPin, MessageCircle, Printer, Search, Store, Truck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import { fmtDate } from "./shared";
import { money, NEXT_ACTION, nextStatus, ORDER_FLOW, ORDER_STATUS, orderUrl, PAYMENT_LABEL, type OrderEvent, type OrderStatus, type Vendor, type VendorOrder } from "@/lib/marketplace";
import { btn, DeadlineChip, Panel, printOrderTicket, StatusBadge, useNow } from "./shared";

type Filter = "abertos" | OrderStatus | "todos";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "abertos", label: "Em aberto" }, { key: "aguardando_pagamento", label: "A pagar" }, { key: "pago", label: "Pagos" }, { key: "separando", label: "Separando" },
  { key: "pronto", label: "Prontos" }, { key: "enviado", label: "Em entrega" }, { key: "entregue", label: "Entregues" }, { key: "cancelado", label: "Cancelados" }, { key: "todos", label: "Todos" },
];
const OPEN: OrderStatus[] = ["aguardando_pagamento", "pago", "separando", "pronto", "enviado"];

export function SellerOrders({ vendor, orders, onChanged, openChat }: { vendor: Vendor; orders: VendorOrder[]; onChanged: () => void; openChat: (customerId: string) => void }) {
  const [filter, setFilter] = useState<Filter>("abertos");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, OrderEvent[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState("");
  const { confirm } = useDialog();
  const now = useNow();

  const counts = useMemo(() => {
    const c: Record<string, number> = { abertos: 0, todos: orders.length };
    orders.forEach((o) => { c[o.status] = (c[o.status] ?? 0) + 1; if (OPEN.includes(o.status)) c.abertos += 1; });
    return c;
  }, [orders]);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders.filter((o) => (filter === "todos" ? true : filter === "abertos" ? OPEN.includes(o.status) : o.status === filter))
      .filter((o) => !term || `${o.order_number} ${o.customer_name} ${o.pickup_code ?? ""} ${o.customer_phone}`.toLowerCase().includes(term));
  }, [orders, filter, q]);

  async function toggle(id: string) {
    const next = open === id ? null : id;
    setOpen(next);
    if (next && !events[next]) {
      const { data } = await (supabase as any).from("care_store_order_events").select("*").eq("order_id", next).order("created_at");
      setEvents((e) => ({ ...e, [next]: data ?? [] }));
    }
  }
  async function setStatus(o: VendorOrder, status: OrderStatus) {
    if (status === "cancelado" && !(await confirm(`Cancelar o pedido #${o.order_number}?`, "Os itens voltam para o estoque e, se o pedido já estava pago, o valor sai do caixa como estorno. Não dá para desfazer.", true, "Cancelar pedido"))) return;
    setBusy(o.id); setMsg("");
    const { error } = await (supabase as any).from("care_store_orders").update({ status }).eq("id", o.id);
    setBusy(null);
    if (error) { setMsg("Não foi possível atualizar o pedido. Tente de novo."); return; }
    setEvents((e) => { const n = { ...e }; delete n[o.id]; return n; });
    setMsg(`Pedido #${o.order_number}: ${ORDER_STATUS[status].label}.`);
    onChanged();
  }
  async function redeem(e: FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length < 6) { setMsg("Digite os 6 caracteres do código."); return; }
    const found = orders.find((o) => o.pickup_code === c);
    if (!found) { setMsg("Código não encontrado nesta loja."); return; }
    if (found.status === "aguardando_pagamento") { setMsg(`O pedido #${found.order_number} ainda não foi pago. Confirme o pagamento antes de entregar.`); return; }
    if (!(await confirm(`Entregar o pedido #${found.order_number}?`, `${found.customer_name} · ${found.items.map((i) => `${i.qty}× ${i.name}`).join(", ")} · ${money(found.total_cents)}`, false, "Entregar agora"))) return;
    const { error } = await (supabase as any).rpc("care_store_redeem_pickup", { p_vendor: vendor.id, p_code: c });
    if (error) { setMsg("Este código não pode ser usado (pedido já entregue ou cancelado)."); return; }
    setCode(""); setMsg(`Pedido #${found.order_number} entregue. Código ${c} usado.`); onChanged();
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por número, cliente, telefone ou código" aria-label="Buscar pedidos" className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm" />
          </div>
          <div role="group" aria-label="Filtrar pedidos" className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${filter === f.key ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                {f.label}<span className="tabular-nums opacity-70">{counts[f.key] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={redeem} className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--accent-store)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent-store)_6%,transparent)] p-3">
          <label htmlFor="pickup-code" className="flex items-center gap-1.5 text-xs font-bold"><KeyRound size={14} /> Retirada no balcão</label>
          <div className="mt-1.5 flex gap-2">
            <input id="pickup-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="Código do cliente" autoComplete="off"
              className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 font-mono text-base font-bold" />
            <button type="submit" className={btn.primary}>Validar</button>
          </div>
        </form>
      </div>
      <p role="status" aria-live="polite" className={msg ? "rounded-lg bg-muted px-3 py-2 text-sm" : "sr-only"}>{msg}</p>

      <Panel>
        <ul className="divide-y divide-border">
          {shown.map((o) => {
            const nxt = nextStatus(o.status, o.fulfillment);
            const expanded = open === o.id;
            const flow = ORDER_FLOW(o.fulfillment);
            const stepIdx = flow.indexOf(o.status);
            return (
              <li key={o.id} className={expanded ? "bg-muted/30" : ""}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <button type="button" onClick={() => void toggle(o.id)} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">{o.fulfillment === "entrega" ? <Truck size={17} /> : <Store size={17} />}</span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2"><strong className="text-sm">#{o.order_number}</strong><span className="truncate text-sm">{o.customer_name}</span><StatusBadge status={o.status} /><DeadlineChip order={o} now={now} /></span>
                      <span className="block truncate text-xs text-muted-foreground">{fmtDate(o.created_at)} · {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</span>
                    </span>
                    <ChevronDown size={16} className={`ml-auto shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>
                  <span className="w-24 text-right text-sm font-bold tabular-nums">{money(o.total_cents)}</span>
                  <div className="flex items-center gap-1.5">
                    {nxt && <button type="button" disabled={busy === o.id} onClick={() => void setStatus(o, nxt)} className={btn.primary}><Check size={14} /> {NEXT_ACTION[o.status]}</button>}
                    <button type="button" onClick={() => printOrderTicket(o, vendor, orderUrl(o.id))} aria-label={`Imprimir comprovante do pedido ${o.order_number}`} title="Imprimir comprovante" className={btn.icon}><Printer size={16} /></button>
                    {o.user_id && <button type="button" onClick={() => openChat(o.user_id!)} aria-label={`Conversar com ${o.customer_name}`} title="Conversar com o cliente" className={btn.icon}><MessageCircle size={16} /></button>}
                  </div>
                </div>
                {expanded && (
                  <div className="grid gap-4 border-t border-border px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div>
                      <ol className="relative grid gap-3 pl-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-border">
                        {flow.map((st, i) => {
                          const ev = (events[o.id] ?? []).find((e) => e.status === st);
                          const done = o.status !== "cancelado" && i <= stepIdx;
                          return (
                            <li key={st} className="relative">
                              <span className={`absolute -left-5 top-0.5 grid size-[15px] place-items-center rounded-full ring-4 ring-card ${done ? "bg-[var(--accent-store)] text-white" : "bg-muted"}`}>{done && <Check size={9} strokeWidth={3} />}</span>
                              <p className={`text-[13px] ${done ? "font-semibold" : "text-muted-foreground"}`}>{ORDER_STATUS[st].label}</p>
                              {ev && <p className="text-[11px] text-muted-foreground">{fmtDate(ev.created_at)}</p>}
                            </li>
                          );
                        })}
                        {o.status === "cancelado" && <li className="relative"><span className="absolute -left-5 top-0.5 grid size-[15px] place-items-center rounded-full bg-rose-500 text-white ring-4 ring-card"><X size={9} strokeWidth={3} /></span><p className="text-[13px] font-semibold text-rose-600 dark:text-rose-300">Cancelado</p><p className="text-[11px] text-muted-foreground">{fmtDate(o.cancelled_at)}</p></li>}
                      </ol>
                    </div>
                    <div className="grid content-start gap-3 text-[13px]">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-card p-3 ring-1 ring-border"><p className="text-[11px] text-muted-foreground">Código de retirada</p><p className="font-mono text-lg font-extrabold tracking-[.18em]">{o.pickup_code ?? "—"}</p></div>
                        <div className="rounded-xl bg-card p-3 ring-1 ring-border"><p className="text-[11px] text-muted-foreground">Pagamento</p><p className="font-semibold">{PAYMENT_LABEL[o.payment_method] ?? o.payment_method}</p></div>
                      </div>
                      <p><span className="text-muted-foreground">Contato:</span> <a className="font-semibold text-primary hover:underline" href={`https://wa.me/55${o.customer_phone.replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noopener noreferrer">{o.customer_phone}</a></p>
                      {o.address && <p className="flex gap-1.5"><MapPin size={14} className="mt-0.5 shrink-0 text-muted-foreground" />{o.address}</p>}
                      {o.notes && <p className="rounded-lg bg-amber-500/10 p-2 text-xs">{o.notes}</p>}
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl bg-card p-3 text-xs ring-1 ring-border">
                        <dt className="text-muted-foreground">Produtos</dt><dd className="text-right tabular-nums">{money(o.total_cents - o.delivery_fee_cents)}</dd>
                        <dt className="text-muted-foreground">Entrega</dt><dd className="text-right tabular-nums">{money(o.delivery_fee_cents)}</dd>
                        <dt className="text-muted-foreground">Contribuição NextVita</dt><dd className="text-right tabular-nums text-rose-600 dark:text-rose-300">−{money(o.commission_cents)}</dd>
                        <dt className="font-semibold">Você recebe</dt><dd className="text-right font-bold tabular-nums">{money(o.vendor_net_cents)}</dd>
                      </dl>
                      {!["entregue", "cancelado"].includes(o.status) && <button type="button" onClick={() => void setStatus(o, "cancelado")} className="w-fit text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300">Cancelar pedido</button>}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {!shown.length && <li className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhum pedido neste filtro.</li>}
        </ul>
      </Panel>
    </div>
  );
}
