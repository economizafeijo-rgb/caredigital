import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { acreAddDays, acreDateAtTime, ACRE_TIME_ZONE } from "@/lib/acre-time";
import { acreDayHour, buildDay } from "@/lib/day-metrics";
import { loadPeriodRaw, resolveTargets, type PeriodData } from "@/lib/period-data";
import { supabase } from "@/integrations/supabase/client";
import { EvolutionDayView } from "./EvolutionDayView";

type Props = { patientId: string; ownerId: string; day: string | null; waterTarget?: number | null; onClose: () => void };

/**
 * Painel de detalhes de um dia (24 horas): abre ao clicar numa barra ou ponto de qualquer gráfico.
 * Mostra metas, hidratação e alimentação hora a hora, suplementos, medicação, sono, peso, atividade e observações.
 */
export function DayDetailDialog({ patientId, ownerId, day: initialDay, waterTarget = null, onClose }: Props) {
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

  return (
    <div className="fixed inset-0 z-[220] grid place-items-center bg-slate-950/55 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-labelledby="day-detail-title" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarDays size={19} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Detalhes do dia · 24 horas</p>
            <h2 id="day-detail-title" className="truncate font-display text-lg font-extrabold capitalize leading-tight">{title}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setDay(acreAddDays(day, -1))} aria-label="Dia anterior" className="grid size-9 place-items-center rounded-xl border border-border hover:bg-muted"><ChevronLeft size={17} /></button>
            <button type="button" onClick={() => setDay(acreAddDays(day, 1))} disabled={day >= today} aria-label="Próximo dia" className="grid size-9 place-items-center rounded-xl border border-border hover:bg-muted disabled:opacity-40"><ChevronRight size={17} /></button>
            <button type="button" onClick={onClose} aria-label="Fechar detalhes" className="grid size-9 place-items-center rounded-xl bg-muted hover:bg-muted/70"><X size={17} /></button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {failed ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Não foi possível carregar este dia. Verifique a conexão e tente novamente.</p>
            : !metrics || !data || !targets ? <p role="status" className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando o dia…</p>
              : <EvolutionDayView metrics={metrics} raw={data.result.raw} targets={targets} />}
        </div>
      </div>
    </div>
  );
}
