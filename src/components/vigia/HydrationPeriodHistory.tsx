import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreAddDays, acreDateKey, acreEndOfDay, acreStartOfDay } from "@/lib/acre-time";

type Period = "dia" | "semana" | "mes" | "ano";
type Row = { at: string; day: string; ml: number; name: string };

const PERIODS: { key: Period; label: string }[] = [
  { key: "dia", label: "Dia" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
  { key: "ano", label: "Ano" },
];

const timeOf = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Rio_Branco",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const dayLabel = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
  return `${weekday.replace(".", "")}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
};

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 15, 12)),
  );
};

/** Intervalo (chaves de dia AAAA-MM-DD, horário do Acre) do período escolhido. */
function rangeFor(period: Period, anchor: string): { from: string; to: string } {
  if (period === "dia") return { from: anchor, to: anchor };
  if (period === "semana") return { from: acreAddDays(anchor, -6), to: anchor };
  if (period === "mes") {
    const first = anchor.slice(0, 7) + "-01";
    const next = acreAddDays(first, 31).slice(0, 7) + "-01";
    return { from: first, to: acreAddDays(next, -1) };
  }
  const y = anchor.slice(0, 4);
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function shift(period: Period, anchor: string, dir: -1 | 1): string {
  if (period === "dia") return acreAddDays(anchor, dir);
  if (period === "semana") return acreAddDays(anchor, dir * 7);
  if (period === "mes") {
    const [y, m] = anchor.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + dir, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }
  return `${Number(anchor.slice(0, 4)) + dir}-01-01`;
}

function periodTitle(period: Period, anchor: string): string {
  if (period === "dia") return dayLabel(anchor);
  if (period === "semana") {
    const { from, to } = rangeFor(period, anchor);
    return `${from.slice(8)}/${from.slice(5, 7)} – ${to.slice(8)}/${to.slice(5, 7)}`;
  }
  if (period === "mes") return monthLabel(anchor);
  return anchor.slice(0, 4);
}

/**
 * Histórico de hidratação com filtros por dia, semana, mês e ano.
 * Mostra total e média do período; cada dia abre os registros com horário e volume.
 */
export function HydrationPeriodHistory({
  patientId,
  ownerId,
}: {
  patientId: string;
  ownerId: string;
}) {
  const [period, setPeriod] = useState<Period>("dia");
  const [anchor, setAnchor] = useState(() => acreDateKey());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const { from, to } = rangeFor(period, anchor);
    const start = acreStartOfDay(from).toISOString();
    const end = acreEndOfDay(to).toISOString();
    Promise.all([
      (supabase as any)
        .from("care_hydration")
        .select("id,amount_ml,recorded_at")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .gte("recorded_at", start)
        .lt("recorded_at", end)
        .order("recorded_at", { ascending: true })
        .limit(2000),
      (supabase as any)
        .from("care_client_beverages")
        .select("id,name,amount_ml,consumed_at")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .gte("consumed_at", start)
        .lt("consumed_at", end)
        .order("consumed_at", { ascending: true })
        .limit(2000),
    ]).then(([water, drinks]: any[]) => {
      if (!active) return;
      if (water.error || drinks.error) setError("Não foi possível carregar a hidratação deste período.");
      const list: Row[] = [
        ...(water.data ?? []).map((r: any) => ({
          at: r.recorded_at,
          day: acreDateKey(r.recorded_at),
          ml: Number(r.amount_ml) || 0,
          name: "Água",
        })),
        ...(drinks.data ?? []).map((r: any) => ({
          at: r.consumed_at,
          day: acreDateKey(r.consumed_at),
          ml: Number(r.amount_ml) || 0,
          name: r.name || "Bebida",
        })),
      ].sort((a, b) => a.at.localeCompare(b.at));
      setRows(list);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [patientId, ownerId, period, anchor]);

  const summary = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.ml, 0);
    const days = new Set(rows.map((r) => r.day));
    const { from, to } = rangeFor(period, anchor);
    const span =
      Math.round(
        (Date.parse(to + "T12:00:00Z") - Date.parse(from + "T12:00:00Z")) / 86400000,
      ) + 1;
    return { total, count: rows.length, withRecords: days.size, average: total / Math.max(1, span) };
  }, [rows, period, anchor]);

  // Agrupa por dia (semana, mês, ano) ou por registro (dia).
  const byDay = useMemo(() => {
    const map = new Map<string, { total: number; items: Row[] }>();
    for (const r of rows) {
      const g = map.get(r.day) ?? { total: 0, items: [] };
      g.total += r.ml;
      g.items.push(r);
      map.set(r.day, g);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { total: number; days: string[] }>();
    for (const [day, g] of byDay) {
      const k = day.slice(0, 7);
      const m = map.get(k) ?? { total: 0, days: [] };
      m.total += g.total;
      m.days.push(day);
      map.set(k, m);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [byDay]);

  const maxDay = Math.max(1, ...byDay.map(([, g]) => g.total));

  return (
    <div className={"flex min-h-0 flex-col gap-3 transition-opacity " + (loading ? "opacity-60" : "")} aria-busy={loading}>
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Período da hidratação" className="flex flex-1 gap-1 border border-border bg-muted/35 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={period === p.key}
              onClick={() => {
                setPeriod(p.key);
                setOpenKey(null);
              }}
              style={{ cursor: "pointer" }}
              className={
                "min-w-0 flex-1 px-2 py-2 text-xs font-bold transition " +
                (period === p.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-card")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border border-border bg-card px-2 py-2">
        <button
          type="button"
          aria-label="Período anterior"
          onClick={() => setAnchor((a) => shift(period, a, -1))}
          style={{ cursor: "pointer" }}
          className="grid size-9 place-items-center hover:bg-muted"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="min-w-0 truncate text-center text-sm font-bold capitalize">{periodTitle(period, anchor)}</p>
        <button
          type="button"
          aria-label="Próximo período"
          onClick={() => setAnchor((a) => shift(period, a, 1))}
          disabled={anchor >= acreDateKey() && period !== "ano"}
          style={{ cursor: "pointer" }}
          className="grid size-9 place-items-center hover:bg-muted disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="border border-border bg-card p-2">
          <dt className="text-[10px] font-semibold text-muted-foreground">Total</dt>
          <dd className="text-base font-extrabold tabular-nums">{summary.total.toLocaleString("pt-BR")} ml</dd>
        </div>
        <div className="border border-border bg-card p-2">
          <dt className="text-[10px] font-semibold text-muted-foreground">Média/dia</dt>
          <dd className="text-base font-extrabold tabular-nums">{Math.round(summary.average).toLocaleString("pt-BR")} ml</dd>
        </div>
        <div className="border border-border bg-card p-2">
          <dt className="text-[10px] font-semibold text-muted-foreground">Registros</dt>
          <dd className="text-base font-extrabold tabular-nums">
            {summary.count} <span className="text-[10px] font-normal text-muted-foreground">em {summary.withRecords} dia(s)</span>
          </dd>
        </div>
      </dl>

      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
      
      {!loading && rows.length === 0 && (
        <p className="border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Nenhum registro de líquido neste período.
        </p>
      )}

      {period === "dia" && rows.length > 0 && (
        <ul className="grid gap-1.5">
          {rows.map((r) => (
            <li key={r.at + r.name + r.ml} className="flex items-center gap-3 border border-border bg-card px-3 py-2">
              <span className="grid size-9 shrink-0 place-items-center bg-cyan-500/10 text-cyan-600">
                <Droplets size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{r.name}</p>
                <p className="text-[11px] text-muted-foreground">{timeOf(r.at)} · horário do Acre</p>
              </div>
              <p className="text-sm font-extrabold tabular-nums">{r.ml} ml</p>
            </li>
          ))}
        </ul>
      )}

      {(period === "semana" || period === "mes") && byDay.length > 0 && (
        <ul className="grid gap-1.5">
          {byDay.map(([day, g]) => (
            <DayRow
              key={day}
              label={dayLabel(day)}
              total={g.total}
              max={maxDay}
              items={g.items}
              open={openKey === day}
              onToggle={() => setOpenKey(openKey === day ? null : day)}
            />
          ))}
        </ul>
      )}

      {period === "ano" && byMonth.length > 0 && (
        <ul className="grid gap-1.5">
          {byMonth.map(([month, m]) => {
            const open = openKey === month;
            return (
              <li key={month} className="border border-border bg-card">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenKey(open ? null : month)}
                  style={{ cursor: "pointer" }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold capitalize">{monthLabel(month + "-01")}</p>
                    <p className="text-[11px] text-muted-foreground">{m.days.length} dia(s) com registro</p>
                  </div>
                  <p className="text-sm font-extrabold tabular-nums">{m.total.toLocaleString("pt-BR")} ml</p>
                  <ChevronDown size={16} className={"transition " + (open ? "rotate-180" : "")} />
                </button>
                {open && (
                  <ul className="grid gap-1.5 border-t border-border p-2">
                    {m.days.map((day) => {
                      const g = byDay.find(([d]) => d === day)?.[1];
                      if (!g) return null;
                      return (
                        <DayRow
                          key={day}
                          label={dayLabel(day)}
                          total={g.total}
                          max={maxDay}
                          items={g.items}
                          open={openKey === day}
                          onToggle={() => setOpenKey(openKey === day ? null : day)}
                        />
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DayRow({
  label,
  total,
  max,
  items,
  open,
  onToggle,
}: {
  label: string;
  total: number;
  max: number;
  items: Row[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="border border-border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        style={{ cursor: "pointer" }}
        className="flex w-full flex-col gap-1.5 px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-bold capitalize">{label}</p>
          <p className="text-sm font-extrabold tabular-nums">{total.toLocaleString("pt-BR")} ml</p>
          <span className="text-[11px] text-muted-foreground">{items.length} reg.</span>
          <ChevronDown size={15} className={"transition " + (open ? "rotate-180" : "")} />
        </div>
        <div className="h-1.5 w-full bg-muted">
          <div className="h-full bg-cyan-500" style={{ width: `${Math.round((total / max) * 100)}%` }} />
        </div>
      </button>
      {open && (
        <ul className="grid gap-1 border-t border-border p-2">
          {items.map((r) => (
            <li key={r.at + r.name + r.ml} className="flex items-center justify-between gap-2 px-1 py-1 text-xs">
              <span className="min-w-0 truncate">
                <span className="font-semibold">{timeOf(r.at)}</span> · {r.name}
              </span>
              <span className="font-bold tabular-nums">{r.ml} ml</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
