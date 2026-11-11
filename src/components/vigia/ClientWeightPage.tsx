import { useEffect, useMemo, useState } from "react";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Activity, CalendarDays, Flag, Plus, Ruler, Scale, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey } from "@/lib/acre-time";

type Point = { id: string; recorded_on: string; weight_kg: number; height_cm: number };
type Props = { patientId: string; ownerId: string; heightCm: number | null; currentWeight: number | null; onRecorded?: () => void };
type Range = "30" | "90" | "365" | "all";

const nf = (value: number, digits = 1) => value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const shortDate = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const longDate = (iso: string) => iso.split("-").reverse().join("/");
const bmiOf = (kg: number, cm: number) => kg / ((cm / 100) ** 2);

export function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Abaixo do peso", color: "#38bdf8" };
  if (bmi < 25) return { label: "Peso adequado", color: "#10b981" };
  if (bmi < 30) return { label: "Sobrepeso", color: "#f59e0b" };
  if (bmi < 35) return { label: "Obesidade grau I", color: "#f97316" };
  if (bmi < 40) return { label: "Obesidade grau II", color: "#ef4444" };
  return { label: "Obesidade grau III", color: "#b91c1c" };
}

/** Média móvel simples dos últimos `size` registros. */
export function movingAverage(values: number[], size = 7): number[] {
  return values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - size + 1), index + 1);
    return slice.reduce((total, value) => total + value, 0) / slice.length;
  });
}

function StatCard({ icon: Icon, label, value, note, gradient }: { icon: typeof Scale; label: string; value: string; note: string; gradient: string }) {
  return <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-3.5 shadow-card">
    <div aria-hidden="true" className={`absolute -right-6 -top-6 size-20 rounded-full opacity-20 blur-xl ${gradient}`}/>
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      <span className={`grid size-8 place-items-center rounded-xl text-white shadow-sm ${gradient}`}><Icon size={16}/></span>{label}
    </div>
    <p className="mt-2 font-display text-2xl font-extrabold tabular-nums tracking-tight">{value}</p>
    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{note}</p>
  </div>;
}

export function ClientWeightPage({ patientId, ownerId, heightCm, currentWeight, onRecorded }: Props) {
  const [points, setPoints] = useState<Point[]>([]);
  const [target, setTarget] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [range, setRange] = useState<Range>("90");
  const [date, setDate] = useState(() => acreDateKey());
  const [weight, setWeight] = useState(currentWeight ? String(currentWeight).replace(".", ",") : "");
  const [height, setHeight] = useState(heightCm ? String(heightCm) : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const db = supabase as any;
    void Promise.all([
      db.from("care_body_measurements").select("id,recorded_on,weight_kg,height_cm")
        .eq("patient_id", patientId).eq("owner_id", ownerId).order("recorded_on", { ascending: true }).limit(730),
      db.from("care_nutrition_preferences").select("target_weight_kg")
        .eq("patient_id", patientId).eq("owner_id", ownerId).maybeSingle(),
    ]).then(([rows, prefs]: any[]) => {
      if (!active) return;
      if (rows.error) setUnavailable(true);
      else {
        setUnavailable(false);
        const list = (rows.data ?? []).map((row: Point) => ({ ...row, weight_kg: Number(row.weight_kg), height_cm: Number(row.height_cm) }));
        setPoints(list);
        const lastHeight = list.at(-1)?.height_cm;
        if (!heightCm && lastHeight) setHeight(previous => previous || String(lastHeight));
      }
      const goal = Number(prefs.data?.target_weight_kg);
      setTarget(Number.isFinite(goal) && goal > 0 ? goal : null);
      setLoaded(true);
    }, () => { if (active) { setUnavailable(true); setLoaded(true); } });
    return () => { active = false; };
  }, [patientId, ownerId, heightCm, reload]);

  async function save() {
    if (saving) return;
    const kg = Number(weight.replace(",", "."));
    const cm = Number(height.replace(",", "."));
    if (!Number.isFinite(kg) || kg < 20 || kg > 350) { setMessage({ ok: false, text: "Informe um peso entre 20 e 350 kg." }); return; }
    if (!Number.isFinite(cm) || cm < 100 || cm > 230) { setMessage({ ok: false, text: "Informe a altura entre 100 e 230 cm." }); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > acreDateKey()) { setMessage({ ok: false, text: "Escolha uma data válida que não esteja no futuro." }); return; }
    setSaving(true); setMessage(null);
    const auth = await supabase.auth.getUser();
    if (!auth.data.user) { setSaving(false); setMessage({ ok: false, text: "Entre na sua conta para registrar o peso." }); return; }
    const result = await (supabase as any).from("care_body_measurements").upsert({
      patient_id: patientId, owner_id: ownerId, recorded_by: auth.data.user.id, recorded_on: date, weight_kg: kg, height_cm: cm,
    }, { onConflict: "patient_id,recorded_on" });
    setSaving(false);
    if (result.error) { setMessage({ ok: false, text: "Não foi possível salvar. Verifique sua conexão e permissões." }); return; }
    setMessage({ ok: true, text: `${nf(kg)} kg registrados em ${longDate(date)}.` });
    setReload(value => value + 1);
    onRecorded?.();
  }

  const filtered = useMemo(() => {
    if (range === "all") return points;
    const since = acreDateKey(new Date(Date.now() - Number(range) * 86_400_000));
    return points.filter(point => point.recorded_on >= since);
  }, [points, range]);

  const chart = useMemo(() => {
    const avg = movingAverage(filtered.map(point => point.weight_kg));
    return filtered.map((point, index) => ({
      date: point.recorded_on, label: shortDate(point.recorded_on), weight: point.weight_kg,
      average: Number(avg[index].toFixed(2)), bmi: Number(bmiOf(point.weight_kg, point.height_cm).toFixed(1)),
    }));
  }, [filtered]);

  const changes = useMemo(() => filtered.slice(1).map((point, index) => ({
    label: shortDate(point.recorded_on), delta: Number((point.weight_kg - filtered[index].weight_kg).toFixed(2)),
  })).slice(-14), [filtered]);

  const last = points.at(-1);
  const first = filtered[0];
  const refHeight = Number(height.replace(",", ".")) || last?.height_cm || heightCm || 0;
  const bmi = last && refHeight ? bmiOf(last.weight_kg, refHeight) : null;
  const category = bmi ? bmiCategory(bmi) : null;
  const delta = last && first && first.id !== last.id ? last.weight_kg - first.weight_kg : null;
  const healthyMin = refHeight ? 18.5 * (refHeight / 100) ** 2 : null;
  const healthyMax = refHeight ? 24.9 * (refHeight / 100) ** 2 : null;
  const toTarget = last && target ? last.weight_kg - target : null;
  const values = chart.flatMap(point => [point.weight]).concat(target ? [target] : []);
  const yMin = values.length ? Math.floor(Math.min(...values) - 2) : 0;
  const yMax = values.length ? Math.ceil(Math.max(...values) + 2) : 100;
  const bmiPercent = bmi ? Math.min(100, Math.max(0, (bmi - 15) / (40 - 15) * 100)) : 0;
  const ranges: { key: Range; label: string }[] = [{ key: "30", label: "30 dias" }, { key: "90", label: "3 meses" }, { key: "365", label: "1 ano" }, { key: "all", label: "Tudo" }];

  if (loaded && unavailable) return <p role="status" className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
    O histórico de peso ainda não está disponível neste ambiente. Verifique se a migração <code>care_body_measurements</code> foi aplicada.
  </p>;

  return <div className="flex flex-col gap-3" aria-label="Registro e evolução do peso">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard icon={Scale} label="Peso atual" gradient="bg-gradient-to-br from-fuchsia-500 to-pink-500"
        value={last ? `${nf(last.weight_kg)} kg` : "—"} note={last ? `Registrado em ${longDate(last.recorded_on)}` : "Faça o primeiro registro"}/>
      <StatCard icon={delta !== null && delta < 0 ? TrendingDown : delta !== null && delta > 0 ? TrendingUp : Minus} label="Variação no período"
        gradient={delta !== null && delta < 0 ? "bg-gradient-to-br from-emerald-500 to-teal-500" : "bg-gradient-to-br from-amber-500 to-orange-500"}
        value={delta !== null ? `${delta > 0 ? "+" : ""}${nf(delta)} kg` : "—"} note={first ? `Desde ${longDate(first.recorded_on)}` : "Sem registros no período"}/>
      <StatCard icon={Activity} label="IMC" gradient="bg-gradient-to-br from-sky-500 to-indigo-500"
        value={bmi ? nf(bmi) : "—"} note={category?.label ?? "Informe peso e altura"}/>
      <StatCard icon={Flag} label="Meta de peso" gradient="bg-gradient-to-br from-violet-500 to-purple-600"
        value={target ? `${nf(target)} kg` : "—"}
        note={toTarget !== null ? (Math.abs(toTarget) < 0.1 ? "Meta alcançada!" : `${nf(Math.abs(toTarget))} kg ${toTarget > 0 ? "acima" : "abaixo"} da meta`) : "Defina em Meu perfil › nutrição"}/>
    </div>

    <div className="grid gap-3 xl:grid-cols-[1fr_320px]">
      <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card" aria-label="Gráfico de evolução do peso">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold">Evolução do peso</h3>
            <p className="text-xs text-muted-foreground">Peso registrado, média móvel de 7 registros e faixa de peso adequado (IMC 18,5–24,9)</p>
          </div>
          <div role="group" aria-label="Período do gráfico" className="flex gap-1 rounded-xl bg-muted p-1">
            {ranges.map(item => <button key={item.key} type="button" aria-pressed={range === item.key} onClick={() => setRange(item.key)}
              className={`h-8 rounded-lg px-2.5 text-[11px] font-semibold transition ${range === item.key ? "bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}
          </div>
        </div>
        <div className="mt-3 h-[300px] w-full">
          {!loaded ? <div className="h-full animate-pulse rounded-xl bg-muted/60"/> : chart.length === 0
            ? <div className="grid h-full place-items-center rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground"><span><Scale className="mx-auto mb-2 text-fuchsia-500" size={28}/>Nenhum registro neste período.<br/>Use o formulário para registrar seu peso.</span></div>
            : <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d946ef" stopOpacity={0.45}/>
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0.02}/>
                  </linearGradient>
                  <linearGradient id="weightStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#a855f7"/><stop offset="100%" stopColor="#ec4899"/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false}/>
                {healthyMin && healthyMax && <ReferenceArea y1={Math.max(yMin, healthyMin)} y2={Math.min(yMax, healthyMax)} fill="#10b981" fillOpacity={0.08} ifOverflow="hidden"/>}
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false} minTickGap={16}/>
                <YAxis domain={[yMin, yMax]} tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false} width={44} unit=" kg"/>
                <Tooltip cursor={{ stroke: "#d946ef", strokeOpacity: 0.3 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as (typeof chart)[number];
                    return <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-pop">
                      <p className="font-bold">{longDate(row.date)}</p>
                      <p className="mt-1"><span className="inline-block size-2 rounded-full bg-fuchsia-500"/> Peso: <strong>{nf(row.weight)} kg</strong></p>
                      <p><span className="inline-block size-2 rounded-full bg-indigo-500"/> Média: {nf(row.average)} kg</p>
                      <p className="text-muted-foreground">IMC {nf(row.bmi)} · {bmiCategory(row.bmi).label}</p>
                    </div>;
                  }}/>
                {target && <ReferenceLine y={target} stroke="#8b5cf6" strokeDasharray="6 4" label={{ value: `Meta ${nf(target)} kg`, position: "insideTopRight", fill: "#8b5cf6", fontSize: 11, fontWeight: 700 }}/>}
                <Area type="monotone" dataKey="weight" stroke="url(#weightStroke)" strokeWidth={3} fill="url(#weightFill)"
                  dot={{ r: 3.5, fill: "#fff", stroke: "#d946ef", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#d946ef", stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false}/>
                <Line type="monotone" dataKey="average" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false}/>
              </ComposedChart>
            </ResponsiveContainer>}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="h-1 w-4 rounded bg-gradient-to-r from-purple-500 to-pink-500"/>Peso</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-indigo-500"/>Média móvel</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-emerald-500/20"/>Faixa de peso adequado</span>
          {target && <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-violet-500"/>Meta</span>}
        </div>
      </section>

      <aside className="flex flex-col gap-3">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card" aria-label="Registrar peso">
          <h3 className="flex items-center gap-2 font-display text-base font-bold"><span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white"><Plus size={16}/></span>Registrar peso</h3>
          <div className="mt-3 grid gap-2">
            <label className="text-xs font-semibold">Data
              <span className="relative mt-1 block"><CalendarDays size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                <input type="date" max={acreDateKey()} value={date} onChange={event => setDate(event.target.value)} className="block h-10 w-full rounded-xl border border-border bg-surface pl-8 pr-2 text-sm"/></span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold">Peso (kg)
                <span className="relative mt-1 block"><Scale size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                  <input inputMode="decimal" value={weight} onChange={event => setWeight(event.target.value)} placeholder="75,5" className="block h-10 w-full rounded-xl border border-border bg-surface pl-8 pr-2 text-sm"/></span>
              </label>
              <label className="text-xs font-semibold">Altura (cm)
                <span className="relative mt-1 block"><Ruler size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                  <input inputMode="numeric" value={height} onChange={event => setHeight(event.target.value)} placeholder="170" className="block h-10 w-full rounded-xl border border-border bg-surface pl-8 pr-2 text-sm"/></span>
              </label>
            </div>
            <button type="button" disabled={saving} onClick={() => void save()}
              className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-500 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60">
              <Scale size={16}/>{saving ? "Salvando…" : "Salvar registro"}
            </button>
            <p className="text-[11px] text-muted-foreground">Um registro por dia; salvar novamente na mesma data substitui o valor.</p>
            {message && <p role="status" className={`rounded-lg px-2.5 py-2 text-xs font-medium ${message.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}>{message.text}</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card" aria-label="Classificação do IMC">
          <h3 className="font-display text-sm font-bold">Classificação do IMC</h3>
          <div className="relative mt-3 h-3 rounded-full bg-gradient-to-r from-sky-400 via-emerald-500 via-40% to-red-600">
            {bmi && <span className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-md" style={{ left: `${bmiPercent}%`, background: category?.color }}/>}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground"><span>15</span><span>18,5</span><span>25</span><span>30</span><span>40</span></div>
          <p className="mt-2 text-xs">{bmi ? <>IMC <strong>{nf(bmi)}</strong> · <strong style={{ color: category?.color }}>{category?.label}</strong>{healthyMin && healthyMax ? ` · faixa adequada: ${nf(healthyMin)}–${nf(healthyMax)} kg` : ""}</> : "Registre peso e altura para calcular."}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Referência populacional (OMS). Não substitui avaliação profissional.</p>
        </section>
      </aside>
    </div>

    <div className="grid gap-3 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card" aria-label="Variação entre registros">
        <h3 className="font-display text-sm font-bold">Variação entre registros</h3>
        <p className="text-xs text-muted-foreground">Diferença em kg em relação ao registro anterior (últimos 14)</p>
        <div className="mt-3 h-[180px]">
          {changes.length === 0 ? <p className="grid h-full place-items-center text-xs text-muted-foreground">São necessários pelo menos dois registros.</p>
            : <ResponsiveContainer width="100%" height="100%">
              <BarChart data={changes} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false}/>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false}/>
                <ReferenceLine y={0} stroke="currentColor" className="text-border"/>
                <Tooltip formatter={(value: number) => [`${value > 0 ? "+" : ""}${nf(value)} kg`, "Variação"]} contentStyle={{ borderRadius: 12, fontSize: 12 }}/>
                <Bar dataKey="delta" radius={[6, 6, 6, 6]} isAnimationActive={false}>
                  {changes.map(item => <Cell key={item.label + item.delta} fill={item.delta <= 0 ? "#10b981" : "#f97316"}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>}
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card" aria-label="Registros de peso">
        <h3 className="font-display text-sm font-bold">Últimos registros</h3>
        <div className="mt-2 max-h-[200px] overflow-y-auto">
          {points.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">Nenhum registro ainda.</p>
            : <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-card text-muted-foreground"><tr><th className="py-1.5">Data</th><th>Peso</th><th>Variação</th><th>IMC</th></tr></thead>
              <tbody>{points.slice().reverse().slice(0, 30).map((point, index, list) => {
                const previous = list[index + 1];
                const diff = previous ? point.weight_kg - previous.weight_kg : null;
                const pointBmi = bmiOf(point.weight_kg, point.height_cm);
                return <tr key={point.id} className="border-t border-border">
                  <td className="py-1.5">{longDate(point.recorded_on)}</td>
                  <td className="font-semibold tabular-nums">{nf(point.weight_kg)} kg</td>
                  <td className={`tabular-nums ${diff === null ? "text-muted-foreground" : diff <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}>{diff === null ? "—" : `${diff > 0 ? "+" : ""}${nf(diff)}`}</td>
                  <td><span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ background: bmiCategory(pointBmi).color }}>{nf(pointBmi)}</span></td>
                </tr>;
              })}</tbody>
            </table>}
        </div>
      </section>
    </div>
  </div>;
}
