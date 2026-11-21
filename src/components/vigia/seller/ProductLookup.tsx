import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/marketplace";

type LookupRow = {
  id: string;
  code: string;
  name: string;
  price_cents: number;
  stock: number;
  active: boolean;
  colors: { name: string; hex: string; stock: number }[] | null;
};

type RpcResult = { data: LookupRow[] | null; error: { message: string } | null };
const client = supabase as unknown as {
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
};

/**
 * Consulta de produto para a equipe da loja: busca pelo código (PRD-000123) ou pelo nome.
 * Mostra estoque e cores, que são dados internos, e envia o produto para o chat aberto.
 * A permissão é conferida no servidor (care_store_product_lookup).
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
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function search(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) {
      setMsg("Digite pelo menos 2 caracteres.");
      return;
    }
    setBusy(true);
    setMsg("");
    const { data, error } = await client.rpc("care_store_product_lookup", {
      p_vendor: vendorId,
      p_query: term,
    });
    setBusy(false);
    if (error) {
      setRows([]);
      setMsg("Não foi possível buscar agora. Tente de novo.");
      return;
    }
    setRows(data ?? []);
    if (!data?.length) setMsg("Nenhum produto encontrado.");
  }

  return (
    <div className="border-t border-border px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
      >
        <Search size={13} aria-hidden="true" /> Buscar produto
      </button>
      {open && (
        <div className="mt-2 grid gap-2">
          <form onSubmit={search} className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              maxLength={80}
              placeholder="Código PRD-… ou nome"
              aria-label="Código ou nome do produto"
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm"
            />
            <button
              type="submit"
              disabled={busy || !q.trim()}
              className="h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50"
            >
              {busy ? "Buscando…" : "Buscar"}
            </button>
          </form>
          {msg && (
            <p role="status" className="text-xs text-muted-foreground">
              {msg}
            </p>
          )}
          {rows.map((r) => (
            <div
              key={r.id}
              className="grid gap-1 rounded-lg border border-border bg-card p-2 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <strong className="block truncate text-sm">{r.name}</strong>
                  <span className="tabular-nums text-muted-foreground">
                    {r.code} · {money(r.price_cents)}
                    {!r.active ? " · inativo" : ""}
                  </span>
                </span>
                <span
                  className={`shrink-0 font-bold tabular-nums ${r.stock <= 0 ? "text-rose-600" : ""}`}
                >
                  Estoque {r.stock}
                </span>
              </div>
              {!!r.colors?.length && (
                <span className="text-muted-foreground">
                  Cores: {r.colors.map((c) => `${c.name} ${c.stock}`).join(" · ")}
                </span>
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSend(`Produto ${r.code} · ${r.name} · ${money(r.price_cents)}`)}
                className="mt-1 justify-self-start rounded-md border border-border px-2 py-1 font-semibold hover:bg-muted disabled:opacity-50"
              >
                Enviar produto no chat
              </button>
            </div>
          ))}
          {disabled && rows.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Abra uma conversa para enviar o produto.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
