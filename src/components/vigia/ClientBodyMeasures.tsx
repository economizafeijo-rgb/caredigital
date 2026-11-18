import { useEffect, useMemo, useState } from "react";
import { Info, Pencil, Plus, Ruler, Save, Target, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import { MEASURES, navyBodyFat, waistHeight, waistHip, type MeasureKey } from "@/lib/body-metrics";
import { parseDecimal } from "@/lib/public-signup-validation";
import { EvoChart } from "./EvoChart";

type Row = { id: string; measured_on: string; body_fat_pct: number | null; goal_label: string | null; notes: string | null } & Partial<Record<MeasureKey, number | null>>;
const tz = "America/Rio_Branco";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
const nf = (v: number, d = 1) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const br = (d: string) => d.split("-").reverse().join("/");
const meta = (k: MeasureKey) => MEASURES.find((m) => m.key === k)!;

/** Pontos de medida sobre o corpo (coordenadas do desenho 300×440). */
const SPOTS: Record<MeasureKey, { x: number; y: number; rx: number; side: "l" | "r" }> = {
  neck: { x: 150, y: 74, rx: 11, side: "r" },
  shoulders: { x: 150, y: 94, rx: 50, side: "l" },
  chest: { x: 150, y: 122, rx: 38, side: "r" },
  waist: { x: 150, y: 168, rx: 30, side: "l" },
  abdomen: { x: 150, y: 190, rx: 33, side: "r" },
  hip: { x: 150, y: 216, rx: 41, side: "l" },
  arm_r: { x: 96, y: 138, rx: 9, side: "l" },
  arm_l: { x: 204, y: 138, rx: 9, side: "r" },
  forearm: { x: 86, y: 190, rx: 7, side: "l" },
  thigh_r: { x: 132, y: 270, rx: 17, side: "l" },
  thigh_l: { x: 168, y: 270, rx: 17, side: "r" },
  calf: { x: 172, y: 352, rx: 11, side: "r" },
};

function Hologram({ values, selected, onSelect }: { values: Partial<Record<MeasureKey, number | null>>; selected: MeasureKey; onSelect: (k: MeasureKey) => void }) {
  return (
    <svg viewBox="0 0 300 440" className="h-full w-full" role="img" aria-label="Corpo com os pontos de medida">
      <defs>
        <linearGradient id="nv-holo-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity=".38" /><stop offset=".55" stopColor="#0ea5e9" stopOpacity=".16" /><stop offset="1" stopColor="#6366f1" stopOpacity=".3" /></linearGradient>
        <radialGradient id="nv-holo-light" cx="45%" cy="30%" r="70%"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <pattern id="nv-holo-lines" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 5.5H6" stroke="#67e8f9" strokeOpacity=".35" strokeWidth=".6" /></pattern>
        <clipPath id="nv-holo-body"><use href="#nv-holo-shape" /></clipPath>
        <g id="nv-holo-shape">
          <ellipse cx="150" cy="40" rx="21" ry="25" />
          <rect x="140" y="60" width="20" height="22" rx="6" />
          <path d="M108 88 Q150 78 192 88 L200 100 Q196 150 182 170 Q178 190 190 225 Q150 240 110 225 Q122 190 118 170 Q104 150 100 100 Z" />
          <path d="M102 92 Q90 96 88 120 L80 200 Q78 225 84 245 L94 246 Q96 222 98 200 L110 130 Z" />
          <path d="M198 92 Q210 96 212 120 L220 200 Q222 225 216 245 L206 246 Q204 222 202 200 L190 130 Z" />
          <path d="M112 222 Q110 270 120 320 L122 400 Q122 420 136 422 L144 420 Q142 400 144 320 Q148 270 150 236 Z" />
          <path d="M188 222 Q190 270 180 320 L178 400 Q178 420 164 422 L156 420 Q158 400 156 320 Q152 270 150 236 Z" />
        </g>
      </defs>
      {/* base e grade */}
      <ellipse cx="150" cy="428" rx="70" ry="8" fill="#22d3ee" opacity=".18" />
      <ellipse cx="150" cy="428" rx="46" ry="5" fill="none" stroke="#22d3ee" strokeOpacity=".5" />
      <use href="#nv-holo-shape" fill="url(#nv-holo-fill)" stroke="#67e8f9" strokeOpacity=".8" strokeWidth="1.2" />
      <g clipPath="url(#nv-holo-body)">
        <rect width="300" height="440" fill="url(#nv-holo-lines)" />
        <rect width="300" height="440" fill="url(#nv-holo-light)" />
        <rect className="nv-holo-scan" x="0" y="-40" width="300" height="40" fill="url(#nv-holo-fill)" opacity=".9" />
      </g>
      {/* pontos */}
      {(Object.keys(SPOTS) as MeasureKey[]).map((k) => {
        const s = SPOTS[k];
        const on = k === selected;
        const v = values[k];
        const lx = s.side === "l" ? 6 : 294;
        return (
          <g key={k} onClick={() => onSelect(k)} className="cursor-pointer" role="button" aria-label={`${meta(k).label}${v ? `: ${nf(v)} cm` : ""}`} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(k); }}>
            <ellipse cx={s.x} cy={s.y} rx={s.rx + 6} ry={Math.max(6, s.rx * 0.28) + 4} fill="transparent" />
            <ellipse cx={s.x} cy={s.y} rx={s.rx} ry={Math.max(3, s.rx * 0.22)} fill="none" stroke={on ? "#fde047" : "#a5f3fc"} strokeWidth={on ? 2.4 : 1.2} strokeDasharray={on ? undefined : "3 3"} className={on ? "nv-holo-ring" : ""} opacity={on ? 1 : 0.75} />
            {(on || v) && (
              <>
                <line x1={s.side === "l" ? s.x - s.rx : s.x + s.rx} y1={s.y} x2={s.side === "l" ? 58 : 242} y2={s.y} stroke={on ? "#fde047" : "#67e8f9"} strokeOpacity={on ? 0.9 : 0.4} strokeWidth=".8" />
                <text x={lx} y={s.y - 2} textAnchor={s.side === "l" ? "start" : "end"} fontSize="9" fontWeight="700" fill={on ? "#fde047" : "#cffafe"}>{meta(k).label}</text>
                <text x={lx} y={s.y + 9} textAnchor={s.side === "l" ? "start" : "end"} fontSize="10" fontWeight="800" fill="#fff">{v ? `${nf(v)} cm` : "—"}</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const empty = (): Record<MeasureKey, string> => Object.fromEntries(MEASURES.map((m) => [m.key, ""])) as Record<MeasureKey, string>;

/** Medidas do corpo: corpo holográfico com os pontos de medida, registro, evolução e indicadores. */
export function ClientBodyMeasures({ patientId, ownerId, heightCm, sex, weightKg }: { patientId: string; ownerId: string; heightCm: number | null; sex: string | null; weightKg: number | null }) {
  const dialog = useDialog();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<MeasureKey>("waist");
  const [form, setForm] = useState<Record<MeasureKey, string>>(empty);
  const [extra, setExtra] = useState({ date: today(), fat: "", goal: "", notes: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const db = supabase as any;

  useEffect(() => {
    let active = true;
    try {
      void db.from("care_body_circumferences").select("*").eq("patient_id", patientId).order("measured_on", { ascending: true }).limit(400)
        .then((r: any) => { if (active) setRows((r?.data ?? []).map((x: any) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, typeof v === "string" && /^\d+(\.\d+)?$/.test(v) && k !== "measured_on" ? Number(v) : v])))); }, () => active && setRows([]));
    } catch { setRows([]); }
    return () => { active = false; };
  }, [patientId, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = rows ?? [];
  const last = list.at(-1) ?? null;
  const first = list[0] ?? null;
  const latestOf = (k: MeasureKey) => [...list].reverse().find((r) => r[k] != null)?.[k] ?? null;
  const values = useMemo(() => Object.fromEntries(MEASURES.map((m) => [m.key, latestOf(m.key)])) as Record<MeasureKey, number | null>, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const series = list.filter((r) => r[selected] != null).map((r) => ({ x: Date.parse(r.measured_on + "T12:00:00Z"), y: Number(r[selected]) }));
  const sel = meta(selected);
  const selFirst = series[0]?.y ?? null, selLast = series.at(-1)?.y ?? null, selPrev = series.at(-2)?.y ?? null;
  const delta = selFirst !== null && selLast !== null && series.length > 1 ? selLast - selFirst : null;
  const good = delta === null ? null : sel.lowerIsBetter ? delta <= 0 : delta >= 0;

  const whr = waistHip(values.waist, values.hip, sex);
  const whtr = waistHeight(values.waist ?? values.abdomen, heightCm);
  const fatNavy = navyBodyFat(sex, heightCm, values.neck, values.waist ?? values.abdomen, values.hip);
  const fatInformed = [...list].reverse().find((r) => r.body_fat_pct != null)?.body_fat_pct ?? null;
  const fat = fatInformed ?? fatNavy;
  const lostTrunk = first && last && first !== last ? (["waist", "abdomen", "hip"] as MeasureKey[]).reduce((a, k) => a + ((first[k] ?? 0) && (last[k] ?? 0) ? Number(first[k]) - Number(last[k]) : 0), 0) : null;

  function openNew() { setEditing(null); setForm(empty()); setExtra({ date: today(), fat: "", goal: last?.goal_label ?? "", notes: "" }); setError(""); setFormOpen(true); }
  function openEdit(r: Row) {
    setEditing(r.id);
    setForm(Object.fromEntries(MEASURES.map((m) => [m.key, r[m.key] != null ? String(r[m.key]).replace(".", ",") : ""])) as Record<MeasureKey, string>);
    setExtra({ date: r.measured_on, fat: r.body_fat_pct != null ? String(r.body_fat_pct).replace(".", ",") : "", goal: r.goal_label ?? "", notes: r.notes ?? "" });
    setError(""); setFormOpen(true);
  }
  async function save() {
    const payload: Record<string, unknown> = {};
    let filled = 0;
    for (const m of MEASURES) {
      const raw = form[m.key].trim();
      if (!raw) { payload[m.key] = null; continue; }
      const v = parseDecimal(raw);
      if (v === null || v < m.min || v > m.max) { setError(`${m.label}: informe entre ${m.min} e ${m.max} cm.`); setSelected(m.key); return; }
      payload[m.key] = Math.round(v * 10) / 10; filled++;
    }
    if (!filled) { setError("Preencha pelo menos uma medida."); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(extra.date) || extra.date > today()) { setError("Informe uma data válida (não pode ser futura)."); return; }
    const fatV = extra.fat.trim() ? parseDecimal(extra.fat) : null;
    if (extra.fat.trim() && (fatV === null || fatV < 3 || fatV > 70)) { setError("Gordura corporal: entre 3% e 70%."); return; }
    const sameDay = list.find((r) => r.measured_on === extra.date && r.id !== editing);
    const summary = MEASURES.filter((m) => payload[m.key] != null).map((m) => `${m.label} ${nf(payload[m.key] as number)} cm`).join(", ");
    if (!(await dialog.confirm(editing ? "Salvar alterações?" : sameDay ? "Substituir medidas do dia?" : "Registrar medidas?", `${br(extra.date)}: ${summary}${sameDay ? ". Já existe um registro nesta data; ele será atualizado." : "."}`, false, editing ? "Salvar" : "Registrar"))) return;
    setBusy(true); setError("");
    const row = { ...payload, patient_id: patientId, owner_id: ownerId, measured_on: extra.date, body_fat_pct: fatV !== null ? Math.round(fatV * 10) / 10 : null, goal_label: extra.goal.trim() || null, notes: extra.notes.trim() || null, updated_at: new Date().toISOString() };
    const res = editing ? await db.from("care_body_circumferences").update(row).eq("id", editing) : await db.from("care_body_circumferences").upsert(row, { onConflict: "patient_id,measured_on" });
    setBusy(false);
    if (res.error) { setError(res.error.message || "Não foi possível salvar."); return; }
    setFormOpen(false); setNotice(`Medidas de ${br(extra.date)} salvas.`); setReload((n) => n + 1);
  }
  async function remove(r: Row) {
    if (!(await dialog.confirm("Excluir definitivamente?", `As medidas de ${br(r.measured_on)} serão apagadas. Não dá para desfazer.`, true, "Excluir"))) return;
    const res = await db.from("care_body_circumferences").delete().eq("id", r.id);
    if (res.error) setError(res.error.message); else { setNotice("Registro excluído."); setReload((n) => n + 1); }
  }

  const field = "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm tabular-nums outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15";
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Medidas do corpo">
      {/* Painel holográfico */}
      <div className="nv-dark relative isolate overflow-hidden rounded-2xl bg-[#030b14] text-white shadow-card">
        <div aria-hidden className="absolute inset-0 -z-10 opacity-[.12] [background-image:linear-gradient(rgba(103,232,249,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,.6)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(circle_at_30%_50%,#000,transparent_75%)]" />
        <div aria-hidden className="absolute -left-20 top-10 -z-10 size-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div className="relative mx-auto h-[26rem] w-full max-w-[22rem]">
            <Hologram values={values} selected={selected} onSelect={setSelected} />
            <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-200"><i className="size-1.5 rounded-full bg-cyan-300 nv-live" /> Escaneamento corporal</span>
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-cyan-200/80">Medida selecionada · toque nos anéis do corpo</p>
                <h2 className="text-2xl font-extrabold">{sel.label}</h2>
              </div>
              <button type="button" onClick={openNew} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 shadow-[0_8px_24px_-8px_rgba(103,232,249,.8)] transition hover:bg-cyan-200 active:scale-[.97]"><Plus size={16} /> Registrar medidas</button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[["Atual", selLast !== null ? `${nf(selLast)} cm` : "—", ""], ["Desde a anterior", selLast !== null && selPrev !== null ? `${selLast - selPrev > 0 ? "+" : ""}${nf(selLast - selPrev)} cm` : "—", ""], ["Desde o início", delta !== null ? `${delta > 0 ? "+" : ""}${nf(delta)} cm` : "—", good === null ? "" : good ? "text-emerald-300" : "text-amber-300"]].map(([l, v, c]) => (
                <div key={l} className="rounded-xl border border-white/10 bg-white/[.05] px-3 py-2"><p className="text-[10px] text-white/55">{l}</p><p className={`text-lg font-extrabold tabular-nums ${c}`}>{v}</p></div>
              ))}
            </div>
            <div className="mt-3 min-h-[12rem] flex-1 rounded-xl border border-white/10 bg-white/[.03] p-2">
              {series.length >= 2 ? (
                <EvoChart height={200} yAuto ariaLabel={`Evolução de ${sel.label}`} xMin={series[0].x - 86_400_000} xMax={series.at(-1)!.x + 86_400_000}
                  xTicks={series.filter((_, i) => series.length <= 6 || i % Math.ceil(series.length / 6) === 0 || i === series.length - 1).map((p) => ({ x: p.x, label: br(new Date(p.x).toISOString().slice(0, 10)).slice(0, 5) }))}
                  formatX={(x) => br(new Date(x).toISOString().slice(0, 10))} formatY={(v) => `${nf(v, Number.isInteger(v) ? 0 : 1)} cm`}
                  series={[{ id: "m", label: sel.label, color: "#22d3ee", area: true, dots: true, live: true, points: series }]} />
              ) : (
                <p className="grid h-full min-h-[11rem] place-items-center px-4 text-center text-sm text-white/60">{series.length === 1 ? "Registre a próxima medida para ver a linha de evolução." : "Nenhuma medida de " + sel.label.toLowerCase() + " ainda. Toque em Registrar medidas."}</p>
              )}
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-white/65"><Ruler size={14} className="mt-0.5 shrink-0 text-cyan-300" /> <span><strong className="text-white/85">Como medir:</strong> {sel.how}</span></p>
          </div>
        </div>
      </div>

      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{notice}</p>}

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { l: "Cintura / quadril", v: whr ? nf(whr.value, 2) : "—", n: whr ? (whr.risk ? `acima de ${nf(whr.limit, 2)} · atenção` : `abaixo de ${nf(whr.limit, 2)} · adequado`) : "meça cintura e quadril", bad: whr?.risk },
          { l: "Cintura / altura", v: whtr ? nf(whtr.value, 2) : "—", n: whtr ? (whtr.risk ? "acima de 0,50 · atenção" : "até 0,50 · adequado") : heightCm ? "meça a cintura" : "informe a altura no cadastro", bad: whtr?.risk },
          { l: "Gordura corporal", v: fat !== null ? `${nf(fat)}%` : "—", n: fatInformed !== null ? "informado por você" : fatNavy !== null ? "estimada (método da Marinha)" : "meça pescoço e cintura", bad: false },
          { l: "Tronco desde o início", v: lostTrunk !== null ? `${lostTrunk > 0 ? "−" : "+"}${nf(Math.abs(lostTrunk))} cm` : "—", n: lostTrunk !== null ? "cintura + abdômen + quadril" : "precisa de 2 registros", bad: lostTrunk !== null && lostTrunk < 0 },
        ].map((c) => (
          <div key={c.l} className="rounded-2xl border border-border bg-card p-3">
            <p className="text-[11px] font-semibold text-muted-foreground">{c.l}</p>
            <p className={`text-xl font-extrabold tabular-nums ${c.bad ? "text-amber-600 dark:text-amber-400" : ""}`}>{c.v}</p>
            <p className="truncate text-[11px] text-muted-foreground">{c.n}</p>
          </div>
        ))}
      </div>

      {/* Formulário */}
      {formOpen && (
        <div className="nv-rise rounded-2xl border border-primary/30 bg-primary/[.04] p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-base font-bold"><Ruler size={18} className="text-primary" /> {editing ? "Editar medidas" : "Registrar medidas"}</h3>
            <button type="button" onClick={() => setFormOpen(false)} aria-label="Fechar" className="grid size-8 place-items-center rounded-lg hover:bg-muted"><X size={16} /></button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Todas opcionais, em centímetros. Meça sempre no mesmo horário, de preferência pela manhã. {weightKg ? `Peso atual: ${nf(weightKg)} kg (vem do cadastro).` : ""}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold">Data<input type="date" max={today()} value={extra.date} onChange={(e) => setExtra({ ...extra, date: e.target.value })} className={`mt-1 ${field}`} /></label>
            <label className="text-xs font-semibold">Objetivo (opcional)<input value={extra.goal} maxLength={60} onChange={(e) => setExtra({ ...extra, goal: e.target.value })} placeholder="Ex.: academia, projeto verão" className={`mt-1 ${field}`} /></label>
            <label className="text-xs font-semibold">% de gordura (se souber)<input inputMode="decimal" value={extra.fat} onChange={(e) => setExtra({ ...extra, fat: e.target.value })} placeholder="Ex.: 18,5" className={`mt-1 ${field}`} /></label>
          </div>
          {(["Tronco", "Braços", "Pernas"] as const).map((g) => (
            <fieldset key={g} className="mt-3">
              <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{g}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {MEASURES.filter((m) => m.group === g).map((m) => (
                  <label key={m.key} onFocus={() => setSelected(m.key)} className={`rounded-xl border p-2 text-xs font-semibold transition ${selected === m.key ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                    {m.label}
                    <span className="relative mt-1 block"><input inputMode="decimal" value={form[m.key]} onChange={(e) => setForm({ ...form, [m.key]: e.target.value })} placeholder={values[m.key] ? nf(values[m.key]!) : "—"} className={`${field} pr-9`} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">cm</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <label className="mt-3 block text-xs font-semibold">Observação<input value={extra.notes} maxLength={280} onChange={(e) => setExtra({ ...extra, notes: e.target.value })} placeholder="Ex.: medido após o treino" className={`mt-1 ${field}`} /></label>
          {error && <p role="alert" className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">Cancelar</button>
            <button type="button" disabled={busy} onClick={() => void save()} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"><Save size={15} /> {busy ? "Salvando…" : "Salvar medidas"}</button>
          </div>
        </div>
      )}

      {/* Comparação e histórico */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold"><Target size={16} className="text-primary" /> Antes e agora</h3>
          {!first || first === last ? <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Com dois ou mais registros, aparece aqui a comparação de cada medida.</p> : (
            <ul className="mt-3 grid gap-1.5">
              {MEASURES.filter((m) => first[m.key] != null && last![m.key] != null).map((m) => {
                const d = Number(last![m.key]) - Number(first[m.key]);
                const ok = m.lowerIsBetter ? d <= 0 : d >= 0;
                return (
                  <li key={m.key}>
                    <button type="button" onClick={() => setSelected(m.key)} className={`grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-muted/60 ${selected === m.key ? "bg-muted/70" : ""}`}>
                      <span className="font-semibold">{m.label}</span>
                      <span className="tabular-nums text-muted-foreground">{nf(Number(first[m.key]))} → <strong className="text-foreground">{nf(Number(last![m.key]))}</strong></span>
                      <span className={`inline-flex min-w-[4.5rem] items-center justify-end gap-1 font-bold tabular-nums ${d === 0 ? "text-muted-foreground" : ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{d < 0 ? <TrendingDown size={12} /> : d > 0 ? <TrendingUp size={12} /> : null}{d > 0 ? "+" : ""}{nf(d)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">De {first ? br(first.measured_on) : "—"} a {last ? br(last.measured_on) : "—"}. Verde: na direção desejada (menos cintura, mais braço e perna).</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold">Histórico de medições</h3>
          {!rows ? <div className="mt-3 h-24 animate-pulse rounded-xl bg-muted" /> : !list.length ? (
            <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Nenhuma medição ainda. Registre as primeiras medidas para começar a acompanhar.</p>
          ) : (
            <ul className="mt-2 grid max-h-[18rem] gap-1.5 overflow-y-auto pr-1">
              {[...list].reverse().map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-cyan-500/12 text-cyan-600 dark:text-cyan-300"><Ruler size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm">{br(r.measured_on)}{r.goal_label ? <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{r.goal_label}</span> : null}</strong>
                    <span className="block truncate text-[11px] text-muted-foreground">{MEASURES.filter((m) => r[m.key] != null).map((m) => `${m.label} ${nf(Number(r[m.key]))}`).join(" · ")}{r.body_fat_pct != null ? ` · gordura ${nf(Number(r.body_fat_pct))}%` : ""}</span>
                  </span>
                  <button type="button" onClick={() => openEdit(r)} title="Editar" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={14} /></button>
                  <button type="button" onClick={() => void remove(r)} title="Excluir" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground"><Info size={13} className="mt-0.5 shrink-0" /> Indicadores de referência (OMS e método da Marinha dos EUA). São estimativas e não substituem a avaliação de um profissional.</p>
    </section>
  );
}
