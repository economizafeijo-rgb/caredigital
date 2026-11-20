import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Loader2,
  Moon,
  Pill,
  Scale,
  Target,
  X,
} from "lucide-react";
import { acreAddDays, acreDateAtTime, ACRE_TIME_ZONE } from "@/lib/acre-time";
import { acreDayHour, buildDay } from "@/lib/day-metrics";
import { loadPeriodRaw, resolveTargets, type PeriodData } from "@/lib/period-data";
import { supabase } from "@/integrations/supabase/client";
import { EvolutionDayView, FOCUS_LABEL, type MetricFocus } from "./EvolutionDayView";

type Props = {
  patientId: string;
  ownerId: string;
  day: string | null;
  waterTarget?: number | null;
  focus?: MetricFocus;
  onClose: () => void;
};

/**
 * Painel de detalhes de um dia (24 horas): abre ao clicar numa barra ou ponto de qualquer gráfico.
 * Mostra metas, hidratação e alimentação hora a hora, suplementos, medicação, sono, peso, atividade e observações.
 */
export function DayDetailDialog({
  patientId,
  ownerId,
  day: initialDay,
  waterTarget = null,
  focus,
  onClose,
}: Props) {
  const [day, setDay] = useState<string | null>(initialDay);
  const [data, setData] = useState<{
    day: string;
    result: PeriodData;
    water: number | null;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const today = acreDayHour(Date.now()).day;

  useEffect(() => {
    setDay(initialDay);
  }, [initialDay]);
  useEffect(() => {
    if (!day) return;
    let active = true;
    setFailed(false);
    void Promise.all([
      loadPeriodRaw(patientId, ownerId, day, day),
      waterTarget
        ? Promise.resolve(waterTarget)
        : (supabase as any)
            .from("care_hydration_profiles")
            .select("target_ml")
            .eq("patient_id", patientId)
            .maybeSingle()
            .then(
              (r: any) => Number(r?.data?.target_ml) || null,
              () => null,
            ),
    ]).then(
      ([result, water]) => {
        if (active) setData({ day, result, water });
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [day, patientId, ownerId, waterTarget]);
  useEffect(() => {
    if (!initialDay) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [initialDay, onClose]);

  const targets = useMemo(
    () => (data ? resolveTargets(data.result.prefs, data.water) : null),
    [data],
  );
  const metrics = useMemo(
    () =>
      data && targets && data.day === day
        ? buildDay(data.result.raw, data.day, { targets, nowMs: Date.now() })
        : null,
    [data, targets, day],
  );

  if (!initialDay || !day) return null;
  const title = new Intl.DateTimeFormat("pt-BR", {
    timeZone: ACRE_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(acreDateAtTime(day, "12:00"));

  const n = (v: number, d = 0) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });
  const chips = metrics
    ? [
        {
          icon: Target,
          label: "Metas",
          value: metrics.goals.length
            ? `${metrics.goals.filter((g) => g.status === "atingida").length} de ${metrics.goals.length}`
            : "—",
          tone: "from-fuchsia-500 to-violet-500",
        },
        {
          icon: Droplets,
          label: "Líquidos",
          value: metrics.waterMl ? `${n(metrics.waterMl / 1000, 1)} L` : "—",
          tone: "from-sky-500 to-cyan-400",
        },
        {
          icon: Flame,
          label: "Calorias",
          value: metrics.kcal ? `${n(metrics.kcal)} kcal` : "—",
          tone: "from-emerald-500 to-lime-400",
        },
        {
          icon: Pill,
          label: "Doses",
          value:
            metrics.medication.planned + metrics.supplements.planned
              ? `${metrics.medication.taken + metrics.supplements.taken}/${metrics.medication.planned + metrics.supplements.planned}`
              : "—",
          tone: "from-rose-500 to-pink-400",
        },
        {
          icon: Activity,
          label: "Movimento",
          value: metrics.activityMinutes ? `${n(metrics.activityMinutes)} min` : "—",
          tone: "from-orange-500 to-amber-400",
        },
        {
          icon: Moon,
          label: "Sono",
          value: metrics.sleep ? "registrado" : "—",
          tone: "from-indigo-500 to-blue-400",
        },
        {
          icon: Scale,
          label: "Peso",
          value: metrics.weightKg ? `${n(metrics.weightKg, 1)} kg` : "—",
          tone: "from-slate-500 to-slate-400",
        },
      ]
    : [];

  return (
    <div
      className="fixed inset-0 z-[220] grid place-items-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-detail-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="nv-pop flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <header className="nv-dark relative isolate shrink-0 overflow-hidden bg-[#070b1a] text-white">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(60%_120%_at_85%_10%,rgba(99,102,241,.35),transparent_60%),radial-gradient(50%_100%_at_10%_100%,rgba(14,165,233,.22),transparent_60%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-[.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]"
          />
          <div className="flex items-center gap-3 px-3 pb-1.5 pt-2.5 sm:px-4">
            {metrics && <DayDial metrics={metrics} />}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-white/60">
                {focus ? `${FOCUS_LABEL[focus]} · detalhes do dia` : "Seu dia completo · 24 horas"}
                {day === today ? " · hoje" : ""}
              </p>
              <h2
                id="day-detail-title"
                className="font-display text-lg font-extrabold leading-tight tracking-tight first-letter:uppercase sm:text-xl"
              >
                {title}
              </h2>
              {metrics && (
                <p className="mt-1 text-xs text-white/60">
                  {(() => {
                    const met = metrics.goals.filter((g) => g.status === "atingida").length;
                    const open = metrics.goals.filter((g) => g.status === "em_andamento").length;
                    return metrics.goals.length
                      ? `${met} de ${metrics.goals.length} metas atingidas${open ? ` · ${open} em andamento` : ""}`
                      : "Sem metas avaliadas neste dia.";
                  })()}{" "}
                  ·{" "}
                  {metrics.water.length +
                    metrics.foods.length +
                    metrics.medication.taken +
                    metrics.supplements.taken}{" "}
                  registros
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 self-start">
              <button
                type="button"
                onClick={() => setDay(acreAddDays(day, -1))}
                aria-label="Dia anterior"
                className="grid size-8 place-items-center rounded-lg border border-white/15 bg-white/[.06] transition hover:bg-white/15 active:scale-95"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                onClick={() => setDay(acreAddDays(day, 1))}
                disabled={day >= today}
                aria-label="Próximo dia"
                className="grid size-8 place-items-center rounded-lg border border-white/15 bg-white/[.06] transition hover:bg-white/15 active:scale-95 disabled:opacity-40"
              >
                <ChevronRight size={17} />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar detalhes"
                className="grid size-8 place-items-center rounded-lg bg-white text-slate-900 transition hover:bg-white/90 active:scale-95"
              >
                <X size={17} />
              </button>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none] sm:px-4">
            {(chips.length ? chips : Array.from({ length: 7 }, () => null)).map((c, i) =>
              c ? (
                <div
                  key={c.label}
                  className={`nv-rise flex min-w-[6.5rem] shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 transition-colors hover:bg-white/[.08] ${c.value === "—" ? "border-white/[.06] opacity-55" : "border-white/[.12] bg-white/[.04]"}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-md bg-gradient-to-br ${c.tone} shadow-sm`}
                  >
                    <c.icon size={14} />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block text-[10px] text-white/65">{c.label}</span>
                    <strong className="block truncate text-[13px] tabular-nums">{c.value}</strong>
                  </span>
                </div>
              ) : (
                <div
                  key={i}
                  className="h-8 w-[6.5rem] shrink-0 animate-pulse rounded-xl bg-white/10"
                />
              ),
            )}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-3">
          {failed ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            >
              Não foi possível carregar este dia. Verifique a conexão e tente novamente.
            </p>
          ) : !metrics || !data || !targets ? (
            <p
              role="status"
              className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"
            >
              <Loader2 size={16} className="animate-spin" /> Carregando o dia…
            </p>
          ) : (
            <EvolutionDayView
              metrics={metrics}
              raw={data.result.raw}
              targets={targets}
              focus={focus}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Relógio de 24 horas: anel interno com a água de cada hora, externo com as calorias, pontos nas doses. */
function DayDial({ metrics }: { metrics: NonNullable<ReturnType<typeof buildDay>> }) {
  const R1 = 30,
    R2 = 39,
    C = 48;
  const maxW = Math.max(250, ...metrics.hours.map((h) => h.water));
  const maxK = Math.max(300, ...metrics.hours.map((h) => h.kcal));
  const arc = (h: number, r: number) => {
    const a0 = ((h / 24) * 360 - 90 + 1.5) * (Math.PI / 180),
      a1 = (((h + 1) / 24) * 360 - 90 - 1.5) * (Math.PI / 180);
    return `M${C + r * Math.cos(a0)},${C + r * Math.sin(a0)} A${r},${r} 0 0 1 ${C + r * Math.cos(a1)},${C + r * Math.sin(a1)}`;
  };
  const doses = [...metrics.medication.entries, ...metrics.supplements.entries];
  const hourOfIso = (iso: string) => acreDayHour(iso).hour + new Date(iso).getMinutes() / 60;
  return (
    <svg
      viewBox="0 0 96 96"
      className="size-14 shrink-0"
      role="img"
      aria-label="Distribuição dos registros nas 24 horas"
    >
      {metrics.hours.map((h, i) => (
        <g key={i}>
          <path
            d={arc(i, R2)}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            stroke={h.kcal ? "#34d399" : "rgba(255,255,255,.08)"}
            strokeOpacity={h.kcal ? 0.35 + 0.65 * (h.kcal / maxK) : 1}
          />
          <path
            d={arc(i, R1)}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            stroke={h.water ? "#38bdf8" : "rgba(255,255,255,.08)"}
            strokeOpacity={h.water ? 0.35 + 0.65 * (h.water / maxW) : 1}
          />
        </g>
      ))}
      {doses.map((d, i) => {
        const a = ((hourOfIso(d.at) / 24) * 360 - 90) * (Math.PI / 180);
        return (
          <circle
            key={i}
            cx={C + 46 * Math.cos(a)}
            cy={C + 46 * Math.sin(a)}
            r="1.8"
            fill="#fb7185"
          />
        );
      })}
      {[0, 6, 12, 18].map((h) => {
        const a = ((h / 24) * 360 - 90) * (Math.PI / 180);
        return (
          <text
            key={h}
            x={C + 20 * Math.cos(a)}
            y={C + 20 * Math.sin(a) + 2}
            textAnchor="middle"
            fontSize="5.5"
            fill="rgba(255,255,255,.45)"
          >
            {h}
          </text>
        );
      })}
      <text x={C} y={C + 3} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">
        {metrics.score === null ? "—" : `${metrics.score}%`}
      </text>
    </svg>
  );
}
