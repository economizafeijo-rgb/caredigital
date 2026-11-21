import { useMemo, useState, type FormEvent } from "react";
import { History, ImagePlus, Minus, Package, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import {
  categoryName,
  centsToInput,
  productStatus,
  type ProductColor,
  money,
  parseMoney,
  PRODUCT_CATEGORIES,
  type StockMove,
  type Vendor,
  type VendorProduct,
} from "@/lib/marketplace";
import { btn, fmtDate, inputCls, Panel } from "./shared";

const UNITS = ["un", "kg", "g", "l", "ml", "par", "kit", "cx"];
const REASON: Record<string, string> = {
  venda: "Venda",
  cancelamento: "Pedido cancelado",
  ajuste: "Ajuste manual",
  "estoque inicial": "Estoque inicial",
  entrada: "Entrada de mercadoria",
  perda: "Perda ou avaria",
};

/** Envia uma imagem para a pasta da loja e devolve o link público. */
export async function uploadStoreImage(vendorId: string, file: File, prefix: string) {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error("Use PNG, JPG ou WEBP.");
  if (file.size > 2 * 1024 * 1024) throw new Error("A imagem precisa ter até 2 MB.");
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${vendorId}/${prefix}-${Date.now()}.${ext}`;
  const st = (supabase as any).storage.from("store-media");
  const { error } = await st.upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error("Não foi possível enviar a imagem.");
  return st.getPublicUrl(path).data.publicUrl as string;
}

type Draft = {
  id?: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  price: string;
  old: string;
  cost: string;
  stock: string;
  min: string;
  unit: string;
  image: string;
  active: boolean;
  colors: ProductColor[];
  limit: string;
  availability: "auto" | "indisponivel" | "esgotado";
  featured: boolean;
};
const blank: Draft = {
  name: "",
  sku: "",
  category: "suplementos",
  description: "",
  price: "",
  old: "",
  cost: "",
  stock: "0",
  min: "3",
  unit: "un",
  image: "",
  active: true,
  colors: [],
  limit: "",
  availability: "auto",
  featured: false,
};

export function SellerProducts({
  vendor,
  products,
  moves,
  onChanged,
}: {
  vendor: Vendor;
  products: VendorProduct[];
  moves: StockMove[];
  onChanged: () => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("todos");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMoves, setShowMoves] = useState(false);
  const [msg, setMsg] = useState("");
  const { confirm, prompt } = useDialog();

  const cats = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const shown = useMemo(
    () =>
      products.filter(
        (p) =>
          (cat === "todos" || p.category === cat) &&
          (!q.trim() ||
            `${p.name} ${p.sku ?? ""} ${p.code ?? ""}`
              .toLowerCase()
              .includes(q.trim().toLowerCase())),
      ),
    [products, cat, q],
  );
  const stockValue = products.reduce((a, p) => a + p.stock * (p.cost_cents ?? p.price_cents), 0);
  const names = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.name])), [products]);

  const edit = (p: VendorProduct) =>
    setDraft({
      id: p.id,
      name: p.name,
      sku: p.sku ?? "",
      category: p.category,
      description: p.description ?? "",
      price: centsToInput(p.price_cents),
      old: centsToInput(p.old_price_cents),
      cost: centsToInput(p.cost_cents),
      stock: String(p.stock),
      min: String(p.min_stock ?? 3),
      unit: p.unit ?? "un",
      image: p.image_url ?? "",
      active: p.active,
      colors: p.colors ?? [],
      limit: p.display_limit ? String(p.display_limit) : "",
      availability: p.availability ?? "auto",
      featured: !!p.featured,
    });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const price = parseMoney(draft.price);
    const old = draft.old.trim() ? parseMoney(draft.old) : null;
    const cost = draft.cost.trim() ? parseMoney(draft.cost) : null;
    const stock = Number(draft.stock);
    const min = Number(draft.min);
    if (draft.name.trim().length < 2) return setErr("Informe o nome do produto.");
    if (!price) return setErr("Informe um preço válido, por exemplo 49,90.");
    if (draft.old.trim() && (old === null || old <= price))
      return setErr("O preço antigo precisa ser maior que o preço atual.");
    if (!Number.isInteger(stock) || stock < 0)
      return setErr("O estoque precisa ser um número inteiro a partir de 0.");
    if (draft.limit.trim() && (!Number.isInteger(Number(draft.limit)) || Number(draft.limit) < 1))
      return setErr("O limite de exibição precisa ser um número a partir de 1.");
    if (draft.image && !/^https:\/\//.test(draft.image))
      return setErr("A imagem precisa ser um link https ou um arquivo enviado.");
    setErr("");
    setSaving(true);
    const row = {
      name: draft.name.trim(),
      sku: draft.sku.trim() || null,
      category: draft.category,
      description: draft.description.trim() || null,
      price_cents: price,
      old_price_cents: old,
      cost_cents: cost,
      stock,
      min_stock: Number.isInteger(min) && min >= 0 ? min : 3,
      unit: draft.unit,
      image_url: draft.image || null,
      active: draft.active,
      colors: draft.colors
        .filter((c) => c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          hex: c.hex,
          stock: Math.max(0, Math.floor(c.stock) || 0),
        })),
      display_limit: draft.limit.trim() ? Number(draft.limit) : null,
      availability: draft.availability,
      featured: draft.featured,
      updated_at: new Date().toISOString(),
    };
    const db = (supabase as any).from("care_store_products");
    const { error } = draft.id
      ? await db.update(row).eq("id", draft.id)
      : await db.insert({ ...row, vendor_id: vendor.id });
    setSaving(false);
    if (error) return setErr("Não foi possível salvar. Confira os campos e tente de novo.");
    setDraft(null);
    setMsg(draft.id ? "Produto atualizado." : "Produto cadastrado.");
    onChanged();
  }
  async function adjust(p: VendorProduct, delta: number) {
    const { error } = await (supabase as any)
      .from("care_store_products")
      .update({ stock: Math.max(0, p.stock + delta), updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) setMsg("Não foi possível ajustar o estoque.");
    else onChanged();
  }
  async function receive(p: VendorProduct) {
    const v = await prompt(
      `Entrada de mercadoria · ${p.name}`,
      "Quantas unidades chegaram?",
      "Ex.: 12",
    );
    const n = Number(v);
    if (!v || !Number.isInteger(n) || n <= 0) return;
    await adjust(p, n);
    setMsg(`${n} ${p.unit ?? "un"} adicionadas a ${p.name}.`);
  }
  async function remove(p: VendorProduct) {
    if (
      !(await confirm(
        `Excluir ${p.name}?`,
        "O produto sai da loja e do painel. Pedidos antigos continuam com o nome e o preço da época. Não dá para desfazer.",
        true,
        "Excluir produto",
      ))
    )
      return;
    const { error } = await (supabase as any).from("care_store_products").delete().eq("id", p.id);
    if (error) setMsg("Não foi possível excluir.");
    else {
      setMsg("Produto excluído.");
      onChanged();
    }
  }
  async function upload(file?: File) {
    if (!file || !draft) return;
    try {
      const url = await uploadStoreImage(vendor.id, file, "produto");
      setDraft({ ...draft, image: url });
      setErr("");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Produtos", String(products.length)],
          ["Ativos na loja", String(products.filter((p) => p.active).length)],
          [
            "Estoque baixo",
            String(products.filter((p) => p.stock > 0 && p.stock <= (p.min_stock ?? 3)).length),
          ],
          [
            "Esgotados / indisponíveis",
            String(products.filter((p) => !productStatus(p).buyable).length),
          ],
          ["Valor em estoque", money(stockValue)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="font-display text-lg font-extrabold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produto ou código"
            aria-label="Buscar produto"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="Categoria"
          className="h-10 rounded-lg border border-border bg-card px-2.5 text-sm"
        >
          <option value="todos">Todas as categorias</option>
          {cats.map((c) => (
            <option key={c} value={c}>
              {categoryName(c)}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setShowMoves((v) => !v)} className={btn.ghost}>
          <History size={15} /> Movimentações
        </button>
        <button type="button" onClick={() => setDraft({ ...blank })} className={btn.primary}>
          <Plus size={15} /> Novo produto
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className={msg ? "rounded-lg bg-muted px-3 py-2 text-sm" : "sr-only"}
      >
        {msg}
      </p>

      {showMoves && (
        <Panel
          title="Movimentações de estoque"
          action={
            <button
              type="button"
              onClick={() => setShowMoves(false)}
              aria-label="Fechar"
              className={btn.icon}
            >
              <X size={15} />
            </button>
          }
        >
          <ul className="max-h-72 divide-y divide-border overflow-y-auto text-[13px]">
            {moves.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-2">
                <span
                  className={`w-12 text-right font-bold tabular-nums ${m.delta > 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}
                >
                  {m.delta > 0 ? "+" : ""}
                  {m.delta}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {names[m.product_id] ?? "Produto excluído"}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {REASON[m.reason] ?? m.reason}
                </span>
                <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                  fica {m.stock_after}
                </span>
                <span className="hidden w-28 text-right text-xs text-muted-foreground md:inline">
                  {fmtDate(m.created_at)}
                </span>
              </li>
            ))}
            {!moves.length && (
              <li className="px-4 py-6 text-center text-muted-foreground">
                Sem movimentações ainda.
              </li>
            )}
          </ul>
        </Panel>
      )}

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Produto</th>
                <th className="px-2 font-medium">Preço</th>
                <th className="px-2 font-medium">Margem</th>
                <th className="px-2 font-medium">Estoque</th>
                <th className="px-2 font-medium">Na loja</th>
                <th className="px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((p) => {
                const margin = p.cost_cents
                  ? Math.round(((p.price_cents - p.cost_cents) / p.price_cents) * 100)
                  : null;
                const low = p.stock <= (p.min_stock ?? 3);
                return (
                  <tr key={p.id} className="group hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt=""
                            loading="lazy"
                            className="size-10 shrink-0 rounded-lg bg-muted object-cover"
                          />
                        ) : (
                          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
                            <Package size={16} />
                          </span>
                        )}
                        <span className="min-w-0">
                          <strong className="block truncate font-semibold">{p.name}</strong>
                          <span className="text-xs text-muted-foreground">
                            {p.code ? `${p.code} · ` : ""}
                            {p.sku ? `${p.sku} · ` : ""}
                            {categoryName(p.category)}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-2 tabular-nums">
                      <strong>{money(p.price_cents)}</strong>
                      {p.old_price_cents && (
                        <span className="block text-[11px] text-muted-foreground line-through">
                          {money(p.old_price_cents)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 tabular-nums text-muted-foreground">
                      {margin !== null ? `${margin}%` : "—"}
                    </td>
                    <td className="px-2">
                      <div className="inline-flex items-center rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() => void adjust(p, -1)}
                          disabled={p.stock === 0}
                          aria-label={`Tirar 1 de ${p.name}`}
                          className="grid size-7 place-items-center rounded-l-lg hover:bg-muted disabled:opacity-40"
                        >
                          <Minus size={12} />
                        </button>
                        <span
                          className={`min-w-10 px-1 text-center text-[12.5px] font-bold tabular-nums ${p.stock === 0 ? "text-rose-600 dark:text-rose-300" : low ? "text-amber-600 dark:text-amber-300" : ""}`}
                        >
                          {p.stock}
                        </span>
                        <button
                          type="button"
                          onClick={() => void adjust(p, 1)}
                          aria-label={`Somar 1 a ${p.name}`}
                          className="grid size-7 place-items-center rounded-r-lg hover:bg-muted"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void receive(p)}
                        className="ml-2 text-xs font-semibold text-primary hover:underline"
                      >
                        Entrada
                      </button>
                    </td>
                    <td className="px-2">
                      {(() => {
                        const st = productStatus(p);
                        const tone = !p.active
                          ? "bg-muted text-muted-foreground"
                          : st.key === "ok"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : st.key === "indisponivel"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-300";
                        return (
                          <>
                            <span
                              className={`inline-block px-2 py-0.5 text-[11px] font-semibold ${tone}`}
                            >
                              {p.active ? st.label : "Oculto"}
                            </span>
                            {p.active && st.key === "ok" && p.display_limit && (
                              <span className="mt-0.5 block text-[10.5px] text-muted-foreground">
                                limite {p.display_limit} no site
                              </span>
                            )}
                            {!!p.colors?.length && (
                              <span className="mt-1 flex gap-0.5">
                                {p.colors.slice(0, 6).map((c) => (
                                  <span
                                    key={c.name}
                                    title={`${c.name} · ${c.stock}`}
                                    className={`size-3 border border-border ${c.stock <= 0 ? "opacity-30" : ""}`}
                                    style={{ background: c.hex }}
                                  />
                                ))}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-4 text-right">
                      <button
                        type="button"
                        onClick={() => edit(p)}
                        aria-label={`Editar ${p.name}`}
                        className={btn.icon}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(p)}
                        aria-label={`Excluir ${p.name}`}
                        className={btn.icon}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!shown.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    {products.length
                      ? "Nenhum produto neste filtro."
                      : "Cadastre o primeiro produto para abrir a vitrine."}
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
          aria-labelledby="prod-form-title"
          className="fixed inset-0 z-[80] flex justify-end bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDraft(null);
          }}
        >
          <form
            onSubmit={save}
            className="nv-fade-in flex h-full w-full max-w-lg flex-col overflow-y-auto bg-card shadow-2xl"
          >
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
              <h2 id="prod-form-title" className="text-base font-bold">
                {draft.id ? "Editar produto" : "Novo produto"}
              </h2>
              <button
                type="button"
                onClick={() => setDraft(null)}
                aria-label="Fechar"
                className={btn.icon}
              >
                <X size={17} />
              </button>
            </header>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <div className="flex items-center gap-3 sm:col-span-2">
                <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                  {draft.image ? (
                    <img src={draft.image} alt="" className="size-full object-cover" />
                  ) : (
                    <ImagePlus size={20} className="text-muted-foreground" />
                  )}
                </span>
                <div className="grid gap-1.5 text-xs">
                  <label className={`${btn.ghost} cursor-pointer`}>
                    <ImagePlus size={14} /> Enviar foto
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => void upload(e.target.files?.[0])}
                    />
                  </label>
                  <span className="text-muted-foreground">
                    PNG, JPG ou WEBP até 2 MB, de preferência quadrada.
                  </span>
                </div>
              </div>
              <label className="text-[13px] font-semibold sm:col-span-2">
                Nome
                <input
                  className={inputCls}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  maxLength={120}
                />
              </label>
              <label className="text-[13px] font-semibold">
                Categoria
                <select
                  className={inputCls}
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[13px] font-semibold">
                Código (SKU)
                <input
                  className={inputCls}
                  value={draft.sku}
                  onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                  maxLength={40}
                  placeholder="Opcional"
                />
              </label>
              <label className="text-[13px] font-semibold">
                Preço de venda
                <input
                  className={inputCls}
                  inputMode="decimal"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                  placeholder="49,90"
                />
              </label>
              <label className="text-[13px] font-semibold">
                Preço antigo
                <input
                  className={inputCls}
                  inputMode="decimal"
                  value={draft.old}
                  onChange={(e) => setDraft({ ...draft, old: e.target.value })}
                  placeholder="Para mostrar desconto"
                />
              </label>
              <label className="text-[13px] font-semibold">
                Custo
                <input
                  className={inputCls}
                  inputMode="decimal"
                  value={draft.cost}
                  onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
                  placeholder="Para calcular a margem"
                />
              </label>
              <label className="text-[13px] font-semibold">
                Unidade
                <select
                  className={inputCls}
                  value={draft.unit}
                  onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                >
                  {UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
              <label className="text-[13px] font-semibold">
                Estoque
                <input
                  className={inputCls}
                  inputMode="numeric"
                  value={draft.stock}
                  onChange={(e) => setDraft({ ...draft, stock: e.target.value.replace(/\D/g, "") })}
                />
              </label>
              <label className="text-[13px] font-semibold">
                Avisar quando chegar a
                <input
                  className={inputCls}
                  inputMode="numeric"
                  value={draft.min}
                  onChange={(e) => setDraft({ ...draft, min: e.target.value.replace(/\D/g, "") })}
                />
              </label>
              <label className="text-[13px] font-semibold">
                Limite no site (por pedido)
                <input
                  className={inputCls}
                  inputMode="numeric"
                  value={draft.limit}
                  onChange={(e) => setDraft({ ...draft, limit: e.target.value.replace(/\D/g, "") })}
                  placeholder="Sem limite"
                />
              </label>
              <label className="text-[13px] font-semibold">
                Disponibilidade
                <select
                  className={inputCls}
                  value={draft.availability}
                  onChange={(e) =>
                    setDraft({ ...draft, availability: e.target.value as Draft["availability"] })
                  }
                >
                  <option value="auto">Automática (pelo estoque)</option>
                  <option value="indisponivel">Indisponível no momento</option>
                  <option value="esgotado">Esgotado</option>
                </select>
              </label>
              <fieldset className="grid gap-2 sm:col-span-2">
                <legend className="text-[13px] font-semibold">Cores</legend>
                {draft.colors.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Cor"
                      value={c.hex}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          colors: draft.colors.map((x, j) =>
                            j === i ? { ...x, hex: e.target.value } : x,
                          ),
                        })
                      }
                      className="h-9 w-10 shrink-0 border border-border bg-transparent"
                    />
                    <input
                      className={inputCls}
                      aria-label="Nome da cor"
                      placeholder="Nome (ex.: Preto)"
                      maxLength={24}
                      value={c.name}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          colors: draft.colors.map((x, j) =>
                            j === i ? { ...x, name: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <input
                      className={`${inputCls} !w-20 shrink-0`}
                      aria-label="Quantidade desta cor"
                      inputMode="numeric"
                      placeholder="Qtd"
                      value={c.stock}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          colors: draft.colors.map((x, j) =>
                            j === i
                              ? { ...x, stock: Number(e.target.value.replace(/\D/g, "")) || 0 }
                              : x,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      aria-label="Remover cor"
                      onClick={() =>
                        setDraft({ ...draft, colors: draft.colors.filter((_, j) => j !== i) })
                      }
                      className={btn.icon}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {draft.colors.length < 12 && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        colors: [...draft.colors, { name: "", hex: "#111827", stock: 0 }],
                      })
                    }
                    className={`${btn.ghost} w-fit`}
                  >
                    <Plus size={14} /> Adicionar cor
                  </button>
                )}
              </fieldset>
              <label className="text-[13px] font-semibold sm:col-span-2">
                Descrição
                <textarea
                  className={`${inputCls} h-24 py-2`}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  maxLength={600}
                />
              </label>
              <label className="flex items-center gap-2 text-[13px] font-semibold sm:col-span-2">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                  className="size-4 accent-[var(--accent-store)]"
                />{" "}
                Mostrar na loja pública
              </label>
              <label className="flex items-center gap-2 text-[13px] font-semibold sm:col-span-2">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
                  className="size-4 accent-[var(--accent-store)]"
                />{" "}
                Destacar na vitrine
              </label>
              {err && (
                <p
                  role="alert"
                  className="rounded-lg bg-rose-500/10 p-2.5 text-sm text-rose-700 dark:text-rose-300 sm:col-span-2"
                >
                  {err}
                </p>
              )}
            </div>
            <footer className="sticky bottom-0 mt-auto flex justify-end gap-2 border-t border-border bg-card px-5 py-3">
              <button type="button" onClick={() => setDraft(null)} className={btn.ghost}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} className={btn.primary}>
                {saving ? "Salvando…" : draft.id ? "Salvar alterações" : "Cadastrar produto"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
