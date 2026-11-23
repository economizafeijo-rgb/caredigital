import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  Copy,
  Hand,
  Headset,
  MessageCircle,
  Package,
  Search,
  Share2,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money, type Vendor } from "@/lib/marketplace";
import { shareProductLink } from "@/lib/share-product";
import { AvailabilityToggle } from "./AvailabilityToggle";
import type { SellerData } from "./useSellerData";
import type { SellerTab } from "./SellerDashboard";

type Waiting = {
  customer_id: string;
  customer_name: string | null;
  last_body: string;
  last_at: string;
  waiting: number;
};

const waitLabel = (ms: number) => {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  return `há ${Math.floor(min / 60)} h`;
};

/** Clientes sem atendente: atualiza sozinho e devolve a lista e a ação de assumir. */
export function useWaitingCustomers(vendorId: string, enabled = true) {
  const [rows, setRows] = useState<Waiting[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!enabled) return;
    const { data, error } = await (supabase as any).rpc("care_store_unassigned", {
      p_vendor: vendorId,
    });
    if (error) {
      setError("A fila de espera ainda não está disponível. Aplique a atualização do banco.");
      return;
    }
    setError("");
    setRows((data ?? []) as Waiting[]);
  }, [vendorId, enabled]);
  useEffect(() => {
    void load();
    if (!enabled) return;
    const t = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(t);
  }, [load, enabled]);
  const take = useCallback(
    async (customerId: string): Promise<boolean> => {
      const { data, error } = await (supabase as any).rpc("care_store_take_customer", {
        p_vendor: vendorId,
        p_customer: customerId,
      });
      void load();
      return !error && data === true;
    },
    [vendorId, load],
  );
  return { rows, error, take, reload: load };
}

/** Lista de clientes aguardando, com o botão Atender. Usada na área da atendente e no chat. */
export function WaitingList({
  vendorId,
  onTaken,
  compact = false,
}: {
  vendorId: string;
  onTaken: (customerId: string) => void;
  compact?: boolean;
}) {
  const { rows, error, take } = useWaitingCustomers(vendorId);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  async function attend(id: string) {
    setBusy(id);
    const ok = await take(id);
    setBusy(null);
    if (ok) onTaken(id);
    else setNote("Outra pessoa da equipe já assumiu esse cliente.");
  }

  if (error) return <p className="px-4 py-3 text-xs text-muted-foreground">{error}</p>;
  if (!rows.length)
    return compact ? null : (
      <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
        <Check size={16} className="text-emerald-600" /> Nenhum cliente esperando agora.
      </p>
    );
  return (
    <div className={compact ? "border-b border-border bg-amber-500/[.06]" : ""}>
      {compact && (
        <p className="flex items-center gap-1.5 px-4 pt-2.5 text-xs font-bold text-amber-700 dark:text-amber-300">
          <Clock3 size={13} /> Aguardando atendimento · {rows.length}
        </p>
      )}
      <ul className={compact ? "grid gap-1 p-2" : "divide-y divide-border"}>
        {rows.map((r) => (
          <li
            key={r.customer_id}
            className={`flex items-center gap-3 ${compact ? "rounded-xl bg-card px-2.5 py-2" : "px-4 py-3"}`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-700 dark:text-amber-300">
              {(r.customer_name ?? "C").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[13px]">{r.customer_name ?? "Cliente"}</strong>
              <span className="block truncate text-xs text-muted-foreground">{r.last_body}</span>
            </span>
            <span className="hidden shrink-0 text-[11px] tabular-nums text-muted-foreground sm:block">
              {waitLabel(now - new Date(r.last_at).getTime())}
            </span>
            <button
              type="button"
              disabled={busy === r.customer_id}
              onClick={() => void attend(r.customer_id)}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground transition hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              <Hand size={13} /> Atender
            </button>
          </li>
        ))}
      </ul>
      {note && (
        <p role="status" className="px-4 pb-2 text-xs text-rose-600">
          {note}
        </p>
      )}
    </div>
  );
}

/**
 * Área da atendente: tudo o que ela precisa para atender e vender, sem o resto da gestão da loja.
 * As conversas que ela vê são só as dela (o banco filtra).
 */
export function SellerAttendantHome({
  vendor,
  data,
  name,
  go,
  openChat,
}: {
  vendor: Vendor;
  data: SellerData;
  name: string;
  go: (tab: SellerTab) => void;
  openChat: (customerId: string) => void;
}) {
  const threads = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; last: string; at: string; unread: number }
    >();
    for (const m of data.messages) {
      if (m.deleted_at) continue;
      const t = map.get(m.customer_id) ?? {
        id: m.customer_id,
        name: "Cliente",
        last: "",
        at: m.created_at,
        unread: 0,
      };
      if (m.customer_name) t.name = m.customer_name;
      t.last = m.body;
      t.at = m.created_at;
      if (!m.from_vendor && !m.read_at) t.unread += 1;
      map.set(m.customer_id, t);
    }
    return [...map.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  }, [data.messages]);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Rio_Branco" });
  const ordersToday = data.orders.filter(
    (o) =>
      new Date(o.created_at).toLocaleDateString("en-CA", { timeZone: "America/Rio_Branco" }) ===
      today,
  );
  const toPrepare = data.orders.filter((o) => o.status === "pago" || o.status === "separando");
  const unread = threads.reduce((a, t) => a + t.unread, 0);

  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const products = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = data.products.filter((p) => p.active !== false);
    const hit = term
      ? list.filter(
          (p) => p.name.toLowerCase().includes(term) || (p.code ?? "").toLowerCase().includes(term),
        )
      : list;
    return hit.slice(0, 8);
  }, [data.products, q]);

  const offer = (p: (typeof products)[number]) =>
    [
      p.code ? `Produto ${p.code}` : null,
      p.name,
      money(p.price_cents),
      p.stock > 0 ? (p.stock <= 5 ? `restam ${p.stock}` : "disponível") : "sem estoque no momento",
      p.share_code ? `${window.location.origin}/p/${p.share_code}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const stat = (label: string, value: number, Icon: typeof Package, tab?: SellerTab) => (
    <button
      type="button"
      onClick={() => tab && go(tab)}
      className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3 text-left transition hover:bg-muted/50"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary sm:size-10">
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <strong className="block text-xl font-extrabold tabular-nums leading-none">{value}</strong>
        <span className="mt-1 block text-xs leading-tight text-muted-foreground">{label}</span>
      </span>
    </button>
  );

  return (
    <div className="grid gap-4">
      <section
        className="relative overflow-hidden rounded-3xl border border-border p-4 text-white sm:p-5"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--accent-store) 88%, #000) 0%, color-mix(in srgb, var(--accent-store) 55%, #0b1330) 100%)",
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15 text-lg font-extrabold ring-2 ring-white/30">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white/75">
              Atendimento · {vendor.name}
            </p>
            <h2 className="truncate text-xl font-extrabold">Olá, {name.split(/[\s·]/)[0]}</h2>
          </div>
          <button
            type="button"
            onClick={() => go("mensagens")}
            className="inline-flex h-10 basis-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-900 sm:basis-auto shadow transition hover:brightness-95 active:scale-[.98]"
          >
            <MessageCircle size={16} /> Abrir conversas
            {unread > 0 && (
              <span className="rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl bg-white text-foreground dark:bg-card">
          <AvailabilityToggle vendorId={vendor.id} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {stat("Minhas conversas", threads.length, Headset, "mensagens")}
        {stat("Mensagens não lidas", unread, MessageCircle, "mensagens")}
        {stat("Pedidos hoje", ordersToday.length, ShoppingBag, "pedidos")}
        {stat("Para separar", toPrepare.length, Truck, "pedidos")}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Clock3 size={16} className="text-amber-600" />
            <h3 className="text-sm font-bold">Clientes aguardando</h3>
          </header>
          <WaitingList vendorId={vendor.id} onTaken={openChat} />
          {threads.length > 0 && (
            <>
              <h3 className="border-y border-border bg-muted/30 px-4 py-2 text-xs font-bold text-muted-foreground">
                Minhas conversas recentes
              </h3>
              <ul className="divide-y divide-border">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => openChat(t.id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-muted/50"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {t.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-[13px]">{t.name}</strong>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t.last}
                        </span>
                      </span>
                      {t.unread > 0 && (
                        <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                          {t.unread}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Package size={16} className="text-primary" />
            <h3 className="text-sm font-bold">Vitrine para vender</h3>
          </header>
          <label className="relative block px-4 pt-3">
            <span className="sr-only">Buscar produto pelo nome ou código</span>
            <Search
              size={15}
              className="pointer-events-none absolute left-7 top-1/2 mt-1.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome ou código do produto"
              className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm"
            />
          </label>
          <ul className="grid gap-1 p-2">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-muted/50"
              >
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt=""
                    loading="lazy"
                    className="size-11 shrink-0 rounded-lg bg-muted object-cover"
                  />
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted">
                    <Package size={16} className="text-muted-foreground" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[13px]">{p.name}</strong>
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    {money(p.price_cents)}
                    {p.code ? ` · ${p.code}` : ""} ·{" "}
                    <span className={p.stock > 0 ? "" : "text-rose-600"}>
                      {p.stock > 0 ? `${p.stock} em estoque` : "sem estoque"}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  title="Copiar oferta para colar no chat"
                  aria-label={`Copiar oferta de ${p.name}`}
                  onClick={() =>
                    void navigator.clipboard?.writeText(offer(p)).then(() => {
                      setCopied(p.id);
                      window.setTimeout(() => setCopied((c) => (c === p.id ? null : c)), 1800);
                    })
                  }
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {copied === p.id ? <Check size={15} /> : <Copy size={15} />}
                </button>
                {p.share_code && (
                  <button
                    type="button"
                    title="Compartilhar o produto"
                    aria-label={`Compartilhar ${p.name}`}
                    onClick={() =>
                      void shareProductLink({
                        url: `${window.location.origin}/p/${p.share_code}`,
                        title: `${p.name} · ${money(p.price_cents)}`,
                        text: `${p.name} por ${money(p.price_cents)} na ${vendor.name}`,
                        image: p.image_url,
                        fileName: p.name,
                      })
                    }
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <Share2 size={15} />
                  </button>
                )}
              </li>
            ))}
            {!products.length && (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado.
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
