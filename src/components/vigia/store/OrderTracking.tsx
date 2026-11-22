import { useCallback, useEffect, useState } from "react";
import { DisputePanel } from "./DisputePanel";
import { OrderReview } from "./OrderReview";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Loader2,
  LogIn,
  MapPin,
  MessageCircle,
  Printer,
  Store,
  Truck,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import {
  money,
  ORDER_FLOW,
  ORDER_STATUS,
  orderUrl,
  PAYMENT_LABEL,
  type OrderEvent,
  type Vendor,
  type VendorOrder,
} from "@/lib/marketplace";
import {
  DeadlineChip,
  fmtDate,
  printOrderTicket,
  QrImage,
  StatusBadge,
  useNow,
} from "../seller/shared";
import { CustomerChat } from "./CustomerChat";

const HINT: Record<string, string> = {
  aguardando_pagamento: "A loja vai confirmar o seu pagamento.",
  pago: "Pagamento confirmado. A loja vai começar a separar.",
  separando: "A loja está separando os seus produtos.",
  pronto: "Pronto! Vá até a loja e mostre o código.",
  enviado: "Saiu para entrega. Mostre o código ao entregador.",
  entregue: "Pedido entregue. Obrigado pela compra!",
  cancelado: "Este pedido foi cancelado.",
};

/** Acompanhamento do pedido pelo cliente: código de retirada, QR, linha do tempo e prazo. */
export function OrderTracking({ id }: { id: string }) {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const now = useNow(15_000);
  const [state, setState] = useState<"loading" | "out" | "missing" | "ok">("loading");
  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [chat, setChat] = useState(false);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setState("out");
      return;
    }
    const db = supabase as any;
    const { data: o } = await db.from("care_store_orders").select("*").eq("id", id).maybeSingle();
    if (!o) {
      setState("missing");
      return;
    }
    const [{ data: v }, { data: ev }] = await Promise.all([
      db.from("care_store_vendors").select("*").eq("id", o.vendor_id).maybeSingle(),
      db.from("care_store_order_events").select("*").eq("order_id", id).order("created_at"),
    ]);
    setOrder(o);
    setVendor(v);
    setEvents(ev ?? []);
    setState("ok");
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const db = supabase as any;
    if (typeof db.channel !== "function") return;
    const ch = db
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "care_store_orders", filter: `id=eq.${id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void db.removeChannel(ch);
    };
  }, [id, load]);

  if (state === "loading")
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"
      >
        <Loader2 size={16} className="animate-spin" /> Abrindo o pedido…
      </p>
    );
  if (state === "out")
    return (
      <div className="mx-auto grid max-w-md justify-items-center gap-3 rounded-3xl border border-border bg-card p-8 text-center">
        <p className="font-display text-lg font-extrabold">Entre para ver o seu pedido</p>
        <p className="text-sm text-muted-foreground">
          O acompanhamento fica na conta de quem fez o pedido.
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              window.sessionStorage.setItem("nv_after_login", `/loja?pedido=${id}`);
            } catch {
              /* ok */
            }
            window.location.assign("/entrar");
          }}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
        >
          <LogIn size={16} /> Entrar
        </button>
      </div>
    );
  if (state === "missing" || !order || !vendor)
    return (
      <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Pedido não encontrado nesta conta.
      </p>
    );

  const accent = vendor.accent_hex ?? "#0e7a5f";
  const flow = ORDER_FLOW(order.fulfillment);
  const idx = flow.indexOf(order.status);
  const url = orderUrl(order.id);
  async function cancel() {
    if (
      !(await confirm(
        "Cancelar este pedido?",
        "Os produtos voltam para a loja. Não dá para desfazer.",
        true,
        "Cancelar pedido",
      ))
    )
      return;
    const { error } = await (supabase as any).rpc("care_store_customer_cancel", {
      p_order: order!.id,
    });
    if (!error) void load();
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4">
      <button
        type="button"
        onClick={() => void navigate({ to: "/loja", search: { loja: vendor.slug } as never })}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> {vendor.name}
      </button>

      <section
        className="nv-dark relative isolate overflow-hidden rounded-3xl p-5 text-white sm:p-7"
        style={{
          background: `radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, ${accent} 70%, #0b1220), #070b14)`,
        }}
      >
        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="text-xs font-semibold text-white/65">
              Pedido #{order.order_number} · {fmtDate(order.created_at)}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {ORDER_STATUS[order.status].label}
            </h1>
            <p className="mt-1 text-sm text-white/80">{HINT[order.status]}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status} />
              <span className="rounded-full bg-white/90 px-0.5">
                <DeadlineChip order={order} now={now} />
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => printOrderTicket(order, vendor, url)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-950 hover:bg-white/90"
              >
                <Printer size={15} /> Imprimir comprovante
              </button>
              <button
                type="button"
                onClick={() => setChat(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-4 text-sm font-semibold backdrop-blur hover:bg-white/15"
              >
                <MessageCircle size={15} /> Falar com a loja
              </button>
            </div>
          </div>
          <div className="grid justify-items-center gap-2 rounded-2xl bg-white p-4 text-slate-900 shadow-xl">
            <p className="text-[11px] font-semibold text-slate-500">
              {order.fulfillment === "retirada" ? "Código de retirada" : "Código de entrega"}
            </p>
            <p className="font-mono text-3xl font-extrabold tracking-[.22em]">
              {order.pickup_code}
            </p>
            <QrImage text={url} size={128} label="QR do pedido" />
            <p className="max-w-[12rem] text-center text-[10.5px] leading-snug text-slate-500">
              Quem tiver este código pode retirar o pedido.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-border bg-card p-5" aria-label="Andamento">
          <h2 className="text-sm font-bold">Andamento</h2>
          <ol className="relative mt-4 grid gap-4 pl-6 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-0.5 before:bg-border">
            {flow.map((st, i) => {
              const done = order.status !== "cancelado" && i <= idx;
              const current = i === idx && order.status !== "entregue";
              const ev = events.find((e) => e.status === st);
              return (
                <li key={st} className="relative">
                  <span
                    className={`absolute -left-6 top-0 grid size-5 place-items-center rounded-full ring-4 ring-card ${done ? "text-white" : "bg-muted"} ${current ? "nv-breathe" : ""}`}
                    style={done ? { background: accent } : undefined}
                  >
                    {done && <Check size={11} strokeWidth={3} />}
                  </span>
                  <p className={`text-sm ${done ? "font-semibold" : "text-muted-foreground"}`}>
                    {ORDER_STATUS[st].label}
                  </p>
                  {ev && <p className="text-xs text-muted-foreground">{fmtDate(ev.created_at)}</p>}
                </li>
              );
            })}
            {order.status === "cancelado" && (
              <li className="relative">
                <span className="absolute -left-6 top-0 grid size-5 place-items-center rounded-full bg-rose-500 text-white ring-4 ring-card">
                  <X size={11} strokeWidth={3} />
                </span>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">Cancelado</p>
                <p className="text-xs text-muted-foreground">{fmtDate(order.cancelled_at)}</p>
              </li>
            )}
          </ol>
          {order.status === "aguardando_pagamento" && (
            <button
              type="button"
              onClick={() => void cancel()}
              className="mt-4 text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300"
            >
              Cancelar pedido
            </button>
          )}
        </section>
        <DisputePanel orderId={order.id} orderStatus={order.status} createdAt={order.created_at} />
        {order.status === "entregue" && order.vendor_id && (
          <OrderReview orderId={order.id} vendorId={order.vendor_id} name={order.customer_name} />
        )}
        <section className="rounded-2xl border border-border bg-card p-5" aria-label="Resumo">
          <h2 className="text-sm font-bold">Resumo</h2>
          <ul className="mt-3 divide-y divide-border">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2 text-[13px]">
                <span>
                  {i.qty}× {i.name}
                </span>
                <span className="tabular-nums">{money(i.price_cents * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 border-t border-border pt-3 text-[13px]">
            <dt className="text-muted-foreground">Entrega</dt>
            <dd className="text-right tabular-nums">
              {order.delivery_fee_cents ? money(order.delivery_fee_cents) : "—"}
            </dd>
            <dt className="font-bold">Total</dt>
            <dd className="text-right font-extrabold tabular-nums">{money(order.total_cents)}</dd>
            <dt className="text-muted-foreground">Pagamento</dt>
            <dd className="text-right">
              {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
            </dd>
          </dl>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-[12.5px]">
            {order.fulfillment === "retirada" ? (
              <Store size={15} className="mt-0.5 shrink-0" />
            ) : (
              <Truck size={15} className="mt-0.5 shrink-0" />
            )}
            <span>
              {order.fulfillment === "retirada" ? (
                <>
                  Retirar em <strong>{vendor.name}</strong>
                  {vendor.address ? ` · ${vendor.address}` : ""}
                  {vendor.opening_hours ? ` · ${vendor.opening_hours}` : ""}
                </>
              ) : (
                <>Entrega em {order.address}</>
              )}
            </span>
          </p>
          {vendor.address && order.fulfillment === "retirada" && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${vendor.address}, ${vendor.city}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <MapPin size={13} /> Ver no mapa
            </a>
          )}
        </section>
      </div>
      {chat && <CustomerChat vendor={vendor} orderId={order.id} onClose={() => setChat(false)} />}
    </div>
  );
}

/** Lista dos pedidos do cliente nas lojas parceiras. */
export function MyOrders() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<
    (VendorOrder & { vendor?: { name: string; accent_hex: string | null } })[] | null
  >(null);
  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setRows([]);
        return;
      }
      const db = supabase as any;
      const { data } = await db
        .from("care_store_orders")
        .select("*")
        .eq("user_id", u.user.id)
        .not("vendor_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      const ids = [...new Set((data ?? []).map((o: VendorOrder) => o.vendor_id))];
      const { data: vs } = ids.length
        ? await db.from("care_store_vendors").select("id,name,accent_hex").in("id", ids)
        : { data: [] };
      setRows(
        (data ?? []).map((o: VendorOrder) => ({
          ...o,
          vendor: (vs ?? []).find((v: { id: string }) => v.id === o.vendor_id),
        })),
      );
    })();
  }, []);
  if (!rows)
    return (
      <p role="status" className="py-16 text-center text-sm text-muted-foreground">
        Carregando…
      </p>
    );
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-3">
      <h1 className="font-display text-2xl font-extrabold">Meus pedidos</h1>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {rows.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => void navigate({ to: "/loja", search: { pedido: o.id } as never })}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
            >
              <span
                className="grid size-10 place-items-center rounded-xl text-xs font-extrabold text-white"
                style={{ background: o.vendor?.accent_hex ?? "#0e7a5f" }}
              >
                {(o.vendor?.name ?? "?").slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">
                  {o.vendor?.name ?? "Loja"} · #{o.order_number}
                </strong>
                <span className="text-xs text-muted-foreground">
                  {fmtDate(o.created_at)} · {money(o.total_cents)}
                </span>
              </span>
              <StatusBadge status={o.status} />
            </button>
          </li>
        ))}
        {!rows.length && (
          <li className="px-4 py-12 text-center text-sm text-muted-foreground">
            Você ainda não fez pedidos nas lojas parceiras.
          </li>
        )}
      </ul>
    </section>
  );
}
