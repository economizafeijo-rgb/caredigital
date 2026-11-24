import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Loader2 } from "lucide-react";
import { acreAddDays } from "@/lib/acre-time";
import {
  acreDayHour,
  buildDays,
  MONTH_NAMES,
  monthRange,
  summarize,
  yearRange,
  type PeriodSummary,
} from "@/lib/day-metrics";
import { loadPeriodRaw, resolveTargets, type PeriodData } from "@/lib/period-data";

type Kind = "semana" | "mes" | "ano";
type Loader = (patientId: string, ownerId: string, from: string, to: string) => Promise<PeriodData>;

const KINDS: { key: Kind; label: string }[] = [
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
  { key: "ano", label: "Ano" },
];

const br = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;

function rangeOf(kind: Kind, anchor: string): { from: string; to: string; label: string } {
  if (kind === "semana") {
    const to = acreAddDays(anchor, 6);
    return { from: anchor, to, label: `${br(anchor)} a ${br(to)}` };
  }
  if (kind === "mes") {
    const y = Number(anchor.slice(0, 4));
    const m = Number(anchor.slice(5, 7));
    return { ...monthRange(y, m), label: `${MONTH_NAMES[m - 1]} de ${y}` };
  }
  const y = Number(anchor.slice(0, 4));
  return { ...yearRange(y), label: String(y) };
}

/** Âncora do período anterior ao informado (mesmo tamanho). */
function previous(kind: Kind, anchor: string): string {
  if (kind === "semana") return acreAddDays(anchor, -7);
  if (kind === "mes") {
    const d = new Date(Date.UTC(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)) - 2, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }
  return `${Number(anchor.slice(0, 4)) - 1}-01-01`;
}

type Metric = {
  key: string;
  label: string;
  unit: string;
  digits?: number;
  /** "up": maior é melhor · "neutral": só mostra a diferença. */
  better: "up" | "neutral";
  color: string;
  get: (s: PeriodSummary) => number | null;
};
const METRICS: Metric[] = [
  {
    key: "metas",
    label: "Metas atingidas",
    unit: "%",
    better: "up",
    color: "#10b981",
    get: (s) => (s.goalsEvaluated ? Math.round((s.goalsMet / s.goalsEvaluated) * 100) : null),
  },
  { key: "agua", label: "Água por dia", unit: "ml", better: "up", color: "#0ea5e9", get: (s) => s.avgWaterMl },
  { key: "kcal", label: "Calorias por dia", unit: "kcal", better: "neutral", color: "#f97316", get: (s) => s.avgKcal },
  { key: "prot", label: "Proteína por dia", unit: "g", better: "up", color: "#f43f5e", get: (s) => s.avgProtein },
  { key: "sono", label: "Sono médio", unit: "h", digits: 1, better: "up", color: "#6366f1", get: (s) => s.avgSleepHours },
  { key: "sup", label: "Suplementos", unit: "%", better: "up", color: "#8b5cf6", get: (s) => s.supplementAdherence },
  { key: "med", label: "Medicação", unit: "%", better: "up", color: "#ec4899", get: (s) => s.medicationAdherence },
  { key: "ativ", label: "Atividade", unit: "min", better: "up", color: "#14b8a6", get: (s) => s.activityMinutes },
  { key: "dias", label: "Dias completos", unit: "dias", better: "up", color: "#22c55e", get: (s) => s.daysAllMet },
  { key: "peso", label: "Peso ao fim", unit: "kg", digits: 1, better: "neutral", color: "#c026d3", get: (s) => s.weightLast },
];

const fmt = (v: number | null, digits = 0) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits });

function useSummary(
  loader: Loader,
  patientId: string,
  ownerId: string,
  waterTarget: number | null,
  from: string,
  to: string,
) {
  const [state, setState] = useState<{ s: PeriodSummary | null; loading: boolean; error: boolean }>({
    s: null,
    loading: true,
    error: false,
  });
  useEffect(() => {
    let active = true;
    setState((p) => ({ ...p, loading: true, error: false }));
    loader(patientId, ownerId, from, to).then(
      (res) => {
        if (!active) return;
        const targets = resolveTargets(res.prefs, waterTarget);
        const days = buildDays(res.raw, from, to, { targets, nowMs: Date.now() });
        setState({ s: summarize(days), loading: false, error: false });
      },
      () => active && setState({ s: null, loading: false, error: true }),
    );
    return () => {
      active = false;
    };
  }, [loader, patientId, ownerId, waterTarget, from, to]);
  return state;
}

function Picker({
  kind,
  value,
  onChange,
  tone,
  title,
}: {
  kind: Kind;
  value: string;
  onChange: (v: string) => void;
  tone: string;
  title: string;
}) {
  const field = "h-9 w-full border border-border bg-background px-2 text-sm";
  return (
    <label className="grid gap-1 text-[11px] font-bold" style={{ color: tone }}>
      {title}
      {kind === "semana" && (
        <input type="date" className={field} value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />
      )}
      {kind === "mes" && (
        <input
          type="month"
          className={field}
          value={value.slice(0, 7)}
          onChange={(e) => e.target.value && onChange(e.target.value + "-01")}
        />
      )}
      {kind === "ano" && (
        <input
          type="number"
          className={field}
          min={2000}
          max={2100}
          value={value.slice(0, 4)}
          onChange={(e) => e.target.value.length === 4 && onChange(e.target.value + "-01-01")}
        />
      )}
    </label>
  );
}

/** Compara dois períodos (semana, mês ou ano) lado a lado, métrica por métrica. */
export function EvolutionCompare({
  patientId,
  ownerId,
  waterTarget,
  loader = loadPeriodRaw,
}: {
  patientId: string;
  ownerId: string;
  waterTarget: number | null;
  loader?: Loader;
}) {
  const today = acreDayHour(Date.now()).day;
  const [kind, setKind] = useState<Kind>("mes");
  const [a, setA] = useState(() => `${today.slice(0, 7)}-01`);
  const [b, setB] = useState(() => previous("mes", `${today.slice(0, 7)}-01`));
  const changeKind = (k: Kind) => {
    const start = k === "semana" ? acreAddDays(today, -6) : k === "mes" ? `${today.slice(0, 7)}-01` : `${today.slice(0, 4)}-01-01`;
    setKind(k);
    setA(start);
    setB(previous(k, start));
  };
  const ra = useMemo(() => rangeOf(kind, a), [kind, a]);
  const rb = useMemo(() => rangeOf(kind, b), [kind, b]);
  const sa = useSummary(loader, patientId, ownerId, waterTarget, ra.from, ra.to);
  const sb = useSummary(loader, patientId, ownerId, waterTarget, rb.from, rb.to);
  const loading = sa.loading || sb.loading;
  const COLOR_A = "#22d3ee";
  const COLOR_B = "#a78bfa";

  return (
    <section aria-label="Comparar períodos" className="grid gap-3 border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-extrabold">Comparar períodos</h3>
          <p className="text-[11px] text-muted-foreground">
            Escolha dois períodos do mesmo tipo e veja a diferença em cada métrica.
          </p>
        </div>
        <div role="group" aria-label="Tipo de período" className="flex gap-1 bg-muted p-1">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              aria-pressed={kind === k.key}
              onClick={() => changeKind(k.key)}
              style={{ cursor: "pointer" }}
              className={`h-8 px-3 text-xs font-bold transition ${kind === k.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Picker kind={kind} value={a} onChange={setA} tone={COLOR_A} title="Período A" />
        <Picker kind={kind} value={b} onChange={setB} tone={COLOR_B} title="Período B" />
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold capitalize">
        <span style={{ color: COLOR_A }}>● A: {ra.label}</span>
        <span style={{ color: COLOR_B }}>● B: {rb.label}</span>
        {loading && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
      </p>
      {(sa.error || sb.error) && (
        <p role="alert" className="text-xs text-rose-600">Não foi possível carregar um dos períodos.</p>
      )}

      <ul className="grid gap-2 md:grid-cols-2">
        {METRICS.map((m) => {
          const va = sa.s ? m.get(sa.s) : null;
          const vb = sb.s ? m.get(sb.s) : null;
          const max = Math.max(va ?? 0, vb ?? 0, 1);
          const diff = va !== null && vb !== null ? va - vb : null;
          const pct = diff !== null && vb ? (diff / Math.abs(vb)) * 100 : null;
          const good = diff === null || diff === 0 || m.better === "neutral" ? null : diff > 0;
          const Icon = diff === null || diff === 0 ? ArrowRight : diff > 0 ? ArrowUpRight : ArrowDownRight;
          const chip =
            good === null
              ? "bg-muted text-muted-foreground"
              : good
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                : "bg-rose-500/15 text-rose-600 dark:text-rose-300";
          return (
            <li key={m.key} className="min-w-0 border border-border bg-background/40 p-2.5" style={{ borderLeft: `3px solid ${m.color}` }}>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-bold">{m.label}</p>
                <span className={`inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${chip}`}>
                  <Icon size={12} />
                  {diff === null
                    ? "sem dados"
                    : `${diff > 0 ? "+" : ""}${fmt(diff, m.digits ?? 0)} ${m.unit}${pct !== null ? ` (${pct > 0 ? "+" : ""}${Math.round(pct)}%)` : ""}`}
                </span>
              </div>
              {[
                { tag: "A", v: va, color: COLOR_A },
                { tag: "B", v: vb, color: COLOR_B },
              ].map((r) => (
                <div key={r.tag} className="mt-1.5 grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2 text-[11px]">
                  <b style={{ color: r.color }}>{r.tag}</b>
                  <div className="h-2 bg-black/10 dark:bg-white/10">
                    <div
                      className="h-full transition-[width] duration-500"
                      style={{ width: `${r.v === null ? 0 : Math.max(2, (r.v / max) * 100)}%`, background: r.color }}
                    />
                  </div>
                  <span className="min-w-[4.5rem] text-right font-semibold tabular-nums">
                    {fmt(r.v, m.digits ?? 0)} <span className="font-normal text-muted-foreground">{m.unit}</span>
                  </span>
                </div>
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
