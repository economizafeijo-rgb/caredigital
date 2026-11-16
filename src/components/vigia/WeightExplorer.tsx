import { useEffect, useMemo, useState } from "react";
import { Area, Brush, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, Flag, MousePointerClick, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Point = { day: string; weight: number; bmi: number; avg: number };
const nf = (v: number, d = 1) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const long = (key: string) => key.split("-").reverse().join("/");
const short = (key: string) => key.slice(8, 10) + "/" + key.slice(5, 7);

/** Tendência por regressão linear: kg por semana (negativo = perdendo peso). */
export function weeklyTrend(points: { day: string; weight: number }[]): number | null {
  if (points.length < 3) return null;
  const xs = points.map(p => Date.parse(p.day + "T12:00:00Z") / 86_400_000), ys = points.map(p => p.weight);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  if (den === 0) return null;
  return (xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den) * 7;
}
/** Data estimada para atingir a meta mantendo o ritmo atual; null se o ritmo não leva à meta. */
export function goalDate(current: number, target: number, perWeek: number | null, from = new Date()): string | null {
  if (perWeek === null || Math.abs(perWeek) < 0.05) return null;
  const weeks = (target - current) / perWeek;
  if (weeks <= 0 || weeks > 156) return null;
  return new Date(from.getTime() + weeks * 7 * 86_400_000).toISOString().slice(0, 10);
}

export function WeightExplorer({ patientId, ownerId, revision = 0 }: { patientId: string; ownerId: string; revision?: number }) {
  const [points, setPoints] = useState<Point[]>([]);
  const [target, setTarget] = useState<number | null>(null);
  const [show, setShow] = useState({ weight: true, avg: true, bmi: false });
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const db = supabase as any;
    void Promise.all([
      db.from("care_body_measurements").select("recorded_on,weight_kg,height_cm").eq("patient_id", patientId).eq("owner_id", ownerId).order("recorded_on").limit(730),
      db.from("care_nutrition_preferences").select("target_weight_kg").eq("patient_id", patientId).maybeSingle(),
    ]).then(([rows, prefs]: any[]) => {
      if (!active) return;
      const list = (rows.data ?? []).map((r: any) => ({ day: r.recorded_on as string, weight: Number(r.weight_kg), bmi: Number(r.weight_kg) / (Number(r.height_cm) / 100) ** 2 }));
      setPoints(list.map((p: any, i: number) => { const slice = list.slice(Math.max(0, i - 6), i + 1); return { ...p, bmi: Number(p.bmi.toFixed(1)), avg: Number((slice.reduce((s: number, x: any) => s + x.weight, 0) / slice.length).toFixed(2)) }; }));
      const goal = Number(prefs.data?.target_weight_kg); setTarget(goal > 0 ? goal : null);
    }, () => undefined);
    return () => { active = false; };
  }, [patientId, ownerId, revision]);

  const last = points.at(-1);
  const recent = useMemo(() => { const since = new Date(Date.now() - 42 * 86_400_000).toISOString().slice(0, 10); const r = points.filter(p => p.day >= since); return r.length >= 3 ? r : points.slice(-6); }, [points]);
  const trend = weeklyTrend(recent);
  const eta = last && target ? goalDate(last.weight, target, trend) : null;
  const focus = points.find(p => p.day === picked) ?? last;
  const index = focus ? points.indexOf(focus) : -1;
  const prev = index > 0 ? points[index - 1] : null;
  if (points.length < 2) return null;
  const toggles = [["weight", "Peso", "#d946ef"], ["avg", "Média móvel", "#6366f1"], ["bmi", "IMC", "#10b981"]] as const;
  return <section className="mb-4 overflow-hidden rounded-3xl border border-border bg-card shadow-card" aria-label="Explorador de peso">
    <header className="flex flex-wrap items-center gap-3 p-4 pb-2 sm:p-5 sm:pb-2">
      <div className="mr-auto min-w-0"><h3 className="text-lg font-bold">Explorar evolução</h3><p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MousePointerClick size={14}/> Arraste a faixa de baixo para dar zoom. Toque em um ponto para ver o dia.</p></div>
      <div className="flex flex-wrap gap-2">{toggles.map(([key, label, color]) => <button key={key} type="button" aria-pressed={show[key]} onClick={() => setShow(v => ({ ...v, [key]: !v[key] }))}
        className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition ${show[key] ? "border-transparent bg-muted" : "border-border text-muted-foreground line-through opacity-60"}`}><i className="size-3 rounded-full" style={{ background: color }}/>{label}</button>)}</div>
    </header>
    <div className="grid gap-4 p-4 pt-2 sm:p-5 sm:pt-2 xl:grid-cols-[1fr_270px]">
      <div className="h-[340px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 10, right: show.bmi ? 0 : 8, left: -8, bottom: 0 }} onClick={(state: any) => { if (state?.activeLabel) setPicked(String(state.activeLabel)); }}>
            <defs><linearGradient id="wxFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d946ef" stopOpacity={0.4}/><stop offset="100%" stopColor="#ec4899" stopOpacity={0.02}/></linearGradient>
              <linearGradient id="wxStroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#a855f7"/><stop offset="100%" stopColor="#ec4899"/></linearGradient></defs>
            <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="currentColor" className="text-border"/>
            <XAxis dataKey="day" tickFormatter={short} tick={{ fontSize: 12, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false} minTickGap={24}/>
            <YAxis yAxisId="kg" domain={["dataMin - 2", "dataMax + 2"]} tickFormatter={v => nf(Number(v), 0)} unit=" kg" tick={{ fontSize: 12, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false} width={56}/>
            {show.bmi && <YAxis yAxisId="bmi" orientation="right" domain={["dataMin - 1", "dataMax + 1"]} tickFormatter={v => nf(Number(v), 0)} tick={{ fontSize: 12, fill: "#10b981" }} tickLine={false} axisLine={false} width={34}/>}
            <Tooltip cursor={{ stroke: "#d946ef", strokeOpacity: 0.35, strokeWidth: 2 }} content={({ active, payload, label }) => { const row = payload?.[0]?.payload as Point | undefined; if (!active || !row) return null;
              return <div className="rounded-2xl border border-border bg-card/95 px-3.5 py-2.5 text-sm shadow-pop backdrop-blur"><p className="font-bold">{long(String(label))}</p><p>Peso: <strong>{nf(row.weight)} kg</strong></p><p>Média móvel: {nf(row.avg)} kg</p><p>IMC: {nf(row.bmi)}</p></div>; }}/>
            {target && <ReferenceLine yAxisId="kg" y={target} stroke="#8b5cf6" strokeDasharray="6 5" label={{ value: `Meta ${nf(target)} kg`, position: "insideTopRight", fontSize: 11, fontWeight: 700, fill: "#8b5cf6" }}/>}
            {picked && <ReferenceLine yAxisId="kg" x={picked} stroke="#d946ef" strokeOpacity={0.5} strokeDasharray="3 3"/>}
            {show.weight && <Area yAxisId="kg" type="monotone" dataKey="weight" stroke="url(#wxStroke)" strokeWidth={3} fill="url(#wxFill)" dot={{ r: 3, fill: "#fff", stroke: "#d946ef", strokeWidth: 2 }} activeDot={{ r: 7, fill: "#d946ef", stroke: "#fff", strokeWidth: 2 }} animationDuration={600}/>}
            {show.avg && <Line yAxisId="kg" type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="5 4" dot={false} animationDuration={600}/>}
            {show.bmi && <Line yAxisId="bmi" type="monotone" dataKey="bmi" stroke="#10b981" strokeWidth={2.5} dot={false} animationDuration={600}/>}
            <Brush dataKey="day" height={30} travellerWidth={12} tickFormatter={short} stroke="#d946ef" fill="transparent" startIndex={Math.max(0, points.length - 30)}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <aside className="flex flex-col gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-fuchsia-600 to-pink-500 p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-white/75">{picked ? "Dia selecionado" : "Último registro"}</p>
          <p className="mt-1 font-bold">{focus ? long(focus.day) : "—"}</p>
          <p className="mt-2 text-4xl font-extrabold tabular-nums leading-none">{focus ? nf(focus.weight) : "—"}<span className="ml-1 text-base font-semibold text-white/80">kg</span></p>
          {focus && <p className="mt-2 text-sm text-white/90">IMC {nf(focus.bmi)}{prev ? ` · ${focus.weight - prev.weight > 0 ? "+" : ""}${nf(focus.weight - prev.weight)} kg desde ${short(prev.day)}` : ""}</p>}
          {picked && <button type="button" onClick={() => setPicked(null)} className="mt-3 h-9 w-full rounded-xl bg-white/20 text-sm font-bold hover:bg-white/30">Voltar ao último</button>}
        </div>
        <div className="rounded-2xl bg-muted/50 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">{trend !== null && trend < 0 ? <TrendingDown size={14} className="text-emerald-500"/> : <TrendingUp size={14} className="text-orange-500"/>} Ritmo atual</p>
          <p className="text-2xl font-extrabold tabular-nums">{trend === null ? "—" : `${trend > 0 ? "+" : ""}${nf(trend, 2)} kg`}<span className="ml-1 text-sm font-semibold text-muted-foreground">/semana</span></p>
          <p className="text-xs text-muted-foreground">tendência das últimas semanas</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Flag size={14} className="text-violet-500"/> Previsão da meta</p>
          {!target ? <p className="mt-1 text-sm">Defina uma meta de peso no seu perfil de nutrição para ver a previsão.</p>
            : last && Math.abs(last.weight - target) < 0.2 ? <p className="mt-1 text-lg font-extrabold text-emerald-600">Meta alcançada!</p>
            : eta ? <><p className="flex items-center gap-1.5 text-2xl font-extrabold tabular-nums"><CalendarClock size={18}/>{long(eta)}</p><p className="text-xs text-muted-foreground">mantendo o ritmo atual até {nf(target)} kg</p></>
            : <p className="mt-1 text-sm">No ritmo atual o peso não está indo em direção à meta de {nf(target)} kg.</p>}
        </div>
      </aside>
    </div>
  </section>;
}
