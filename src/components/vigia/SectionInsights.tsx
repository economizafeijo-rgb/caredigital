import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Flame, LineChart as LineIcon, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { EvoChart } from "./EvoChart";
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
  hidratacao: { title: "Líquidos por dia", subtitle: "Água e outras bebidas comparadas à sua meta", unit: "ml", a: { label: "Total de líquidos", color: "#0284c7", to: "#22d3ee" }, b: { label: "Outras bebidas", color: "#8b5cf6", to: "#a78bfa" }, goalLabel: "Meta" },
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
    const [water, profile, drinks] = await Promise.all([
      db.from("care_hydration").select("amount_ml,recorded_at").eq("patient_id", patientId).eq("owner_id", ownerId).gte("recorded_at", since).limit(3000),
      db.from("care_hydration_profiles").select("target_ml").eq("patient_id", patientId).maybeSingle(),
      db.from("care_client_beverages").select("amount_ml,consumed_at").eq("patient_id", patientId).eq("owner_id", ownerId).gte("consumed_at", since).limit(3000),
    ]);
    for (const w of water.data ?? []) add(dayOf(w.recorded_at), Number(w.amount_ml));
    for (const d of drinks?.data ?? []) add(dayOf(d.consumed_at), Number(d.amount_ml), Number(d.amount_ml));
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

const ranges = [[7, "7 dias"], [14, "14 dias"], [30, "30 dias"]] as const;
const DAY = 86_400_000;
const toX = (key: string) => Date.parse(key + "T12:00:00Z");
const fromX = (x: number) => new Date(x).toISOString().slice(0, 10);
const compact = (v: number) => v >= 10000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : fmt(Math.round(v * 10) / 10);
/** Séries com a mesma unidade da principal podem dividir o eixo; as demais aparecem só na dica. */
const sharesAxis = (s: InsightSection) => s === "agenda" || s === "medicacao" || s === "historico" || s === "hidratacao";

export function SectionInsights({ section, patientId, ownerId, revision = 0 }: { section: InsightSection; patientId: string; ownerId: string; revision?: number }) {
  const config = configs[section];
  const [data, setData] = useState<{ map: Map<string, { a: number; b: number }>; goal: number | null } | null>(null);
  const [days, setDays] = useState<7 | 14 | 30>(14);
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
  const TREND = { label: "Média de 3 dias", color: section === "medicacao" ? "#4f46e5" : "#f43f5e" };
  const previous = useMemo(() => fillDays(data?.map ?? new Map(), days * 2).slice(0, days), [data, days]);
  const total = rows.reduce((sum, row) => sum + row.a, 0);
  const previousTotal = previous.reduce((sum, row) => sum + row.a, 0);
  const activeDays = rows.filter(row => row.a > 0).length;
  const average = activeDays ? total / activeDays : 0;
  const best = rows.reduce((top, row) => row.a > top.a ? row : top, rows[0]);
  const streak = currentStreak(rows);
  const change = previousTotal > 0 ? Math.round((total - previousTotal) / previousTotal * 100) : null;
  const picked = rows.find(row => row.day === selected) ?? rows[rows.length - 1];
  const empty = total === 0 && rows.every(row => row.b === 0);
  const unit = config.unit ? " " + config.unit : "";
  const goalDays = data?.goal ? rows.filter(row => row.a >= data.goal!).length : null;
  const byX = useMemo(() => new Map(rows.map(r => [toX(r.day), r])), [rows]);
  const bOnAxis = Boolean(config.b) && sharesAxis(section);

  const series = [
    ...(!hidden.a ? [{ id: "a", label: config.a.label, color: config.a.color, area: true, dots: days <= 14, live: true, points: rows.map(r => ({ x: toX(r.day), y: r.a })) }] : []),
    ...(config.b && bOnAxis && !hidden.b ? [{ id: "b", label: config.b.label, color: config.b.color, dots: days <= 14, points: rows.map(r => ({ x: toX(r.day), y: r.b })) }] : []),
    ...(!hidden.t ? [{ id: "t", label: TREND.label, color: TREND.color, dashed: true, points: rows.map(r => ({ x: toX(r.day), y: r.t ?? 0 })) }] : []),
  ];
  const tickEvery = days === 7 ? 1 : days === 14 ? 2 : 5;
  const xTicks = rows.filter((_, i) => (rows.length - 1 - i) % tickEvery === 0).map(r => ({ x: toX(r.day), label: short(r.day) }));
  const pct = data?.goal ? Math.round(picked.a / data.goal * 100) : null;

  const stats = [
    { label: `Total · ${days} dias`, value: `${compact(total)}${unit}`, icon: change !== null && change < 0 ? TrendingDown : TrendingUp, note: change === null ? "sem período anterior" : `${change > 0 ? "+" : ""}${change}% vs. anterior`, tone: change === null ? "" : change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400" },
    { label: "Média por dia ativo", value: `${compact(average)}${unit}`, icon: LineIcon, note: `${activeDays} de ${days} dias`, tone: "" },
    { label: "Melhor dia", value: best && best.a > 0 ? `${compact(best.a)}${unit}` : "—", icon: Trophy, note: best && best.a > 0 ? `${weekday(best.day)}, ${short(best.day)}` : "sem registros", tone: "" },
    { label: goalDays !== null ? "Dias na meta" : "Sequência", value: goalDays !== null ? `${goalDays}/${days}` : `${streak} dia${streak === 1 ? "" : "s"}`, icon: Flame, note: goalDays !== null ? `sequência de ${streak} dia${streak === 1 ? "" : "s"}` : streak > 1 ? "continue assim" : "registre hoje", tone: "" },
  ];

  return <section className="mb-4 overflow-hidden rounded-2xl border border-border bg-card shadow-card" aria-label={config.title} style={{ ["--ins" as string]: config.a.color }}>
    <div aria-hidden className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${config.a.color}, ${config.a.to})` }} />
    <header className="flex flex-wrap items-center gap-3 px-4 pb-2 pt-3 sm:px-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${config.a.color}, ${config.a.to})` }}><LineIcon size={18}/></span>
      <div className="min-w-0 flex-1"><h3 className="truncate text-base font-bold leading-tight">{config.title}</h3><p className="truncate text-xs text-muted-foreground">{config.subtitle}</p></div>
      <div role="group" aria-label="Período" className="flex gap-0.5 rounded-lg bg-muted p-0.5">
        {ranges.map(([value, label]) => <button key={value} type="button" aria-pressed={days === value} onClick={() => { setDays(value); setSelected(null); }}
          className={`h-7 rounded-md px-2.5 text-xs font-semibold transition ${days === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
      </div>
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? "Recolher gráfico" : "Mostrar gráfico"} className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"><ChevronDown size={17} className={`transition-transform ${open ? "rotate-180" : ""}`}/></button>
    </header>

    {open && <div className="px-4 pb-4 sm:px-5">
      <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-border sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, note, tone }, i) => <div key={label} className={`min-w-0 px-3 py-2 ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""} border-border`}>
          <dt className="flex items-center gap-1.5 truncate text-[11px] font-semibold text-muted-foreground"><Icon size={13} style={{ color: config.a.color }}/>{label}</dt>
          <dd className="mt-0.5 truncate text-lg font-extrabold tabular-nums leading-tight">{value}</dd>
          <dd className={`truncate text-[11px] text-muted-foreground ${tone}`}>{note}</dd>
        </div>)}
      </dl>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {([["a", config.a.label, config.a.color, false], ...(config.b && bOnAxis ? [["b", config.b.label, config.b.color, false]] : []), ["t", TREND.label, TREND.color, true]] as [keyof typeof hidden, string, string, boolean][]).map(([key, label, color, dashed]) =>
              <button key={key} type="button" aria-pressed={!hidden[key]} onClick={() => setHidden(v => ({ ...v, [key]: !v[key] }))}
                className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition ${hidden[key] ? "text-muted-foreground line-through opacity-60 hover:opacity-100" : "bg-muted text-foreground hover:bg-muted/70"}`}>
                <i className={`inline-block w-3.5 ${dashed ? "border-t-2 border-dashed" : "h-[3px] rounded-full"}`} style={dashed ? { borderColor: color } : { background: color }}/>{label}</button>)}
            <span className="ml-auto text-[11px] text-muted-foreground">Toque num ponto para ver o dia</span>
          </div>
          {!data ? <div className="h-[230px] animate-pulse rounded-xl bg-muted/60"/> : empty
            ? <div className="grid h-[230px] place-items-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">Ainda não há registros neste período.<br/>Assim que você registrar, a linha de evolução aparece aqui.</div>
            : <EvoChart height={230} ariaLabel={`${config.title} nos últimos ${days} dias`} xMin={toX(rows[0].day) - DAY * 0.3} xMax={toX(rows[rows.length - 1].day) + DAY * 0.3}
                xTicks={xTicks} formatX={x => `${weekday(fromX(x))}, ${short(fromX(x))}`} formatY={v => compact(v)}
                goal={data.goal && !hidden.a ? { y: data.goal, label: `${config.goalLabel ?? "Referência"} ${compact(data.goal)}${unit}`, color: "#10b981" } : undefined}
                series={series} selectedX={selected ? toX(selected) : null} onPick={x => setSelected(fromX(x))}
                tip={x => { const r = byX.get(x); if (!r) return null; return <>
                  {config.b && !bOnAxis && <p className="mt-1 flex justify-between gap-3"><span className="text-muted-foreground">{config.b.label}</span><strong className="tabular-nums">{fmt(r.b)}</strong></p>}
                  {data.goal ? <p className={`mt-1.5 border-t border-border pt-1.5 font-semibold ${r.a >= data.goal ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>{Math.round(r.a / data.goal * 100)}% da meta</p> : null}
                </>; }}/>}
        </div>

        <aside className="flex flex-col rounded-xl border border-border p-3" style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${config.a.color} 10%, transparent), transparent 70%)` }} aria-live="polite">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><CalendarDays size={13} style={{ color: config.a.color }}/>{selected ? "Dia selecionado" : "Hoje"}</p>
          <p className="text-sm font-bold capitalize">{weekday(picked.day)}, {short(picked.day)}</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums leading-none" style={{ color: config.a.color }}>{compact(picked.a)}<span className="ml-1 text-sm font-semibold text-muted-foreground">{config.unit}</span></p>
          <p className="text-xs text-muted-foreground">{config.a.label}{config.b ? ` · ${fmt(picked.b)} ${config.b.label.toLowerCase()}` : ""}</p>
          {pct !== null && <div className="mt-2.5"><div className="h-1.5 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full transition-[width] duration-700" style={{ width: Math.min(100, pct) + "%", background: `linear-gradient(90deg, ${config.a.color}, ${config.a.to})` }}/></div>
            <p className="mt-1 text-[11px] text-muted-foreground">{pct}% de {compact(data!.goal!)}{unit}</p></div>}
          <p className="mt-2 text-[11px] text-muted-foreground">{average > 0 ? (picked.a >= average ? `Acima da sua média (${compact(average)}).` : `Abaixo da sua média (${compact(average)}).`) : "Sem média ainda."}</p>
          <div className="mt-auto flex gap-1.5 pt-3">
            <button type="button" onClick={() => setDetailDay(picked.day)} className="h-8 flex-1 rounded-lg text-xs font-bold text-white shadow-sm transition hover:brightness-110 active:scale-[.98]" style={{ background: `linear-gradient(135deg, ${config.a.color}, ${config.a.to})` }}>Ver detalhes</button>
            {selected && <button type="button" onClick={() => setSelected(null)} className="h-8 rounded-lg border border-border px-2.5 text-xs font-semibold hover:bg-muted">Hoje</button>}
          </div>
        </aside>
      </div>
    </div>}
    <DayDetailDialog patientId={patientId} ownerId={ownerId} focus={section === "agenda" || section === "historico" ? undefined : section} day={detailDay} waterTarget={data?.goal && section === "hidratacao" ? data.goal : null} onClose={() => setDetailDay(null)}/>
  </section>;
}
