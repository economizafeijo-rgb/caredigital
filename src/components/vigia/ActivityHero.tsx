import { useMemo, useState } from "react";
import { Flame, Footprints, MapPin, Timer, Trophy } from "lucide-react";
import { NextUpClock } from "./NextUpClock";

type Item = { happened_at: string; details: { duration_minutes?: number; distance_km?: number | null } | null };
const tz = "America/Rio_Branco";
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
const WEEK_GOAL = 150; // recomendação da OMS: 150 min de atividade moderada por semana

/** Cartão principal da Atividade: anel da meta semanal, números da semana e acesso ao GPS. */
export function ActivityHero({ items, onStartGps, gpsLabel }: { items: Item[]; onStartGps: () => void; gpsLabel: string }) {
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
      return { key: k, label: new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "short" }).format(d).replace(".", ""), date: new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit" }).format(d), ...(map.get(k) ?? { min: 0, km: 0, n: 0 }) };
    });
  }, [items]);
  const week = days.slice(7);
  const prev = days.slice(0, 7);
  const wMin = week.reduce((a, d) => a + d.min, 0);
  const pMin = prev.reduce((a, d) => a + d.min, 0);
  const wKm = week.reduce((a, d) => a + d.km, 0);
  const active = week.filter((d) => d.min > 0).length;
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) { if (days[i].min > 0) streak++; else if (i === days.length - 1) continue; else break; }
  const pct = Math.min(100, Math.round((wMin / WEEK_GOAL) * 100));
  // Sem atividade hoje: lembrete às 17h30 (fim de tarde, mais fresco no Acre).
  const todayMin = days[days.length - 1].min;
  const moveAt = Date.parse(dayKey(new Date()) + "T17:30:00-05:00");
  const moveTarget = todayMin > 0 || Date.now() > moveAt + 3 * 3_600_000 ? null : moveAt;
  const trend = pMin ? Math.round(((wMin - pMin) / pMin) * 100) : null;
  const stats = [
    { icon: Timer, label: "Dias ativos", value: `${active} de 7` },
    { icon: MapPin, label: "Distância", value: `${wKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km` },
    { icon: Trophy, label: "Sequência", value: `${streak} ${streak === 1 ? "dia" : "dias"}` },
  ];
  return (
    <header className="nv-dark relative isolate shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#06231f] via-[#0b4a43] to-[#0e7490] p-4 text-white shadow-card sm:p-5">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 -z-10 size-72 rounded-full bg-cyan-300/15 blur-3xl" />
      <svg aria-hidden="true" viewBox="0 0 400 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-16 w-full text-white/[.06]">
        <path d="M0 60 Q50 20 100 45 T200 40 T300 30 T400 50 V80 H0Z" fill="currentColor" />
      </svg>
      <div className="grid items-center gap-4 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,19rem)]">
        <div className="relative mx-auto size-32 shrink-0 sm:size-36 lg:mx-0" role="img" aria-label={`${wMin} de ${WEEK_GOAL} minutos na semana`}>
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#ffffff1f" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="url(#nv-act-grad)" strokeWidth="10" strokeLinecap="round" pathLength={100} strokeDasharray={`${pct} 100`} className="nv-ring-draw" />
            <defs><linearGradient id="nv-act-grad" x1="0" x2="1"><stop offset="0" stopColor="#5eead4" /><stop offset="1" stopColor="#a3e635" /></linearGradient></defs>
          </svg>
          <div className="absolute inset-[26px] grid place-items-center rounded-full bg-white/[.07] text-center shadow-inner">
            <span className="leading-none"><Flame size={16} className="mx-auto mb-1 text-lime-300" /><strong className="block text-2xl font-extrabold tabular-nums">{wMin}</strong><span className="text-[10px] font-semibold text-white/70">min / semana</span></span>
          </div>
        </div>
        <div className="min-w-0 text-center lg:text-left">
          <p className="text-3xl font-extrabold tabular-nums">{pct}% <span className="text-lg font-semibold text-white/65">da meta de {WEEK_GOAL} min</span></p>
          <p className="mt-1 text-sm text-white/80">
            {!items.length ? "Registre uma caminhada, treino ou pedalada para começar." : wMin >= WEEK_GOAL ? "Meta semanal alcançada. Mantenha o ritmo." : `Faltam ${WEEK_GOAL - wMin} min nos últimos 7 dias.`}
            {trend !== null && <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${trend >= 0 ? "bg-lime-300/20 text-lime-100" : "bg-amber-300/20 text-amber-100"}`}>{trend >= 0 ? "+" : ""}{trend}% vs semana anterior</span>}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start">
            <button type="button" onClick={onStartGps} className="nv-bump inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-teal-900 shadow-sm transition hover:bg-white/90 active:scale-[.97]"><Footprints size={17} /> {gpsLabel}</button>
            <a href="#nv-activity-form" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">Registrar manualmente</a>
          </div>
        </div>
        <div className="grid gap-2">
        <NextUpClock alertKey="atividade" title="Hora de se mexer" color="#a3e635" target={moveTarget} from={Date.parse(dayKey(new Date()) + "T06:00:00-05:00")}
          detail="30 min de caminhada" emptyText={todayMin > 0 ? `Feito hoje: ${todayMin} min` : "Amanhã tem mais"} actionLabel="Iniciar com GPS" onAction={onStartGps} />
        <ul className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <li key={s.label} className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-2.5 py-2 backdrop-blur">
              <s.icon size={14} className="hidden shrink-0 text-teal-200 sm:block lg:hidden" />
              <span className="min-w-0"><span className="block text-[11px] font-semibold text-white/70">{s.label}</span><strong className="block truncate text-sm tabular-nums">{s.value}</strong></span>
            </li>
          ))}
        </ul>
        </div>
      </div>
    </header>
  );
}

/** Barras dos últimos 14 dias com minutos por dia; passe o mouse para ver os detalhes. */
export function ActivityDaysChart({ items }: { items: Item[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const days = useMemo(() => {
    const map = new Map<string, { min: number; km: number; n: number }>();
    for (const it of items) {
      const k = dayKey(new Date(it.happened_at));
      const cur = map.get(k) ?? { min: 0, km: 0, n: 0 };
      cur.min += Number(it.details?.duration_minutes) || 0; cur.km += Number(it.details?.distance_km) || 0; cur.n++;
      map.set(k, cur);
    }
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 86_400_000);
      return { label: new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "narrow" }).format(d), date: new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit" }).format(d), ...(map.get(dayKey(d)) ?? { min: 0, km: 0, n: 0 }) };
    });
  }, [items]);
  const max = Math.max(45, ...days.map((d) => d.min));
  const daily = Math.round(WEEK_GOAL / 7);
  return (
    <figure className="shrink-0 rounded-2xl border border-border bg-card p-3 sm:p-4">
      <figcaption className="flex items-center justify-between gap-2">
        <span><strong className="block text-sm font-bold">Últimos 14 dias</strong><span className="text-xs text-muted-foreground">Minutos de atividade por dia</span></span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><i className="h-0.5 w-4 border-t-2 border-dashed border-teal-500" /> Ritmo da meta ({daily} min/dia)</span>
      </figcaption>
      <div className="relative mt-3 flex h-32 items-end gap-1.5" onPointerLeave={() => setHover(null)}>
        <span aria-hidden="true" className="absolute inset-x-0 border-t-2 border-dashed border-teal-500/50" style={{ bottom: `${(daily / max) * 100}%` }} />
        {days.map((d, i) => (
          <button key={i} type="button" onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} aria-label={`${d.date}: ${d.min} minutos`}
            className="group relative flex h-full flex-1 flex-col justify-end focus-visible:outline-none">
            <span className={`nv-bar block w-full rounded-t-md transition-[filter,opacity] ${i >= 7 ? "bg-gradient-to-t from-teal-600 to-lime-400" : "bg-teal-500/35"} ${hover !== null && hover !== i ? "opacity-50" : ""} group-focus-visible:ring-2 group-focus-visible:ring-teal-400`}
              style={{ height: d.min ? `${Math.max(4, (d.min / max) * 100)}%` : "3px", animationDelay: `${i * 35}ms` }} />
            {hover === i && (
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-32 -translate-x-1/2 rounded-xl bg-slate-900 px-2.5 py-1.5 text-left text-[11px] text-white shadow-lg">
                <strong className="block">{d.date}</strong>{d.min} min · {d.n} {d.n === 1 ? "sessão" : "sessões"}{d.km > 0 && <span className="block text-white/70">{d.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</span>}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 text-center text-[10px] font-semibold uppercase text-muted-foreground">{days.map((d, i) => <span key={i} className="flex-1">{d.label}</span>)}</div>
    </figure>
  );
}
