import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, Landmark, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import { COUNTED, money, parseMoney, type Invoice, type VendorOrder } from "@/lib/marketplace";

type Entry = { id: string; kind: "receita" | "despesa"; amount_cents: number; category: string; description: string | null; occurred_on: string };
const CATS = { receita: ["mensalidade", "comissão recebida", "anúncio", "serviço", "outros"], despesa: ["hospedagem", "domínio", "marketing", "taxas de pagamento", "equipe", "impostos", "outros"] };
const monthNow = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 7);
const inputCls = "mt-1 block h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-sm";

/** Receitas e despesas da plataforma: contribuição das lojas (calculada das vendas) e lançamentos do administrador. */
export function AdminFinance() {
  const { confirm } = useDialog();
  const [period, setPeriod] = useState(monthNow());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [kind, setKind] = useState<"receita" | "despesa">("despesa");
  const [amount, setAmount] = useState(""); const [category, setCategory] = useState("hospedagem"); const [desc, setDesc] = useState(""); const [date, setDate] = useState(new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10));
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const db = supabase as any;
    const [l, o, i] = await Promise.all([
      db.from("care_platform_ledger").select("*").order("occurred_on", { ascending: false }).limit(1000),
      db.from("care_store_orders").select("id,status,total_cents,commission_cents,paid_at,created_at,vendor_id").not("vendor_id", "is", null).limit(5000),
      db.from("care_store_vendor_invoices").select("*").limit(1000),
    ]);
    setEntries(l.data ?? []); setOrders(o.data ?? []); setInvoices(i.data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const s = useMemo(() => {
    const inMonth = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "America/Rio_Branco" }).startsWith(period);
    const commission = orders.filter((o) => COUNTED.includes(o.status) && inMonth(o.paid_at ?? o.created_at)).reduce((a, o) => a + o.commission_cents, 0);
    const fees = invoices.filter((i) => i.period === period).reduce((a, i) => a + i.monthly_fee_cents, 0);
    const received = invoices.filter((i) => i.period === period && i.status === "pago").reduce((a, i) => a + i.total_due_cents, 0);
    const list = entries.filter((e) => e.occurred_on.startsWith(period));
    const otherIn = list.filter((e) => e.kind === "receita").reduce((a, e) => a + e.amount_cents, 0);
    const out = list.filter((e) => e.kind === "despesa").reduce((a, e) => a + e.amount_cents, 0);
    const revenue = commission + fees + otherIn;
    return { commission, fees, received, otherIn, out, revenue, result: revenue - out, list };
  }, [orders, invoices, entries, period]);

  async function add(e: FormEvent) {
    e.preventDefault();
    const cents = parseMoney(amount);
    if (!cents) return setErr("Informe um valor válido.");
    setErr("");
    const { error } = await (supabase as any).from("care_platform_ledger").insert({ kind, amount_cents: cents, category, description: desc.trim() || null, occurred_on: date });
    if (error) return setErr("Não foi possível lançar.");
    setAmount(""); setDesc(""); void load();
  }
  async function remove(x: Entry) {
    if (!(await confirm("Apagar lançamento?", `${x.kind === "receita" ? "Receita" : "Despesa"} de ${money(x.amount_cents)} · ${x.category}. Não dá para desfazer.`, true, "Apagar"))) return;
    await (supabase as any).from("care_platform_ledger").delete().eq("id", x.id); void load();
  }

  return (
    <section aria-label="Receitas e despesas da plataforma" className="grid gap-3 rounded-3xl border border-border bg-card/60 p-3 shadow-card sm:p-5">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2"><span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white"><Landmark size={20} /></span><div><p className="text-[11px] font-bold text-primary">Financeiro</p><h2 className="text-lg font-extrabold leading-tight">Receitas e despesas da plataforma</h2></div></div>
        <label className="text-[11px] font-semibold">Mês<input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-0.5 block h-10 rounded-lg border border-border bg-surface px-2 text-sm" /></label>
      </header>
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">
        {[["Contribuição das vendas", s.commission, ""], ["Mensalidades do mês", s.fees, ""], ["Outras receitas", s.otherIn, ""], ["Despesas", s.out, "text-rose-600 dark:text-rose-300"], ["Resultado", s.result, s.result >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"]].map(([l, v, tone]) => (
          <div key={l as string} className="rounded-2xl border border-border bg-card p-3.5"><p className="text-[11.5px] text-muted-foreground">{l as string}</p><p className={`mt-1 text-lg font-extrabold tabular-nums ${tone}`}>{money(v as number)}</p></div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Recebido de cobranças fechadas neste mês: <strong className="text-foreground">{money(s.received)}</strong>. A contribuição de cada venda paga é calculada pelo plano da loja.</p>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <ul className="max-h-96 divide-y divide-border overflow-y-auto rounded-2xl border border-border bg-card">
          {s.list.map((x) => (
            <li key={x.id} className="group flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
              <span className={`grid size-8 place-items-center rounded-lg ${x.kind === "receita" ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300" : "bg-rose-500/12 text-rose-600 dark:text-rose-300"}`}>{x.kind === "receita" ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span>
              <span className="min-w-0 flex-1"><strong className="block truncate font-semibold capitalize">{x.category}</strong><span className="text-xs text-muted-foreground">{x.description ?? "—"} · {x.occurred_on.split("-").reverse().join("/")}</span></span>
              <span className="font-bold tabular-nums">{x.kind === "receita" ? "+" : "−"}{money(x.amount_cents)}</span>
              <button type="button" onClick={() => void remove(x)} aria-label="Apagar lançamento" className="grid size-8 place-items-center rounded-lg text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100 focus:opacity-100"><Trash2 size={14} /></button>
            </li>
          ))}
          {!s.list.length && <li className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum lançamento manual neste mês.</li>}
        </ul>
        <form onSubmit={add} className="grid content-start gap-2.5 rounded-2xl border border-border bg-card p-3.5">
          <div role="group" aria-label="Tipo" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(["receita", "despesa"] as const).map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); setCategory(CATS[k][0]); }} className={`h-8 rounded-md text-xs font-semibold ${kind === k ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{k === "receita" ? "Receita" : "Despesa"}</button>)}
          </div>
          <label className="text-[12.5px] font-semibold">Valor<input className={inputCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></label>
          <label className="text-[12.5px] font-semibold">Categoria<select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>{CATS[kind].map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="text-[12.5px] font-semibold">Data<input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="text-[12.5px] font-semibold">Descrição<input className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={200} /></label>
          {err && <p role="alert" className="text-xs text-rose-600">{err}</p>}
          <button type="submit" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground"><Plus size={15} /> Lançar</button>
        </form>
      </div>
    </section>
  );
}
