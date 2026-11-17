import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, BedDouble, CheckCircle2, Droplets, Flame, Maximize2, Minimize2, Pill, Radio, RefreshCw, Scale, Sparkles, Target, X, Zap, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreAddDays, acreDateKey, ACRE_TIME_ZONE } from "@/lib/acre-time";
import { buildDays, type DayMetrics } from "@/lib/day-metrics";
import { loadPeriodRaw, resolveTargets, type PeriodData } from "@/lib/period-data";
import { bmiCategory } from "./ClientWeightPage";

type Props = { patientId: string; ownerId: string; heightCm?: number | null; name?: string };
type MetricKey = "score" | "agua" | "peso" | "imc" | "sono" | "exercicio" | "calorias" | "proteina" | "doses";

const REFRESH_MS = 30_000;
const SLEEP_GOAL = 8;
const EXERCISE_GOAL = 30;
const nf = (v: number, d = 0) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const clockFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: ACRE_TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: ACRE_TIME_ZONE, weekday: "long", day: "numeric", month: "long" });

function useCountUp(value: number, ms = 900) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now(); const a = from.current; let raf = 0;
    const tick = (now: number) => { const t = Math.min(1, (now - start) / ms); const eased = 1 - Math.pow(1 - t, 3); setShown(a + (value - a) * eased); if (t < 1) raf = requestAnimationFrame(tick); else from.current = value; };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

function Ring({ pct, color, size = 132, stroke = 12, children }: { pct: number; color: string; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 8px ${color}88)` }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

function Spark({ data, color, goal }: { data: { v: number | null }[]; color: string; goal?: number }) {
  const id = useMemo(() => `sp${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <div className="h-10 w-full" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.5} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
      {goal ? <ReferenceLine y={goal} stroke="rgba(255,255,255,.25)" strokeDasharray="3 3" /> : null}
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${id})`} connectNulls isAnimationActive />
    </AreaChart></ResponsiveContainer></div>
  );
}

function Tile({ k, on, onPick, icon: Icon, tone, title, children }: { k: MetricKey; on: boolean; onPick: (k: MetricKey) => void; icon: LucideIcon; tone: string; title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={`group relative overflow-hidden rounded-3xl p-4 ring-1 transition ${on ? "bg-white/[.12] ring-white/40 shadow-[0_0_40px_-10px_var(--tile)]" : "bg-white/[.06] ring-white/10 hover:bg-white/[.09]"}`} style={{ ["--tile" as string]: tone }}>
      <button type="button" onClick={() => onPick(k)} aria-pressed={on} aria-label={`Ver gráfico de ${title}`} className="flex w-full items-center gap-2 text-left">
        <span className="grid size-9 place-items-center rounded-xl text-white shadow-lg" style={{ background: tone }}><Icon size={18} /></span>
        <strong className="text-sm font-bold tracking-wide text-white/90">{title}</strong>
      </button>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function LiveModeButton({ iconOnlyOnMobile = false, className = "", ...props }: Props & { iconOnlyOnMobile?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Abrir o painel ao vivo em tela cheia"
        aria-label="Abrir painel ao vivo em tela cheia"
        className={`inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 text-xs font-extrabold text-slate-950 shadow-lg ring-1 ring-white/30 transition hover:brightness-110 active:scale-95 ${className}`}>
        <Radio size={15} className="animate-pulse" /> <span className={iconOnlyOnMobile ? "hidden sm:inline" : ""}>Ao vivo</span> <Maximize2 size={14} className={iconOnlyOnMobile ? "hidden sm:block" : ""} />
      </button>
      {open && <LiveDashboard {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function LiveDashboard({ patientId, ownerId, heightCm, name, onClose }: Props & { onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<{ days: DayMetrics[]; weights: { day: string; kg: number }[]; waterTarget: number | null; at: number } | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<MetricKey>("agua");
  const [now, setNow] = useState(Date.now());
  const [full, setFull] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLElement>(null);
  const pick = useCallback((k: MetricKey) => { setSelected(k); window.setTimeout(() => chartRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" }), 60); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = acreDateKey();
      const from = acreAddDays(today, -59);
      const [period, profile]: [PeriodData, any] = await Promise.all([
        loadPeriodRaw(patientId, ownerId, from, today),
        (supabase as any).from("care_hydration_profiles").select("target_ml").eq("patient_id", patientId).maybeSingle().then((r: any) => r, () => null),
      ]);
      const waterTarget = Number(profile?.data?.target_ml) || null;
      const targets = resolveTargets(period.prefs, waterTarget);
      const days = buildDays(period.raw, acreAddDays(today, -13), today, { targets, nowMs: Date.now() });
      const weights = [...period.raw.weights].sort((a, b) => a.day.localeCompare(b.day));
      setData({ days, weights, waterTarget, at: Date.now() }); setError(false);
    } catch { setError(true); } finally { setLoading(false); }
  }, [patientId, ownerId]);

  useEffect(() => { void load(); const t = window.setInterval(() => { if (!document.hidden) void load(); }, REFRESH_MS); return () => window.clearInterval(t); }, [load]);
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  useEffect(() => {
    const el = root.current;
    try { void el?.requestFullscreen?.().catch(() => undefined); } catch { /* sem suporte (ex.: iPhone): a sobreposição já ocupa a tela */ }
    const sync = () => setFull(Boolean(document.fullscreenElement));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.fullscreenElement) onClose(); };
    document.addEventListener("fullscreenchange", sync); window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("fullscreenchange", sync); window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); };
  }, [onClose]);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(""), 2600); return () => window.clearTimeout(t); }, [toast]);

  const today = data?.days.at(-1) ?? null;
  const goalOf = (m: string) => today?.goals.find((g) => g.metric === m);
  const waterTarget = goalOf("hidratacao")?.target || data?.waterTarget || 0;
  const kcalTarget = goalOf("calorias")?.target || 0;
  const proteinTarget = goalOf("proteina")?.target || 0;
  const lastWeight = data?.weights.at(-1) ?? null; const prevWeight = data && data.weights.length > 1 ? data.weights[data.weights.length - 2] : null;
  const h = Number(heightCm) || 0;
  const bmi = lastWeight && h > 0 ? lastWeight.kg / Math.pow(h / 100, 2) : null;
  const cat = bmi ? bmiCategory(bmi) : null;
  const doses = today ? { planned: today.supplements.planned + today.medication.planned, taken: today.supplements.taken + today.medication.taken } : { planned: 0, taken: 0 };
  const sleep = [...(data?.days ?? [])].reverse().find((d) => d.sleep)?.sleep ?? null;

  const waterShown = useCountUp(today?.waterMl ?? 0);
  const scoreShown = useCountUp(today?.score ?? 0);
  const water = today?.waterMl ?? 0; const waterPct = waterTarget ? (water / waterTarget) * 100 : 0;

  async function addWater(ml: number) {
    if (busy) return; setBusy(true);
    const { error: err } = await (supabase as any).rpc("care_log_unscheduled_intake", { p_patient_id: patientId, p_kind: "agua", p_description: "Água", p_amount_ml: ml, p_request_id: crypto.randomUUID() });
    setBusy(false);
    if (err) { setToast("Não foi possível registrar a água agora."); return; }
    setToast(`+${ml} ml registrados`); void load();
  }
  async function addWeight() {
    const kg = Number(weightInput.replace(",", "."));
    if (!Number.isFinite(kg) || kg < 20 || kg > 350) { setToast("Informe um peso entre 20 e 350 kg."); return; }
    if (!h) { setToast("Informe sua altura em Peso para registrar."); return; }
    const day = acreDateKey();
    if (data?.weights.some((w) => w.day === day)) { setToast("Já existe peso hoje. Edite na área Peso."); return; }
    setBusy(true);
    const auth = await supabase.auth.getUser();
    const { error: err } = await (supabase as any).from("care_body_measurements").insert({ patient_id: patientId, owner_id: ownerId, recorded_by: auth.data.user?.id, recorded_on: day, weight_kg: kg, height_cm: h });
    setBusy(false);
    if (err) { setToast("Não foi possível registrar o peso agora."); return; }
    setWeightInput(""); setToast(`Peso de ${nf(kg, 1)} kg registrado`); void load();
  }
  function toggleFull() { try { if (document.fullscreenElement) void document.exitFullscreen(); else void root.current?.requestFullscreen?.(); } catch { /* sem suporte */ } }

  const series = useMemo(() => {
    const days = data?.days ?? [];
    const label = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
    const wmap = new Map((data?.weights ?? []).map((w) => [w.day, w.kg]));
    const last14 = days.map((d) => d.day);
    const weight30 = (data?.weights ?? []).slice(-30).map((w) => ({ label: label(w.day), v: w.kg }));
    return {
      agua: days.map((d) => ({ label: label(d.day), v: d.waterMl })),
      sono: days.map((d) => ({ label: label(d.day), v: d.sleep ? Math.round(d.sleep.hours * 10) / 10 : null })),
      exercicio: days.map((d) => ({ label: label(d.day), v: d.activityMinutes })),
      calorias: days.map((d) => ({ label: label(d.day), v: Math.round(d.kcal) })),
      proteina: days.map((d) => ({ label: label(d.day), v: Math.round(d.protein) })),
      doses: days.map((d) => ({ label: label(d.day), v: d.supplements.taken + d.medication.taken })),
      score: days.map((d) => ({ label: label(d.day), v: d.score })),
      peso: weight30,
      imc: h > 0 ? (data?.weights ?? []).slice(-30).map((w) => ({ label: label(w.day), v: Math.round((w.kg / Math.pow(h / 100, 2)) * 10) / 10 })) : [],
      _w: wmap, _d: last14,
    };
  }, [data, h]);

  const CHART: Record<MetricKey, { title: string; unit: string; color: string; goal?: number; kind: "bar" | "area" }> = {
    score: { title: "Metas atingidas por dia", unit: "%", color: "#34d399", goal: 100, kind: "bar" },
    agua: { title: "Água por dia", unit: "ml", color: "#38bdf8", goal: waterTarget || undefined, kind: "bar" },
    peso: { title: "Peso (últimas medidas)", unit: "kg", color: "#e879f9", kind: "area" },
    imc: { title: "IMC (últimas medidas)", unit: "", color: "#34d399", kind: "area" },
    sono: { title: "Horas de sono", unit: "h", color: "#818cf8", goal: SLEEP_GOAL, kind: "bar" },
    exercicio: { title: "Minutos de exercício", unit: "min", color: "#fb923c", goal: EXERCISE_GOAL, kind: "bar" },
    calorias: { title: "Calorias por dia", unit: "kcal", color: "#fbbf24", goal: kcalTarget || undefined, kind: "bar" },
    proteina: { title: "Proteína por dia", unit: "g", color: "#4ade80", goal: proteinTarget || undefined, kind: "bar" },
    doses: { title: "Doses registradas", unit: "", color: "#fb7185", kind: "bar" },
  };
  const chart = CHART[selected]; const chartData = (series as any)[selected] as { label: string; v: number | null }[];

  const ui = (
    <div ref={root} className="fixed inset-0 z-[500] overflow-y-auto bg-[radial-gradient(ellipse_at_top,#0b3b3a_0%,#020617_60%)] text-white" role="dialog" aria-modal="true" aria-label="Painel ao vivo">
      <div className="mx-auto flex min-h-full max-w-[1500px] flex-col gap-4 p-3 pb-24 sm:p-6">
        <header className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-300 ring-1 ring-emerald-400/40"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" /></span> Ao vivo</span>
          <span className="flex-1 sm:hidden" />
          <div className="order-last min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-auto"><p className="truncate text-xs text-white/60 first-letter:uppercase">{dateFmt.format(now)}{name ? ` · ${name.split(" ")[0]}` : ""}</p><p className="font-mono text-3xl font-extrabold tabular-nums leading-none sm:text-4xl">{clockFmt.format(now)}</p></div>
          <button type="button" onClick={() => void load()} aria-label="Atualizar agora" className="grid size-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20"><RefreshCw size={19} className={loading ? "animate-spin" : ""} /></button>
          <button type="button" onClick={toggleFull} aria-label={full ? "Sair da tela cheia" : "Tela cheia"} className="grid size-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20">{full ? <Minimize2 size={19} /> : <Maximize2 size={19} />}</button>
          <button type="button" onClick={onClose} aria-label="Fechar painel ao vivo" className="grid size-11 place-items-center rounded-2xl bg-rose-500/90 ring-1 ring-white/20 transition hover:bg-rose-500"><X size={20} /></button>
        </header>

        {!data ? (
          <p role="status" className="grid flex-1 place-items-center text-sm text-white/70">{error ? "Não foi possível carregar os dados agora. Toque em atualizar." : "Carregando seus dados…"}</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Tile k="score" on={selected === "score"} onPick={pick} icon={Target} tone="linear-gradient(135deg,#10b981,#06b6d4)" title="Dia em dia">
                <div className="flex items-center gap-4"><Ring pct={today?.score ?? 0} color="#34d399"><div><p className="text-3xl font-extrabold tabular-nums">{today?.score == null ? "—" : `${Math.round(scoreShown)}%`}</p><p className="text-[10px] uppercase tracking-wider text-white/60">metas</p></div></Ring>
                  <p className="text-sm text-white/70">{today?.score == null ? "As metas aparecem conforme o dia avança." : `${today.goals.filter((g) => g.status === "atingida").length} de ${today.goals.length} metas atingidas hoje.`}</p></div>
              </Tile>

              <Tile k="agua" on={selected === "agua"} onPick={pick} icon={Droplets} tone="linear-gradient(135deg,#0ea5e9,#22d3ee)" title="Hidratação">
                <div className="flex items-center gap-4"><Ring pct={waterPct} color="#38bdf8"><div><p className="text-2xl font-extrabold tabular-nums">{nf(waterShown)}</p><p className="text-[10px] text-white/60">{waterTarget ? `de ${nf(waterTarget)} ml` : "ml hoje"}</p></div></Ring>
                  <div className="grid flex-1 gap-1.5">{[150, 250, 500].map((ml) => <button key={ml} type="button" disabled={busy} onClick={() => void addWater(ml)} className="h-10 rounded-xl bg-sky-400/20 text-sm font-extrabold text-sky-100 ring-1 ring-sky-300/30 transition hover:bg-sky-400/30 active:scale-95 disabled:opacity-50">+{ml} ml</button>)}</div></div>
                {waterPct >= 100 && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-200"><CheckCircle2 size={14} /> Meta batida!</p>}
              </Tile>

              <Tile k="peso" on={selected === "peso"} onPick={pick} icon={Scale} tone="linear-gradient(135deg,#d946ef,#ec4899)" title="Peso">
                <p className="text-4xl font-extrabold tabular-nums">{lastWeight ? nf(lastWeight.kg, 1) : "—"}<span className="ml-1 text-base font-semibold text-white/60">kg</span></p>
                <p className="text-xs text-white/60">{lastWeight && prevWeight ? `${lastWeight.kg - prevWeight.kg > 0 ? "▲ +" : lastWeight.kg - prevWeight.kg < 0 ? "▼ " : ""}${nf(lastWeight.kg - prevWeight.kg, 1)} kg desde a medida anterior` : "Registre seu peso para acompanhar a evolução."}</p>
                <Spark data={series.peso} color="#e879f9" />
                <div className="mt-1 flex gap-1.5"><input value={weightInput} onChange={(e) => setWeightInput(e.target.value)} inputMode="decimal" placeholder="kg hoje" aria-label="Peso de hoje em kg" className="h-10 min-w-0 flex-1 rounded-xl bg-white/10 px-3 text-sm text-white outline-none ring-1 ring-white/15 placeholder:text-white/40 focus:ring-fuchsia-300/60" /><button type="button" disabled={busy || !weightInput} onClick={() => void addWeight()} className="h-10 rounded-xl bg-fuchsia-500 px-3 text-xs font-extrabold disabled:opacity-40">Registrar</button></div>
              </Tile>

              <Tile k="imc" on={selected === "imc"} onPick={pick} icon={Zap} tone="linear-gradient(135deg,#10b981,#84cc16)" title="IMC">
                <p className="text-4xl font-extrabold tabular-nums" style={{ color: cat?.color }}>{bmi ? nf(bmi, 1) : "—"}</p>
                <p className="text-sm font-semibold" style={{ color: cat?.color }}>{cat?.label ?? (h ? "Sem peso registrado" : "Informe sua altura")}</p>
                <div className="relative mt-3 h-3 overflow-hidden rounded-full" style={{ background: "linear-gradient(90deg,#38bdf8 0 14%,#10b981 14% 40%,#f59e0b 40% 60%,#f97316 60% 80%,#ef4444 80%)" }} aria-hidden="true">
                  {bmi && <span className="absolute top-0 h-3 w-1 -translate-x-1/2 rounded bg-white shadow-[0_0_8px_#fff]" style={{ left: `${Math.max(0, Math.min(100, ((bmi - 15) / 25) * 100))}%`, transition: "left 1s" }} />}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-white/50"><span>15</span><span>25</span><span>40</span></div>
              </Tile>

              <Tile k="sono" on={selected === "sono"} onPick={pick} icon={BedDouble} tone="linear-gradient(135deg,#6366f1,#8b5cf6)" title="Sono">
                <div className="flex items-center gap-4"><Ring pct={sleep ? (sleep.hours / SLEEP_GOAL) * 100 : 0} color="#818cf8"><div><p className="text-2xl font-extrabold tabular-nums">{sleep ? nf(sleep.hours, 1) : "—"}</p><p className="text-[10px] text-white/60">horas</p></div></Ring>
                  <div className="text-sm text-white/70">{sleep ? <><p>Qualidade {"★".repeat(Math.max(0, Math.min(5, sleep.quality)))}{"☆".repeat(5 - Math.max(0, Math.min(5, sleep.quality)))}</p><p className="text-xs">Meta de {SLEEP_GOAL} h por noite</p></> : "Sem noite registrada."}</div></div>
                <Spark data={series.sono} color="#818cf8" goal={SLEEP_GOAL} />
              </Tile>

              <Tile k="exercicio" on={selected === "exercicio"} onPick={pick} icon={Activity} tone="linear-gradient(135deg,#f97316,#f59e0b)" title="Exercício">
                <div className="flex items-center gap-4"><Ring pct={((today?.activityMinutes ?? 0) / EXERCISE_GOAL) * 100} color="#fb923c"><div><p className="text-2xl font-extrabold tabular-nums">{today?.activityMinutes ?? 0}</p><p className="text-[10px] text-white/60">min hoje</p></div></Ring>
                  <p className="text-sm text-white/70">{today && today.activityKm > 0 ? `${nf(today.activityKm, 1)} km percorridos. ` : ""}Referência: {EXERCISE_GOAL} min por dia.</p></div>
                <Spark data={series.exercicio} color="#fb923c" goal={EXERCISE_GOAL} />
              </Tile>

              <Tile k="calorias" on={selected === "calorias"} onPick={pick} icon={Flame} tone="linear-gradient(135deg,#f59e0b,#ef4444)" title="Calorias">
                <p className="text-4xl font-extrabold tabular-nums">{nf(today?.kcal ?? 0)}<span className="ml-1 text-base font-semibold text-white/60">kcal</span></p>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000" style={{ width: `${Math.min(100, kcalTarget ? ((today?.kcal ?? 0) / kcalTarget) * 100 : 0)}%` }} /></div>
                <p className="mt-1 text-xs text-white/60">{kcalTarget ? `Meta de ${nf(kcalTarget)} kcal` : "Meta não definida"}</p>
              </Tile>

              <Tile k="proteina" on={selected === "proteina"} onPick={pick} icon={Sparkles} tone="linear-gradient(135deg,#22c55e,#14b8a6)" title="Proteína">
                <p className="text-4xl font-extrabold tabular-nums">{nf(today?.protein ?? 0)}<span className="ml-1 text-base font-semibold text-white/60">g</span></p>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-1000" style={{ width: `${Math.min(100, proteinTarget ? ((today?.protein ?? 0) / proteinTarget) * 100 : 0)}%` }} /></div>
                <p className="mt-1 text-xs text-white/60">{proteinTarget ? `Meta de ${nf(proteinTarget)} g` : "Meta não definida"}</p>
              </Tile>

              <Tile k="doses" on={selected === "doses"} onPick={pick} icon={Pill} tone="linear-gradient(135deg,#f43f5e,#a855f7)" title="Doses de hoje">
                <div className="flex items-center gap-4"><Ring pct={doses.planned ? (doses.taken / doses.planned) * 100 : 0} color="#fb7185"><div><p className="text-2xl font-extrabold tabular-nums">{doses.taken}/{doses.planned}</p><p className="text-[10px] text-white/60">doses</p></div></Ring>
                  <p className="text-sm text-white/70">Medicação {today?.medication.taken ?? 0}/{today?.medication.planned ?? 0} · Suplementos {today?.supplements.taken ?? 0}/{today?.supplements.planned ?? 0}</p></div>
              </Tile>
            </div>

            <section ref={chartRef} aria-label="Gráfico detalhado" className="rounded-3xl bg-white/[.06] p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-2"><h2 className="text-base font-extrabold">{chart.title}</h2><span className="text-xs text-white/50">Toque numa barra ou ponto para ver o valor</span></div>
              <div className="mt-3 h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {chart.kind === "bar" ? (
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,.1)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(255,255,255,.6)" }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,.6)" }} width={44} />
                      <Tooltip cursor={{ fill: "rgba(255,255,255,.08)" }} contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.2)", borderRadius: 12, color: "#fff" }} formatter={(v: number) => [`${nf(v, chart.unit === "h" ? 1 : 0)} ${chart.unit}`.trim(), chart.title]} />
                      {chart.goal ? <ReferenceLine y={chart.goal} stroke="#34d399" strokeDasharray="5 4" label={{ value: "Meta", fill: "#34d399", fontSize: 11, position: "insideTopRight" }} /> : null}
                      <Bar dataKey="v" radius={[8, 8, 0, 0]} maxBarSize={36} animationDuration={800}>{chartData.map((d, i) => <Cell key={i} fill={chart.goal && d.v != null && d.v >= chart.goal ? "#34d399" : chart.color} />)}</Bar>
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <defs><linearGradient id="liveArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chart.color} stopOpacity={0.55} /><stop offset="100%" stopColor={chart.color} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,.1)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(255,255,255,.6)" }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,.6)" }} width={44} domain={["auto", "auto"]} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.2)", borderRadius: 12, color: "#fff" }} formatter={(v: number) => [`${nf(v, 1)} ${chart.unit}`.trim(), chart.title]} />
                      <Area type="monotone" dataKey="v" stroke={chart.color} strokeWidth={3} fill="url(#liveArea)" dot={{ r: 3, fill: chart.color }} activeDot={{ r: 7 }} animationDuration={900} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </section>
            <p className="text-center text-[11px] text-white/40">Atualiza sozinho a cada {REFRESH_MS / 1000} segundos · última leitura {clockFmt.format(data.at)}</p>
          </>
        )}
      </div>
      {toast && <div role="status" className="fixed inset-x-0 bottom-6 z-[510] mx-auto w-fit max-w-[90vw] rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-2xl">{toast}</div>}
    </div>
  );
  return typeof document === "undefined" ? null : createPortal(ui, document.body);
}

/** Botão "Ao vivo" que encontra sozinho o prontuário da conta: pode ser colocado em qualquer tela do cliente. */
export function LiveModeLauncher(props: { iconOnlyOnMobile?: boolean; className?: string }) {
  const [link, setLink] = useState<{ patientId: string; ownerId: string; name: string; heightCm: number | null } | null>(null);
  useEffect(() => {
    let active = true;
    void (async () => {
      const db = supabase as any;
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const grant = await db.from("care_patient_access").select("patient_id").eq("user_id", data.user.id).limit(1);
      const id = grant.data?.[0]?.patient_id;
      const patient = id ? await db.from("care_patients").select("id,owner_id,full_name,height_cm").eq("id", id).limit(1)
        : await db.from("care_patients").select("id,owner_id,full_name,height_cm").eq("owner_id", data.user.id).limit(1);
      const row = patient.data?.[0];
      if (active && row) setLink({ patientId: row.id, ownerId: row.owner_id, name: row.full_name, heightCm: Number(row.height_cm) || null });
    })();
    return () => { active = false; };
  }, []);
  if (!link) return null;
  return <LiveModeButton patientId={link.patientId} ownerId={link.ownerId} heightCm={link.heightCm} name={link.name} {...props} />;
}
