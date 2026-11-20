import { useEffect, useMemo, useState } from "react";
import { EvoChart } from "./EvoChart";
import { CalendarClock, Flag, MousePointerClick, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DayDetailDialog } from "./DayDetailDialog";

type Point = { day: string; weight: number; bmi: number; avg: number };
const nf = (v: number, d = 1) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const long = (key: string) => key.split("-").reverse().join("/");
const short = (key: string) => key.slice(8, 10) + "/" + key.slice(5, 7);

/** Tendência por regressão linear: kg por semana (negativo = perdendo peso). */
export function weeklyTrend(points: { day: string; weight: number }[]): number | null {
  if (points.length < 3) return null;
  const xs = points.map((p) => Date.parse(p.day + "T12:00:00Z") / 86_400_000),
    ys = points.map((p) => p.weight);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length,
    my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  if (den === 0) return null;
  return (xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den) * 7;
}
/** Data estimada para atingir a meta mantendo o ritmo atual; null se o ritmo não leva à meta. */
export function goalDate(
  current: number,
  target: number,
  perWeek: number | null,
  from = new Date(),
): string | null {
  if (perWeek === null || Math.abs(perWeek) < 0.05) return null;
  const weeks = (target - current) / perWeek;
  if (weeks <= 0 || weeks > 156) return null;
  return new Date(from.getTime() + weeks * 7 * 86_400_000).toISOString().slice(0, 10);
}

export function WeightExplorer({
  patientId,
  ownerId,
  revision = 0,
}: {
  patientId: string;
  ownerId: string;
  revision?: number;
}) {
  const [points, setPoints] = useState<Point[]>([]);
  const [target, setTarget] = useState<number | null>(null);
  const [show, setShow] = useState({ weight: true, avg: true });
  const [range, setRange] = useState<30 | 90 | 365 | 0>(90);
  const [picked, setPicked] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const db = supabase as any;
    void Promise.all([
      db
        .from("care_body_measurements")
        .select("recorded_on,weight_kg,height_cm")
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
        .order("recorded_on")
        .limit(730),
      db
        .from("care_nutrition_preferences")
        .select("target_weight_kg")
        .eq("patient_id", patientId)
        .maybeSingle(),
    ]).then(
      ([rows, prefs]: any[]) => {
        if (!active) return;
        const list = (rows.data ?? []).map((r: any) => ({
          day: r.recorded_on as string,
          weight: Number(r.weight_kg),
          bmi: Number(r.weight_kg) / (Number(r.height_cm) / 100) ** 2,
        }));
        setPoints(
          list.map((p: any, i: number) => {
            const slice = list.slice(Math.max(0, i - 6), i + 1);
            return {
              ...p,
              bmi: Number(p.bmi.toFixed(1)),
              avg: Number(
                (slice.reduce((s: number, x: any) => s + x.weight, 0) / slice.length).toFixed(2),
              ),
            };
          }),
        );
        const goal = Number(prefs.data?.target_weight_kg);
        setTarget(goal > 0 ? goal : null);
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [patientId, ownerId, revision]);

  const last = points.at(-1);
  const recent = useMemo(() => {
    const since = new Date(Date.now() - 42 * 86_400_000).toISOString().slice(0, 10);
    const r = points.filter((p) => p.day >= since);
    return r.length >= 3 ? r : points.slice(-6);
  }, [points]);
  const trend = weeklyTrend(recent);
  const eta = last && target ? goalDate(last.weight, target, trend) : null;
  const focus = points.find((p) => p.day === picked) ?? last;
  const index = focus ? points.indexOf(focus) : -1;
  const prev = index > 0 ? points[index - 1] : null;
  if (points.length < 2) return null;
  const toggles = [
    ["weight", "Peso", "#d946ef"],
    ["avg", "Média móvel", "#6366f1"],
  ] as const;
  const since = range ? new Date(Date.now() - range * 86_400_000).toISOString().slice(0, 10) : "";
  const view = (() => {
    const v = points.filter((p) => !since || p.day >= since);
    return v.length >= 2 ? v : points.slice(-2);
  })();
  const X = (d: string) => Date.parse(d + "T12:00:00Z");
  const byX = new Map(view.map((p) => [X(p.day), p]));
  const x0 = X(view[0].day),
    x1 = X(view[view.length - 1].day),
    padX = Math.max(86_400_000 * 0.6, (x1 - x0) * 0.03);
  const tickCount = 6,
    tickStep = (x1 - x0) / (tickCount - 1 || 1);
  const xTicks =
    view.length <= tickCount
      ? view.map((p) => ({ x: X(p.day), label: short(p.day) }))
      : Array.from({ length: tickCount }, (_, i) => {
          const x = x0 + i * tickStep;
          const d = new Date(x).toISOString().slice(0, 10);
          return { x, label: short(d) };
        });
  return (
    <section
      className="overflow-hidden border border-border bg-card shadow-card"
      aria-label="Explorador de peso"
    >
      <header className="flex flex-wrap items-center gap-3 p-3 pb-1.5">
        <div className="mr-auto min-w-0">
          <h3 className="text-sm font-bold">Evolução do peso</h3>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MousePointerClick size={13} /> Escolha o período e toque num ponto para ver o dia.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div role="group" aria-label="Período" className="flex gap-0.5 bg-muted p-0.5">
            {(
              [
                [30, "30 d"],
                [90, "90 d"],
                [365, "1 ano"],
                [0, "Tudo"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                aria-pressed={range === v}
                onClick={() => setRange(v)}
                className={`h-7 px-2.5 text-xs font-semibold transition ${range === v ? "bg-fuchsia-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {l}
              </button>
            ))}
          </div>
          {toggles.map(([key, label, color]) => (
            <button
              key={key}
              type="button"
              aria-pressed={show[key]}
              onClick={() => setShow((v) => ({ ...v, [key]: !v[key] }))}
              className={`inline-flex h-7 items-center gap-1.5 border border-border px-2.5 text-[11px] font-semibold transition ${show[key] ? "bg-muted text-foreground" : "text-muted-foreground line-through opacity-60"}`}
            >
              <i
                className={`inline-block w-3.5 ${key === "avg" ? "border-t-2 border-dashed" : "h-[3px] rounded-full"}`}
                style={key === "avg" ? { borderColor: color } : { background: color }}
              />
              {label}
            </button>
          ))}
        </div>
      </header>
      <div className="grid gap-3 p-3 pt-1 xl:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0">
          <EvoChart
            height={210}
            yAuto
            ariaLabel={`Peso: ${view.length} medidas`}
            xMin={x0 - padX}
            xMax={x1 + padX}
            xTicks={xTicks}
            formatX={(x) => long(new Date(x).toISOString().slice(0, 10))}
            formatY={(v) => `${nf(v, Number.isInteger(v) ? 0 : 1)} kg`}
            goal={
              target ? { y: target, label: `Meta ${nf(target)} kg`, color: "#8b5cf6" } : undefined
            }
            selectedX={picked ? X(picked) : null}
            onPick={(x) => setPicked(new Date(x).toISOString().slice(0, 10))}
            series={[
              ...(show.weight
                ? [
                    {
                      id: "w",
                      label: "Peso",
                      color: "#d946ef",
                      area: true,
                      dots: view.length <= 40,
                      live: true,
                      points: view.map((p) => ({ x: X(p.day), y: p.weight })),
                    },
                  ]
                : []),
              ...(show.avg
                ? [
                    {
                      id: "a",
                      label: "Média móvel",
                      color: "#6366f1",
                      dashed: true,
                      points: view.map((p) => ({ x: X(p.day), y: p.avg })),
                    },
                  ]
                : []),
            ]}
            tip={(x) => {
              const p = byX.get(x);
              if (!p) return null;
              const i = points.indexOf(p);
              const d = i > 0 ? p.weight - points[i - 1].weight : null;
              return (
                <>
                  <p className="mt-1 flex justify-between gap-3">
                    <span className="text-muted-foreground">IMC</span>
                    <strong className="tabular-nums">{nf(p.bmi)}</strong>
                  </p>
                  {d !== null && (
                    <p
                      className={`mt-1.5 border-t border-border pt-1.5 font-semibold ${d <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-500"}`}
                    >
                      {d > 0 ? "+" : ""}
                      {nf(d)} kg desde a medida anterior
                    </p>
                  )}
                </>
              );
            }}
          />
        </div>
        <aside className="grid content-start gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <div className="bg-gradient-to-br from-fuchsia-600 to-pink-500 p-3 text-white sm:col-span-2 xl:col-span-1">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-white/75">
              {picked ? "Dia selecionado" : "Último registro"}
            </p>
            <p className="mt-1 font-bold">{focus ? long(focus.day) : "—"}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums leading-none">
              {focus ? nf(focus.weight) : "—"}
              <span className="ml-1 text-base font-semibold text-white/80">kg</span>
            </p>
            {focus && (
              <p className="mt-2 text-sm text-white/90">
                IMC {nf(focus.bmi)}
                {prev
                  ? ` · ${focus.weight - prev.weight > 0 ? "+" : ""}${nf(focus.weight - prev.weight)} kg desde ${short(prev.day)}`
                  : ""}
              </p>
            )}
            <button
              type="button"
              onClick={() => setDetail((picked ?? points[points.length - 1]?.day) || null)}
              className="mt-2 h-8 w-full bg-white text-xs font-extrabold text-slate-900 shadow transition hover:bg-white/90 active:scale-[.98]"
            >
              Ver dia completo
            </button>
            {picked && (
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="mt-1.5 h-8 w-full bg-white/20 text-xs font-bold hover:bg-white/30"
              >
                Voltar ao último
              </button>
            )}
          </div>
          <div className="border border-border bg-muted/30 p-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              {trend !== null && trend < 0 ? (
                <TrendingDown size={14} className="text-emerald-500" />
              ) : (
                <TrendingUp size={14} className="text-orange-500" />
              )}{" "}
              Ritmo atual
            </p>
            <p className="text-lg font-extrabold tabular-nums">
              {trend === null ? "—" : `${trend > 0 ? "+" : ""}${nf(trend, 2)} kg`}
              <span className="ml-1 text-sm font-semibold text-muted-foreground">/semana</span>
            </p>
            <p className="text-xs text-muted-foreground">tendência das últimas semanas</p>
          </div>
          <div className="border border-border bg-muted/30 p-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Flag size={14} className="text-violet-500" /> Previsão da meta
            </p>
            {!target ? (
              <p className="mt-1 text-sm">
                Defina uma meta de peso no seu perfil de nutrição para ver a previsão.
              </p>
            ) : last && Math.abs(last.weight - target) < 0.2 ? (
              <p className="mt-1 text-lg font-extrabold text-emerald-600">Meta alcançada!</p>
            ) : eta ? (
              <>
                <p className="flex items-center gap-1.5 text-lg font-extrabold tabular-nums">
                  <CalendarClock size={18} />
                  {long(eta)}
                </p>
                <p className="text-xs text-muted-foreground">
                  mantendo o ritmo atual até {nf(target)} kg
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm">
                No ritmo atual o peso não está indo em direção à meta de {nf(target)} kg.
              </p>
            )}
          </div>
        </aside>
      </div>
      <DayDetailDialog
        patientId={patientId}
        ownerId={ownerId}
        focus="peso"
        day={detail}
        onClose={() => setDetail(null)}
      />
    </section>
  );
}
