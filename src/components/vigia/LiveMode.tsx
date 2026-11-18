import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, BedDouble, Check, ChevronRight, CheckCircle2, Droplets, Flame, Info, Maximize2, Minimize2, Minus, Pill, Plus, Radio, RefreshCw, Scale, Sparkles, Target, Trophy, Wheat, Zap, X, type LucideIcon, Dumbbell, Egg } from "lucide-react";
import { NextUpClock } from "./NextUpClock";
import { clientSectionHashes, type ClientSection } from "@/lib/client-pages";
import { useNextUps } from "./useNextUps";
import { supabase } from "@/integrations/supabase/client";
import { acreAddDays, acreDateKey, ACRE_TIME_ZONE } from "@/lib/acre-time";
import { buildDays, type DayMetrics } from "@/lib/day-metrics";
import { loadPeriodRaw, resolveTargets, type PeriodData } from "@/lib/period-data";
import { enterFullscreen, exitFullscreen, fullscreenSupported, isFullscreen, isStandaloneApp } from "@/lib/fullscreen";
import { bmiCategory } from "./ClientWeightPage";
import { QrShareCard } from "./QrShareCard";

type Props = { patientId: string; ownerId: string; heightCm?: number | null; name?: string };
type MetricKey = "score" | "agua" | "peso" | "imc" | "metapeso" | "sono" | "exercicio" | "semana" | "calorias" | "proteina" | "carbs" | "gordura" | "supl" | "med" | "streak";
type Targets = ReturnType<typeof resolveTargets>;

const REFRESH_MS = 30_000;
const SLEEP_GOAL = 8;
const EXERCISE_GOAL = 30;
const WEEK_GOAL = 150;
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

function Ring({ pct, color, size = 124, stroke = 11, children }: { pct: number; color: string; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 8px ${color}88)` }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

function Bar2({ pct, from, to }: { pct: number; from: string; to: string }) {
  return <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: `linear-gradient(90deg,${from},${to})`, boxShadow: `0 0 14px ${to}77` }} /></div>;
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

const tileArea: Partial<Record<MetricKey, ClientSection>> = {
  score: "hoje", agua: "hidratacao", peso: "peso", imc: "peso", metapeso: "peso", sono: "sono", exercicio: "atividade", semana: "atividade",
  calorias: "alimentacao", proteina: "alimentacao", carbs: "alimentacao", gordura: "alimentacao", med: "medicacao", supl: "suplementos", streak: "historico",
} as Partial<Record<MetricKey, ClientSection>>;
let openArea: ((area: ClientSection) => void) | null = null;

function Tile({ k, on, onPick, icon: Icon, tone, title, children }: { k: MetricKey; on: boolean; onPick: (k: MetricKey) => void; icon: LucideIcon; tone: string; title: string; children: ReactNode }) {
  const area = tileArea[k];
  // O cartão inteiro abre a área; botões e campos dentro dele mantêm a própria ação.
  const go = (e: { target: EventTarget | null }) => {
    if (!area || !openArea) return;
    if ((e.target as HTMLElement | null)?.closest("button, input, select, textarea, a, [role=slider]")) return;
    openArea(area);
  };
  return (
    <section aria-label={title} onClick={go} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); go(e); } }} tabIndex={area ? 0 : undefined}
      title={area ? `Abrir ${title}` : undefined}
      className={`group relative overflow-hidden rounded-3xl p-4 ring-1 transition duration-300 ${area ? "cursor-pointer hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" : ""} ${on ? "bg-white/[.13] ring-white/45 shadow-[0_0_44px_-10px_var(--tile)]" : "bg-white/[.06] ring-white/10 hover:bg-white/[.09] hover:ring-white/25"}`} style={{ ["--tile" as string]: tone }}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70" style={{ background: tone }} />
      <div className="flex w-full items-center gap-2.5">
        <span className="grid size-10 place-items-center rounded-2xl text-white shadow-lg ring-1 ring-white/25 transition-transform duration-300 group-hover:scale-110" style={{ background: tone }}><Icon size={19} /></span>
        <strong className="flex-1 text-sm font-bold tracking-wide text-white/95">{title}</strong>
        <button type="button" onClick={() => onPick(k)} aria-pressed={on} aria-label={`Ver gráfico de ${title}`} className={`inline-flex cursor-pointer items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition ${on ? "bg-white/25 text-white" : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"}`}>Gráfico <ChevronRight size={11} /></button>
      </div>
      <div className="mt-3">{children}</div>
      {area && <span aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 inline-flex translate-y-1 items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">Abrir área <ChevronRight size={11} /></span>}
    </section>
  );
}

function HeaderBtn({ icon: Icon, label, onClick, tone = "glass", spin = false }: { icon: LucideIcon; label: string; onClick: () => void; tone?: "glass" | "danger"; spin?: boolean }) {
  const cls = tone === "danger" ? "bg-gradient-to-br from-rose-500 to-pink-600 shadow-[0_10px_28px_-10px_rgba(244,63,94,.9)] ring-white/30" : "bg-white/10 ring-white/20 hover:bg-white/20";
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={`inline-flex h-11 items-center gap-2 rounded-2xl px-3 text-sm font-bold ring-1 backdrop-blur transition active:scale-95 sm:px-4 ${cls}`}><Icon size={18} className={spin ? "animate-spin" : ""} /><span className="hidden sm:inline">{label}</span></button>;
}

function ConfirmSheet({ title, lines, confirmLabel, busy, onConfirm, onCancel }: { title: string; lines: string[]; confirmLabel: string; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[520] grid place-items-end bg-slate-950/70 p-3 backdrop-blur-sm sm:place-items-center" role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 p-5 text-white shadow-2xl ring-1 ring-white/20">
        <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950"><CheckCircle2 size={24} /></span>
        <h3 className="mt-3 text-lg font-extrabold">{title}</h3>
        {lines.map((l) => <p key={l} className="mt-1 text-sm text-white/75">{l}</p>)}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="h-12 rounded-2xl bg-white/10 text-sm font-bold ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95">Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={busy} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-sm font-extrabold text-slate-950 shadow-[0_10px_28px_-10px_rgba(52,211,153,.9)] transition active:scale-95 disabled:opacity-60"><Check size={17} /> {busy ? "Salvando…" : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function LiveModeButton({ iconOnlyOnMobile = false, className = "", ...props }: Props & { iconOnlyOnMobile?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => { void enterFullscreen(); setOpen(true); }} title="Abrir o painel ao vivo em tela cheia"
        aria-label="Abrir painel ao vivo em tela cheia" className={`${liveButtonClass} ${className}`}>
        <Radio size={15} className="animate-pulse" /> <span className={iconOnlyOnMobile ? "hidden sm:inline" : ""}>Ao vivo</span> <Maximize2 size={14} className={iconOnlyOnMobile ? "hidden sm:block" : ""} />
      </button>
      {open && <LiveDashboard {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function LiveDashboard({ patientId, ownerId, heightCm, name, onClose }: Props & { onClose: () => void }) {
  const [clockKey] = useState(0);
  openArea = (area) => { onClose(); window.location.hash = clientSectionHashes[area]; };
  const root = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLElement>(null);
  const [data, setData] = useState<{ days: DayMetrics[]; weights: { day: string; kg: number }[]; waterTarget: number | null; targets: Targets; at: number } | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<MetricKey>("agua");
  const [waterView, setWaterView] = useState<"dias" | "hoje">("dias");
  const [now, setNow] = useState(Date.now());
  const [full, setFull] = useState(isFullscreen());
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customMl, setCustomMl] = useState("");
  const [pending, setPending] = useState<{ type: "water"; ml: number } | { type: "weight"; kg: number } | null>(null);
  const [hint, setHint] = useState(() => !fullscreenSupported() && !isStandaloneApp());

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
      setData({ days, weights, waterTarget, targets, at: Date.now() }); setError(false);
    } catch { setError(true); } finally { setLoading(false); }
  }, [patientId, ownerId]);

  useEffect(() => { void load(); const t = window.setInterval(() => { if (!document.hidden) void load(); }, REFRESH_MS); return () => window.clearInterval(t); }, [load]);
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  // onClose e pending ficam em refs para a tela cheia não ser desfeita quando o pai ou o painel de confirmação re-renderiza.
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const pendingRef = useRef(pending); pendingRef.current = pending;
  useEffect(() => {
    const sync = () => setFull(isFullscreen());
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !isFullscreen() && !pendingRef.current) closeRef.current(); };
    document.addEventListener("fullscreenchange", sync); document.addEventListener("webkitfullscreenchange", sync); window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("fullscreenchange", sync); document.removeEventListener("webkitfullscreenchange", sync); window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; void exitFullscreen(); };
  }, []);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(""), 2800); return () => window.clearTimeout(t); }, [toast]);

  const today = data?.days.at(-1) ?? null;
  const targets = data?.targets ?? null;
  const goalOf = (m: string) => today?.goals.find((g) => g.metric === m);
  const waterTarget = goalOf("hidratacao")?.target || data?.waterTarget || 0;
  const kcalTarget = goalOf("calorias")?.target || 0;
  const proteinTarget = goalOf("proteina")?.target || 0;
  const carbsTarget = targets?.carbs ?? 0;
  const fatTarget = targets?.fat ?? 0;
  const lastWeight = data?.weights.at(-1) ?? null; const prevWeight = data && data.weights.length > 1 ? data.weights[data.weights.length - 2] : null;
  const firstWeight = data?.weights[0] ?? null;
  const h = Number(heightCm) || 0;
  const bmi = lastWeight && h > 0 ? lastWeight.kg / Math.pow(h / 100, 2) : null;
  const cat = bmi ? bmiCategory(bmi) : null;
  const targetKg = targets?.targetWeightKg ?? null;
  const goalPct = lastWeight && firstWeight && targetKg && firstWeight.kg !== targetKg ? ((firstWeight.kg - lastWeight.kg) / (firstWeight.kg - targetKg)) * 100 : lastWeight && targetKg && lastWeight.kg === targetKg ? 100 : 0;
  const toGo = lastWeight && targetKg ? lastWeight.kg - targetKg : null;
  const sleep = [...(data?.days ?? [])].reverse().find((d) => d.sleep)?.sleep ?? null;
  const sleepNights = (data?.days ?? []).slice(-7).filter((d) => d.sleep);
  const sleepAvg = sleepNights.length ? sleepNights.reduce((s, d) => s + (d.sleep?.hours ?? 0), 0) / sleepNights.length : null;
  const week = (data?.days ?? []).slice(-7);
  const weekMin = week.reduce((s, d) => s + d.activityMinutes, 0);
  const weekKm = week.reduce((s, d) => s + d.activityKm, 0);
  const streak = useMemo(() => { const list = [...(data?.days ?? [])].reverse(); let i = list[0]?.hasData ? 0 : 1; let n = 0; while (i < list.length && list[i].hasData) { n += 1; i += 1; } return n; }, [data]);
  const waterPct = waterTarget && today ? (today.waterMl / waterTarget) * 100 : 0;
  const waterShown = useCountUp(today?.waterMl ?? 0);
  const nextUps = useNextUps(patientId, ownerId, waterTarget, (data?.at ?? 0) + clockKey);
  const scoreShown = useCountUp(today?.score ?? 0);

  // REGRA: toda gravação do modo ao vivo (inserir, alterar ou remover) só acontece aqui, depois de o usuário tocar em "Confirmar" na folha de confirmação.
  async function runPending() {
    if (!pending || busy) return;
    setBusy(true);
    if (pending.type === "water") {
      const { error: err } = await (supabase as any).rpc("care_log_unscheduled_intake", { p_patient_id: patientId, p_kind: "agua", p_description: "Água", p_amount_ml: pending.ml, p_request_id: crypto.randomUUID() });
      setBusy(false);
      if (err) { setPending(null); setToast("Não foi possível registrar a água agora."); return; }
      setPending(null); setCustomOpen(false); setCustomMl(""); setToast(`+${pending.ml} ml de água registrados`); void load();
    } else {
      const day = acreDateKey();
      const auth = await supabase.auth.getUser();
      const { error: err } = await (supabase as any).from("care_body_measurements").insert({ patient_id: patientId, owner_id: ownerId, recorded_by: auth.data.user?.id, recorded_on: day, weight_kg: pending.kg, height_cm: h });
      setBusy(false);
      if (err) { setPending(null); setToast("Não foi possível registrar o peso agora."); return; }
      setPending(null); setWeightInput(""); setToast(`Peso de ${nf(pending.kg, 1)} kg registrado`); void load();
    }
  }
  function askWater(ml: number) {
    if (!Number.isInteger(ml) || ml < 10 || ml > 1500) { setToast("Informe um volume entre 10 e 1.500 ml."); return; }
    setPending({ type: "water", ml });
  }
  function askWeight() {
    const kg = Number(weightInput.replace(",", "."));
    if (!Number.isFinite(kg) || kg < 20 || kg > 350) { setToast("Informe um peso entre 20 e 350 kg."); return; }
    if (!h) { setToast("Informe sua altura na área Peso para registrar."); return; }
    if (data?.weights.some((w) => w.day === acreDateKey())) { setToast("Já existe peso hoje. Edite na área Peso."); return; }
    setPending({ type: "weight", kg });
  }
  const stepWeight = (d: number) => { const base = Number((weightInput || String(lastWeight?.kg ?? 70)).replace(",", ".")); const next = Math.round((base + d) * 10) / 10; setWeightInput(String(next).replace(".", ",")); };
  async function toggleFull() { if (isFullscreen()) await exitFullscreen(); else { const ok = await enterFullscreen(); if (!ok) setHint(true); } }

  const series = useMemo(() => {
    const days = data?.days ?? [];
    const label = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
    const w30 = (data?.weights ?? []).slice(-30);
    return {
      agua: days.map((d) => ({ label: label(d.day), v: d.waterMl })),
      aguaHoje: (days.at(-1)?.hours ?? []).map((x, i) => ({ label: `${i}h`, v: x.water })),
      sono: days.map((d) => ({ label: label(d.day), v: d.sleep ? Math.round(d.sleep.hours * 10) / 10 : null })),
      exercicio: days.map((d) => ({ label: label(d.day), v: d.activityMinutes })),
      calorias: days.map((d) => ({ label: label(d.day), v: Math.round(d.kcal) })),
      proteina: days.map((d) => ({ label: label(d.day), v: Math.round(d.protein) })),
      carbs: days.map((d) => ({ label: label(d.day), v: Math.round(d.carbs) })),
      gordura: days.map((d) => ({ label: label(d.day), v: Math.round(d.fat) })),
      supl: days.map((d) => ({ label: label(d.day), v: d.supplements.taken })),
      med: days.map((d) => ({ label: label(d.day), v: d.medication.taken })),
      score: days.map((d) => ({ label: label(d.day), v: d.score })),
      streak: days.map((d) => ({ label: label(d.day), v: d.hasData ? 1 : 0 })),
      peso: w30.map((w) => ({ label: label(w.day), v: w.kg })),
      imc: h > 0 ? w30.map((w) => ({ label: label(w.day), v: Math.round((w.kg / Math.pow(h / 100, 2)) * 10) / 10 })) : [],
    };
  }, [data, h]);

  const CHART: Record<MetricKey, { title: string; unit: string; color: string; goal?: number; kind: "bar" | "area"; src: keyof typeof series }> = {
    score: { title: "Metas atingidas por dia", unit: "%", color: "#34d399", goal: 100, kind: "bar", src: "score" },
    agua: waterView === "hoje" ? { title: "Água de hoje, hora a hora", unit: "ml", color: "#38bdf8", kind: "bar", src: "aguaHoje" } : { title: "Água por dia", unit: "ml", color: "#38bdf8", goal: waterTarget || undefined, kind: "bar", src: "agua" },
    peso: { title: "Peso (últimas medidas)", unit: "kg", color: "#e879f9", goal: targetKg ?? undefined, kind: "area", src: "peso" },
    imc: { title: "IMC (últimas medidas)", unit: "", color: "#34d399", kind: "area", src: "imc" },
    metapeso: { title: "Caminho até a meta de peso", unit: "kg", color: "#f472b6", goal: targetKg ?? undefined, kind: "area", src: "peso" },
    sono: { title: "Horas de sono", unit: "h", color: "#818cf8", goal: SLEEP_GOAL, kind: "bar", src: "sono" },
    exercicio: { title: "Minutos de exercício", unit: "min", color: "#fb923c", goal: EXERCISE_GOAL, kind: "bar", src: "exercicio" },
    semana: { title: "Exercício por dia (meta semanal de 150 min)", unit: "min", color: "#f97316", goal: Math.round(WEEK_GOAL / 7), kind: "bar", src: "exercicio" },
    calorias: { title: "Calorias por dia", unit: "kcal", color: "#fbbf24", goal: kcalTarget || undefined, kind: "bar", src: "calorias" },
    proteina: { title: "Proteína por dia", unit: "g", color: "#4ade80", goal: proteinTarget || undefined, kind: "bar", src: "proteina" },
    carbs: { title: "Carboidratos por dia", unit: "g", color: "#fcd34d", goal: carbsTarget || undefined, kind: "bar", src: "carbs" },
    gordura: { title: "Gorduras por dia", unit: "g", color: "#fb923c", goal: fatTarget || undefined, kind: "bar", src: "gordura" },
    supl: { title: "Suplementos tomados por dia", unit: "", color: "#c084fc", kind: "bar", src: "supl" },
    med: { title: "Medicações tomadas por dia", unit: "", color: "#fb7185", kind: "bar", src: "med" },
    streak: { title: "Dias com registros (1 = teve registro)", unit: "", color: "#fbbf24", kind: "bar", src: "streak" },
  };
  const chart = CHART[selected]; const chartData = series[chart.src] as { label: string; v: number | null }[];
  const tip = { background: "#0f172a", border: "1px solid rgba(255,255,255,.2)", borderRadius: 12, color: "#fff" } as const;
  const tipText = { itemStyle: { color: "#fff" }, labelStyle: { color: "rgba(255,255,255,.75)" } } as const;

  const ui = (
    <div ref={root} className="fixed inset-0 z-[500] overflow-y-auto overscroll-contain bg-[radial-gradient(ellipse_at_top,#0b3b3a_0%,#020617_62%)] text-white" role="dialog" aria-modal="true" aria-label="Painel ao vivo">
      <div className="mx-auto flex min-h-full max-w-[1500px] flex-col gap-4 p-3 pb-24 sm:p-6">
        <header className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-2 text-xs font-extrabold uppercase tracking-widest text-emerald-300 ring-1 ring-emerald-400/40"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" /></span> Ao vivo</span>
          <span className="flex-1 sm:hidden" />
          <div className="order-last min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-auto"><p className="truncate text-xs text-white/60 first-letter:uppercase">{dateFmt.format(now)}{name ? ` · ${name.split(" ")[0]}` : ""}</p><p className="font-mono text-3xl font-extrabold tabular-nums leading-none sm:text-4xl">{clockFmt.format(now)}</p></div>
          <div className="flex items-center gap-2">
            <HeaderBtn icon={RefreshCw} label="Atualizar" onClick={() => void load()} spin={loading} />
            <HeaderBtn icon={full ? Minimize2 : Maximize2} label={full ? "Sair da tela cheia" : "Tela cheia"} onClick={() => void toggleFull()} />
            <HeaderBtn icon={X} label="Fechar" onClick={onClose} tone="danger" />
          </div>
        </header>
        {hint && <p className="flex items-start gap-2 rounded-2xl bg-white/10 p-3 text-xs text-white/80 ring-1 ring-white/15"><Info size={16} className="mt-0.5 shrink-0 text-cyan-300" /><span className="flex-1">Este navegador não libera a tela cheia. No iPhone, toque em Compartilhar e em <strong>Adicionar à Tela de Início</strong>; abrindo pelo ícone, o NextVita ocupa a tela toda, sem barra do navegador.</span><button type="button" onClick={() => setHint(false)} className="rounded-lg bg-white/15 px-2.5 py-1 font-bold">Entendi</button></p>}

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
                  <div className="grid flex-1 grid-cols-3 gap-1.5">
                    {[{ ml: 150, label: "Gole", size: 16 }, { ml: 250, label: "Copo", size: 20 }, { ml: 500, label: "Garrafa", size: 25 }].map((c) => (
                      <button key={c.ml} type="button" disabled={busy} onClick={() => askWater(c.ml)} className="flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-gradient-to-b from-sky-300/30 to-sky-500/10 py-2.5 ring-1 ring-sky-300/40 transition hover:from-sky-300/45 active:scale-95 disabled:opacity-50" aria-label={`Registrar ${c.ml} ml de água`}>
                        <Droplets size={c.size} className="text-sky-200" /><span className="text-sm font-extrabold leading-none">+{c.ml}</span><span className="text-[9px] font-bold uppercase tracking-wider text-sky-100/70">{c.label}</span>
                      </button>))}
                  </div></div>
                <button type="button" onClick={() => setCustomOpen((v) => !v)} aria-expanded={customOpen} className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-white/10 text-xs font-bold ring-1 ring-white/15 transition hover:bg-white/20"><Plus size={14} /> Outro valor</button>
                {customOpen && <div className="mt-2 flex gap-1.5"><input value={customMl} onChange={(e) => setCustomMl(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="ml" aria-label="Quantidade de água em ml" className="h-11 min-w-0 flex-1 rounded-xl bg-white/10 px-3 text-sm text-white outline-none ring-1 ring-white/15 placeholder:text-white/40 focus:ring-sky-300/60" /><button type="button" disabled={!customMl} onClick={() => askWater(Number(customMl))} className="h-11 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 px-4 text-xs font-extrabold text-slate-950 disabled:opacity-40">Registrar</button></div>}
                {waterPct >= 100 && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-200"><CheckCircle2 size={14} /> Meta batida!</p>}
              {nextUps.agua && <NextUpClock compact className="mt-3" alertKey="ao-vivo-agua" title="Próximo copo" color="#38bdf8" target={nextUps.agua.at} from={nextUps.agua.from} detail={nextUps.agua.detail} actionLabel="Bebi 250 ml" onAction={() => askWater(250)} />}
              </Tile>

              <Tile k="peso" on={selected === "peso"} onPick={pick} icon={Scale} tone="linear-gradient(135deg,#d946ef,#ec4899)" title="Peso">
                <p className="text-4xl font-extrabold tabular-nums">{lastWeight ? nf(lastWeight.kg, 1) : "—"}<span className="ml-1 text-base font-semibold text-white/60">kg</span></p>
                <p className="text-xs text-white/60">{lastWeight && prevWeight ? `${lastWeight.kg - prevWeight.kg > 0 ? "▲ +" : lastWeight.kg - prevWeight.kg < 0 ? "▼ " : ""}${nf(lastWeight.kg - prevWeight.kg, 1)} kg desde a medida anterior` : "Registre seu peso para acompanhar a evolução."}</p>
                <Spark data={series.peso} color="#e879f9" />
                <div className="mt-1 flex items-center gap-1.5">
                  <button type="button" onClick={() => stepWeight(-0.1)} aria-label="Diminuir 0,1 kg" className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95"><Minus size={16} /></button>
                  <input value={weightInput} onChange={(e) => setWeightInput(e.target.value)} inputMode="decimal" placeholder="kg hoje" aria-label="Peso de hoje em kg" className="h-11 min-w-0 flex-1 rounded-xl bg-white/10 px-3 text-center text-base font-bold text-white outline-none ring-1 ring-white/15 placeholder:text-sm placeholder:font-normal placeholder:text-white/40 focus:ring-fuchsia-300/60" />
                  <button type="button" onClick={() => stepWeight(0.1)} aria-label="Aumentar 0,1 kg" className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95"><Plus size={16} /></button>
                </div>
                <button type="button" disabled={busy || !weightInput} onClick={askWeight} className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-sm font-extrabold shadow-[0_10px_28px_-12px_rgba(236,72,153,.9)] transition active:scale-95 disabled:opacity-40"><Check size={16} /> Registrar peso de hoje</button>
              </Tile>

              <Tile k="imc" on={selected === "imc"} onPick={pick} icon={Zap} tone="linear-gradient(135deg,#10b981,#84cc16)" title="IMC">
                <p className="text-4xl font-extrabold tabular-nums" style={{ color: cat?.color }}>{bmi ? nf(bmi, 1) : "—"}</p>
                <p className="text-sm font-semibold" style={{ color: cat?.color }}>{cat?.label ?? (h ? "Sem peso registrado" : "Informe sua altura")}</p>
                <div className="relative mt-3 h-3 overflow-hidden rounded-full" style={{ background: "linear-gradient(90deg,#38bdf8 0 14%,#10b981 14% 40%,#f59e0b 40% 60%,#f97316 60% 80%,#ef4444 80%)" }} aria-hidden="true">
                  {bmi && <span className="absolute top-0 h-3 w-1 -translate-x-1/2 rounded bg-white shadow-[0_0_8px_#fff]" style={{ left: `${Math.max(0, Math.min(100, ((bmi - 15) / 25) * 100))}%`, transition: "left 1s" }} />}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-white/50"><span>15</span><span>25</span><span>40</span></div>
              </Tile>

              <Tile k="metapeso" on={selected === "metapeso"} onPick={pick} icon={Trophy} tone="linear-gradient(135deg,#ec4899,#f59e0b)" title="Meta de peso">
                {targetKg && lastWeight ? <>
                  <p className="text-3xl font-extrabold tabular-nums">{toGo !== null && Math.abs(toGo) < 0.05 ? "Meta atingida" : `${nf(Math.abs(toGo ?? 0), 1)} kg`}</p>
                  <p className="text-xs text-white/60">{toGo !== null && Math.abs(toGo) >= 0.05 ? (toGo > 0 ? "para chegar a " : "para chegar a ") + `${nf(targetKg, 1)} kg` : `Peso atual ${nf(lastWeight.kg, 1)} kg`}</p>
                  <Bar2 pct={goalPct} from="#ec4899" to="#f59e0b" />
                  <p className="mt-1 text-[11px] text-white/50">{Math.round(Math.max(0, Math.min(100, goalPct)))}% do caminho · início {firstWeight ? nf(firstWeight.kg, 1) : "—"} kg</p>
                </> : <p className="text-sm text-white/70">{targetKg ? "Registre seu peso para ver o progresso." : "Defina a meta de peso no seu perfil para acompanhar o caminho até ela."}</p>}
              </Tile>

              <Tile k="sono" on={selected === "sono"} onPick={pick} icon={BedDouble} tone="linear-gradient(135deg,#6366f1,#8b5cf6)" title="Sono">
                <div className="flex items-center gap-4"><Ring pct={sleep ? (sleep.hours / SLEEP_GOAL) * 100 : 0} color="#818cf8"><div><p className="text-2xl font-extrabold tabular-nums">{sleep ? nf(sleep.hours, 1) : "—"}</p><p className="text-[10px] text-white/60">horas</p></div></Ring>
                  <div className="text-sm text-white/70">{sleep ? <><p>Qualidade {"★".repeat(Math.max(0, Math.min(5, sleep.quality)))}{"☆".repeat(5 - Math.max(0, Math.min(5, sleep.quality)))}</p><p className="text-xs">Meta de {SLEEP_GOAL} h por noite</p>{sleepAvg !== null && <p className="mt-1 text-xs text-indigo-200">Média de 7 noites: {nf(sleepAvg, 1)} h</p>}</> : "Sem noite registrada."}</div></div>
                <Spark data={series.sono} color="#818cf8" goal={SLEEP_GOAL} />
              {nextUps.sono && <NextUpClock compact className="mt-3" alertKey="ao-vivo-sono" title="Hora de desacelerar" color="#a5b4fc" target={nextUps.sono.at} from={nextUps.sono.from} detail={nextUps.sono.detail} />}
              </Tile>

              <Tile k="exercicio" on={selected === "exercicio"} onPick={pick} icon={Activity} tone="linear-gradient(135deg,#f97316,#f59e0b)" title="Exercício hoje">
                <div className="flex items-center gap-4"><Ring pct={((today?.activityMinutes ?? 0) / EXERCISE_GOAL) * 100} color="#fb923c"><div><p className="text-2xl font-extrabold tabular-nums">{today?.activityMinutes ?? 0}</p><p className="text-[10px] text-white/60">min hoje</p></div></Ring>
                  <p className="text-sm text-white/70">{today && today.activityKm > 0 ? `${nf(today.activityKm, 1)} km percorridos. ` : ""}Referência: {EXERCISE_GOAL} min por dia.</p></div>
                <Spark data={series.exercicio} color="#fb923c" goal={EXERCISE_GOAL} />
              {nextUps.exercicio && <NextUpClock compact className="mt-3" alertKey="ao-vivo-atividade" title="Hora de se mexer" color="#fdba74" target={nextUps.exercicio.at} from={nextUps.exercicio.from} detail={nextUps.exercicio.detail} />}
              </Tile>

              <Tile k="semana" on={selected === "semana"} onPick={pick} icon={Dumbbell} tone="linear-gradient(135deg,#ef4444,#f97316)" title="Exercício na semana">
                <p className="text-4xl font-extrabold tabular-nums">{nf(weekMin)}<span className="ml-1 text-base font-semibold text-white/60">min</span></p>
                <Bar2 pct={(weekMin / WEEK_GOAL) * 100} from="#ef4444" to="#f97316" />
                <p className="mt-1 text-xs text-white/60">Meta da OMS: {WEEK_GOAL} min por semana{weekKm > 0 ? ` · ${nf(weekKm, 1)} km` : ""}{weekMin >= WEEK_GOAL ? " · meta batida!" : ""}</p>
              </Tile>

              <Tile k="calorias" on={selected === "calorias"} onPick={pick} icon={Flame} tone="linear-gradient(135deg,#f59e0b,#ef4444)" title="Calorias">
                <p className="text-4xl font-extrabold tabular-nums">{nf(today?.kcal ?? 0)}<span className="ml-1 text-base font-semibold text-white/60">kcal</span></p>
                <Bar2 pct={kcalTarget ? ((today?.kcal ?? 0) / kcalTarget) * 100 : 0} from="#fbbf24" to="#f97316" />
                <p className="mt-1 text-xs text-white/60">{kcalTarget ? `Meta de ${nf(kcalTarget)} kcal` : "Meta não definida"}</p>
              {nextUps.refeicao && <NextUpClock compact className="mt-3" alertKey="ao-vivo-refeicao" title="Próxima refeição" color="#fdba74" target={nextUps.refeicao.at} from={nextUps.refeicao.from} detail={nextUps.refeicao.detail} />}
              </Tile>

              <Tile k="proteina" on={selected === "proteina"} onPick={pick} icon={Egg} tone="linear-gradient(135deg,#22c55e,#14b8a6)" title="Proteína">
                <p className="text-4xl font-extrabold tabular-nums">{nf(today?.protein ?? 0)}<span className="ml-1 text-base font-semibold text-white/60">g</span></p>
                <Bar2 pct={proteinTarget ? ((today?.protein ?? 0) / proteinTarget) * 100 : 0} from="#4ade80" to="#2dd4bf" />
                <p className="mt-1 text-xs text-white/60">{proteinTarget ? `Meta de ${nf(proteinTarget)} g` : "Meta não definida"}</p>
              </Tile>

              <Tile k="carbs" on={selected === "carbs"} onPick={pick} icon={Wheat} tone="linear-gradient(135deg,#eab308,#f59e0b)" title="Carboidratos">
                <p className="text-4xl font-extrabold tabular-nums">{nf(today?.carbs ?? 0)}<span className="ml-1 text-base font-semibold text-white/60">g</span></p>
                <Bar2 pct={carbsTarget ? ((today?.carbs ?? 0) / carbsTarget) * 100 : 0} from="#fde047" to="#f59e0b" />
                <p className="mt-1 text-xs text-white/60">{carbsTarget ? `Meta de ${nf(carbsTarget)} g` : "Meta não definida"}</p>
              </Tile>

              <Tile k="gordura" on={selected === "gordura"} onPick={pick} icon={Sparkles} tone="linear-gradient(135deg,#fb923c,#e11d48)" title="Gorduras">
                <p className="text-4xl font-extrabold tabular-nums">{nf(today?.fat ?? 0)}<span className="ml-1 text-base font-semibold text-white/60">g</span></p>
                <Bar2 pct={fatTarget ? ((today?.fat ?? 0) / fatTarget) * 100 : 0} from="#fb923c" to="#e11d48" />
                <p className="mt-1 text-xs text-white/60">{fatTarget ? `Meta de ${nf(fatTarget)} g` : "Meta não definida"}</p>
              </Tile>

              <Tile k="med" on={selected === "med"} onPick={pick} icon={Pill} tone="linear-gradient(135deg,#f43f5e,#fb7185)" title="Medicação">
                <div className="flex items-center gap-4"><Ring pct={today?.medication.planned ? (today.medication.taken / today.medication.planned) * 100 : 0} color="#fb7185" size={96} stroke={9}><div><p className="text-xl font-extrabold tabular-nums">{today?.medication.taken ?? 0}/{today?.medication.planned ?? 0}</p><p className="text-[10px] text-white/60">doses</p></div></Ring>
                  <p className="text-sm text-white/70">{today?.medication.planned ? (today.medication.taken >= today.medication.planned ? "Todas as doses de hoje registradas." : `${today.medication.planned - today.medication.taken} dose(s) para registrar hoje.`) : "Sem medicação programada hoje."}</p></div>
              {nextUps.med && <NextUpClock compact className="mt-3" alertKey="ao-vivo-medicacao" title="Próxima dose" color="#fb7185" target={nextUps.med.at} from={nextUps.med.from} detail={nextUps.med.detail} />}
              </Tile>

              <Tile k="supl" on={selected === "supl"} onPick={pick} icon={Sparkles} tone="linear-gradient(135deg,#a855f7,#6366f1)" title="Suplementos">
                <div className="flex items-center gap-4"><Ring pct={today?.supplements.planned ? (today.supplements.taken / today.supplements.planned) * 100 : 0} color="#c084fc" size={96} stroke={9}><div><p className="text-xl font-extrabold tabular-nums">{today?.supplements.taken ?? 0}/{today?.supplements.planned ?? 0}</p><p className="text-[10px] text-white/60">doses</p></div></Ring>
                  <p className="text-sm text-white/70">{today?.supplements.planned ? (today.supplements.taken >= today.supplements.planned ? "Suplementação de hoje completa." : `${today.supplements.planned - today.supplements.taken} dose(s) a tomar hoje.`) : "Nenhum suplemento programado hoje."}</p></div>
              {nextUps.supl && <NextUpClock compact className="mt-3" alertKey="ao-vivo-suplemento" title="Próximo suplemento" color="#c084fc" target={nextUps.supl.at} from={nextUps.supl.from} detail={nextUps.supl.detail} />}
              </Tile>

              <Tile k="streak" on={selected === "streak"} onPick={pick} icon={Flame} tone="linear-gradient(135deg,#fbbf24,#f97316)" title="Sequência">
                <p className="text-4xl font-extrabold tabular-nums">{streak}{streak >= 14 ? "+" : ""}<span className="ml-1 text-base font-semibold text-white/60">{streak === 1 ? "dia" : "dias"}</span></p>
                <p className="text-sm text-white/70">{streak > 0 ? "seguidos registrando o seu cuidado." : "Registre algo hoje para começar uma sequência."}</p>
                <div className="mt-2 flex gap-1" aria-hidden="true">{(data.days ?? []).map((d) => <span key={d.day} className={`h-2 flex-1 rounded-full ${d.hasData ? "bg-amber-300" : "bg-white/10"}`} />)}</div>
              </Tile>
            </div>

            <section ref={chartRef} aria-label="Gráfico detalhado" className="rounded-3xl bg-white/[.06] p-4 ring-1 ring-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-extrabold">{chart.title}</h2>
                {selected === "agua" ? <div role="group" aria-label="Período do gráfico de água" className="inline-flex rounded-xl bg-white/10 p-1 text-xs font-bold">{(["dias", "hoje"] as const).map((v) => <button key={v} type="button" onClick={() => setWaterView(v)} aria-pressed={waterView === v} className={`h-8 rounded-lg px-3 transition ${waterView === v ? "bg-white text-slate-900" : "text-white/70"}`}>{v === "dias" ? "14 dias" : "Hoje por hora"}</button>)}</div> : <span className="text-xs text-white/50">Toque numa barra ou ponto para ver o valor</span>}
              </div>
              <div className="mt-3 h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {chart.kind === "bar" ? (
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,.1)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(255,255,255,.6)" }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,.6)" }} width={44} />
                      <Tooltip cursor={{ fill: "rgba(255,255,255,.08)" }} contentStyle={tip} {...tipText} formatter={(v: number) => [`${nf(v, chart.unit === "h" ? 1 : 0)} ${chart.unit}`.trim(), chart.title]} />
                      {chart.goal ? <ReferenceLine y={chart.goal} stroke="#34d399" strokeDasharray="5 4" label={{ value: "Meta", fill: "#34d399", fontSize: 11, position: "insideTopRight" }} /> : null}
                      <Bar dataKey="v" radius={[8, 8, 0, 0]} maxBarSize={36} animationDuration={800}>{chartData.map((d, i) => <Cell key={i} fill={chart.goal && d.v != null && d.v >= chart.goal ? "#34d399" : chart.color} />)}</Bar>
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <defs><linearGradient id="liveArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chart.color} stopOpacity={0.55} /><stop offset="100%" stopColor={chart.color} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,.1)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(255,255,255,.6)" }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,.6)" }} width={44} domain={["auto", "auto"]} />
                      <Tooltip contentStyle={tip} {...tipText} formatter={(v: number) => [`${nf(v, 1)} ${chart.unit}`.trim(), chart.title]} />
                      {chart.goal ? <ReferenceLine y={chart.goal} stroke="#34d399" strokeDasharray="5 4" label={{ value: "Meta", fill: "#34d399", fontSize: 11, position: "insideTopRight" }} /> : null}
                      <Area type="monotone" dataKey="v" stroke={chart.color} strokeWidth={3} fill="url(#liveArea)" dot={{ r: 3, fill: chart.color }} activeDot={{ r: 7 }} animationDuration={900} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </section>
            <QrShareCard variant="live" dark className="mx-auto w-full max-w-3xl" />
            <p className="text-center text-[11px] text-white/40">Atualiza sozinho a cada {REFRESH_MS / 1000} segundos · última leitura {clockFmt.format(data.at)}</p>
          </>
        )}
      </div>
      {toast && <div role="status" className="fixed inset-x-0 bottom-6 z-[510] mx-auto w-fit max-w-[90vw] rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-2xl">{toast}</div>}
      {pending && <ConfirmSheet busy={busy} onCancel={() => !busy && setPending(null)} onConfirm={() => void runPending()}
        title={pending.type === "water" ? "Confirmar registro de água?" : "Confirmar registro de peso?"}
        lines={pending.type === "water" ? [`Registrar ${pending.ml} ml de água agora.`, "Horário do Acre (UTC−5)."] : [`Registrar ${nf(pending.kg, 1)} kg para hoje.`, "Registros de peso salvos ficam protegidos contra alterações acidentais."]}
        confirmLabel="Confirmar registro" />}
    </div>
  );
  return typeof document === "undefined" ? null : createPortal(ui, document.body);
}

const liveButtonClass = "inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 text-xs font-extrabold text-slate-950 shadow-lg ring-1 ring-white/30 transition hover:brightness-110 active:scale-95";

type Link = { patientId: string; ownerId: string; name: string; heightCm: number | null };
async function findPatientLink(): Promise<Link | null> {
  const db = supabase as any;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const grant = await db.from("care_patient_access").select("patient_id").eq("user_id", data.user.id).limit(1);
  const id = grant.data?.[0]?.patient_id;
  const patient = id ? await db.from("care_patients").select("id,owner_id,full_name,height_cm").eq("id", id).limit(1)
    : await db.from("care_patients").select("id,owner_id,full_name,height_cm").eq("owner_id", data.user.id).limit(1);
  const row = patient.data?.[0];
  return row ? { patientId: row.id, ownerId: row.owner_id, name: row.full_name, heightCm: Number(row.height_cm) || null } : null;
}

/** Botão "Ao vivo" para qualquer tela do cliente: aparece sempre e procura o prontuário da conta ao abrir. */
export function LiveModeLauncher({ iconOnlyOnMobile = false, className = "" }: { iconOnlyOnMobile?: boolean; className?: string }) {
  const [link, setLink] = useState<Link | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { let active = true; void findPatientLink().then((l) => { if (active && l) setLink(l); }, () => undefined); return () => { active = false; }; }, []);
  useEffect(() => { if (!msg) return; const t = window.setTimeout(() => setMsg(""), 3500); return () => window.clearTimeout(t); }, [msg]);
  async function openLive() {
    void enterFullscreen(); // precisa acontecer direto do toque, antes de qualquer espera
    if (link) { setOpen(true); return; }
    setBusy(true);
    try { const found = await findPatientLink(); if (found) { setLink(found); setOpen(true); } else { void exitFullscreen(); setMsg("Não encontramos o seu prontuário. Entre novamente e tente de novo."); } }
    catch { void exitFullscreen(); setMsg("Não foi possível abrir o painel ao vivo agora."); }
    finally { setBusy(false); }
  }
  return (
    <>
      <button type="button" onClick={() => void openLive()} disabled={busy} title="Painel ao vivo em tela cheia" aria-label="Abrir painel ao vivo em tela cheia" className={`${liveButtonClass} disabled:opacity-60 ${className}`}>
        <Radio size={15} className="animate-pulse" /> <span className={iconOnlyOnMobile ? "hidden sm:inline" : ""}>Ao vivo</span> <Maximize2 size={14} className={iconOnlyOnMobile ? "hidden sm:block" : ""} />
      </button>
      {open && link && <LiveDashboard patientId={link.patientId} ownerId={link.ownerId} heightCm={link.heightCm} name={link.name} onClose={() => setOpen(false)} />}
      {msg && createPortal(<div role="alert" className="fixed inset-x-0 bottom-6 z-[600] mx-auto w-fit max-w-[90vw] rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-2xl">{msg}</div>, document.body)}
    </>
  );
}
