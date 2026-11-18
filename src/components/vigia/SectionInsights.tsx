import { useEffect, useMemo, useState } from "react";
import {
  Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AreaChart as AreaIcon, BarChart3, ChevronDown, Flame, LineChart as LineIcon, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey } from "@/lib/acre-time";
import { parseFoodText, sumNutrients } from "@/lib/food-parser";
import type { ClientSection } from "@/lib/client-pages";
import { DayDetailDialog } from "./DayDetailDialog";

type Row = { day: string; a: number; b: number; t?: number };
type Config = { title: string; subtitle: string; unit: string; a: { label: string; color: string; to: string }; b?: { label: string; color: string; to: string }; goalLabel?: string };
export type InsightSection = "agenda" | "hidratacao" | "medicacao" | "alimentacao" | "atividade" | "suplementos" | "historico";

const configs: Record<InsightSection, Config> = {
  agenda: { title: "Cuidados concluídos por dia", subtitle: "Toque em um dia para ver os detalhes", unit: "", a: { label: "Concluídos", color: "#7c3aed", to: "#d946ef" }, b: { label: "Pendentes", color: "#f59e0b", to: "#fbbf24" } },
  hidratacao: { title: "Água consumida por dia", subtitle: "Compare com a sua meta diária", unit: "ml", a: { label: "Água", color: "#0284c7", to: "#22d3ee" }, goalLabel: "Meta" },
  medicacao: { title: "Adesão às doses por dia", subtitle: "Doses confirmadas e doses sem registro", unit: "", a: { label: "Confirmadas", color: "#e11d48", to: "#fb7185" }, b: { label: "Sem registro", color: "#94a3b8", to: "#cbd5e1" } },
  alimentacao: { title: "Calorias registradas por dia", subtitle: "Estimativa a partir das refeições descritas", unit: "kcal", a: { label: "Calorias", color: "#059669", to: "#84cc16" }, b: { label: "Proteína (g)", color: "#e11d48", to: "#fb7185" } },
  atividade: { title: "Minutos de atividade por dia", subtitle: "Referência da OMS: 150 minutos por semana", unit: "min", a: { label: "Minutos", color: "#ea580c", to: "#fbbf24" }, b: { label: "Distância (km)", color: "#0ea5e9", to: "#38bdf8" } },
  suplementos: { title: "Doses de suplementos por dia", subtitle: "Constância da sua suplementação", unit: "", a: { label: "Doses tomadas", color: "#7c3aed", to: "#f59e0b" } },
  historico: { title: "Registros por dia", subtitle: "Tudo o que você registrou na plataforma", unit: "", a: { label: "Cuidados e refeições", color: "#475569", to: "#94a3b8" }, b: { label: "Água (registros)", color: "#0284c7", to: "#22d3ee" } },
};
export const insightSections = Object.keys(configs) as InsightSection[];
export const isInsightSection = (section: ClientSection): section is InsightSection => (insightSections as string[]).includes(section);

const dayOf = (iso: string) => acreDateKey(new Date(iso));
const short = (key: string) => key.slice(8, 10) + "/" + key.slice(5, 7);
const weekday = (key: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(new Date(key + "T12:00:00Z")).replace(".", "");
const fmt = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Preenche os dias sem registro com zero, do mais antigo ao mais recente. */
export function fillDays(map: Map<string, { a: number; b: number }>, days: number, today = acreDateKey()): Row[] {
  const end = Date.parse(today + "T12:00:00Z");
  return Array.from({ length: days }, (_, index) => {
    const key = new Date(end - (days - 1 - index) * 86_400_000).toISOString().slice(0, 10);
    const value = map.get(key);
    return { day: key, a: value?.a ?? 0, b: value?.b ?? 0 };
  });
}

/** Média móvel de 3 dias da série principal: a linha de tendência desenhada sobre as barras. */
export function withTrend(rows: Row[]): Row[] {
  return rows.map((row, index) => {
    const slice = rows.slice(Math.max(0, index - 2), index + 1);
    return { ...row, t: Number((slice.reduce((sum, item) => sum + item.a, 0) / slice.length).toFixed(1)) };
  });
}

/** Maior sequência atual de dias seguidos com registro, contando a partir de hoje. */
export function currentStreak(rows: Row[]): number {
  let streak = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].a > 0) streak++;
    else if (i === rows.length - 1) continue; // hoje ainda pode estar em andamento
    else break;
  }
  return streak;
}

async function load(section: InsightSection, patientId: string, ownerId: string): Promise<{ map: Map<string, { a: number; b: number }>; goal: number | null }> {
  const db = supabase as any;
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sinceDay = since.slice(0, 10);
  const map = new Map<string, { a: number; b: number }>();
  const add = (day: string, a: number, b = 0) => { const cur = map.get(day) ?? { a: 0, b: 0 }; map.set(day, { a: cur.a + a, b: cur.b + b }); };
  let goal: number | null = null;
  if (section === "agenda" || section === "medicacao") {
    let query = db.from("care_daily_checklist").select("category,scheduled_at,completed_at").eq("patient_id", patientId).gte("scheduled_at", since).lte("scheduled_at", new Date().toISOString()).limit(3000);
    if (section === "medicacao") query = query.eq("category", "medicacao");
    const rows = await query;
    for (const t of rows.data ?? []) add(dayOf(t.scheduled_at), t.completed_at ? 1 : 0, t.completed_at ? 0 : 1);
    if (section === "medicacao") {
      const own = await db.from("care_client_medication_intakes").select("taken_on").eq("patient_id", patientId).gte("taken_on", sinceDay).limit(2000);
      for (const t of own.data ?? []) add(t.taken_on, 1, 0);
    }
  } else if (section === "hidratacao") {
    const [water, profile] = await Promise.all([
      db.from("care_hydration").select("amount_ml,recorded_at").eq("patient_id", patientId).eq("owner_id", ownerId).gte("recorded_at", since).limit(3000),
      db.from("care_hydration_profiles").select("target_ml").eq("patient_id", patientId).maybeSingle(),
    ]);
    for (const w of water.data ?? []) add(dayOf(w.recorded_at), Number(w.amount_ml));
    goal = Number(profile.data?.target_ml) || null;
  } else if (section === "alimentacao") {
    const rows = await db.from("care_activity_log").select("happened_at,details").eq("patient_id", patientId).eq("category", "refeicao").in("event_type", ["confirmed", "logged"]).gte("happened_at", since).limit(2000);
    for (const r of rows.data ?? []) {
      const total = sumNutrients(parseFoodText(String(r.details?.description || r.details?.title || "")).map(food => food.nutrients));
      add(dayOf(r.happened_at), Math.round(total.kcal), Math.round(total.protein));
    }
  } else if (section === "atividade") {
    const rows = await db.from("care_activity_log").select("happened_at,details").eq("patient_id", patientId).eq("category", "atividade").gte("happened_at", since).limit(2000);
    for (const r of rows.data ?? []) add(dayOf(r.happened_at), Number(r.details?.duration_minutes) || 0, Number(r.details?.distance_km) || 0);
    goal = 22; // ~150 min por semana
  } else if (section === "suplementos") {
    const rows = await db.from("care_supplement_intakes").select("taken_on").eq("patient_id", patientId).gte("taken_on", sinceDay).limit(2000);
    for (const r of rows.data ?? []) add(r.taken_on, 1);
  } else {
    const [log, water] = await Promise.all([
      db.from("care_activity_log").select("happened_at").eq("patient_id", patientId).gte("happened_at", since).limit(3000),
      db.from("care_hydration").select("recorded_at").eq("patient_id", patientId).gte("recorded_at", since).limit(3000),
    ]);
    for (const r of log.data ?? []) add(dayOf(r.happened_at), 1, 0);
    for (const r of water.data ?? []) add(dayOf(r.recorded_at), 0, 1);
  }
  return { map, goal };
}

type ChartKind = "bar" | "area" | "line";
const ranges = [[7, "7 dias"], [14, "14 dias"], [30, "30 dias"]] as const;

export function SectionInsights({ section, patientId, ownerId, revision = 0 }: { section: InsightSection; patientId: string; ownerId: string; revision?: number }) {
  const config = configs[section];
  const [data, setData] = useState<{ map: Map<string, { a: number; b: number }>; goal: number | null } | null>(null);
  const [days, setDays] = useState<7 | 14 | 30>(14);
  const [kind, setKind] = useState<ChartKind>("bar");
  const [hidden, setHidden] = useState<{ a: boolean; b: boolean; t: boolean }>({ a: false, b: false, t: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [detailDay, setDetailDay] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void load(section, patientId, ownerId).then(result => { if (active) setData(result); }, () => { if (active) setData({ map: new Map(), goal: null }); });
    return () => { active = false; };
  }, [section, patientId, ownerId, revision]);
  useEffect(() => { setSelected(null); setHidden({ a: false, b: false, t: false }); }, [section]);

  const rows = useMemo(() => withTrend(fillDays(data?.map ?? new Map(), days)), [data, days]);
  // Onde a segunda série já é uma linha (alimentação e atividade), ela faz o papel da linha do gráfico.
  const hasTrend = section !== "alimentacao" && section !== "atividade";
  // Em Medicação as barras já são vermelhas: a linha usa índigo para contrastar.
  const TREND = { label: "Tendência (média de 3 dias)", color: section === "medicacao" ? "#4f46e5" : "#f43f5e" };
  const previous = useMemo(() => fillDays(data?.map ?? new Map(), days * 2).slice(0, days), [data, days]);
  const total = rows.reduce((sum, row) => sum + row.a, 0);
  const previousTotal = previous.reduce((sum, row) => sum + row.a, 0);
  const activeDays = rows.filter(row => row.a > 0).length;
  const average = activeDays ? total / activeDays : 0;
  const best = rows.reduce((top, row) => row.a > top.a ? row : top, rows[0]);
  const streak = currentStreak(rows);
  const change = days <= 14 && previousTotal > 0 ? Math.round((total - previousTotal) / previousTotal * 100) : null;
  const picked = rows.find(row => row.day === selected) ?? rows[rows.length - 1];
  const gid = `ins-${section}`;
  const empty = total === 0 && rows.every(row => row.b === 0);

  const series = (key: "a" | "b") => {
    const item = key === "a" ? config.a : config.b;
    if (!item || hidden[key]) return null;
    const fill = `url(#${gid}-${key})`;
    const common = { dataKey: key, name: item.label, isAnimationActive: true, animationDuration: 500 } as const;
    if (key === "b" && section !== "agenda" && section !== "medicacao" && section !== "historico")
      return <Line {...common} yAxisId="right" type="monotone" stroke={item.color} strokeWidth={3} dot={{ r: 3, fill: "#fff", stroke: item.color, strokeWidth: 2 }} activeDot={{ r: 6 }}/>;
    if (kind === "bar") return <Bar {...common} yAxisId="left" stackId="s" fill={fill} radius={key === "a" && (!config.b || hidden.b || section === "alimentacao" || section === "atividade") ? [8, 8, 8, 8] : key === "b" ? [8, 8, 0, 0] : [0, 0, 8, 8]} maxBarSize={38} cursor="pointer"/>;
    if (kind === "area") return <Area {...common} yAxisId="left" type="monotone" stackId="s" stroke={item.color} strokeWidth={3} fill={fill} fillOpacity={0.35} activeDot={{ r: 6, fill: item.color, stroke: "#fff", strokeWidth: 2 }}/>;
    return <Line {...common} yAxisId="left" type="monotone" stroke={item.color} strokeWidth={3.5} dot={{ r: 3.5, fill: "#fff", stroke: item.color, strokeWidth: 2 }} activeDot={{ r: 7, fill: item.color, stroke: "#fff", strokeWidth: 2 }}/>;
  };
  const twoAxes = Boolean(config.b) && (section === "alimentacao" || section === "atividade") && !hidden.b;

  return <section className="mb-4 overflow-hidden rounded-3xl border border-border bg-card shadow-card" aria-label={config.title}>
    <header className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 p-4 pb-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:p-5 sm:pb-2">
      <span className="row-span-1 grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-md" style={{ background: `linear-gradient(135deg, ${config.a.color}, ${config.a.to})` }}><BarChart3 size={21}/></span>
      <div className="min-w-0 w-full"><h3 className="break-words text-lg font-bold leading-tight">{config.title}</h3><p className="break-words text-sm text-muted-foreground">{config.subtitle}</p></div>
      <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-2 sm:ml-auto sm:col-span-1 sm:w-auto">
        <div role="group" aria-label="Período" className="flex w-fit max-w-full gap-1 rounded-xl bg-muted p-1">
          {ranges.map(([value, label]) => <button key={value} type="button" aria-pressed={days === value} onClick={() => { setDays(value); setSelected(null); }}
            className={`h-9 rounded-lg px-3 text-sm font-semibold transition ${days === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
        </div>
        <div role="group" aria-label="Tipo de gráfico" className="flex shrink-0 gap-1 rounded-xl bg-muted p-1">
          {([["bar", BarChart3, "Barras"], ["area", AreaIcon, "Área"], ["line", LineIcon, "Linha"]] as const).map(([value, Icon, label]) => <button key={value} type="button" aria-pressed={kind === value} aria-label={label} title={label} onClick={() => setKind(value)}
            className={`grid size-9 place-items-center rounded-lg transition ${kind === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><Icon size={17}/></button>)}
        </div>
        <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? "Recolher gráfico" : "Mostrar gráfico"} className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"><ChevronDown size={18} className={`transition ${open ? "rotate-180" : ""}`}/></button>
      </div>
    </header>

    {open && <div className="grid gap-4 p-4 pt-2 sm:p-5 sm:pt-2 xl:grid-cols-[1fr_260px]">
      <div className="min-w-0">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[{ label: `Total em ${days} dias`, value: `${fmt(total)}${config.unit ? " " + config.unit : ""}`, icon: change !== null && change < 0 ? TrendingDown : TrendingUp, note: change === null ? "período selecionado" : `${change > 0 ? "+" : ""}${change}% vs. período anterior` },
            { label: "Média por dia ativo", value: `${fmt(average)}${config.unit ? " " + config.unit : ""}`, icon: BarChart3, note: `${activeDays} de ${days} dias com registro` },
            { label: "Melhor dia", value: best && best.a > 0 ? `${fmt(best.a)}${config.unit ? " " + config.unit : ""}` : "—", icon: Trophy, note: best && best.a > 0 ? `${weekday(best.day)}, ${short(best.day)}` : "ainda sem registros" },
            { label: "Sequência atual", value: `${streak} dia${streak === 1 ? "" : "s"}`, icon: Flame, note: streak > 1 ? "continue assim!" : "registre hoje para começar" }]
            .map(({ label, value, icon: Icon, note }) => <div key={label} className="rounded-2xl bg-muted/50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Icon size={14} style={{ color: config.a.color }}/>{label}</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums leading-tight">{value}</p><p className="truncate text-xs text-muted-foreground">{note}</p>
            </div>)}
        </div>
        <div className="mt-3 h-[260px] w-full sm:h-[300px]">
          {!data ? <div className="h-full animate-pulse rounded-2xl bg-muted/60"/> : empty
            ? <div className="grid h-full place-items-center rounded-2xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">Ainda não há registros neste período.<br/>Assim que você registrar, o gráfico aparece aqui.</div>
            : <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 12, right: twoAxes ? 0 : 8, left: -14, bottom: 0 }} onClick={(state: any) => { if (state?.activeLabel) { setSelected(String(state.activeLabel)); setDetailDay(String(state.activeLabel)); } }}>
                <defs>
                  {(["a", "b"] as const).map(key => { const item = key === "a" ? config.a : config.b; return item && <linearGradient key={key} id={`${gid}-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={item.to} stopOpacity={1}/><stop offset="100%" stopColor={item.color} stopOpacity={kind === "area" ? 0.15 : 0.92}/></linearGradient>; })}
                </defs>
                <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="currentColor" className="text-border"/>
                <XAxis dataKey="day" tickFormatter={short} tick={{ fontSize: 12, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false} minTickGap={14}/>
                <YAxis yAxisId="left" domain={[0, (max: number) => Math.ceil(Math.max(max, data.goal && !hidden.a ? data.goal * 1.08 : 0))]} tick={{ fontSize: 12, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false} width={48} allowDecimals={false}/>
                {twoAxes && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false} width={36}/>}
                <Tooltip cursor={{ fill: config.a.color, fillOpacity: 0.08 }} content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return <div className="rounded-2xl border border-border bg-card/95 px-3.5 py-2.5 text-sm shadow-pop backdrop-blur">
                    <p className="font-bold capitalize">{weekday(String(label))}, {short(String(label))}</p>
                    {payload.map(item => <p key={String(item.dataKey)} className="mt-0.5 flex items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: item.dataKey === "t" ? TREND.color : (item.dataKey === "a" ? config.a : config.b)?.color }}/>{item.name}: <strong className="tabular-nums">{fmt(Number(item.value))}{item.dataKey === "a" && config.unit ? " " + config.unit : ""}</strong></p>)}
                    {data.goal && section === "hidratacao" && <p className="mt-1 text-xs text-muted-foreground">{Math.round(Number(payload[0].payload.a) / data.goal * 100)}% da meta</p>}
                  </div>;
                }}/>
                {data.goal && !hidden.a && <ReferenceLine yAxisId="left" y={data.goal} stroke={config.a.color} strokeDasharray="6 5" strokeOpacity={0.7} label={{ value: `${config.goalLabel ?? "Referência"} ${fmt(data.goal)}`, position: "insideTopRight", fontSize: 11, fontWeight: 700, fill: config.a.color }}/>}
                {selected && <ReferenceLine yAxisId="left" x={selected} stroke={config.a.color} strokeOpacity={0.35} strokeWidth={22}/>}
                {series("a")}{series("b")}
                {hasTrend && !hidden.t && <Line yAxisId="left" dataKey="t" name={TREND.label} type="monotone" stroke={TREND.color} strokeWidth={3} dot={{ r: 3.5, fill: "#fff", stroke: TREND.color, strokeWidth: 2 }} activeDot={{ r: 7, fill: TREND.color, stroke: "#fff", strokeWidth: 2 }} animationDuration={500}/>}
              </ComposedChart>
            </ResponsiveContainer>}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["a", "b"] as const).map(key => { const item = key === "a" ? config.a : config.b; return item && <button key={key} type="button" aria-pressed={!hidden[key]} onClick={() => setHidden(value => ({ ...value, [key]: !value[key] }))}
            className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition ${hidden[key] ? "border-border text-muted-foreground line-through opacity-60" : "border-transparent bg-muted text-foreground"}`}>
            <i className="size-3 rounded-full" style={{ background: `linear-gradient(135deg, ${item.color}, ${item.to})` }}/>{item.label}</button>; })}
          {hasTrend && <button type="button" aria-pressed={!hidden.t} onClick={() => setHidden(value => ({ ...value, t: !value.t }))}
            className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition ${hidden.t ? "border-border text-muted-foreground line-through opacity-60" : "border-transparent bg-muted text-foreground"}`}>
            <i className="h-1 w-4 rounded-full" style={{ background: TREND.color }}/>{TREND.label}</button>}
          <span className="ml-auto self-center text-xs text-muted-foreground">Toque numa barra para abrir os detalhes do dia.</span>
        </div>
      </div>

      <aside className="flex flex-col rounded-2xl p-4 text-white" style={{ background: `linear-gradient(160deg, ${config.a.color}, ${config.a.to})` }} aria-live="polite">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-white/75">{selected ? "Dia selecionado" : "Hoje"}</p>
        <p className="mt-1 text-lg font-extrabold capitalize">{weekday(picked.day)}, {short(picked.day)}</p>
        <p className="mt-3 text-4xl font-extrabold tabular-nums leading-none">{fmt(picked.a)}<span className="ml-1 text-base font-semibold text-white/80">{config.unit}</span></p>
        <p className="text-sm text-white/85">{config.a.label}</p>
        {config.b && <p className="mt-2 text-sm text-white/90"><strong className="tabular-nums">{fmt(picked.b)}</strong> {config.b.label.toLowerCase()}</p>}
        {data?.goal && <div className="mt-3"><div className="h-2 overflow-hidden rounded-full bg-white/25"><i className="block h-full rounded-full bg-white transition-[width] duration-500" style={{ width: Math.min(100, Math.round(picked.a / data.goal * 100)) + "%" }}/></div>
          <p className="mt-1 text-xs text-white/85">{Math.round(picked.a / data.goal * 100)}% de {fmt(data.goal)} {config.unit}</p></div>}
        {hasTrend && <p className="mt-2 text-sm text-white/90">Tendência: <strong className="tabular-nums">{fmt(picked.t ?? 0)}</strong>{config.unit ? " " + config.unit : ""} (média de 3 dias)</p>}
        {data?.goal && <p className="mt-1 text-sm text-white/90"><strong className="tabular-nums">{rows.filter(row => row.a >= data.goal!).length}</strong> de {days} dias atingiram a meta</p>}
        <p className="mt-auto pt-3 text-xs text-white/80">{average > 0 ? (picked.a >= average ? `Acima da sua média (${fmt(average)}).` : `Abaixo da sua média (${fmt(average)}).`) : "Sem média ainda."}</p>
        <button type="button" onClick={() => setDetailDay(picked.day)} className="mt-2 h-10 rounded-xl bg-white text-sm font-extrabold text-slate-900 shadow hover:bg-white/90">Ver detalhes do dia</button>
        {selected && <button type="button" onClick={() => setSelected(null)} className="mt-2 h-9 rounded-xl bg-white/20 text-sm font-bold hover:bg-white/30">Voltar para hoje</button>}
      </aside>
    </div>}
    <DayDetailDialog patientId={patientId} ownerId={ownerId} focus={section === "agenda" || section === "historico" ? undefined : section} day={detailDay} waterTarget={data?.goal && section === "hidratacao" ? data.goal : null} onClose={() => setDetailDay(null)}/>
  </section>;
}
