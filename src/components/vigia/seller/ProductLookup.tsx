import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ImageOff,
  Package,
  Phone,
  Search,
  Send,
  Truck,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoryName, money } from "@/lib/marketplace";

type LookupRow = {
  id: string;
  code: string;
  share_code: string | null;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  old_price_cents: number | null;
  cost_cents: number | null;
  stock: number;
  min_stock: number | null;
  unit: string | null;
  sku: string | null;
  ref: string | null;
  active: boolean;
  availability: string | null;
  display_limit: number | null;
  featured: boolean;
  colors: { name: string; hex: string; stock: number }[] | null;
  supplier_name: string | null;
  supplier_phone: string | null;
  supplier_email: string | null;
  sold_30d: number;
  updated_at: string | null;
};

type RpcResult = { data: LookupRow[] | null; error: { message: string } | null };
const client = supabase as unknown as {
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
};

function stockState(r: LookupRow) {
  if (!r.active) return { label: "Inativo na loja", tone: "muted" as const };
  if (r.availability === "indisponivel") return { label: "Indisponível", tone: "muted" as const };
  if (r.stock <= 0 || r.availability === "esgotado")
    return { label: "Esgotado", tone: "bad" as const };
  if (r.stock <= (r.min_stock ?? 3)) return { label: "Estoque baixo", tone: "warn" as const };
  return { label: "Em estoque", tone: "ok" as const };
}

const TONE = {
  ok: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  warn: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  bad: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  muted: "bg-muted text-muted-foreground",
};

function Thumb({ src, alt, size }: { src: string | null; alt: string; size: string }) {
  return src ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`${size} shrink-0 rounded-md border border-border bg-white object-cover`}
    />
  ) : (
    <span
      className={`${size} grid shrink-0 place-items-center rounded-md border border-border bg-muted text-muted-foreground`}
    >
      <ImageOff size={16} aria-hidden="true" />
    </span>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate text-[13px] font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * Consulta de produto para o dono e os atendentes: busca pelo código (PRD-000123, 123),
 * código de compartilhamento, SKU ou nome. Abre a ficha com foto, estoque, cores,
 * fornecedor e vendas recentes, e envia o produto para o chat aberto.
 * A permissão é conferida no servidor (care_store_product_lookup); o custo só vem para o dono.
 */
export function ProductLookup({
  vendorId,
  disabled,
  onSend,
}: {
  vendorId: string;
  disabled: boolean;
  onSend: (body: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<LookupRow[]>([]);
  const [pick, setPick] = useState<LookupRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState("");

  async function search(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) {
      setMsg("Digite pelo menos 2 caracteres.");
      return;
    }
    setBusy(true);
    setMsg("");
    setSent("");
    const { data, error } = await client.rpc("care_store_product_lookup", {
      p_vendor: vendorId,
      p_query: term,
    });
    setBusy(false);
    if (error) {
      setRows([]);
      setPick(null);
      setMsg(
        /permiss/i.test(error.message)
          ? "Sua conta não tem acesso aos produtos desta loja."
          : "Não foi possível buscar agora. Tente de novo.",
      );
      return;
    }
    const list = data ?? [];
    setRows(list);
    setPick(list.length === 1 ? list[0] : null);
    if (!list.length) setMsg(`Nenhum produto encontrado para “${term}”.`);
  }

  function send(r: LookupRow) {
    const parts = [`Produto ${r.code}`, r.name, money(r.price_cents)];
    if (r.stock > 0 && r.active) parts.push(r.stock <= 5 ? `restam ${r.stock}` : "disponível");
    else parts.push("sem estoque no momento");
    onSend(parts.join(" · "));
    setSent(r.id);
  }

  const reset = () => {
    setOpen(false);
    setRows([]);
    setPick(null);
    setMsg("");
    setQ("");
  };

  if (!open) {
    return (
      <div className="border-t border-border px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <Search size={13} aria-hidden="true" /> Consultar produto pelo código
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Consulta de produto"
      className="border-t border-border bg-muted/30 px-3 pb-3 pt-2"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold">
          <Package size={13} aria-hidden="true" /> Consulta de produto
        </span>
        <button
          type="button"
          onClick={reset}
          aria-label="Fechar consulta"
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <X size={15} />
        </button>
      </div>

      <form onSubmit={search} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={80}
          autoFocus
          placeholder="Código (PRD-000123 ou 123), SKU ou nome"
          aria-label="Código ou nome do produto"
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !q.trim()}
          className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {msg && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {msg}
        </p>
      )}

      {!pick && rows.length > 1 && (
        <ul className="mt-2 grid max-h-56 gap-1 overflow-y-auto">
          {rows.map((r) => {
            const st = stockState(r);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setPick(r)}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card p-1.5 text-left hover:border-primary/50"
                >
                  <Thumb src={r.image_url} alt="" size="h-10 w-10" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{r.name}</span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {r.code} · {money(r.price_cents)}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${TONE[st.tone]}`}
                  >
                    {r.stock} {r.unit ?? "un"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {pick && <ProductSheet r={pick} />}

      {pick && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => setPick(null)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-semibold hover:bg-muted"
            >
              <ChevronLeft size={14} aria-hidden="true" /> {rows.length} resultados
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => send(pick)}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Send size={13} aria-hidden="true" />
            {sent === pick.id ? "Enviado. Enviar de novo" : "Enviar ao cliente"}
          </button>
          {disabled && (
            <p className="w-full text-[11px] text-muted-foreground">
              Abra uma conversa para enviar o produto ao cliente.
            </p>
          )}
        </div>
      )}
    </section>
  );

  function ProductSheet({ r }: { r: LookupRow }) {
    const st = stockState(r);
    const margin =
      r.cost_cents != null && r.price_cents > 0
        ? Math.round(((r.price_cents - r.cost_cents) / r.price_cents) * 100)
        : null;
    return (
      <article className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex gap-3 p-3">
          <Thumb src={r.image_url} alt={r.name} size="h-24 w-24 sm:h-28 sm:w-28" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {r.code}
              {r.featured ? " · Destaque" : ""}
            </p>
            <h4 className="line-clamp-2 text-sm font-bold leading-snug">{r.name}</h4>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-base font-bold tabular-nums">{money(r.price_cents)}</span>
              {r.old_price_cents && r.old_price_cents > r.price_cents && (
                <span className="text-xs tabular-nums text-muted-foreground line-through">
                  {money(r.old_price_cents)}
                </span>
              )}
            </p>
            <span
              className={`mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${TONE[st.tone]}`}
            >
              {st.tone === "warn" && <AlertTriangle size={11} aria-hidden="true" />}
              {st.label}
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-x-3 gap-y-2 border-t border-border px-3 py-2.5">
          <Fact label="Estoque" value={`${r.stock} ${r.unit ?? "un"}`} />
          <Fact label="Mínimo" value={`${r.min_stock ?? 3} ${r.unit ?? "un"}`} />
          <Fact label="Vendidos 30 dias" value={r.sold_30d} />
          <Fact label="Categoria" value={categoryName(r.category)} />
          <Fact label="SKU" value={r.sku || "—"} />
          {r.cost_cents != null ? (
            <Fact
              label="Custo"
              value={`${money(r.cost_cents)}${margin != null ? ` · ${margin}%` : ""}`}
            />
          ) : (
            <Fact label="Limite na vitrine" value={r.display_limit ?? "—"} />
          )}
        </dl>

        {!!r.colors?.length && (
          <div className="border-t border-border px-3 py-2.5">
            <p className="mb-1.5 text-[11px] text-muted-foreground">Cores e estoque</p>
            <ul className="flex flex-wrap gap-1.5">
              {r.colors.map((c) => (
                <li
                  key={c.name}
                  className={`inline-flex items-center gap-1.5 rounded border border-border px-1.5 py-0.5 text-[11px] ${c.stock <= 0 ? "text-muted-foreground line-through" : ""}`}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-black/10"
                    style={{ background: c.hex }}
                    aria-hidden="true"
                  />
                  {c.name} <strong className="tabular-nums">{c.stock}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-start gap-2 border-t border-border px-3 py-2.5 text-[12px]">
          <Truck size={14} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {r.supplier_name ? (
            <div className="min-w-0">
              <p className="font-semibold">{r.supplier_name}</p>
              <p className="flex flex-wrap gap-x-3 text-muted-foreground">
                {r.supplier_phone && (
                  <a
                    href={`tel:${r.supplier_phone.replace(/[^\d+]/g, "")}`}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    <Phone size={11} aria-hidden="true" /> {r.supplier_phone}
                  </a>
                )}
                {r.supplier_email && <span className="truncate">{r.supplier_email}</span>}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Sem fornecedor ligado. Escolha um em Produtos → Editar.
            </p>
          )}
        </div>

        {r.description && (
          <p className="line-clamp-4 border-t border-border px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
            {r.description}
          </p>
        )}
      </article>
    );
  }
}
