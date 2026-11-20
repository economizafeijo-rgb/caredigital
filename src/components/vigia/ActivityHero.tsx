import { EvoChart, EvoLegend } from "./EvoChart";
import { useMemo } from "react";
import { Footprints, MapPin, Timer, Trophy } from "lucide-react";
import { NextUpClock } from "./NextUpClock";

type Item = {
  happened_at: string;
  details: { duration_minutes?: number; distance_km?: number | null } | null;
};
const tz = "America/Rio_Branco";
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
const WEEK_GOAL = 150; // recomendação da OMS: 150 min de atividade moderada por semana

/** Cartão principal da Atividade: anel da meta semanal, números da semana e acesso ao GPS. */
export function ActivityHero({
  items,
  onStartGps,
  gpsLabel,
}: {
  items: Item[];
  onStartGps: () => void;
  gpsLabel: string;
}) {
  const days = useMemo(() => {
    const map = new Map<string, { min: number; km: number; n: number }>();
    for (const it of items) {
      const k = dayKey(new Date(it.happened_at));
      const cur = map.get(k) ?? { min: 0, km: 0, n: 0 };
      cur.min += Number(it.details?.duration_minutes) || 0;
      cur.km += Number(it.details?.distance_km) || 0;
      cur.n += 1;
      map.set(k, cur);
    }
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 86_400_000);
      const k = dayKey(d);
      return {
        key: k,
        label: new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "short" })
          .format(d)
          .replace(".", ""),
        date: new Intl.DateTimeFormat("pt-BR", {
          timeZone: tz,
          day: "2-digit",
          month: "2-digit",
        }).format(d),
        ...(map.get(k) ?? { min: 0, km: 0, n: 0 }),
      };
    });
  }, [items]);
  const week = days.slice(7);
  const prev = days.slice(0, 7);
  const wMin = week.reduce((a, d) => a + d.min, 0);
  const pMin = prev.reduce((a, d) => a + d.min, 0);
  const wKm = week.reduce((a, d) => a + d.km, 0);
  const active = week.filter((d) => d.min > 0).length;
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].min > 0) streak++;
    else if (i === days.length - 1) continue;
    else break;
  }
  const pct = Math.min(100, Math.round((wMin / WEEK_GOAL) * 100));
  // Sem atividade hoje: lembrete às 17h30 (fim de tarde, mais fresco no Acre).
  const todayMin = days[days.length - 1].min;
  const moveAt = Date.parse(dayKey(new Date()) + "T17:30:00-05:00");
  const moveTarget = todayMin > 0 || Date.now() > moveAt + 3 * 3_600_000 ? null : moveAt;
  const trend = pMin ? Math.round(((wMin - pMin) / pMin) * 100) : null;
  const stats = [
    { icon: Timer, label: "Dias ativos", value: `${active} de 7` },
    {
      icon: MapPin,
      label: "Distância",
      value: `${wKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`,
    },
    { icon: Trophy, label: "Sequência", value: `${streak} ${streak === 1 ? "dia" : "dias"}` },
  ];
  return (
    <header className="nv-dark relative isolate shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#06231f] via-[#0b4a43] to-[#0e7490] p-3.5 text-white shadow-card sm:p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 -z-10 size-72 rounded-full bg-cyan-300/15 blur-3xl"
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 400 80"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-16 w-full text-white/[.06]"
      >
        <path d="M0 60 Q50 20 100 45 T200 40 T300 30 T400 50 V80 H0Z" fill="currentColor" />
      </svg>
      <div className="grid items-center gap-4 lg:grid-cols-[auto_minmax(0,1fr)_16rem]">
        <div
          className="relative mx-auto size-28 shrink-0 lg:mx-0"
          role="img"
          aria-label={`${wMin} de ${WEEK_GOAL} minutos na semana`}
        >
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#ffffff1f" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="url(#nv-act-grad)"
              strokeWidth="10"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${Math.max(pct, 0.5)} 100`}
              className="nv-ring-draw"
            />
            <defs>
              <linearGradient id="nv-act-grad" x1="0" x2="1">
                <stop offset="0" stopColor="#5eead4" />
                <stop offset="1" stopColor="#a3e635" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-[24px] grid place-items-center rounded-full bg-white/[.07] text-center shadow-inner">
            <span className="leading-none">
              <strong className="block text-lg font-extrabold tabular-nums">{pct}%</strong>
              <span className="text-[10px] font-semibold text-white/70">da meta</span>
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-2xl font-extrabold tabular-nums sm:text-3xl">
              {wMin}{" "}
              <span className="text-base font-semibold text-white/65">
                de {WEEK_GOAL} min na semana
              </span>
            </p>
            {trend !== null && (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${trend >= 0 ? "bg-lime-300/20 text-lime-100" : "bg-amber-300/20 text-amber-100"}`}
              >
                {trend >= 0 ? "+" : ""}
                {trend}% vs semana anterior
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-white/80">
            {!items.length
              ? "Registre uma caminhada, treino ou pedalada para começar."
              : wMin >= WEEK_GOAL
                ? "Meta semanal alcançada. Mantenha o ritmo."
                : `Faltam ${WEEK_GOAL - wMin} min nos últimos 7 dias (recomendação da OMS).`}
          </p>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <li
                key={s.label}
                className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[.07] px-2.5 py-2 backdrop-blur transition-colors hover:bg-white/[.12]"
              >
                <span className="hidden size-7 shrink-0 place-items-center rounded-lg bg-white/10 text-teal-200 sm:grid">
                  <s.icon size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-semibold text-white/65">
                    {s.label}
                  </span>
                  <strong className="block truncate text-sm tabular-nums">{s.value}</strong>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onStartGps}
              className="nv-bump inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3.5 text-[13px] font-bold text-teal-900 shadow-sm transition hover:bg-white/90 active:scale-[.97]"
            >
              <Footprints size={16} /> {gpsLabel}
            </button>
            <a
              href="#nv-activity-form"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3.5 text-[13px] font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              Registrar manualmente
            </a>
          </div>
        </div>
        <NextUpClock
          alertKey="atividade"
          title="Hora de se mexer"
          color="#a3e635"
          target={moveTarget}
          from={Date.parse(dayKey(new Date()) + "T06:00:00-05:00")}
          detail="30 min de caminhada"
          emptyText={todayMin > 0 ? `Feito hoje: ${todayMin} min` : "Amanhã tem mais"}
          actionLabel="Iniciar com GPS"
          onAction={onStartGps}
        />
      </div>
    </header>
  );
}

/** Linha dos últimos 14 dias com minutos por dia e o ritmo necessário para a meta semanal. */
export function ActivityDaysChart({ items }: { items: Item[] }) {
  const days = useMemo(() => {
    const map = new Map<string, { min: number; km: number; n: number }>();
    for (const it of items) {
      const k = dayKey(new Date(it.happened_at));
      const cur = map.get(k) ?? { min: 0, km: 0, n: 0 };
      cur.min += Number(it.details?.duration_minutes) || 0;
      cur.km += Number(it.details?.distance_km) || 0;
      cur.n++;
      map.set(k, cur);
    }
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 86_400_000);
      return {
        x: i,
        date: new Intl.DateTimeFormat("pt-BR", {
          timeZone: tz,
          day: "2-digit",
          month: "2-digit",
        }).format(d),
        wd: new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "short" })
          .format(d)
          .replace(".", ""),
        ...(map.get(dayKey(d)) ?? { min: 0, km: 0, n: 0 }),
      };
    });
  }, [items]);
  const daily = Math.round(WEEK_GOAL / 7);
  const week = days.slice(7).reduce((a, d) => a + d.min, 0);
  return (
    <figure className="min-w-0 shrink-0 rounded-2xl border border-border bg-card p-3 sm:p-4">
      <figcaption className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <span>
          <strong className="block text-sm font-bold">Últimos 14 dias</strong>
          <span className="text-xs text-muted-foreground">
            {week} min nos últimos 7 dias · meta {WEEK_GOAL} min/semana
          </span>
        </span>
        <EvoLegend
          items={[
            { label: "Minutos por dia", color: "#0d9488", bar: true },
            { label: "Média de 3 dias", color: "#f59e0b" },
            { label: `Meta (${daily} min/dia)`, color: "#84cc16", dashed: true },
          ]}
        />
      </figcaption>
      <EvoChart
        height={200}
        ariaLabel={`Minutos de atividade nos últimos 14 dias; ${week} nos últimos 7`}
        xMin={-0.6}
        xMax={13.6}
        xTicks={days.filter((_, i) => (13 - i) % 2 === 0).map((d) => ({ x: d.x, label: d.date }))}
        formatX={(x) => `${days[Math.round(x)]?.wd ?? ""}, ${days[Math.round(x)]?.date ?? ""}`}
        formatY={(v) => `${Math.round(v)}`}
        yFloor={daily * 1.5}
        bars={days.map((d) => ({
          x: d.x,
          w: 1,
          parts: [{ y: d.min, color: d.x >= 7 ? "#0d9488" : "#5eead4", label: "Minutos" }],
        }))}
        series={[
          {
            id: "avg",
            label: "Média de 3 dias",
            color: "#f59e0b",
            dots: true,
            live: true,
            points: days.map((d, i) => ({
              x: d.x,
              y: Math.round(
                days.slice(Math.max(0, i - 2), i + 1).reduce((a, q) => a + q.min, 0) /
                  Math.min(3, i + 1),
              ),
            })),
          },
          {
            id: "goal",
            label: "Ritmo da meta",
            color: "#84cc16",
            points: [
              { x: -0.6, y: daily },
              { x: 13.6, y: daily },
            ],
            dashed: true,
            linear: true,
          },
        ]}
        tip={(x) => {
          const d = days[Math.round(x)];
          return d ? (
            <p className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">
              {d.n} {d.n === 1 ? "sessão" : "sessões"}
              {d.km > 0
                ? ` · ${d.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`
                : ""}
            </p>
          ) : null;
        }}
      />
    </figure>
  );
}
