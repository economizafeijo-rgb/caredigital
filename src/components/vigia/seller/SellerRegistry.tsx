import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import { centsToInput, money, parseMoney, type Vendor } from "@/lib/marketplace";
import { btn, inputCls, Panel } from "./shared";

type Kind = "cliente" | "fornecedor" | "material";
type Contact = {
  id: string;
  kind: Kind;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  address: string | null;
  quantity: number | null;
  unit: string | null;
  unit_cost_cents: number | null;
  supplier_id: string | null;
  notes: string | null;
};
const LABEL: Record<Kind, [string, string]> = {
  cliente: ["Clientes", "cliente"],
  fornecedor: ["Fornecedores", "fornecedor"],
  material: ["Materiais", "material"],
};
type Draft = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  document: string;
  address: string;
  quantity: string;
  unit: string;
  cost: string;
  supplier: string;
  notes: string;
};
const blank: Draft = {
  name: "",
  phone: "",
  email: "",
  document: "",
  address: "",
  quantity: "",
  unit: "un",
  cost: "",
  supplier: "",
  notes: "",
};

/** Banco de dados do dono da loja: clientes, fornecedores e materiais. */
export function SellerRegistry({ vendor }: { vendor: Vendor }) {
  const [kind, setKind] = useState<Kind>("cliente");
  const [rows, setRows] = useState<Contact[]>([]);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState("");
  const { confirm } = useDialog();
  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("care_store_contacts")
      .select("*")
      .eq("vendor_id", vendor.id)
      .order("name")
      .limit(2000);
    setRows(data ?? []);
  }, [vendor.id]);
  useEffect(() => {
    void load();
  }, [load]);
  const list = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.kind === kind &&
          (!q.trim() ||
            `${r.name} ${r.phone ?? ""} ${r.email ?? ""} ${r.document ?? ""}`
              .toLowerCase()
              .includes(q.trim().toLowerCase())),
      ),
    [rows, kind, q],
  );
  const suppliers = rows.filter((r) => r.kind === "fornecedor");
  const supplierName = (id: string | null) => suppliers.find((s) => s.id === id)?.name;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (draft.name.trim().length < 2) return setErr("Informe o nome.");
    const cost = draft.cost.trim() ? parseMoney(draft.cost) : null;
    if (draft.cost.trim() && cost === null) return setErr("Confira o custo, por exemplo 12,50.");
    const row = {
      kind,
      name: draft.name.trim(),
      phone: draft.phone.trim() || null,
      email: draft.email.trim() || null,
      document: draft.document.trim() || null,
      address: draft.address.trim() || null,
      notes: draft.notes.trim() || null,
      updated_at: new Date().toISOString(),
      ...(kind === "material"
        ? {
            quantity: draft.quantity.trim() ? Number(draft.quantity.replace(",", ".")) : null,
            unit: draft.unit.trim() || null,
            unit_cost_cents: cost,
            supplier_id: draft.supplier || null,
          }
        : {}),
    };
    const db = (supabase as any).from("care_store_contacts");
    const { error } = draft.id
      ? await db.update(row).eq("id", draft.id)
      : await db.insert({ ...row, vendor_id: vendor.id });
    if (error)
      return setErr("Não foi possível salvar. A migração mais recente precisa estar aplicada.");
    setDraft(null);
    setErr("");
    void load();
  }
  async function remove(r: Contact) {
    if (
      !(await confirm(
        `Excluir ${r.name}?`,
        "O cadastro é removido do seu banco de dados. Não dá para desfazer.",
        true,
        "Excluir",
      ))
    )
      return;
    await (supabase as any).from("care_store_contacts").delete().eq("id", r.id);
    void load();
  }
  const edit = (r: Contact) =>
    setDraft({
      id: r.id,
      name: r.name,
      phone: r.phone ?? "",
      email: r.email ?? "",
      document: r.document ?? "",
      address: r.address ?? "",
      quantity: r.quantity == null ? "" : String(r.quantity),
      unit: r.unit ?? "un",
      cost: centsToInput(r.unit_cost_cents),
      supplier: r.supplier_id ?? "",
      notes: r.notes ?? "",
    });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" className="flex border border-border">
          {(Object.keys(LABEL) as Kind[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              type="button"
              onClick={() => setKind(k)}
              className={`h-9 px-3 text-xs font-semibold ${kind === k ? "bg-foreground text-background" : "hover:bg-muted"}`}
            >
              {LABEL[k][0]}{" "}
              <span className="opacity-60">{rows.filter((r) => r.kind === k).length}</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[12rem] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, telefone ou documento"
            aria-label="Buscar"
            className="h-9 w-full border border-border bg-card pl-9 pr-3 text-sm"
          />
        </div>
        <button type="button" onClick={() => setDraft({ ...blank })} className={btn.primary}>
          <Plus size={15} /> Novo {LABEL[kind][1]}
        </button>
      </div>
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-2 font-medium">Contato</th>
                <th className="px-2 font-medium">
                  {kind === "material" ? "Estoque / custo" : "Documento"}
                </th>
                <th className="px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <strong className="block font-semibold">{r.name}</strong>
                    {r.notes && (
                      <span className="line-clamp-1 text-xs text-muted-foreground">{r.notes}</span>
                    )}
                  </td>
                  <td className="px-2 text-xs text-muted-foreground">
                    {[r.phone, r.email].filter(Boolean).join(" · ") || "—"}
                    {r.address && <span className="block">{r.address}</span>}
                  </td>
                  <td className="px-2 text-xs tabular-nums">
                    {kind === "material" ? (
                      <>
                        {r.quantity ?? 0} {r.unit}
                        {r.unit_cost_cents != null && ` · ${money(r.unit_cost_cents)}/${r.unit}`}
                        {supplierName(r.supplier_id) && (
                          <span className="block text-muted-foreground">
                            {supplierName(r.supplier_id)}
                          </span>
                        )}
                      </>
                    ) : (
                      r.document || "—"
                    )}
                  </td>
                  <td className="px-4 text-right">
                    <button
                      type="button"
                      aria-label={`Editar ${r.name}`}
                      onClick={() => edit(r)}
                      className={btn.icon}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Excluir ${r.name}`}
                      onClick={() => void remove(r)}
                      className={btn.icon}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    {rows.some((r) => r.kind === kind)
                      ? "Nada encontrado."
                      : `Cadastre o primeiro ${LABEL[kind][1]} para montar o seu banco de dados.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      {draft && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cadastro"
          className="fixed inset-0 z-[80] flex justify-end bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setDraft(null)}
        >
          <form
            onSubmit={(e) => void save(e)}
            className="nv-fade-in flex h-full w-full max-w-md flex-col overflow-y-auto bg-card shadow-2xl"
          >
            <header className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-4">
              <h2 className="text-base font-bold">
                {draft.id ? "Editar" : "Novo"} {LABEL[kind][1]}
              </h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setDraft(null)}
                className={btn.icon}
              >
                <X size={17} />
              </button>
            </header>
            <div className="grid gap-3 p-5">
              {(
                [
                  ["name", "Nome", ""],
                  ["phone", "Telefone", "Para contato interno"],
                  ["email", "E-mail", ""],
                  ["document", "CPF / CNPJ", "Opcional"],
                  ["address", "Endereço", ""],
                ] as [keyof Draft, string, string][]
              ).map(([k, l, ph]) => (
                <label key={k} className="text-[13px] font-semibold">
                  {l}
                  <input
                    className={inputCls}
                    value={draft[k] as string}
                    placeholder={ph}
                    maxLength={k === "name" ? 120 : 200}
                    onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                  />
                </label>
              ))}
              {kind === "material" && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="text-[13px] font-semibold">
                      Quantidade
                      <input
                        className={inputCls}
                        inputMode="decimal"
                        value={draft.quantity}
                        onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                      />
                    </label>
                    <label className="text-[13px] font-semibold">
                      Unidade
                      <input
                        className={inputCls}
                        value={draft.unit}
                        maxLength={10}
                        onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                      />
                    </label>
                    <label className="text-[13px] font-semibold">
                      Custo unit.
                      <input
                        className={inputCls}
                        inputMode="decimal"
                        value={draft.cost}
                        onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
                      />
                    </label>
                  </div>
                  <label className="text-[13px] font-semibold">
                    Fornecedor
                    <select
                      className={inputCls}
                      value={draft.supplier}
                      onChange={(e) => setDraft({ ...draft, supplier: e.target.value })}
                    >
                      <option value="">Sem fornecedor</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <label className="text-[13px] font-semibold">
                Observações
                <textarea
                  className={`${inputCls} h-20 py-2`}
                  maxLength={500}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </label>
              {err && (
                <p
                  role="alert"
                  className="bg-rose-500/10 p-2.5 text-sm text-rose-700 dark:text-rose-300"
                >
                  {err}
                </p>
              )}
            </div>
            <footer className="sticky bottom-0 mt-auto flex justify-end gap-2 border-t border-border bg-card px-5 py-3">
              <button type="button" onClick={() => setDraft(null)} className={btn.ghost}>
                Cancelar
              </button>
              <button type="submit" className={btn.primary}>
                Salvar
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
