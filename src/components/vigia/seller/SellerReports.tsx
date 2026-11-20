import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, Lock, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  money,
  parseMoney,
  type CashEntry,
  type Vendor,
  type VendorOrder,
} from "@/lib/marketplace";
import { btn, inputCls, Panel } from "./shared";

type Period = "dia" | "mes" | "semestre" | "ano";
type Closing = {
  id: string;
  day: string;
  entradas_cents: number;
  saidas_cents: number;
  expected_cents: number;
  counted_cents: number;
  diff_cents: number;
  notes: string | null;
};
const TZ = "America/Rio_Branco";
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
const dayOf = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
const br = (d: string) => d.split("-").reverse().join("/");
const PAID = ["pago", "separando", "pronto", "enviado", "entregue"];

/** Intervalo [início, fim) em datas ISO (dia civil de Rio Branco) para cada período. */
function range(p: Period, day: string, month: string, year: string, half: 1 | 2) {
  if (p === "dia") {
    const next = new Date(`${day}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return { from: day, to: next.toISOString().slice(0, 10), label: br(day) };
  }
  if (p === "mes") {
    const [y, m] = month.split("-").map(Number);
    const to = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    return { from: `${month}-01`, to, label: `${String(m).padStart(2, "0")}/${y}` };
  }
  if (p === "semestre")
    return half === 1
      ? { from: `${year}-01-01`, to: `${year}-07-01`, label: `1º semestre de ${year}` }
      : { from: `${year}-07-01`, to: `${Number(year) + 1}-01-01`, label: `2º semestre de ${year}` };
  return { from: `${year}-01-01`, to: `${Number(year) + 1}-01-01`, label: `Ano de ${year}` };
}
const rio = (d: string) => `${d}T00:00:00-05:00`;

/** Balanço por período, fechamento de caixa do dia e exportação em PDF (impressão) e CSV. */
export function SellerReports({ vendor }: { vendor: Vendor }) {
  const [period, setPeriod] = useState<Period>("dia");
  const [day, setDay] = useState(today());
  const [month, setMonth] = useState(today().slice(0, 7));
  const [year, setYear] = useState(today().slice(0, 4));
  const [half, setHalf] = useState<1 | 2>(new Date().getMonth() < 6 ? 1 : 2);
  const [cash, setCash] = useState<CashEntry[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [closings, setClosings] = useState<Closing[]>([]);
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const r = useMemo(() => range(period, day, month, year, half), [period, day, month, year, half]);

  const load = useCallback(async () => {
    const db = supabase as any;
    const [c, o, k] = await Promise.all([
      db
        .from("care_store_cash_entries")
        .select("*")
        .eq("vendor_id", vendor.id)
        .gte("occurred_at", rio(r.from))
        .lt("occurred_at", rio(r.to))
        .order("occurred_at")
        .limit(5000),
      db
        .from("care_store_orders")
        .select("*")
        .eq("vendor_id", vendor.id)
        .gte("created_at", rio(r.from))
        .lt("created_at", rio(r.to))
        .limit(5000),
      db
        .from("care_store_cash_closings")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("day", { ascending: false })
        .limit(60),
    ]);
    setCash(c.data ?? []);
    setOrders(o.data ?? []);
    setClosings(k.data ?? []);
  }, [vendor.id, r.from, r.to]);
  useEffect(() => {
    void load();
  }, [load]);

  const sum = (k: "entrada" | "saida") =>
    cash.filter((c) => c.kind === k).reduce((a, c) => a + c.amount_cents, 0);
  const inn = sum("entrada");
  const out = sum("saida");
  const paid = orders.filter((o) => PAID.includes(o.status));
  const sales = paid.reduce((a, o) => a + o.total_cents, 0);
  const ticket = paid.length ? Math.round(sales / paid.length) : 0;
  const cancelled = orders.filter((o) => o.status === "cancelado").length;
  const byCat = useMemo(() => {
    const m = new Map<string, { in: number; out: number }>();
    cash.forEach((c) => {
      const e = m.get(c.category) ?? { in: 0, out: 0 };
      if (c.kind === "entrada") e.in += c.amount_cents;
      else e.out += c.amount_cents;
      m.set(c.category, e);
    });
    return [...m.entries()].sort((a, b) => b[1].in + b[1].out - (a[1].in + a[1].out));
  }, [cash]);
  const top = useMemo(() => {
    const m = new Map<string, { qty: number; total: number }>();
    paid.forEach((o) =>
      o.items.forEach((i) => {
        const e = m.get(i.name) ?? { qty: 0, total: 0 };
        e.qty += i.qty;
        e.total += i.qty * i.price_cents;
        m.set(i.name, e);
      }),
    );
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8);
  }, [paid]);
  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    cash.forEach((c) =>
      m.set(
        dayOf(c.occurred_at),
        (m.get(dayOf(c.occurred_at)) ?? 0) +
          (c.kind === "entrada" ? c.amount_cents : -c.amount_cents),
      ),
    );
    return [...m.entries()].sort();
  }, [cash]);
  const closed = closings.find((c) => c.day === day);

  async function close(e: FormEvent) {
    e.preventDefault();
    const cents = parseMoney(counted);
    if (cents === null) return setMsg("Informe o valor contado no caixa, por exemplo 350,00.");
    const { error } = await (supabase as any).from("care_store_cash_closings").insert({
      vendor_id: vendor.id,
      day,
      entradas_cents: inn,
      saidas_cents: out,
      expected_cents: inn - out,
      counted_cents: cents,
      notes: notes.trim() || null,
    });
    if (error) return setMsg("Não foi possível fechar. Esse dia pode já estar fechado.");
    setMsg("Caixa fechado.");
    setCounted("");
    setNotes("");
    void load();
  }
  function csv() {
    const rows = [
      ["Data", "Tipo", "Categoria", "Descrição", "Valor (R$)"],
      ...cash.map((c) => [
        dayOf(c.occurred_at),
        c.kind,
        c.category,
        c.description ?? "",
        (c.amount_cents / 100).toFixed(2).replace(".", ","),
      ]),
    ];
    const body = rows
      .map((x) => x.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }));
    a.download = `relatorio-${vendor.slug}-${r.from}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));
  return (
    <div className="grid gap-4">
      <div className="nv-no-print flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Período do relatório" className="flex border border-border">
          {(
            [
              ["dia", "Diário"],
              ["mes", "Mensal"],
              ["semestre", "Semestral"],
              ["ano", "Anual"],
            ] as [Period, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={period === k}
              onClick={() => setPeriod(k)}
              className={`h-9 px-3 text-xs font-semibold ${period === k ? "bg-foreground text-background" : "hover:bg-muted"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {period === "dia" && (
          <input
            type="date"
            value={day}
            max={today()}
            onChange={(e) => e.target.value && setDay(e.target.value)}
            aria-label="Dia"
            className={`${inputCls} !w-auto`}
          />
        )}
        {period === "mes" && (
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            aria-label="Mês"
            className={`${inputCls} !w-auto`}
          />
        )}
        {(period === "semestre" || period === "ano") && (
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            aria-label="Ano"
            className={`${inputCls} !w-auto`}
          >
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        )}
        {period === "semestre" && (
          <select
            value={half}
            onChange={(e) => setHalf(Number(e.target.value) as 1 | 2)}
            aria-label="Semestre"
            className={`${inputCls} !w-auto`}
          >
            <option value={1}>1º semestre</option>
            <option value={2}>2º semestre</option>
          </select>
        )}
        <span className="ml-auto flex gap-2">
          <button type="button" onClick={csv} className={btn.ghost}>
            <Download size={15} /> Exportar CSV
          </button>
          <button type="button" onClick={() => window.print()} className={btn.primary}>
            <Printer size={15} /> Imprimir / salvar PDF
          </button>
        </span>
      </div>

      <div className="nv-print-area grid gap-4">
        <header className="border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Relatório{" "}
            {period === "dia"
              ? "diário"
              : period === "mes"
                ? "mensal"
                : period === "semestre"
                  ? "semestral"
                  : "anual"}
          </p>
          <h2 className="font-display text-xl font-extrabold">
            {vendor.name} · {r.label}
          </h2>
          <p className="text-xs text-muted-foreground">
            Emitido em {new Date().toLocaleString("pt-BR", { timeZone: TZ })} · horário do Acre
          </p>
        </header>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Entradas", money(inn), "text-emerald-600"],
            ["Saídas", money(out), "text-rose-600"],
            ["Resultado", money(inn - out), inn - out >= 0 ? "text-emerald-600" : "text-rose-600"],
            ["Pedidos pagos", `${paid.length} · ticket ${money(ticket)}`, ""],
          ].map(([l, v, t]) => (
            <div key={l} className="border border-border bg-card p-3.5">
              <p className="text-xs text-muted-foreground">{l}</p>
              <p className={`font-display text-lg font-extrabold tabular-nums ${t}`}>{v}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Por categoria">
            <table className="w-full text-[13px]">
              <tbody className="divide-y divide-border">
                {byCat.map(([c, v]) => (
                  <tr key={c}>
                    <td className="px-4 py-2 capitalize">{c}</td>
                    <td className="px-2 text-right tabular-nums text-emerald-600">
                      {v.in ? money(v.in) : ""}
                    </td>
                    <td className="px-4 text-right tabular-nums text-rose-600">
                      {v.out ? money(v.out) : ""}
                    </td>
                  </tr>
                ))}
                {!byCat.length && (
                  <tr>
                    <td className="px-4 py-6 text-center text-muted-foreground">
                      Sem lançamentos no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>
          <Panel title="Produtos mais vendidos">
            <table className="w-full text-[13px]">
              <tbody className="divide-y divide-border">
                {top.map(([n, v]) => (
                  <tr key={n}>
                    <td className="px-4 py-2">{n}</td>
                    <td className="px-2 text-right tabular-nums text-muted-foreground">
                      {v.qty} un
                    </td>
                    <td className="px-4 text-right font-semibold tabular-nums">{money(v.total)}</td>
                  </tr>
                ))}
                {!top.length && (
                  <tr>
                    <td className="px-4 py-6 text-center text-muted-foreground">
                      Sem vendas pagas no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {cancelled > 0 && (
              <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                {cancelled} pedido(s) cancelado(s) no período.
              </p>
            )}
          </Panel>
        </div>
        {period !== "dia" && (
          <Panel title="Resultado por dia">
            <ul className="grid max-h-72 divide-y divide-border overflow-y-auto text-[13px] sm:grid-cols-2">
              {byDay.map(([d, v]) => (
                <li key={d} className="flex justify-between px-4 py-1.5">
                  <span>{br(d)}</span>
                  <strong
                    className={`tabular-nums ${v >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {money(v)}
                  </strong>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        <Panel title="Lançamentos do período">
          <table className="w-full text-[12.5px]">
            <tbody className="divide-y divide-border">
              {cash.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-1.5 tabular-nums text-muted-foreground">
                    {br(dayOf(c.occurred_at))}
                  </td>
                  <td className="capitalize">{c.category}</td>
                  <td className="text-muted-foreground">{c.description}</td>
                  <td
                    className={`px-4 text-right tabular-nums ${c.kind === "entrada" ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {c.kind === "saida" ? "-" : ""}
                    {money(c.amount_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      {period === "dia" && (
        <Panel title={`Fechamento de caixa · ${br(day)}`}>
          <div className="nv-no-print grid gap-3 p-4">
            {closed ? (
              <p className="flex items-center gap-2 text-sm">
                <Lock size={15} /> Caixa fechado: esperado {money(closed.expected_cents)}, contado{" "}
                {money(closed.counted_cents)}, diferença{" "}
                <strong
                  className={
                    closed.diff_cents === 0
                      ? ""
                      : closed.diff_cents > 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                  }
                >
                  {money(closed.diff_cents)}
                </strong>
                .
              </p>
            ) : (
              <form
                onSubmit={(e) => void close(e)}
                className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end"
              >
                <label className="text-[13px] font-semibold">
                  Valor contado
                  <input
                    className={inputCls}
                    inputMode="decimal"
                    value={counted}
                    onChange={(e) => setCounted(e.target.value)}
                    placeholder={`Esperado ${money(inn - out)}`}
                  />
                </label>
                <label className="text-[13px] font-semibold">
                  Observação
                  <input
                    className={inputCls}
                    value={notes}
                    maxLength={300}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Opcional"
                  />
                </label>
                <button type="submit" className={btn.primary}>
                  <Lock size={15} /> Fechar caixa
                </button>
              </form>
            )}
            {msg && (
              <p role="status" className="text-xs text-muted-foreground">
                {msg}
              </p>
            )}
            {!!closings.length && (
              <ul className="divide-y divide-border border border-border text-[12.5px]">
                {closings.slice(0, 8).map((c) => (
                  <li key={c.id} className="flex flex-wrap justify-between gap-2 px-3 py-1.5">
                    <span>{br(c.day)}</span>
                    <span className="tabular-nums text-muted-foreground">
                      esperado {money(c.expected_cents)} · contado {money(c.counted_cents)}
                    </span>
                    <strong
                      className={`tabular-nums ${c.diff_cents === 0 ? "" : c.diff_cents > 0 ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {money(c.diff_cents)}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
