import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ConfirmCard, confirmArea } from "./ConfirmCard";
import { createPortal } from "react-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BedDouble,
  Check,
  ChevronRight,
  CheckCircle2,
  Droplets,
  Flame,
  Info,
  Maximize2,
  Minimize2,
  Minus,
  Pill,
  Plus,
  Radio,
  RefreshCw,
  Scale,
  Sparkles,
  Target,
  Trophy,
  Wheat,
  Zap,
  X,
  type LucideIcon,
  Dumbbell,
  Egg,
} from "lucide-react";
import { NextUpClock } from "./NextUpClock";
import { clientSectionHashes, type ClientSection } from "@/lib/client-pages";
import { useNextUps } from "./useNextUps";
import { supabase } from "@/integrations/supabase/client";
import { acreAddDays, acreDateKey, ACRE_TIME_ZONE } from "@/lib/acre-time";
import { buildDays, type DayMetrics } from "@/lib/day-metrics";
import { loadPeriodRaw, resolveTargets, type PeriodData } from "@/lib/period-data";
import {
  enterFullscreen,
  exitFullscreen,
  fullscreenSupported,
  isFullscreen,
  isStandaloneApp,
} from "@/lib/fullscreen";
import { bmiCategory } from "./ClientWeightPage";
import { QrShareCard } from "./QrShareCard";

type Props = { patientId: string; ownerId: string; heightCm?: number | null; name?: string };
type MetricKey =
  | "score"
  | "agua"
  | "peso"
  | "imc"
  | "metapeso"
  | "sono"
  | "exercicio"
  | "semana"
  | "calorias"
  | "proteina"
  | "carbs"
  | "gordura"
  | "supl"
  | "med"
  | "streak";
type Targets = ReturnType<typeof resolveTargets>;

const REFRESH_MS = 30_000;
const SLEEP_GOAL = 8;
const EXERCISE_GOAL = 30;
const WEEK_GOAL = 150;
const nf = (v: number, d = 0) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const clockFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: ACRE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: ACRE_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

function useCountUp(value: number, ms = 900) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(a + (value - a) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

function Ring({
  pct,
  color,
  size = 124,
  stroke = 11,
  children,
}: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,.1)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)",
            filter: `drop-shadow(0 0 8px ${color}88)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

function Bar2({ pct, from, to }: { pct: number; from: string; to: string }) {
  return (
    <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className="relative h-full overflow-hidden rounded-full transition-all duration-1000"
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: `linear-gradient(90deg,${from},${to})`,
          boxShadow: `0 0 12px ${to}77`,
        }}
      >
        <span className="lv-shine absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
      </div>
    </div>
  );
}

function Spark({
  data,
  color,
  goal,
}: {
  data: { v: number | null }[];
  color: string;
  goal?: number;
}) {
  const id = useMemo(() => `sp${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <div className="h-9 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {goal ? (
            <ReferenceLine y={goal} stroke="rgba(255,255,255,.25)" strokeDasharray="3 3" />
          ) : null}
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${id})`}
            connectNulls
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const tileArea: Partial<Record<MetricKey, ClientSection>> = {
  score: "hoje",
  agua: "hidratacao",
  peso: "peso",
  imc: "peso",
  metapeso: "peso",
  sono: "sono",
  exercicio: "atividade",
  semana: "atividade",
  calorias: "alimentacao",
  proteina: "alimentacao",
  carbs: "alimentacao",
  gordura: "alimentacao",
  med: "medicacao",
  supl: "suplementos",
  streak: "historico",
} as Partial<Record<MetricKey, ClientSection>>;
let openArea: ((area: ClientSection) => void) | null = null;
let openDetail: ((k: MetricKey) => void) | null = null;

const TILE_META: Record<MetricKey, { icon: LucideIcon; tone: string; title: string }> = {
  score: { icon: Target, tone: "linear-gradient(135deg,#10b981,#06b6d4)", title: "Metas de hoje" },
  agua: { icon: Droplets, tone: "linear-gradient(135deg,#0ea5e9,#22d3ee)", title: "Hidratação" },
  peso: { icon: Scale, tone: "linear-gradient(135deg,#d946ef,#ec4899)", title: "Peso" },
  imc: { icon: Zap, tone: "linear-gradient(135deg,#10b981,#84cc16)", title: "IMC" },
  metapeso: { icon: Trophy, tone: "linear-gradient(135deg,#ec4899,#f59e0b)", title: "Meta de peso" },
  sono: { icon: BedDouble, tone: "linear-gradient(135deg,#6366f1,#8b5cf6)", title: "Sono" },
  exercicio: { icon: Activity, tone: "linear-gradient(135deg,#f97316,#f59e0b)", title: "Exercício hoje" },
  semana: { icon: Dumbbell, tone: "linear-gradient(135deg,#ef4444,#f97316)", title: "Exercício na semana" },
  calorias: { icon: Flame, tone: "linear-gradient(135deg,#f59e0b,#ef4444)", title: "Calorias" },
  proteina: { icon: Egg, tone: "linear-gradient(135deg,#22c55e,#14b8a6)", title: "Proteína" },
  carbs: { icon: Wheat, tone: "linear-gradient(135deg,#eab308,#f59e0b)", title: "Carboidratos" },
  gordura: { icon: Sparkles, tone: "linear-gradient(135deg,#fb923c,#e11d48)", title: "Gorduras" },
  med: { icon: Pill, tone: "linear-gradient(135deg,#f43f5e,#fb7185)", title: "Medicação" },
  supl: { icon: Sparkles, tone: "linear-gradient(135deg,#a855f7,#6366f1)", title: "Suplementos" },
  streak: { icon: Flame, tone: "linear-gradient(135deg,#fbbf24,#f97316)", title: "Sequência" },
};
const GRID = "grid grid-cols-2 gap-2.5 sm:grid-cols-6 lg:grid-cols-12 lg:gap-3";
const GOAL_COLOR: Record<string, string> = {
  atingida: "#34d399",
  em_andamento: "#fbbf24",
  nao_atingida: "#fb7185",
  sem_registro: "#94a3b8",
  sem_meta: "#475569",
};
const WEEKDAY_INITIAL = ["D", "S", "T", "Q", "Q", "S", "S"];

const LIVE_CSS = `
@keyframes lv-in{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}
@keyframes lv-tick{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes lv-shine{from{transform:translateX(-120%)}to{transform:translateX(320%)}}
.lv-in{animation:lv-in .55s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i,0)*38ms)}
.lv-shine{animation:lv-shine 2.8s ease-in-out infinite}
.lv-tick{transform-origin:left;animation:lv-tick 30s linear both}
@media (prefers-reduced-motion:reduce){.lv-in,.lv-shine,.lv-tick{animation:none}}
`;

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1 flex items-center gap-3">
      <h2 className="text-[13px] font-semibold text-white/70">{children}</h2>
      <span className="h-px flex-1 bg-gradient-to-r from-white/20 via-white/5 to-transparent" />
    </div>
  );
}

function Big({ v, unit, color }: { v: string; unit?: string; color?: string }) {
  return (
    <p
      className="text-[28px] font-extrabold leading-none tracking-tight tabular-nums"
      style={color ? { color } : undefined}
    >
      {v}
      {unit ? <span className="ml-1 text-xs font-semibold text-white/50">{unit}</span> : null}
    </p>
  );
}

function Progress({
  value,
  unit,
  target,
  from,
  to,
}: {
  value: number;
  unit: string;
  target: number;
  from: string;
  to: string;
}) {
  const pct = target ? (value / target) * 100 : 0;
  const left = target ? target - value : 0;
  return (
    <>
      <div className="flex items-end justify-between gap-2">
        <Big v={nf(value)} unit={unit} />
        {target ? (
          <span
            className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold tabular-nums"
            style={{ color: to }}
          >
            {Math.round(pct)}%
          </span>
        ) : null}
      </div>
      <Bar2 pct={pct} from={from} to={to} />
      <p className="mt-1.5 text-[11px] text-white/55">
        {target
          ? left > 0
            ? `faltam ${nf(left)} ${unit} · meta ${nf(target)}`
            : `meta de ${nf(target)} ${unit} atingida (+${nf(-left)})`
          : "Meta não definida"}
      </p>
    </>
  );
}

function Tile({
  k,
  on,
  onPick,
  icon: Icon,
  tone,
  title,
  span = "",
  i = 0,
  badge,
  children,
}: {
  k: MetricKey;
  on: boolean;
  onPick: (k: MetricKey) => void;
  icon: LucideIcon;
  tone: string;
  title: string;
  span?: string;
  i?: number;
  badge?: string;
  children: ReactNode;
}) {
  // O cartão inteiro abre os detalhes; botões e campos dentro dele mantêm a própria ação.
  const go = (e: { target: EventTarget | null }) => {
    if (!openDetail) return;
    if (
      (e.target as HTMLElement | null)?.closest("button, input, select, textarea, a, [role=slider]")
    )
      return;
    openDetail(k);
  };
  const tint = `${tone.match(/#[0-9a-f]{6}/i)?.[0] ?? "#ffffff"}2e`;
  return (
    <section
      aria-label={title}
      onClick={go}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          go(e);
        }
      }}
      tabIndex={0}
      title={`Ver detalhes de ${title}`}
      className={`lv-in group relative isolate min-w-0 cursor-pointer overflow-hidden rounded-2xl p-3.5 ring-1 backdrop-blur-sm transition-[transform,box-shadow,background-color,--tw-ring-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 hover:-translate-y-0.5 ${span} ${on ? "bg-slate-900/80 ring-white/40 shadow-[0_0_36px_-12px_var(--tile)]" : "bg-slate-900/55 ring-white/10 hover:ring-white/25 hover:shadow-[0_18px_36px_-22px_rgba(0,0,0,.9)]"}`}
      style={{ ["--tile" as string]: tone, ["--i" as string]: i }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(260px circle at var(--mx,50%) var(--my,0%), ${tint}, transparent 70%)`,
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-3 left-0 w-[3px] rounded-r-full opacity-90"
        style={{ background: tone }}
      />
      <div className="flex w-full items-center gap-2">
        <span
          className="grid size-8 place-items-center rounded-xl text-white shadow-md ring-1 ring-white/25 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
          style={{ background: tone }}
        >
          <Icon size={16} />
        </span>
        <strong className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/90">
          {title}
        </strong>
        {badge ? (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white/80">
            {badge}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => {
            onPick(k);
            openDetail?.(k);
          }}
          aria-pressed={on}
          aria-label={`Ver detalhes e gráfico de ${title}`}
          className={`grid size-6 shrink-0 cursor-pointer place-items-center rounded-full transition duration-200 group-hover:translate-x-0.5 ${on ? "bg-white/25 text-white" : "bg-white/10 text-white/60 hover:bg-white/25 hover:text-white"}`}
        >
          <ChevronRight size={13} />
        </button>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function HeaderBtn({
  icon: Icon,
  label,
  onClick,
  tone = "glass",
  spin = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: "glass" | "danger";
  spin?: boolean;
}) {
  const cls =
    tone === "danger"
      ? "bg-gradient-to-br from-rose-500 to-pink-600 shadow-[0_10px_28px_-10px_rgba(244,63,94,.9)] ring-white/30"
      : "bg-white/10 ring-white/20 hover:bg-white/20";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ring-1 backdrop-blur transition hover:-translate-y-0.5 active:scale-95 sm:px-4 ${cls}`}
    >
      <Icon size={18} className={spin ? "animate-spin" : ""} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ConfirmSheet({
  title,
  lines,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  lines: string[];
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onCancel]);
  return (
    <div
      className="fixed inset-0 z-[520] grid place-items-center bg-slate-950/70 p-3 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      style={{ maxWidth: "100vw" }}
    >
      <ConfirmCard
        title={title}
        lines={lines}
        area={confirmArea(`${title} ${lines.join(" ")}`)}
        onClose={busy ? undefined : onCancel}
        footer={
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              style={{ cursor: "pointer" }}
              className="h-11 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold transition hover:bg-white/20 active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              style={{ cursor: "pointer" }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-sm font-extrabold text-slate-950 shadow-lg transition hover:bg-emerald-300 active:scale-95 disabled:opacity-60"
            >
              <Check size={17} /> {busy ? "Salvando…" : confirmLabel}
            </button>
          </div>
        }
      />
    </div>
  );
}

export function LiveModeButton({
  iconOnlyOnMobile = false,
  className = "",
  ...props
}: Props & { iconOnlyOnMobile?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void enterFullscreen();
          setOpen(true);
        }}
        title="Abrir o painel ao vivo em tela cheia"
        aria-label="Abrir painel ao vivo em tela cheia"
        className={`${liveButtonClass} ${className}`}
      >
        <Radio size={15} className="animate-pulse" />{" "}
        <span className={iconOnlyOnMobile ? "hidden sm:inline" : ""}>Ao vivo</span>{" "}
        <Maximize2 size={14} className={iconOnlyOnMobile ? "hidden sm:block" : ""} />
      </button>
      {open && <LiveDashboard {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function LiveDashboard({
  patientId,
  ownerId,
  heightCm,
  name,
  onClose,
}: Props & { onClose: () => void }) {
  const [clockKey] = useState(0);
  openArea = (area) => {
    onClose();
    window.location.hash = clientSectionHashes[area];
  };
  const root = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLElement>(null);
  const [data, setData] = useState<{
    days: DayMetrics[];
    weights: { day: string; kg: number }[];
    waterTarget: number | null;
    targets: Targets;
    at: number;
  } | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<MetricKey>("agua");
  const [detail, setDetail] = useState<MetricKey | null>(null);
  const detailRef = useRef<MetricKey | null>(null);
  detailRef.current = detail;
  openDetail = (k) => {
    setSelected(k);
    setDetail(k);
  };
  const [waterView, setWaterView] = useState<"dias" | "hoje">("dias");
  const [now, setNow] = useState(Date.now());
  const [full, setFull] = useState(isFullscreen());
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customMl, setCustomMl] = useState("");
  const [pending, setPending] = useState<
    { type: "water"; ml: number } | { type: "weight"; kg: number } | null
  >(null);
  const [hint, setHint] = useState(() => !fullscreenSupported() && !isStandaloneApp());

  const pick = useCallback((k: MetricKey) => {
    setSelected(k);
    window.setTimeout(
      () => chartRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" }),
      60,
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = acreDateKey();
      const from = acreAddDays(today, -59);
      const [period, profile]: [PeriodData, any] = await Promise.all([
        loadPeriodRaw(patientId, ownerId, from, today),
        (supabase as any)
          .from("care_hydration_profiles")
          .select("target_ml")
          .eq("patient_id", patientId)
          .maybeSingle()
          .then(
            (r: any) => r,
            () => null,
          ),
      ]);
      const waterTarget = Number(profile?.data?.target_ml) || null;
      const targets = resolveTargets(period.prefs, waterTarget);
      const days = buildDays(period.raw, acreAddDays(today, -13), today, {
        targets,
        nowMs: Date.now(),
      });
      const weights = [...period.raw.weights].sort((a, b) => a.day.localeCompare(b.day));
      setData({ days, weights, waterTarget, targets, at: Date.now() });
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [patientId, ownerId]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => {
      if (!document.hidden) void load();
    }, REFRESH_MS);
    return () => window.clearInterval(t);
  }, [load]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  // onClose e pending ficam em refs para a tela cheia não ser desfeita quando o pai ou o painel de confirmação re-renderiza.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => {
    const sync = () => setFull(isFullscreen());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && detailRef.current) {
        setDetail(null);
        return;
      }
      if (e.key === "Escape" && !isFullscreen() && !pendingRef.current) closeRef.current();
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      void exitFullscreen();
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const today = data?.days.at(-1) ?? null;
  const targets = data?.targets ?? null;
  const goalOf = (m: string) => today?.goals.find((g) => g.metric === m);
  const waterTarget = goalOf("hidratacao")?.target || data?.waterTarget || 0;
  const kcalTarget = goalOf("calorias")?.target || 0;
  const proteinTarget = goalOf("proteina")?.target || 0;
  const carbsTarget = targets?.carbs ?? 0;
  const fatTarget = targets?.fat ?? 0;
  const lastWeight = data?.weights.at(-1) ?? null;
  const prevWeight = data && data.weights.length > 1 ? data.weights[data.weights.length - 2] : null;
  const firstWeight = data?.weights[0] ?? null;
  const h = Number(heightCm) || 0;
  const bmi = lastWeight && h > 0 ? lastWeight.kg / Math.pow(h / 100, 2) : null;
  const cat = bmi ? bmiCategory(bmi) : null;
  const targetKg = targets?.targetWeightKg ?? null;
  const goalPct =
    lastWeight && firstWeight && targetKg && firstWeight.kg !== targetKg
      ? ((firstWeight.kg - lastWeight.kg) / (firstWeight.kg - targetKg)) * 100
      : lastWeight && targetKg && lastWeight.kg === targetKg
        ? 100
        : 0;
  const toGo = lastWeight && targetKg ? lastWeight.kg - targetKg : null;
  const sleep = [...(data?.days ?? [])].reverse().find((d) => d.sleep)?.sleep ?? null;
  const sleepNights = (data?.days ?? []).slice(-7).filter((d) => d.sleep);
  const sleepAvg = sleepNights.length
    ? sleepNights.reduce((s, d) => s + (d.sleep?.hours ?? 0), 0) / sleepNights.length
    : null;
  const week = (data?.days ?? []).slice(-7);
  const weekMin = week.reduce((s, d) => s + d.activityMinutes, 0);
  const weekKm = week.reduce((s, d) => s + d.activityKm, 0);
  const streak = useMemo(() => {
    const list = [...(data?.days ?? [])].reverse();
    let i = list[0]?.hasData ? 0 : 1;
    let n = 0;
    while (i < list.length && list[i].hasData) {
      n += 1;
      i += 1;
    }
    return n;
  }, [data]);
  const waterPct = waterTarget && today ? (today.waterMl / waterTarget) * 100 : 0;
  const waterShown = useCountUp(today?.waterMl ?? 0);
  const nextUps = useNextUps(patientId, ownerId, waterTarget, (data?.at ?? 0) + clockKey);
  const scoreShown = useCountUp(today?.score ?? 0);
  const goalCount = {
    met: today?.goals.filter((g) => g.status === "atingida").length ?? 0,
    missed: today?.goals.filter((g) => g.status === "nao_atingida").length ?? 0,
    pending: today?.goals.filter((g) => g.status === "em_andamento").length ?? 0,
  };

  // REGRA: toda gravação do modo ao vivo (inserir, alterar ou remover) só acontece aqui, depois de o usuário tocar em "Confirmar" na folha de confirmação.
  async function runPending() {
    if (!pending || busy) return;
    setBusy(true);
    if (pending.type === "water") {
      const { error: err } = await (supabase as any).rpc("care_log_unscheduled_intake", {
        p_patient_id: patientId,
        p_kind: "agua",
        p_description: "Água",
        p_amount_ml: pending.ml,
        p_request_id: crypto.randomUUID(),
      });
      setBusy(false);
      if (err) {
        setPending(null);
        setToast("Não foi possível registrar a água agora.");
        return;
      }
      setPending(null);
      setCustomOpen(false);
      setCustomMl("");
      setToast(`+${pending.ml} ml de água registrados`);
      void load();
    } else {
      const day = acreDateKey();
      const auth = await supabase.auth.getUser();
      const { error: err } = await (supabase as any).from("care_body_measurements").insert({
        patient_id: patientId,
        owner_id: ownerId,
        recorded_by: auth.data.user?.id,
        recorded_on: day,
        weight_kg: pending.kg,
        height_cm: h,
      });
      setBusy(false);
      if (err) {
        setPending(null);
        setToast("Não foi possível registrar o peso agora.");
        return;
      }
      setPending(null);
      setWeightInput("");
      setToast(`Peso de ${nf(pending.kg, 1)} kg registrado`);
      void load();
    }
  }
  function askWater(ml: number) {
    if (!Number.isInteger(ml) || ml < 10 || ml > 1500) {
      setToast("Informe um volume entre 10 e 1.500 ml.");
      return;
    }
    setPending({ type: "water", ml });
  }
  function askWeight() {
    const kg = Number(weightInput.replace(",", "."));
    if (!Number.isFinite(kg) || kg < 20 || kg > 350) {
      setToast("Informe um peso entre 20 e 350 kg.");
      return;
    }
    if (!h) {
      setToast("Informe sua altura na área Peso para registrar.");
      return;
    }
    if (data?.weights.some((w) => w.day === acreDateKey())) {
      setToast("Já existe peso hoje. Edite na área Peso.");
      return;
    }
    setPending({ type: "weight", kg });
  }
  const stepWeight = (d: number) => {
    const base = Number((weightInput || String(lastWeight?.kg ?? 70)).replace(",", "."));
    const next = Math.round((base + d) * 10) / 10;
    setWeightInput(String(next).replace(".", ","));
  };
  async function toggleFull() {
    if (isFullscreen()) await exitFullscreen();
    else {
      const ok = await enterFullscreen();
      if (!ok) setHint(true);
    }
  }

  const series = useMemo(() => {
    const days = data?.days ?? [];
    const label = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
    const w30 = (data?.weights ?? []).slice(-30);
    return {
      agua: days.map((d) => ({ label: label(d.day), v: d.waterMl })),
      aguaHoje: (days.at(-1)?.hours ?? []).map((x, i) => ({ label: `${i}h`, v: x.water })),
      sono: days.map((d) => ({
        label: label(d.day),
        v: d.sleep ? Math.round(d.sleep.hours * 10) / 10 : null,
      })),
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
      imc:
        h > 0
          ? w30.map((w) => ({
              label: label(w.day),
              v: Math.round((w.kg / Math.pow(h / 100, 2)) * 10) / 10,
            }))
          : [],
    };
  }, [data, h]);

  const CHART: Record<
    MetricKey,
    {
      title: string;
      unit: string;
      color: string;
      goal?: number;
      kind: "bar" | "area";
      src: keyof typeof series;
    }
  > = {
    score: {
      title: "Metas atingidas por dia",
      unit: "%",
      color: "#34d399",
      goal: 100,
      kind: "bar",
      src: "score",
    },
    agua:
      waterView === "hoje"
        ? {
            title: "Água de hoje, hora a hora",
            unit: "ml",
            color: "#38bdf8",
            kind: "bar",
            src: "aguaHoje",
          }
        : {
            title: "Água por dia",
            unit: "ml",
            color: "#38bdf8",
            goal: waterTarget || undefined,
            kind: "bar",
            src: "agua",
          },
    peso: {
      title: "Peso (últimas medidas)",
      unit: "kg",
      color: "#e879f9",
      goal: targetKg ?? undefined,
      kind: "area",
      src: "peso",
    },
    imc: { title: "IMC (últimas medidas)", unit: "", color: "#34d399", kind: "area", src: "imc" },
    metapeso: {
      title: "Caminho até a meta de peso",
      unit: "kg",
      color: "#f472b6",
      goal: targetKg ?? undefined,
      kind: "area",
      src: "peso",
    },
    sono: {
      title: "Horas de sono",
      unit: "h",
      color: "#818cf8",
      goal: SLEEP_GOAL,
      kind: "bar",
      src: "sono",
    },
    exercicio: {
      title: "Minutos de exercício",
      unit: "min",
      color: "#fb923c",
      goal: EXERCISE_GOAL,
      kind: "bar",
      src: "exercicio",
    },
    semana: {
      title: "Exercício por dia (meta semanal de 150 min)",
      unit: "min",
      color: "#f97316",
      goal: Math.round(WEEK_GOAL / 7),
      kind: "bar",
      src: "exercicio",
    },
    calorias: {
      title: "Calorias por dia",
      unit: "kcal",
      color: "#fbbf24",
      goal: kcalTarget || undefined,
      kind: "bar",
      src: "calorias",
    },
    proteina: {
      title: "Proteína por dia",
      unit: "g",
      color: "#4ade80",
      goal: proteinTarget || undefined,
      kind: "bar",
      src: "proteina",
    },
    carbs: {
      title: "Carboidratos por dia",
      unit: "g",
      color: "#fcd34d",
      goal: carbsTarget || undefined,
      kind: "bar",
      src: "carbs",
    },
    gordura: {
      title: "Gorduras por dia",
      unit: "g",
      color: "#fb923c",
      goal: fatTarget || undefined,
      kind: "bar",
      src: "gordura",
    },
    supl: {
      title: "Suplementos tomados por dia",
      unit: "",
      color: "#c084fc",
      kind: "bar",
      src: "supl",
    },
    med: {
      title: "Medicações tomadas por dia",
      unit: "",
      color: "#fb7185",
      kind: "bar",
      src: "med",
    },
    streak: {
      title: "Dias com registros (1 = teve registro)",
      unit: "",
      color: "#fbbf24",
      kind: "bar",
      src: "streak",
    },
  };
  const chart = CHART[selected];
  const chartData = series[chart.src] as { label: string; v: number | null }[];
  const tip = {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,.2)",
    borderRadius: 12,
    color: "#fff",
  } as const;
  const tipText = {
    itemStyle: { color: "#fff" },
    labelStyle: { color: "rgba(255,255,255,.75)" },
  } as const;

  const chartEl = (
                <ResponsiveContainer width="100%" height="100%">
                  {chart.kind === "bar" ? (
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="rgba(255,255,255,.1)"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "rgba(255,255,255,.6)" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,.6)" }} width={44} />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,.08)" }}
                        contentStyle={tip}
                        {...tipText}
                        formatter={(v: number) => [
                          `${nf(v, chart.unit === "h" ? 1 : 0)} ${chart.unit}`.trim(),
                          chart.title,
                        ]}
                      />
                      {chart.goal ? (
                        <ReferenceLine
                          y={chart.goal}
                          stroke="#34d399"
                          strokeDasharray="5 4"
                          label={{
                            value: "Meta",
                            fill: "#34d399",
                            fontSize: 11,
                            position: "insideTopRight",
                          }}
                        />
                      ) : null}
                      <Bar
                        dataKey="v"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={36}
                        animationDuration={800}
                      >
                        {chartData.map((d, i) => (
                          <Cell
                            key={i}
                            fill={
                              chart.goal && d.v != null && d.v >= chart.goal
                                ? "#34d399"
                                : chart.color
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="liveArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chart.color} stopOpacity={0.55} />
                          <stop offset="100%" stopColor={chart.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="rgba(255,255,255,.1)"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "rgba(255,255,255,.6)" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "rgba(255,255,255,.6)" }}
                        width={44}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        contentStyle={tip}
                        {...tipText}
                        formatter={(v: number) => [`${nf(v, 1)} ${chart.unit}`.trim(), chart.title]}
                      />
                      {chart.goal ? (
                        <ReferenceLine
                          y={chart.goal}
                          stroke="#34d399"
                          strokeDasharray="5 4"
                          label={{
                            value: "Meta",
                            fill: "#34d399",
                            fontSize: 11,
                            position: "insideTopRight",
                          }}
                        />
                      ) : null}
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke={chart.color}
                        strokeWidth={3}
                        fill="url(#liveArea)"
                        dot={{ r: 3, fill: chart.color }}
                        activeDot={{ r: 7 }}
                        animationDuration={900}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
  );

  type Fact = { label: string; value: string };
  const detailView = (() => {
    if (!detail || !data) return null;
    const meta = TILE_META[detail];
    const cfg = CHART[detail];
    const rows = (series[cfg.src] as { label: string; v: number | null }[]) ?? [];
    const vals = rows.map((r) => r.v).filter((v): v is number => v != null);
    const dec = cfg.unit === "h" || cfg.unit === "kg" || detail === "imc" ? 1 : 0;
    const fmt = (v: number | null | undefined) =>
      v == null ? "—" : `${nf(v, dec)}${cfg.unit ? ` ${cfg.unit}` : ""}`;
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const best = vals.length ? Math.max(...vals) : null;
    const low = vals.length ? Math.min(...vals) : null;
    const goal = cfg.goal ?? null;
    const hit = goal ? vals.filter((v) => v >= goal).length : null;
    let value = "—";
    let sub = "";
    let accent: string | undefined;
    const facts: Fact[] = [];
    const t = today;
    switch (detail) {
      case "score":
        value = `${t?.score ?? 0}%`;
        sub = "das metas já encerradas hoje foram atingidas";
        break;
      case "agua":
        value = `${nf(t?.waterMl ?? 0)} ml`;
        sub = waterTarget
          ? `${Math.round(waterPct)}% de ${nf(waterTarget)} ml`
          : "Defina a meta de hidratação na área de água";
        if (waterTarget) facts.push({ label: "Falta para a meta", value: `${nf(Math.max(0, waterTarget - (t?.waterMl ?? 0)))} ml` });
        break;
      case "peso":
        value = lastWeight ? `${nf(lastWeight.kg, 1)} kg` : "—";
        sub = lastWeight
          ? prevWeight
            ? `${nf(lastWeight.kg - prevWeight.kg, 1)} kg desde a medida anterior`
            : "Primeira medida registrada"
          : "Nenhum peso registrado";
        if (firstWeight && lastWeight)
          facts.push({ label: "Desde a primeira medida", value: `${nf(lastWeight.kg - firstWeight.kg, 1)} kg` });
        break;
      case "imc":
        value = bmi ? nf(bmi, 1) : "—";
        sub = cat?.label ?? (h ? "Sem peso registrado" : "Informe sua altura");
        accent = cat?.color;
        if (h) facts.push({ label: "Altura", value: `${nf(h)} cm` });
        break;
      case "metapeso":
        value = toGo != null ? `${nf(Math.abs(toGo), 1)} kg` : "—";
        sub = targetKg ? (toGo != null && toGo <= 0 ? `Meta de ${nf(targetKg, 1)} kg alcançada` : `para chegar a ${nf(targetKg, 1)} kg`) : "Defina a meta de peso";
        facts.push({ label: "Progresso", value: `${Math.round(Math.max(0, Math.min(100, goalPct)))}%` });
        if (firstWeight) facts.push({ label: "Peso inicial", value: `${nf(firstWeight.kg, 1)} kg` });
        break;
      case "sono":
        value = sleep ? `${nf(sleep.hours, 1)} h` : "—";
        sub = sleep ? "na última noite registrada" : "Sem noite registrada";
        if (sleepAvg != null) facts.push({ label: "Média de 7 noites", value: `${nf(sleepAvg, 1)} h` });
        break;
      case "exercicio":
        value = `${nf(t?.activityMinutes ?? 0)} min`;
        sub = `meta diária de ${EXERCISE_GOAL} min`;
        if (t && t.activityKm > 0) facts.push({ label: "Distância hoje", value: `${nf(t.activityKm, 1)} km` });
        break;
      case "semana":
        value = `${nf(weekMin)} min`;
        sub = `de ${WEEK_GOAL} min na semana`;
        facts.push({ label: "Falta para a meta", value: `${nf(Math.max(0, WEEK_GOAL - weekMin))} min` });
        if (weekKm > 0) facts.push({ label: "Distância na semana", value: `${nf(weekKm, 1)} km` });
        break;
      case "calorias":
        value = `${nf(t?.kcal ?? 0)} kcal`;
        sub = kcalTarget ? `meta de ${nf(kcalTarget)} kcal` : "Sem meta definida";
        break;
      case "proteina":
        value = `${nf(t?.protein ?? 0)} g`;
        sub = proteinTarget ? `meta de ${nf(proteinTarget)} g` : "Sem meta definida";
        break;
      case "carbs":
        value = `${nf(t?.carbs ?? 0)} g`;
        sub = carbsTarget ? `meta de ${nf(carbsTarget)} g` : "Sem meta definida";
        break;
      case "gordura":
        value = `${nf(t?.fat ?? 0)} g`;
        sub = fatTarget ? `meta de ${nf(fatTarget)} g` : "Sem meta definida";
        break;
      case "supl":
        value = `${t?.supplements.taken ?? 0}/${t?.supplements.planned ?? 0}`;
        sub = "doses de suplementos tomadas hoje";
        break;
      case "med":
        value = `${t?.medication.taken ?? 0}/${t?.medication.planned ?? 0}`;
        sub = "doses de medicação tomadas hoje";
        break;
      case "streak":
        value = `${streak}`;
        sub = streak === 1 ? "dia seguido com registros" : "dias seguidos com registros";
        break;
    }
    const stats: Fact[] = [
      ...facts,
      ...(detail === "streak" ? [] : [{ label: "Média no período", value: fmt(avg) }]),
      ...(detail === "streak" ? [] : [{ label: "Melhor valor", value: fmt(best) }]),
      ...(detail === "streak" || detail === "imc" ? [] : [{ label: "Menor valor", value: fmt(low) }]),
      ...(hit != null && detail !== "streak"
        ? [{ label: "Dias na meta", value: `${hit} de ${vals.length}` }]
        : []),
    ];
    const recent = rows.slice(-7).reverse();
    return { meta, cfg, value, sub, accent, stats, recent, fmt, goal };
  })();

  const ui = (
    <div
      ref={root}
      className="fixed inset-0 z-[500] overflow-y-auto overscroll-contain bg-[radial-gradient(ellipse_at_top,#0b3b3a_0%,#020617_62%)] text-white [scrollbar-width:thin]"
      role="dialog"
      aria-modal="true"
      aria-label="Painel ao vivo"
    >
      <style>{LIVE_CSS}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_top,#000,transparent_75%)]"
      />
      <div className="relative mx-auto flex min-h-full max-w-[1500px] flex-col gap-3 p-3 pb-24 sm:p-6">
        <header className="sticky top-0 z-20 -mx-3 flex flex-wrap items-center gap-2.5 border-b border-white/10 bg-slate-950/55 px-3 py-2.5 backdrop-blur-xl sm:-mx-6 sm:gap-3 sm:px-6">
          {data && (
            <span
              key={data.at}
              aria-hidden="true"
              className="lv-tick absolute inset-x-0 bottom-[-1px] h-px bg-gradient-to-r from-emerald-400 via-cyan-300 to-transparent"
            />
          )}
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-extrabold text-emerald-300 ring-1 ring-emerald-400/40">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
            </span>{" "}
            Ao vivo
          </span>
          <span className="flex-1 sm:hidden" />
          <div className="order-last min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-auto">
            <p className="truncate text-xs text-white/60 first-letter:uppercase">
              {dateFmt.format(now)}
              {name ? ` · ${name.split(" ")[0]}` : ""}
            </p>
            <p className="font-mono text-2xl font-extrabold tabular-nums leading-none sm:text-3xl">
              {clockFmt.format(now)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HeaderBtn
              icon={RefreshCw}
              label="Atualizar"
              onClick={() => void load()}
              spin={loading}
            />
            <HeaderBtn
              icon={full ? Minimize2 : Maximize2}
              label={full ? "Sair da tela cheia" : "Tela cheia"}
              onClick={() => void toggleFull()}
            />
            <HeaderBtn icon={X} label="Fechar" onClick={onClose} tone="danger" />
          </div>
        </header>
        {hint && (
          <p className="flex items-start gap-2 rounded-2xl bg-white/10 p-3 text-xs text-white/80 ring-1 ring-white/15">
            <Info size={16} className="mt-0.5 shrink-0 text-cyan-300" />
            <span className="flex-1">
              Este navegador não libera a tela cheia. No iPhone, toque em Compartilhar e em{" "}
              <strong>Adicionar à Tela de Início</strong>; abrindo pelo ícone, o NextVita ocupa a
              tela toda, sem barra do navegador.
            </span>
            <button
              type="button"
              onClick={() => setHint(false)}
              className="rounded-lg bg-white/15 px-2.5 py-1 font-bold"
            >
              Entendi
            </button>
          </p>
        )}

        {!data ? (
          <p role="status" className="grid flex-1 place-items-center text-sm text-white/70">
            {error
              ? "Não foi possível carregar os dados agora. Toque em atualizar."
              : "Carregando seus dados…"}
          </p>
        ) : (
          <>
            {/* Agora: o que vem a seguir, com contagem regressiva e alerta */}
            {(() => {
              const ups = [
                nextUps?.agua && {
                  key: "agua",
                  alertKey: "ao-vivo-agua",
                  title: "Próximo copo",
                  color: "#38bdf8",
                  up: nextUps.agua,
                  actionLabel: "Bebi 250 ml",
                  onAction: () => askWater(250),
                },
                nextUps?.refeicao && {
                  key: "refeicao",
                  alertKey: "ao-vivo-refeicao",
                  title: "Próxima refeição",
                  color: "#fdba74",
                  up: nextUps.refeicao,
                },
                nextUps?.med && {
                  key: "med",
                  alertKey: "ao-vivo-medicacao",
                  title: "Próxima dose",
                  color: "#fb7185",
                  up: nextUps.med,
                },
                nextUps?.supl && {
                  key: "supl",
                  alertKey: "ao-vivo-suplemento",
                  title: "Próximo suplemento",
                  color: "#c084fc",
                  up: nextUps.supl,
                },
                nextUps?.exercicio && {
                  key: "exercicio",
                  alertKey: "ao-vivo-atividade",
                  title: "Hora de se mexer",
                  color: "#fdba74",
                  up: nextUps.exercicio,
                },
                nextUps?.sono && {
                  key: "sono",
                  alertKey: "ao-vivo-sono",
                  title: "Hora de desacelerar",
                  color: "#a5b4fc",
                  up: nextUps.sono,
                },
              ].filter(Boolean) as {
                key: string;
                alertKey: string;
                title: string;
                color: string;
                up: { at: number; from: number | null; detail: string };
                actionLabel?: string;
                onAction?: () => void;
              }[];
              if (!ups.length) return null;
              return (
                <>
                  <SectionTitle>Agora e a seguir</SectionTitle>
                  <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3 xl:grid-cols-6">
                    {ups.map((u, i) => (
                      <div key={u.key} className="lv-in" style={{ ["--i" as string]: i }}>
                        <NextUpClock
                          compact
                          alertKey={u.alertKey}
                          title={u.title}
                          color={u.color}
                          target={u.up.at}
                          from={u.up.from}
                          detail={u.up.detail}
                          actionLabel={u.actionLabel}
                          onAction={u.onAction}
                        />
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            <SectionTitle>Hoje</SectionTitle>
            <div className={GRID}>
              <Tile
                k="score"
                i={0}
                span="col-span-2 sm:col-span-3 lg:col-span-4"
                on={selected === "score"}
                onPick={pick}
                icon={Target}
                tone="linear-gradient(135deg,#10b981,#06b6d4)"
                title="Metas de hoje"
              >
                <div className="flex items-center gap-3">
                  <Ring pct={today?.score ?? 0} color="#34d399" size={84} stroke={8}>
                    <p className="text-xl font-extrabold tabular-nums">
                      {today?.score == null ? "—" : `${Math.round(scoreShown)}%`}
                    </p>
                  </Ring>
                  <p className="text-xs leading-relaxed text-white/65">
                    {today?.score == null
                      ? goalCount.pending > 0
                        ? `${goalCount.pending} em andamento. A porcentagem aparece quando a primeira meta for encerrada.`
                        : "As metas aparecem conforme o dia avança."
                      : [
                          `${goalCount.met} atingida${goalCount.met === 1 ? "" : "s"}`,
                          goalCount.missed > 0 ? `${goalCount.missed} não atingida${goalCount.missed === 1 ? "" : "s"}` : null,
                          goalCount.pending > 0 ? `${goalCount.pending} em andamento` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                  </p>
                </div>
                {today && today.goals.length > 0 && (
                  <ul className="mt-2.5 grid grid-cols-2 gap-1.5">
                    {today.goals
                      .filter((g) => g.status !== "sem_meta")
                      .map((g) => (
                        <li
                          key={g.metric}
                          className="flex items-center gap-1.5 rounded-lg bg-white/[.05] px-2 py-1.5 text-[11px] ring-1 ring-white/10"
                          title={g.rule}
                        >
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{
                              background: GOAL_COLOR[g.status],
                              boxShadow: `0 0 8px ${GOAL_COLOR[g.status]}`,
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate text-white/75">{g.label}</span>
                          <span className="font-bold tabular-nums text-white/90">
                            {Math.round(g.pct)}%
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </Tile>

              <Tile
                k="agua"
                i={1}
                span="col-span-2 sm:col-span-3 lg:col-span-5"
                on={selected === "agua"}
                onPick={pick}
                icon={Droplets}
                tone="linear-gradient(135deg,#0ea5e9,#22d3ee)"
                title="Hidratação"
              >
                <div className="flex items-center gap-3">
                  <Ring pct={waterPct} color="#38bdf8" size={92} stroke={8}>
                    <div>
                      <p className="text-lg font-extrabold leading-none tabular-nums">{nf(waterShown)}</p>
                      <p className="mt-0.5 text-[10px] text-white/55">
                        {waterTarget ? `de ${nf(waterTarget)} ml` : "ml hoje"}
                      </p>
                    </div>
                  </Ring>
                  <dl className="grid flex-1 grid-cols-2 gap-1.5 text-[11px]">
                    <div className="rounded-lg bg-white/[.05] px-2 py-1.5 ring-1 ring-white/10">
                      <dt className="text-white/50">{waterTarget && waterPct >= 100 ? "Meta" : "Faltam"}</dt>
                      <dd
                        className={`text-sm font-extrabold tabular-nums ${waterTarget && waterPct >= 100 ? "text-emerald-300" : ""}`}
                      >
                        {!waterTarget
                          ? "—"
                          : waterPct >= 100
                            ? "Batida"
                            : `${nf(Math.max(0, waterTarget - Math.round(waterShown)))} ml`}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-white/[.05] px-2 py-1.5 ring-1 ring-white/10">
                      <dt className="text-white/50">Concluído</dt>
                      <dd className="text-sm font-extrabold tabular-nums">
                        {waterTarget ? `${Math.round(waterPct)}%` : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                  {[
                    { ml: 150, label: "Gole" },
                    { ml: 250, label: "Copo" },
                    { ml: 500, label: "Garrafa" },
                  ].map((c) => (
                    <button
                      key={c.ml}
                      type="button"
                      disabled={busy}
                      onClick={() => askWater(c.ml)}
                      className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-gradient-to-b from-sky-300/25 to-sky-500/10 py-2 ring-1 ring-sky-300/35 transition hover:-translate-y-0.5 hover:from-sky-300/40 active:scale-95 disabled:opacity-50"
                      aria-label={`Registrar ${c.ml} ml de água`}
                    >
                      <span className="text-sm font-extrabold leading-none">+{c.ml}</span>
                      <span className="text-[10px] font-semibold text-sky-100/70">{c.label}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomOpen((v) => !v)}
                    aria-expanded={customOpen}
                    aria-label="Outro valor"
                    className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-white/[.07] py-2 ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:bg-white/15 active:scale-95"
                  >
                    <Plus size={14} />
                    <span className="text-[10px] font-semibold text-white/70">Outro</span>
                  </button>
                </div>
                {customOpen && (
                  <div className="mt-2 flex gap-1.5">
                    <input
                      value={customMl}
                      onChange={(e) => setCustomMl(e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric"
                      placeholder="ml"
                      aria-label="Quantidade de água em ml"
                      className="h-10 min-w-0 flex-1 rounded-xl bg-white/10 px-3 text-sm text-white outline-none ring-1 ring-white/15 placeholder:text-white/40 focus:ring-sky-300/60"
                    />
                    <button
                      type="button"
                      disabled={!customMl}
                      onClick={() => askWater(Number(customMl))}
                      className="h-10 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 px-4 text-xs font-extrabold text-slate-950 disabled:opacity-40"
                    >
                      Registrar
                    </button>
                  </div>
                )}
              </Tile>

              <Tile
                k="streak"
                i={2}
                span="col-span-2 sm:col-span-6 lg:col-span-3"
                on={selected === "streak"}
                onPick={pick}
                icon={Flame}
                tone="linear-gradient(135deg,#fbbf24,#f97316)"
                title="Sequência"
              >
                <Big v={`${streak}${streak >= 14 ? "+" : ""}`} unit={streak === 1 ? "dia" : "dias"} />
                <p className="mt-1 text-xs text-white/60">
                  {streak > 0
                    ? "seguidos registrando o seu cuidado."
                    : "Registre algo hoje para começar uma sequência."}
                </p>
                <div className="mt-3 flex gap-1" aria-hidden="true">
                  {(data.days ?? []).map((d) => (
                    <span key={d.day} className="flex flex-1 flex-col items-center gap-1">
                      <span
                        className={`h-6 w-full rounded-md transition-colors ${d.hasData ? "bg-gradient-to-t from-amber-500 to-amber-300 shadow-[0_0_10px_-2px_#fbbf24]" : "bg-white/10"}`}
                      />
                      <span className="text-[9px] font-semibold text-white/40">
                        {WEEKDAY_INITIAL[new Date(`${d.day}T12:00:00`).getDay()]}
                      </span>
                    </span>
                  ))}
                </div>
              </Tile>
            </div>

            <SectionTitle>Corpo e descanso</SectionTitle>
            <div className={GRID}>
              <Tile
                k="peso"
                i={3}
                span="col-span-2 sm:col-span-3 lg:col-span-5"
                on={selected === "peso"}
                onPick={pick}
                icon={Scale}
                tone="linear-gradient(135deg,#d946ef,#ec4899)"
                title="Peso"
              >
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <Big v={lastWeight ? nf(lastWeight.kg, 1) : "—"} unit="kg" />
                    <p className="mt-1 text-[11px] text-white/60">
                      {lastWeight && prevWeight
                        ? `${lastWeight.kg - prevWeight.kg > 0 ? "▲ +" : lastWeight.kg - prevWeight.kg < 0 ? "▼ " : ""}${nf(lastWeight.kg - prevWeight.kg, 1)} kg desde a medida anterior`
                        : "Registre seu peso para acompanhar a evolução."}
                    </p>
                  </div>
                  <div className="w-28 shrink-0 sm:w-36">
                    <Spark data={series.peso} color="#e879f9" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => stepWeight(-0.1)}
                    aria-label="Diminuir 0,1 kg"
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20 active:scale-90"
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    inputMode="decimal"
                    placeholder="kg hoje"
                    aria-label="Peso de hoje em kg"
                    className="h-10 min-w-0 flex-1 rounded-xl bg-white/10 px-3 text-center text-base font-bold text-white outline-none ring-1 ring-white/15 placeholder:text-sm placeholder:font-normal placeholder:text-white/40 focus:ring-fuchsia-300/60"
                  />
                  <button
                    type="button"
                    onClick={() => stepWeight(0.1)}
                    aria-label="Aumentar 0,1 kg"
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20 active:scale-90"
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <button
                  type="button"
                  disabled={busy || !weightInput}
                  onClick={askWeight}
                  className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-sm font-extrabold shadow-[0_10px_28px_-12px_rgba(236,72,153,.9)] transition active:scale-[.98] disabled:opacity-40"
                >
                  <Check size={15} /> Registrar peso de hoje
                </button>
              </Tile>

              <Tile
                k="imc"
                i={4}
                span="col-span-2 sm:col-span-3 lg:col-span-3"
                on={selected === "imc"}
                onPick={pick}
                icon={Zap}
                tone="linear-gradient(135deg,#10b981,#84cc16)"
                title="IMC"
              >
                <Big v={bmi ? nf(bmi, 1) : "—"} unit="kg/m²" color={cat?.color} />
                <p className="mt-1 text-xs font-semibold" style={{ color: cat?.color }}>
                  {cat?.label ?? (h ? "Sem peso registrado" : "Informe sua altura")}
                </p>
                <div
                  className="relative mt-3 h-2 overflow-hidden rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg,#38bdf8 0 14%,#10b981 14% 40%,#f59e0b 40% 60%,#f97316 60% 80%,#ef4444 80%)",
                  }}
                  aria-hidden="true"
                >
                  {bmi && (
                    <span
                      className="absolute top-0 h-2 w-1 -translate-x-1/2 rounded bg-white shadow-[0_0_8px_#fff]"
                      style={{
                        left: `${Math.max(0, Math.min(100, ((bmi - 15) / 25) * 100))}%`,
                        transition: "left 1s",
                      }}
                    />
                  )}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-white/45">
                  <span>15</span>
                  <span>25</span>
                  <span>40</span>
                </div>
              </Tile>

              <Tile
                k="metapeso"
                i={5}
                span="col-span-2 sm:col-span-6 lg:col-span-4"
                on={selected === "metapeso"}
                onPick={pick}
                icon={Trophy}
                tone="linear-gradient(135deg,#ec4899,#f59e0b)"
                title="Meta de peso"
                badge={targetKg && lastWeight ? `${Math.round(Math.max(0, Math.min(100, goalPct)))}%` : undefined}
              >
                {targetKg && lastWeight ? (
                  <>
                    <Big
                      v={
                        toGo !== null && Math.abs(toGo) < 0.05
                          ? "Meta atingida"
                          : nf(Math.abs(toGo ?? 0), 1)
                      }
                      unit={toGo !== null && Math.abs(toGo) < 0.05 ? "" : "kg"}
                    />
                    <p className="mt-1 text-[11px] text-white/60">
                      {toGo !== null && Math.abs(toGo) >= 0.05
                        ? `para chegar a ${nf(targetKg, 1)} kg`
                        : `Você chegou a ${nf(targetKg, 1)} kg`}
                    </p>
                    <Bar2 pct={goalPct} from="#ec4899" to="#f59e0b" />
                    <p className="mt-1.5 text-[11px] text-white/50">
                      início {firstWeight ? nf(firstWeight.kg, 1) : "—"} kg · meta {nf(targetKg, 1)} kg
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-white/70">
                    {targetKg
                      ? "Registre seu peso para ver o progresso."
                      : "Defina a meta de peso no seu perfil para acompanhar o caminho até ela."}
                  </p>
                )}
              </Tile>

              <Tile
                k="sono"
                i={6}
                span="col-span-2 sm:col-span-3 lg:col-span-5"
                on={selected === "sono"}
                onPick={pick}
                icon={BedDouble}
                tone="linear-gradient(135deg,#6366f1,#8b5cf6)"
                title="Sono"
              >
                <div className="flex items-center gap-3">
                  <Ring pct={sleep ? (sleep.hours / SLEEP_GOAL) * 100 : 0} color="#818cf8" size={84} stroke={8}>
                    <div>
                      <p className="text-lg font-extrabold leading-none tabular-nums">
                        {sleep ? nf(sleep.hours, 1) : "—"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/55">horas</p>
                    </div>
                  </Ring>
                  <div className="min-w-0 flex-1 text-xs text-white/70">
                    {sleep ? (
                      <>
                        <p className="text-sm tracking-widest text-indigo-200">
                          {"★".repeat(Math.max(0, Math.min(5, sleep.quality)))}
                          <span className="text-white/25">{"★".repeat(5 - Math.max(0, Math.min(5, sleep.quality)))}</span>
                        </p>
                        <p>Meta de {SLEEP_GOAL} h por noite</p>
                        {sleepAvg !== null && (
                          <p className="mt-0.5 text-indigo-200">Média de 7 noites: {nf(sleepAvg, 1)} h</p>
                        )}
                      </>
                    ) : (
                      "Sem noite registrada."
                    )}
                  </div>
                </div>
                <div className="mt-1.5">
                  <Spark data={series.sono} color="#818cf8" goal={SLEEP_GOAL} />
                </div>
              </Tile>

              <Tile
                k="exercicio"
                i={7}
                span="col-span-2 sm:col-span-3 lg:col-span-4"
                on={selected === "exercicio"}
                onPick={pick}
                icon={Activity}
                tone="linear-gradient(135deg,#f97316,#f59e0b)"
                title="Exercício hoje"
              >
                <div className="flex items-center gap-3">
                  <Ring pct={((today?.activityMinutes ?? 0) / EXERCISE_GOAL) * 100} color="#fb923c" size={84} stroke={8}>
                    <div>
                      <p className="text-lg font-extrabold leading-none tabular-nums">{today?.activityMinutes ?? 0}</p>
                      <p className="mt-0.5 text-[10px] text-white/55">min hoje</p>
                    </div>
                  </Ring>
                  <p className="text-xs leading-relaxed text-white/65">
                    {today && today.activityKm > 0 ? `${nf(today.activityKm, 1)} km percorridos. ` : ""}
                    Referência: {EXERCISE_GOAL} min por dia.
                  </p>
                </div>
                <div className="mt-1.5">
                  <Spark data={series.exercicio} color="#fb923c" goal={EXERCISE_GOAL} />
                </div>
              </Tile>

              <Tile
                k="semana"
                i={8}
                span="col-span-2 sm:col-span-6 lg:col-span-3"
                on={selected === "semana"}
                onPick={pick}
                icon={Dumbbell}
                tone="linear-gradient(135deg,#ef4444,#f97316)"
                title="Exercício na semana"
                badge={`${Math.round((weekMin / WEEK_GOAL) * 100)}%`}
              >
                <Big v={nf(weekMin)} unit="min" />
                <Bar2 pct={(weekMin / WEEK_GOAL) * 100} from="#ef4444" to="#f97316" />
                <p className="mt-1.5 text-[11px] text-white/55">
                  Meta da OMS: {WEEK_GOAL} min por semana
                  {weekKm > 0 ? ` · ${nf(weekKm, 1)} km` : ""}
                  {weekMin >= WEEK_GOAL ? " · meta batida!" : ` · faltam ${nf(WEEK_GOAL - weekMin)} min`}
                </p>
              </Tile>
            </div>

            <SectionTitle>Alimentação</SectionTitle>
            <div className={GRID}>
              <Tile
                k="calorias"
                i={9}
                span="col-span-2 sm:col-span-3 lg:col-span-3"
                on={selected === "calorias"}
                onPick={pick}
                icon={Flame}
                tone="linear-gradient(135deg,#f59e0b,#ef4444)"
                title="Calorias"
              >
                <Progress value={today?.kcal ?? 0} unit="kcal" target={kcalTarget} from="#fbbf24" to="#f97316" />
              </Tile>
              <Tile
                k="proteina"
                i={10}
                span="col-span-1 sm:col-span-3 lg:col-span-3"
                on={selected === "proteina"}
                onPick={pick}
                icon={Egg}
                tone="linear-gradient(135deg,#22c55e,#14b8a6)"
                title="Proteína"
              >
                <Progress value={today?.protein ?? 0} unit="g" target={proteinTarget} from="#4ade80" to="#2dd4bf" />
              </Tile>
              <Tile
                k="carbs"
                i={11}
                span="col-span-1 sm:col-span-3 lg:col-span-3"
                on={selected === "carbs"}
                onPick={pick}
                icon={Wheat}
                tone="linear-gradient(135deg,#eab308,#f59e0b)"
                title="Carboidratos"
              >
                <Progress value={today?.carbs ?? 0} unit="g" target={carbsTarget} from="#fde047" to="#f59e0b" />
              </Tile>
              <Tile
                k="gordura"
                i={12}
                span="col-span-2 sm:col-span-3 lg:col-span-3"
                on={selected === "gordura"}
                onPick={pick}
                icon={Sparkles}
                tone="linear-gradient(135deg,#fb923c,#e11d48)"
                title="Gorduras"
              >
                <Progress value={today?.fat ?? 0} unit="g" target={fatTarget} from="#fb923c" to="#e11d48" />
              </Tile>
            </div>

            <SectionTitle>Rotina de cuidado</SectionTitle>
            <div className={GRID}>
              <Tile
                k="med"
                i={13}
                span="col-span-2 sm:col-span-3 lg:col-span-6"
                on={selected === "med"}
                onPick={pick}
                icon={Pill}
                tone="linear-gradient(135deg,#f43f5e,#fb7185)"
                title="Medicação"
              >
                <div className="flex items-center gap-3">
                  <Ring
                    pct={today?.medication.planned ? (today.medication.taken / today.medication.planned) * 100 : 0}
                    color="#fb7185"
                    size={76}
                    stroke={8}
                  >
                    <div>
                      <p className="text-base font-extrabold leading-none tabular-nums">
                        {today?.medication.taken ?? 0}/{today?.medication.planned ?? 0}
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/55">doses</p>
                    </div>
                  </Ring>
                  <p className="text-xs leading-relaxed text-white/65">
                    {today?.medication.planned
                      ? today.medication.taken >= today.medication.planned
                        ? "Todas as doses de hoje registradas."
                        : `${today.medication.planned - today.medication.taken} dose(s) para registrar hoje.`
                      : "Sem medicação programada hoje."}
                  </p>
                </div>
              </Tile>

              <Tile
                k="supl"
                i={14}
                span="col-span-2 sm:col-span-3 lg:col-span-6"
                on={selected === "supl"}
                onPick={pick}
                icon={Sparkles}
                tone="linear-gradient(135deg,#a855f7,#6366f1)"
                title="Suplementos"
              >
                <div className="flex items-center gap-3">
                  <Ring
                    pct={today?.supplements.planned ? (today.supplements.taken / today.supplements.planned) * 100 : 0}
                    color="#c084fc"
                    size={76}
                    stroke={8}
                  >
                    <div>
                      <p className="text-base font-extrabold leading-none tabular-nums">
                        {today?.supplements.taken ?? 0}/{today?.supplements.planned ?? 0}
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/55">doses</p>
                    </div>
                  </Ring>
                  <p className="text-xs leading-relaxed text-white/65">
                    {today?.supplements.planned
                      ? today.supplements.taken >= today.supplements.planned
                        ? "Suplementação de hoje completa."
                        : `${today.supplements.planned - today.supplements.taken} dose(s) a tomar hoje.`
                      : "Nenhum suplemento programado hoje."}
                  </p>
                </div>
              </Tile>
            </div>

            <section
              ref={chartRef}
              aria-label="Gráfico detalhado"
              className="rounded-3xl bg-white/[.06] p-4 ring-1 ring-white/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-extrabold">{chart.title}</h2>
                {selected === "agua" ? (
                  <div
                    role="group"
                    aria-label="Período do gráfico de água"
                    className="inline-flex rounded-xl bg-white/10 p-1 text-xs font-bold"
                  >
                    {(["dias", "hoje"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setWaterView(v)}
                        aria-pressed={waterView === v}
                        className={`h-8 rounded-lg px-3 transition ${waterView === v ? "bg-white text-slate-900" : "text-white/70"}`}
                      >
                        {v === "dias" ? "14 dias" : "Hoje por hora"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-white/50">
                    Toque numa barra ou ponto para ver o valor
                  </span>
                )}
              </div>
              <div className="mt-3 h-64 sm:h-72">
                {chartEl}
              </div>
            </section>
            <QrShareCard variant="live" dark className="mx-auto w-full max-w-3xl" />
            <p className="text-center text-[11px] text-white/40">
              Atualiza sozinho a cada {REFRESH_MS / 1000} segundos · última leitura{" "}
              {clockFmt.format(data.at)}
            </p>
          </>
        )}
      </div>
      {detailView && detail && (
        <div
          className="fixed inset-0 z-[505] grid place-items-end bg-slate-950/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"
          onClick={() => setDetail(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Detalhes de ${detailView.meta.title}`}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-slate-900 text-white shadow-2xl ring-1 ring-white/15 sm:rounded-3xl"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: detailView.meta.tone }}
            />
            <header className="flex items-center gap-3 px-5 pb-3 pt-5">
              <span
                className="grid size-11 place-items-center rounded-2xl text-white shadow-lg ring-1 ring-white/25"
                style={{ background: detailView.meta.tone }}
              >
                <detailView.meta.icon size={21} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-extrabold">{detailView.meta.title}</h2>
                <p className="text-xs text-white/55">Detalhes e histórico recente</p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                aria-label="Fechar detalhes"
                className="grid size-10 place-items-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
              >
                <X size={18} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                <p
                  className="text-5xl font-extrabold tabular-nums"
                  style={{ color: detailView.accent }}
                >
                  {detailView.value}
                </p>
                <p className="pb-1.5 text-sm font-semibold text-white/70">{detailView.sub}</p>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {detailView.stats.map((f) => (
                  <div key={f.label} className="rounded-2xl bg-white/[.06] px-3 py-2.5 ring-1 ring-white/10">
                    <dt className="text-[11px] font-semibold text-white/55">{f.label}</dt>
                    <dd className="mt-0.5 text-base font-extrabold tabular-nums">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 rounded-2xl bg-white/[.04] p-3 ring-1 ring-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">{detailView.cfg.title}</h3>
                  {detail === "agua" && (
                    <div
                      role="group"
                      aria-label="Período do gráfico de água"
                      className="inline-flex rounded-xl bg-white/10 p-1 text-xs font-bold"
                    >
                      {(["dias", "hoje"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setWaterView(v)}
                          aria-pressed={waterView === v}
                          className={`h-7 rounded-lg px-3 transition ${waterView === v ? "bg-white text-slate-900" : "text-white/70"}`}
                        >
                          {v === "dias" ? "14 dias" : "Hoje por hora"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-2 h-56">{chartEl}</div>
              </div>
              {detailView.recent.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-white/10">
                  <table className="w-full text-sm">
                    <caption className="bg-white/[.06] px-3 py-2 text-left text-xs font-bold text-white/70">
                      Últimos registros
                    </caption>
                    <tbody>
                      {detailView.recent.map((r) => {
                        const ok = detailView.goal != null && r.v != null && r.v >= detailView.goal;
                        return (
                          <tr key={r.label} className="border-t border-white/10">
                            <td className="px-3 py-2 text-white/70">{r.label}</td>
                            <td className="px-3 py-2 text-right font-bold tabular-nums">
                              {detailView.fmt(r.v)}
                            </td>
                            <td className="w-24 px-3 py-2 text-right text-xs font-bold">
                              {detailView.goal != null && r.v != null ? (
                                <span className={ok ? "text-emerald-300" : "text-white/40"}>
                                  {ok ? "Meta atingida" : "Abaixo da meta"}
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-slate-950/40 px-5 py-3">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="h-10 rounded-xl bg-white/10 px-4 text-sm font-bold text-white/85 transition hover:bg-white/20"
              >
                Voltar ao painel
              </button>
              {tileArea[detail] && (
                <button
                  type="button"
                  onClick={() => openArea?.(tileArea[detail] as ClientSection)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-extrabold text-white shadow-lg transition hover:brightness-110"
                  style={{ background: detailView.meta.tone }}
                >
                  Abrir área completa <ChevronRight size={15} />
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
      {toast && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-[510] mx-auto w-fit max-w-[90vw] rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-2xl"
        >
          {toast}
        </div>
      )}
      {pending && (
        <ConfirmSheet
          busy={busy}
          onCancel={() => !busy && setPending(null)}
          onConfirm={() => void runPending()}
          title={
            pending.type === "water" ? "Confirmar registro de água?" : "Confirmar registro de peso?"
          }
          lines={
            pending.type === "water"
              ? [`Registrar ${pending.ml} ml de água agora.`, "Horário do Acre (UTC−5)."]
              : [
                  `Registrar ${nf(pending.kg, 1)} kg para hoje.`,
                  "Registros de peso salvos ficam protegidos contra alterações acidentais.",
                ]
          }
          confirmLabel="Confirmar registro"
        />
      )}
    </div>
  );
  return typeof document === "undefined" ? null : createPortal(ui, document.body);
}

const liveButtonClass =
  "inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 text-xs font-extrabold text-slate-950 shadow-lg ring-1 ring-white/30 transition hover:brightness-110 active:scale-95";

type Link = { patientId: string; ownerId: string; name: string; heightCm: number | null };
async function findPatientLink(): Promise<Link | null> {
  const db = supabase as any;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const grant = await db
    .from("care_patient_access")
    .select("patient_id")
    .eq("user_id", data.user.id)
    .limit(1);
  const id = grant.data?.[0]?.patient_id;
  const patient = id
    ? await db.from("care_patients").select("id,owner_id,full_name,height_cm").eq("id", id).limit(1)
    : await db
        .from("care_patients")
        .select("id,owner_id,full_name,height_cm")
        .eq("owner_id", data.user.id)
        .limit(1);
  const row = patient.data?.[0];
  return row
    ? {
        patientId: row.id,
        ownerId: row.owner_id,
        name: row.full_name,
        heightCm: Number(row.height_cm) || null,
      }
    : null;
}

/** Botão "Ao vivo" para qualquer tela do cliente: aparece sempre e procura o prontuário da conta ao abrir. */
export function LiveModeLauncher({
  iconOnlyOnMobile = false,
  className = "",
}: {
  iconOnlyOnMobile?: boolean;
  className?: string;
}) {
  const [link, setLink] = useState<Link | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let active = true;
    void findPatientLink().then(
      (l) => {
        if (active && l) setLink(l);
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(""), 3500);
    return () => window.clearTimeout(t);
  }, [msg]);
  async function openLive() {
    void enterFullscreen(); // precisa acontecer direto do toque, antes de qualquer espera
    if (link) {
      setOpen(true);
      return;
    }
    setBusy(true);
    try {
      const found = await findPatientLink();
      if (found) {
        setLink(found);
        setOpen(true);
      } else {
        void exitFullscreen();
        setMsg("Não encontramos o seu prontuário. Entre novamente e tente de novo.");
      }
    } catch {
      void exitFullscreen();
      setMsg("Não foi possível abrir o painel ao vivo agora.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => void openLive()}
        disabled={busy}
        title="Painel ao vivo em tela cheia"
        aria-label="Abrir painel ao vivo em tela cheia"
        className={`${liveButtonClass} disabled:opacity-60 ${className}`}
      >
        <Radio size={15} className="animate-pulse" />{" "}
        <span className={iconOnlyOnMobile ? "hidden sm:inline" : ""}>Ao vivo</span>{" "}
        <Maximize2 size={14} className={iconOnlyOnMobile ? "hidden sm:block" : ""} />
      </button>
      {open && link && (
        <LiveDashboard
          patientId={link.patientId}
          ownerId={link.ownerId}
          heightCm={link.heightCm}
          name={link.name}
          onClose={() => setOpen(false)}
        />
      )}
      {msg &&
        createPortal(
          <div
            role="alert"
            className="fixed inset-x-0 bottom-6 z-[600] mx-auto w-fit max-w-[90vw] rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-2xl"
          >
            {msg}
          </div>,
          document.body,
        )}
    </>
  );
}
