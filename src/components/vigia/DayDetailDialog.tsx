import { useEffect, useMemo, useState } from "react";
import { Activity, ChevronLeft, ChevronRight, Droplets, Flame, Loader2, Moon, Pill, Scale, Target, X } from "lucide-react";
import { clientSectionTheme } from "@/lib/client-section-theme";
import { acreAddDays, acreDateAtTime, ACRE_TIME_ZONE } from "@/lib/acre-time";
import { acreDayHour, buildDay } from "@/lib/day-metrics";
import { loadPeriodRaw, resolveTargets, type PeriodData } from "@/lib/period-data";
import { supabase } from "@/integrations/supabase/client";
import { EvolutionDayView, FOCUS_LABEL, type MetricFocus } from "./EvolutionDayView";

type Props = { patientId: string; ownerId: string; day: string | null; waterTarget?: number | null; focus?: MetricFocus; onClose: () => void };

/**
 * Painel de detalhes de um dia (24 horas): abre ao clicar numa barra ou ponto de qualquer gráfico.
 * Mostra metas, hidratação e alimentação hora a hora, suplementos, medicação, sono, peso, atividade e observações.
 */
export function DayDetailDialog({ patientId, ownerId, day: initialDay, waterTarget = null, focus, onClose }: Props) {
  const [day, setDay] = useState<string | null>(initialDay);
  const [data, setData] = useState<{ day: string; result: PeriodData; water: number | null } | null>(null);
  const [failed, setFailed] = useState(false);
  const today = acreDayHour(Date.now()).day;

  useEffect(() => { setDay(initialDay); }, [initialDay]);
  useEffect(() => {
    if (!day) return;
    let active = true;
    setFailed(false);
    void Promise.all([
      loadPeriodRaw(patientId, ownerId, day, day),
      waterTarget ? Promise.resolve(waterTarget) : (supabase as any).from("care_hydration_profiles").select("target_ml").eq("patient_id", patientId).maybeSingle().then((r: any) => Number(r?.data?.target_ml) || null, () => null),
    ]).then(([result, water]) => { if (active) setData({ day, result, water }); }, () => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [day, patientId, ownerId, waterTarget]);
  useEffect(() => {
    if (!initialDay) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [initialDay, onClose]);

  const targets = useMemo(() => (data ? resolveTargets(data.result.prefs, data.water) : null), [data]);
  const metrics = useMemo(() => (data && targets && data.day === day ? buildDay(data.result.raw, data.day, { targets, nowMs: Date.now() }) : null), [data, targets, day]);

  if (!initialDay || !day) return null;
  const title = new Intl.DateTimeFormat("pt-BR", { timeZone: ACRE_TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(acreDateAtTime(day, "12:00"));

  const theme = focus ? (clientSectionTheme as any)[focus] : null;
  const image = theme?.image ?? "/images/painel-indicadores.webp";
  const n = (v: number, d = 0) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });
  const chips = metrics ? [
    { icon: Target, label: "Metas", value: metrics.score === null ? "—" : `${metrics.score}%`, tone: "from-fuchsia-500 to-violet-500" },
    { icon: Droplets, label: "Líquidos", value: metrics.waterMl ? `${n(metrics.waterMl / 1000, 1)} L` : "—", tone: "from-sky-500 to-cyan-400" },
    { icon: Flame, label: "Calorias", value: metrics.kcal ? `${n(metrics.kcal)} kcal` : "—", tone: "from-emerald-500 to-lime-400" },
    { icon: Pill, label: "Doses", value: metrics.medication.planned + metrics.supplements.planned ? `${metrics.medication.taken + metrics.supplements.taken}/${metrics.medication.planned + metrics.supplements.planned}` : "—", tone: "from-rose-500 to-pink-400" },
    { icon: Activity, label: "Movimento", value: metrics.activityMinutes ? `${n(metrics.activityMinutes)} min` : "—", tone: "from-orange-500 to-amber-400" },
    { icon: Moon, label: "Sono", value: metrics.sleep ? "registrado" : "—", tone: "from-indigo-500 to-blue-400" },
    { icon: Scale, label: "Peso", value: metrics.weightKg ? `${n(metrics.weightKg, 1)} kg` : "—", tone: "from-slate-500 to-slate-400" },
  ] : [];

  return (
    <div className="fixed inset-0 z-[220] grid place-items-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-labelledby="day-detail-title" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="nv-pop flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <header className="nv-dark relative isolate shrink-0 overflow-hidden text-white">
          <img src={image} alt="" aria-hidden className="absolute inset-0 -z-20 size-full object-cover" style={{ objectPosition: theme?.position ?? "50% 50%" }} />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-slate-900/30" />
          <div className="flex items-start gap-3 px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white/70">{focus ? `${FOCUS_LABEL[focus]} · detalhes do dia` : "Seu dia completo · 24 horas"}{day === today ? " · hoje" : ""}</p>
              <h2 id="day-detail-title" className="mt-0.5 font-display text-2xl font-extrabold leading-tight first-letter:uppercase sm:text-3xl">{title}</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setDay(acreAddDays(day, -1))} aria-label="Dia anterior" className="grid size-9 place-items-center rounded-xl border border-white/20 bg-white/10 backdrop-blur transition hover:bg-white/20 active:scale-95"><ChevronLeft size={17} /></button>
              <button type="button" onClick={() => setDay(acreAddDays(day, 1))} disabled={day >= today} aria-label="Próximo dia" className="grid size-9 place-items-center rounded-xl border border-white/20 bg-white/10 backdrop-blur transition hover:bg-white/20 active:scale-95 disabled:opacity-40"><ChevronRight size={17} /></button>
              <button type="button" onClick={onClose} aria-label="Fechar detalhes" className="grid size-9 place-items-center rounded-xl bg-white text-slate-900 transition hover:bg-white/90 active:scale-95"><X size={17} /></button>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:px-6">
            {(chips.length ? chips : Array.from({ length: 7 }, () => null)).map((c, i) => c ? (
              <div key={c.label} className="nv-rise flex min-w-[7.5rem] shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 backdrop-blur" style={{ animationDelay: `${i * 40}ms` }}>
                <span className={`grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${c.tone}`}><c.icon size={14} /></span>
                <span className="min-w-0 leading-tight"><span className="block text-[10px] text-white/65">{c.label}</span><strong className="block truncate text-[13px] tabular-nums">{c.value}</strong></span>
              </div>
            ) : <div key={i} className="h-[46px] w-[7.5rem] shrink-0 animate-pulse rounded-xl bg-white/10" />)}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {failed ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Não foi possível carregar este dia. Verifique a conexão e tente novamente.</p>
            : !metrics || !data || !targets ? <p role="status" className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando o dia…</p>
              : <EvolutionDayView metrics={metrics} raw={data.result.raw} targets={targets} focus={focus} />}
        </div>
      </div>
    </div>
  );
}
