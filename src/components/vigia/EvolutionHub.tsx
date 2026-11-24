import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { acreAddDays, acreDateAtTime, ACRE_TIME_ZONE } from "@/lib/acre-time";
import {
  acreDayHour,
  buildDays,
  MONTH_NAMES,
  monthLabel,
  monthRange,
  yearRange,
  type PeriodRaw,
} from "@/lib/day-metrics";
import { loadPeriodRaw, resolveTargets, type PeriodData } from "@/lib/period-data";
import { EvolutionDayView } from "./EvolutionDayView";
import { DayDetailDialog } from "./DayDetailDialog";
import { EvolutionMonthView, EvolutionYearView } from "./EvolutionPeriodView";
import { EvolutionCompare } from "./EvolutionCompare";

type View = "dia" | "mes" | "ano" | "comparar";
type Props = {
  patientId: string;
  ownerId: string;
  waterTarget: number | null;
  revision?: number;
  /** Visão inicial: o panorama da Visão geral abre no dia de hoje, com todas as métricas. */
  defaultView?: View;
  /** Permite trocar a origem dos dados (testes e pré-visualização). */
  loader?: (patientId: string, ownerId: string, from: string, to: string) => Promise<PeriodData>;
};

const pad = (value: number) => String(value).padStart(2, "0");
const VIEWS: { key: View; label: string }[] = [
  { key: "dia", label: "Dia" },
  { key: "mes", label: "Mês" },
  { key: "ano", label: "Ano" },
  { key: "comparar", label: "Comparar" },
];
const YEARS_BACK = 5;

export function EvolutionHub({
  patientId,
  ownerId,
  waterTarget,
  revision = 0,
  defaultView = "mes",
  loader = loadPeriodRaw,
}: Props) {
  const today = acreDayHour(Date.now()).day;
  const thisYear = Number(today.slice(0, 4));
  const [view, setView] = useState<View>(defaultView);
  const [cursor, setCursor] = useState(today);
  const [data, setData] = useState<{ result: PeriodData; from: string; to: string } | null>(null);
  const [detailDay, setDetailDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const year = Number(cursor.slice(0, 4));
  const month = Number(cursor.slice(5, 7));
  const range = useMemo(
    () =>
      view === "dia"
        ? { from: cursor, to: cursor }
        : view === "mes"
          ? monthRange(year, month)
          : yearRange(year),
    [view, cursor, year, month],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    loader(patientId, ownerId, range.from, range.to).then(
      (result) => {
        if (active) {
          setData({ result, from: range.from, to: range.to });
          setLoading(false);
        }
      },
      () => {
        if (active) {
          setFailed(true);
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [loader, patientId, ownerId, range.from, range.to, revision]);

  const targets = useMemo(
    () => (data ? resolveTargets(data.result.prefs, waterTarget) : null),
    [data, waterTarget],
  );
  // Mantém o período anterior na tela enquanto o novo carrega: a página não encolhe nem "pula".
  const keep = useRef<{ view: View; days: ReturnType<typeof buildDays> }>({ view, days: [] });
  const days = useMemo(() => {
    if (data && targets && data.from === range.from && data.to === range.to) {
      const built = buildDays(data.result.raw, range.from, range.to, { targets, nowMs: Date.now() });
      keep.current = { view, days: built };
      return built;
    }
    return keep.current.view === view ? keep.current.days : [];
  }, [data, targets, range.from, range.to, view]);
  const raw: PeriodRaw | null = data?.result.raw ?? null;

  const firstOfMonth = (y: number, m: number) =>
    `${y}-${pad(m)}` === today.slice(0, 7) ? today : `${y}-${pad(m)}-01`;
  const shift = (direction: 1 | -1) => {
    if (view === "dia") setCursor(acreAddDays(cursor, direction));
    else if (view === "mes") {
      const total = year * 12 + (month - 1) + direction;
      setCursor(firstOfMonth(Math.floor(total / 12), (total % 12) + 1));
    } else setCursor(`${year + direction}-${pad(Math.min(month, 12))}-01`);
  };
  const nextBlocked =
    view === "dia"
      ? cursor >= today
      : view === "mes"
        ? `${year}-${pad(month)}` >= today.slice(0, 7)
        : year >= thisYear;
  const openMonth = (m: number) => {
    setView("mes");
    setCursor(firstOfMonth(year, m));
  };
  const changeYear = (y: number) =>
    setCursor(view === "dia" ? `${y}-${cursor.slice(5)}` : firstOfMonth(y, month));

  const title =
    view === "dia"
      ? new Intl.DateTimeFormat("pt-BR", {
          timeZone: ACRE_TIME_ZONE,
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(acreDateAtTime(cursor, "12:00"))
      : view === "mes"
        ? monthLabel(year, month)
        : String(year);
  // Guarda a altura do conteúdo: ao trocar Dia/Mês/Ano ou de período, o espaço é mantido enquanto
  // carrega, e a página não encolhe nem salta.
  const body = useRef<HTMLDivElement>(null);
  const lastHeight = useRef(0);
  useLayoutEffect(() => {
    if (body.current && days.length) lastHeight.current = body.current.offsetHeight;
  });
  const warnings = data?.result.warnings ?? [];
  const current = days[0];

  return (
    <section aria-label="Evolução e histórico das métricas" className="grid gap-3">
      <div className="rounded-2xl border border-border bg-card p-3 shadow-card sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
              <CalendarDays size={13} /> Histórico completo
            </p>
            <h3 className="font-display text-xl font-extrabold leading-tight first-letter:uppercase">
              {title}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Todos os seus registros ficam guardados por data. Escolha o ano, o mês ou o dia.
            </p>
          </div>
          <div role="group" aria-label="Período" className="flex gap-1 rounded-xl bg-muted p-1">
            {VIEWS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={view === item.key}
                onClick={() => setView(item.key)}
                className={`h-9 rounded-lg px-4 text-xs font-bold transition ${view === item.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className={`mt-3 flex flex-wrap items-center gap-2 ${view === "comparar" ? "hidden" : ""}`}>
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Período anterior"
            className="grid size-9 place-items-center rounded-xl border border-border hover:bg-muted"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            disabled={nextBlocked}
            aria-label="Próximo período"
            className="grid size-9 place-items-center rounded-xl border border-border hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight size={17} />
          </button>
          <label className="sr-only" htmlFor="evolution-year">
            Ano
          </label>
          <select
            id="evolution-year"
            value={year}
            onChange={(event) => changeYear(Number(event.target.value))}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-sm font-semibold"
          >
            {Array.from({ length: YEARS_BACK + 1 }, (_, i) => thisYear - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCursor(today)}
            className="h-9 rounded-xl border border-border px-3 text-xs font-bold hover:bg-muted"
          >
            Hoje
          </button>
          {view !== "ano" && (
            <div
              className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1"
              role="group"
              aria-label="Mês"
            >
              {MONTH_NAMES.map((name, i) => {
                const disabled = `${year}-${pad(i + 1)}` > today.slice(0, 7);
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={disabled}
                    aria-pressed={month === i + 1}
                    onClick={() =>
                      setCursor(
                        view === "dia"
                          ? `${year}-${pad(i + 1)}-${pad(Math.min(Number(cursor.slice(8)), new Date(Date.UTC(year, i + 1, 0)).getUTCDate()))}`
                          : firstOfMonth(year, i + 1),
                      )
                    }
                    className={`h-9 shrink-0 rounded-full px-3 text-xs font-bold capitalize transition ${month === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"} disabled:opacity-40`}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {view === "comparar" && (
        <EvolutionCompare
          patientId={patientId}
          ownerId={ownerId}
          waterTarget={waterTarget}
          loader={loader}
        />
      )}
      {view !== "comparar" && warnings.length > 0 && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs"
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            Algumas fontes ainda não estão disponíveis neste ambiente ({warnings.join(", ")}).
            Aplique as migrações pendentes do banco para ver o histórico completo.
          </span>
        </p>
      )}
      {view !== "comparar" && failed && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          Não foi possível carregar o histórico agora. Verifique sua conexão e tente novamente.
        </p>
      )}

      {view === "comparar" ? null : loading && !days.length ? (
        <p
          role="status"
          style={{ minHeight: lastHeight.current || undefined }}
          className="flex items-center justify-center gap-2 border border-border bg-card p-10 text-sm text-muted-foreground"
        >
          <Loader2 size={16} className="animate-spin" /> Carregando seu histórico…
        </p>
      ) : raw && targets && days.length > 0 ? (
        <div
          ref={body}
          className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}
          aria-busy={loading}
        >
          {view === "dia" && current && (
            <EvolutionDayView metrics={current} raw={raw} targets={targets} />
          )}
          {view === "mes" && (
            <EvolutionMonthView
              year={year}
              month={month}
              days={days}
              targets={targets}
              onOpenDay={setDetailDay}
            />
          )}
          {view === "ano" && (
            <EvolutionYearView year={year} days={days} targets={targets} onOpenMonth={openMonth} />
          )}
        </div>
      ) : null}
      <DayDetailDialog
        patientId={patientId}
        ownerId={ownerId}
        day={detailDay}
        onClose={() => setDetailDay(null)}
      />
    </section>
  );
}
