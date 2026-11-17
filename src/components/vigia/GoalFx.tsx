import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ClipboardList, Sparkles, X } from "lucide-react";
import { goalValue, GOAL_INFO, longDay, type GoalMetric, type GoalResult } from "@/lib/day-metrics";

export type FxItem = {
  id: string;
  kind: "hit" | "miss";
  metric: GoalMetric;
  title: string;
  subtitle: string;
  detail: string;
  actual: number;
  target: number;
  pct: number;
  unit: string;
  day: string;
};

type Push = (item: Omit<FxItem, "id">) => void;
const FxContext = createContext<{ push: Push } | null>(null);

/** Usável sem provedor (testes, páginas públicas): nesse caso não faz nada. */
export function useGoalFx(): { push: Push } {
  return useContext(FxContext) ?? { push: () => undefined };
}

/** Monta o texto do cartão a partir do resultado da meta. */
export function goalFxItem(goal: GoalResult, kind: "hit" | "miss", day: string): Omit<FxItem, "id"> {
  const info = GOAL_INFO[goal.metric];
  const missing = Math.max(0, goal.target - goal.actual);
  const hit = kind === "hit";
  return {
    kind, metric: goal.metric, day, actual: goal.actual, target: goal.target, pct: goal.pct, unit: goal.unit,
    title: hit ? `${info.noun[0].toUpperCase()}${info.noun.slice(1)} atingida!` : `${info.noun[0].toUpperCase()}${info.noun.slice(1)} não atingida`,
    subtitle: goalValue(goal),
    detail: hit
      ? "Excelente constância. Seu progresso foi guardado no histórico."
      : goal.metric === "calorias" ? `Fora da faixa de ${goal.pct}% da meta em ${longDay(day)}.`
        : goal.metric === "sono" ? `Faltaram ${Math.max(0, Number((goal.target - goal.actual).toFixed(1)))} h para a meta em ${longDay(day)}.`
          : `Faltaram ${missing.toLocaleString("pt-BR")} ${goal.unit} em ${longDay(day)}.`,
  };
}

const prefersReducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useCountUp(value: number, ms = 1200) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) { setShown(value); return; }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / ms);
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, ms]);
  return shown;
}

const CIRCUMFERENCE = 2 * Math.PI * 46;
const PARTICLES = Array.from({ length: 16 }, (_, index) => {
  const angle = (index / 16) * Math.PI * 2 + (index % 2 ? 0.2 : 0);
  const distance = 62 + (index % 3) * 16;
  return { x: Math.round(Math.cos(angle) * distance), y: Math.round(Math.sin(angle) * distance), delay: 900 + (index % 4) * 40, hue: index % 3 };
});

/** Anel animado: enche até o percentual atingido; na meta cumprida desenha o "check" e solta partículas. */
export function GoalCelebration({ item, onClose, onOpenHistory }: { item: FxItem; onClose: () => void; onOpenHistory?: () => void }) {
  const hit = item.kind === "hit";
  const fill = Math.min(1, Math.max(0, item.pct / 100));
  const finalOffset = CIRCUMFERENCE * (hit ? 0 : 1 - fill);
  const count = useCountUp(item.metric === "sono" ? Math.round(item.actual * 10) : Math.round(item.actual));
  const shownCount = item.metric === "sono" ? (count / 10).toLocaleString("pt-BR", { minimumFractionDigits: 1 }) : count.toLocaleString("pt-BR");
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const timer = window.setTimeout(() => closeRef.current(), hit ? 7500 : 10000);
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(timer); window.removeEventListener("keydown", onKey); };
  }, [hit, item.id]);

  const tone = hit
    ? { head: "from-emerald-600 via-emerald-500 to-teal-400", ring: "#10b981", soft: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" }
    : { head: "from-amber-600 via-amber-500 to-orange-400", ring: "#f59e0b", soft: "bg-amber-500/15 text-amber-800 dark:text-amber-300" };
  const particleColors = ["#34d399", "#fbbf24", "#38bdf8"];

  return (
    <div role="status" aria-live="polite" className="nv-fx-card pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
      <div className={`flex items-center justify-between bg-gradient-to-r ${tone.head} px-4 py-2.5 text-white`}>
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
          {hit ? <Sparkles size={15} /> : <AlertTriangle size={15} />} {hit ? "Meta cumprida" : "Meta do dia"}
        </span>
        <button type="button" onClick={onClose} aria-label="Fechar aviso" className="grid size-7 place-items-center rounded-lg text-white/90 hover:bg-white/20"><X size={16} /></button>
      </div>
      <div className="flex items-center gap-4 p-4">
        <div className="relative grid size-28 shrink-0 place-items-center">
          {hit && <i aria-hidden="true" className="nv-fx-glow absolute inset-1 rounded-full" style={{ boxShadow: `0 0 0 2px ${tone.ring}` }} />}
          <div className={`absolute inset-0 ${hit ? "" : "nv-fx-shake"}`}>
          <svg viewBox="0 0 120 120" aria-hidden="true" className="size-full -rotate-90">
            <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="11" className="text-muted" />
            <circle cx="60" cy="60" r="46" fill="none" stroke={tone.ring} strokeWidth="11" strokeLinecap="round" strokeDasharray={CIRCUMFERENCE}
              className="nv-fx-ring" style={{ strokeDashoffset: finalOffset, ["--fx-from" as string]: CIRCUMFERENCE, ["--fx-to" as string]: finalOffset }} />
            {!hit && <circle cx="60" cy="14" r="5.5" fill="#fff" stroke={tone.ring} strokeWidth="3" className="nv-fx-marker" />}
          </svg>
          </div>
          {hit ? (
            <svg viewBox="0 0 120 120" aria-hidden="true" className="relative size-full">
              <path d="M38 62 L54 78 L84 44" fill="none" stroke={tone.ring} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="80" className="nv-fx-check" />
            </svg>
          ) : (
            <span className="relative text-center"><b className="text-2xl tabular-nums text-amber-600 dark:text-amber-300">{item.pct}%</b><span className="block text-[10px] font-semibold text-muted-foreground">da meta</span></span>
          )}
          {hit && PARTICLES.map((p, i) => (
            <i key={i} aria-hidden="true" className="nv-fx-particle absolute left-1/2 top-1/2 size-2 rounded-full"
              style={{ background: particleColors[p.hue], animationDelay: `${p.delay}ms`, ["--x" as string]: `${p.x}px`, ["--y" as string]: `${p.y}px` }} />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold leading-tight">{item.title}</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums leading-none">{shownCount}<span className="ml-1 text-sm font-semibold text-muted-foreground">{item.metric === "sono" ? "h" : item.unit} <span className="text-muted-foreground/70">/ {item.target.toLocaleString("pt-BR")}</span></span></p>
          <p className="mt-2 text-xs leading-snug text-muted-foreground">{item.detail}</p>
        </div>
      </div>
      {!hit && (
        <div className={`mx-4 mb-4 flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs font-semibold ${tone.soft}`}>
          <span className="inline-flex items-center gap-1.5"><ClipboardList size={14} /> Observação registrada no seu histórico</span>
          {onOpenHistory && <button type="button" onClick={() => { onOpenHistory(); onClose(); }} className="rounded-lg bg-white/70 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-white dark:bg-black/30 dark:text-amber-100">Ver</button>}
        </div>
      )}
    </div>
  );
}

/** Fila de avisos: mostra um por vez, no topo da tela, sem bloquear o que o usuário está fazendo. */
export function GoalFxProvider({ children, onOpenHistory }: { children: ReactNode; onOpenHistory?: () => void }) {
  const [queue, setQueue] = useState<FxItem[]>([]);
  const counter = useRef(0);
  const push = useCallback<Push>((item) => {
    setQueue((current) => {
      const key = `${item.kind}-${item.metric}-${item.day}`;
      if (current.length >= 4 || current.some((entry) => `${entry.kind}-${entry.metric}-${entry.day}` === key)) return current;
      counter.current += 1;
      return [...current, { ...item, id: `${key}-${counter.current}` }];
    });
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  const current = queue[0];
  return (
    <FxContext.Provider value={value}>
      {children}
      {current && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[210] flex justify-center px-3 sm:top-16">
          <GoalCelebration key={current.id} item={current} onOpenHistory={onOpenHistory} onClose={() => setQueue((list) => list.slice(1))} />
        </div>
      )}
    </FxContext.Provider>
  );
}
