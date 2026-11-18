import { useMemo, useState, type FormEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import { money, parseMoney, type CashEntry, type Vendor } from "@/lib/marketplace";
import { btn, fmtDate, inputCls, Panel } from "./shared";

type Range = "hoje" | "7d" | "mes" | "tudo";
const dayKey = (d: Date | string) => new Date(d).toLocaleDateString("sv-SE", { timeZone: "America/Rio_Branco" });
const CATS = { entrada: ["venda balcão", "aporte", "outros"], saida: ["fornecedor", "aluguel", "salários", "embalagem", "frete", "despesa fixa", "retirada do dono", "outros"] };

export function SellerCash({ vendor, cash, onChanged }: { vendor: Vendor; cash: CashEntry[]; onChanged: () => void }) {
  const [range, setRange] = useState<Range>("mes");
  const [kind, setKind] = useState<"entrada" | "saida">("saida");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("fornecedor");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");
  const { confirm } = useDialog();

  const list = useMemo(() => {
    const today = dayKey(new Date());
    const week = Date.now() - 7 * 86_400_000;
    return cash.filter((c) => range === "tudo" || (range === "hoje" ? dayKey(c.occurred_at) === today : range === "7d" ? new Date(c.occurred_at).getTime() >= week : dayKey(c.occurred_at).slice(0, 7) === today.slice(0, 7)));
  }, [cash, range]);
  const sum = (k: "entrada" | "saida", cat?: string) => list.filter((c) => c.kind === k && (!cat || c.category === cat)).reduce((a, c) => a + c.amount_cents, 0);
  const inn = sum("entrada"); const out = sum("saida"); const fee = sum("saida", "comissão NextVita") - sum("entrada", "comissão NextVita");
  const balance = cash.reduce((a, c) => a + (c.kind === "entrada" ? c.amount_cents : -c.amount_cents), 0);

  async function add(e: FormEvent) {
    e.preventDefault();
    const cents = parseMoney(amount);
    if (!cents) return setErr("Informe um valor válido, por exemplo 120,00.");
    setErr("");
    const { error } = await (supabase as any).from("care_store_cash_entries").insert({ vendor_id: vendor.id, kind, amount_cents: cents, category, description: desc.trim() || null });
    if (error) return setErr("Não foi possível lançar. Tente de novo.");
    setAmount(""); setDesc(""); onChanged();
  }
  async function remove(c: CashEntry) {
    if (!(await confirm("Apagar este lançamento?", `${c.kind === "entrada" ? "Entrada" : "Saída"} de ${money(c.amount_cents)} · ${c.category}. Não dá para desfazer.`, true, "Apagar"))) return;
    await (supabase as any).from("care_store_cash_entries").delete().eq("id", c.id);
    onChanged();
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-2 rounded-2xl p-4 text-white lg:col-span-1" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-store) 80%, #000), #0b1220)" }}>
          <p className="flex items-center gap-1.5 text-xs text-white/70"><Wallet size={14} /> Saldo do caixa</p>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{money(balance)}</p>
          <p className="text-[11px] text-white/60">desde o primeiro lançamento</p>
        </div>
        {[["Entradas", inn, "text-emerald-600 dark:text-emerald-300"], ["Saídas", out, "text-rose-600 dark:text-rose-300"], ["Contribuição NextVita", fee, "text-muted-foreground"]].map(([l, v, tone]) => (
          <div key={l as string} className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{l as string} no período</p><p className={`mt-1 font-display text-xl font-extrabold tabular-nums ${tone}`}>{money(v as number)}</p></div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title="Lançamentos" action={
          <div role="group" aria-label="Período" className="flex gap-1">
            {(["hoje", "7d", "mes", "tudo"] as Range[]).map((r) => <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)} className={`h-7 rounded-md px-2 text-xs font-semibold ${range === r ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}>{{ hoje: "Hoje", "7d": "7 dias", mes: "Mês", tudo: "Tudo" }[r]}</button>)}
          </div>}>
          <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto">
            {list.map((c) => (
              <li key={c.id} className="group flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${c.kind === "entrada" ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300" : "bg-rose-500/12 text-rose-600 dark:text-rose-300"}`}>{c.kind === "entrada" ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span>
                <span className="min-w-0 flex-1"><strong className="block truncate font-semibold capitalize">{c.category}</strong><span className="block truncate text-xs text-muted-foreground">{c.description ?? "—"} · {fmtDate(c.occurred_at)}</span></span>
                <span className={`font-bold tabular-nums ${c.kind === "entrada" ? "text-emerald-600 dark:text-emerald-300" : ""}`}>{c.kind === "entrada" ? "+" : "−"}{money(c.amount_cents)}</span>
                {!c.order_id ? <button type="button" onClick={() => void remove(c)} aria-label="Apagar lançamento" className={`${btn.icon} opacity-0 group-hover:opacity-100 focus:opacity-100`}><Trash2 size={14} /></button> : <span className="w-8" title="Gerado pelo pedido" />}
              </li>
            ))}
            {!list.length && <li className="px-4 py-10 text-center text-sm text-muted-foreground">Sem lançamentos no período.</li>}
          </ul>
        </Panel>

        <Panel title="Novo lançamento">
          <form onSubmit={add} className="grid gap-3 p-4">
            <div role="group" aria-label="Tipo" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(["entrada", "saida"] as const).map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); setCategory(CATS[k][0]); }} className={`h-8 rounded-md text-xs font-semibold transition ${kind === k ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{k === "entrada" ? "Entrada" : "Saída"}</button>)}
            </div>
            <label className="text-[13px] font-semibold">Valor<input className={inputCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></label>
            <label className="text-[13px] font-semibold">Categoria<select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>{CATS[kind].map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
            <label className="text-[13px] font-semibold">Descrição<input className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={160} placeholder="Opcional" /></label>
            {err && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{err}</p>}
            <button type="submit" className={btn.primary}><Plus size={15} /> Lançar</button>
            <p className="text-[11px] leading-snug text-muted-foreground">Vendas pagas entram sozinhas, já com a contribuição do plano descontada como saída.</p>
          </form>
        </Panel>
      </div>
    </div>
  );
}
