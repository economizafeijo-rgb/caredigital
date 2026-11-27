import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Dumbbell,
  Flame,
  Info,
  Leaf,
  Scale,
  Settings2,
  TrendingUp,
  Wheat,
  Drumstick,
  Droplet,
  X,
  type LucideIcon,
} from "lucide-react";

export type HeroGoal = { value: string; label: string; description: string };
export type HeroChip = {
  k: "kcal" | "protein" | "carbs" | "fat";
  label: string;
  v: number;
  goal: number;
  unit: string;
  color: string;
};

const goalIcon: Record<string, LucideIcon> = {
  equilibrio: Leaf,
  emagrecimento: Scale,
  ganho_peso: TrendingUp,
  hipertrofia: Dumbbell,
};
const chipIcon: Record<HeroChip["k"], LucideIcon> = {
  kcal: Flame,
  protein: Drumstick,
  carbs: Wheat,
  fat: Droplet,
};
/** Explicações curtas e gerais (educativas): não substituem orientação de nutricionista. */
const chipInfo: Record<HeroChip["k"], { what: string; why: string; sources: string }> = {
  kcal: {
    what: "Energia é a quantidade de calorias que o alimento fornece ao corpo.",
    why: "A meta diária é uma estimativa pelo seu objetivo e peso. Comer perto dela ajuda a manter o peso, ganhar ou perder de forma gradual.",
    sources: "Vem dos carboidratos, proteínas e gorduras de tudo o que você come e bebe.",
  },
  protein: {
    what: "Proteínas ajudam a construir e manter músculos, pele e defesas do corpo.",
    why: "Distribuir a proteína ao longo das refeições costuma ser melhor do que concentrar tudo em uma só.",
    sources: "Ovos, peixes, carnes, leite e derivados, feijão, lentilha e soja.",
  },
  carbs: {
    what: "Carboidratos são a principal fonte de energia para o cérebro e os músculos.",
    why: "Prefira versões com fibras (grãos integrais, raízes, frutas) para saciedade e energia mais estável.",
    sources: "Arroz, mandioca, batata, pão, frutas, feijão e aveia.",
  },
  fat: {
    what: "Gorduras fornecem energia, ajudam a absorver as vitaminas A, D, E e K e participam dos hormônios.",
    why: "Vale priorizar as insaturadas e moderar as gorduras de frituras e ultraprocessados.",
    sources: "Azeite, castanhas, abacate, peixes, ovos e sementes.",
  },
};
const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");

function Ring({ pct, color, size = 46 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,.14)"
        strokeWidth="5"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, pct / 100))}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .7s ease" }}
      />
    </svg>
  );
}

function Modal({
  title,
  onClose,
  children,
  accent,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  accent: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[12000] grid place-items-center bg-slate-950/70 p-3 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="nv-pop w-full max-w-md border border-border bg-card text-card-foreground shadow-2xl"
      >
        <header
          className="flex items-center justify-between gap-2 border-b border-border px-4 py-3"
          style={{ borderTop: `3px solid ${accent}` }}
        >
          <h3 className="text-base font-extrabold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-8 place-items-center border border-border hover:bg-muted"
          >
            <X size={16} />
          </button>
        </header>
        <div className="grid gap-3 p-4 text-sm">{children}</div>
      </section>
    </div>,
    document.body,
  );
}

export function NutritionStudioHero({
  goal,
  goals,
  onGoal,
  chips,
  settingsOpen,
  onToggleSettings,
  settingsBadge,
  exportSlot,
}: {
  goal: string;
  goals: HeroGoal[];
  onGoal: (value: string) => void;
  chips: HeroChip[];
  settingsOpen: boolean;
  onToggleSettings: () => void;
  settingsBadge: number;
  exportSlot: ReactNode;
}) {
  const [info, setInfo] = useState<HeroChip["k"] | null>(null);
  const [goalInfo, setGoalInfo] = useState(false);
  const selected = goals.find((g) => g.value === goal) ?? goals[0];
  const by = Object.fromEntries(chips.map((c) => [c.k, c])) as Record<HeroChip["k"], HeroChip>;
  // Participação de cada nutriente nas calorias do dia (4 kcal/g de proteína e carboidrato; 9 kcal/g de gordura).
  const shares = (["protein", "carbs", "fat"] as const).map((k) => ({
    k,
    kcal: (by[k]?.v ?? 0) * (k === "fat" ? 9 : 4),
  }));
  const shareTotal = shares.reduce((s, x) => s + x.kcal, 0);
  const active = info ? by[info] : null;
  const ActiveIcon = info ? chipIcon[info] : null;
  return (
    <header className="nv-dark relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#12203a] via-[#0d1626] to-[#0a1220] p-3.5 text-white sm:p-4">
      <div className="flex flex-col gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
            Seu objetivo
            <button
              type="button"
              onClick={() => setGoalInfo((v) => !v)}
              aria-expanded={goalInfo}
              aria-label="O que cada objetivo muda"
              className="grid size-6 place-items-center rounded-lg border border-white/25 text-white/70 hover:bg-white/10"
            >
              <Info size={12} />
            </button>
          </p>
          <div
            className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
            role="radiogroup"
            aria-label="Objetivo alimentar"
          >
            {goals.map((o) => {
              const Icon = goalIcon[o.value] ?? Leaf;
              const on = goal === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onGoal(o.value)}
                  className={
                    "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition active:scale-95 " +
                    (on
                      ? "border-emerald-300/60 bg-emerald-400/20 text-emerald-100 shadow-[inset_0_0_0_1px_rgba(110,231,183,.25)]"
                      : "border-white/10 bg-white/[.04] text-white/75 hover:bg-white/10")
                  }
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 [&>*]:h-11 [&>*]:w-full [&>*]:justify-center [&>*]:rounded-xl">
          {exportSlot}
          <button
            type="button"
            onClick={onToggleSettings}
            aria-expanded={settingsOpen}
            className={
              "inline-flex items-center gap-1.5 border px-2.5 text-xs font-semibold transition " +
              (settingsOpen
                ? "border-white bg-white text-slate-900"
                : "border-white/15 bg-white/10 text-white hover:bg-white/20")
            }
          >
            <Settings2 size={15} /> Preferências
            {settingsBadge ? (
              <span className="grid size-5 place-items-center rounded-md bg-white/20 text-[11px] font-bold">
                {settingsBadge}
              </span>
            ) : null}
            <ChevronDown
              size={14}
              className={"transition-transform " + (settingsOpen ? "rotate-180" : "")}
            />
          </button>
        </div>
      </div>
      {goalInfo && (
        <dl className="nv-fade-in mt-2 grid gap-1 border border-white/10 bg-white/[.05] p-2.5 text-xs sm:grid-cols-2">
          {goals.map((o) => (
            <div key={o.value} className={o.value === selected.value ? "text-white" : ""}>
              <dt className="font-bold">{o.label}</dt>
              <dd className="text-white/70">{o.description}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {chips.map((c) => {
          const pct = c.goal ? (c.v / c.goal) * 100 : 0;
          return (
            <button
              key={c.k}
              type="button"
              onClick={() => setInfo(c.k)}
              aria-label={`${c.label} hoje: ${fmt(c.v)} de ${fmt(c.goal)} ${c.unit}. Ver detalhes`}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[.04] p-2.5 text-left transition hover:bg-white/[.09]"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{ background: c.color }}
              />
              <span className="flex items-center justify-between gap-1 pl-1 text-[11px] text-white/65">
                <span className="whitespace-nowrap">{c.label}</span>
                <Info size={11} className="shrink-0 opacity-50 group-hover:opacity-100" />
              </span>
              <span className="mt-0.5 block whitespace-nowrap pl-1 text-lg font-bold leading-tight tabular-nums">
                {fmt(c.v)}
                <span className="text-[11px] font-medium text-white/50">
                  {" "}
                  / {fmt(c.goal)} {c.unit}
                </span>
              </span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/10">
                <i
                  className="block h-full rounded-full transition-[width] duration-700"
                  style={{ width: Math.min(100, pct) + "%", background: c.color }}
                />
              </span>
            </button>
          );
        })}
      </div>

      {shareTotal > 0 && (
        <div className="mt-2.5">
          <div
            className="flex h-2.5 w-full overflow-hidden bg-white/10"
            role="group"
            aria-label="De onde vêm as calorias de hoje"
          >
            {shares.map((s) => (
              <button
                key={s.k}
                type="button"
                onClick={() => setInfo(s.k)}
                aria-label={`${by[s.k].label}: ${Math.round((s.kcal / shareTotal) * 100)}% das calorias`}
                title={`${by[s.k].label}: ${Math.round((s.kcal / shareTotal) * 100)}% das calorias de hoje`}
                className="h-full transition-[filter] hover:brightness-125"
                style={{ width: `${(s.kcal / shareTotal) * 100}%`, background: by[s.k].color }}
              />
            ))}
          </div>
          <p className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-white/55">
            <span>De onde vêm as calorias de hoje:</span>
            {shares.map((s) => (
              <span key={s.k} className="inline-flex items-center gap-1">
                <i className="size-2" style={{ background: by[s.k].color }} />
                {by[s.k].label} {Math.round((s.kcal / shareTotal) * 100)}%
              </span>
            ))}
          </p>
        </div>
      )}

      {active && info && ActiveIcon && (
        <Modal title={`${active.label} hoje`} accent={active.color} onClose={() => setInfo(null)}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="border border-border bg-muted/40 p-2">
              <p className="text-[11px] text-muted-foreground">Consumido</p>
              <p className="text-lg font-extrabold tabular-nums">{fmt(active.v)}</p>
            </div>
            <div className="border border-border bg-muted/40 p-2">
              <p className="text-[11px] text-muted-foreground">Meta</p>
              <p className="text-lg font-extrabold tabular-nums">{fmt(active.goal)}</p>
            </div>
            <div className="border border-border bg-muted/40 p-2">
              <p className="text-[11px] text-muted-foreground">
                {active.v > active.goal ? "Acima" : "Faltam"}
              </p>
              <p className="text-lg font-extrabold tabular-nums">
                {fmt(Math.abs(active.goal - active.v))}
              </p>
            </div>
          </div>
          <div>
            <div className="h-2.5 overflow-hidden bg-muted">
              <i
                className="block h-full"
                style={{
                  width: `${Math.min(100, active.goal ? (active.v / active.goal) * 100 : 0)}%`,
                  background: active.color,
                }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {active.goal ? Math.round((active.v / active.goal) * 100) : 0}% da meta ({active.unit}
              ) · só conta o que foi registrado hoje.
            </p>
          </div>
          <p>{chipInfo[info].what}</p>
          <p className="text-muted-foreground">{chipInfo[info].why}</p>
          <p className="border-l-2 pl-2.5 text-xs" style={{ borderColor: active.color }}>
            <strong>Boas fontes: </strong>
            {chipInfo[info].sources}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Informação educativa; não substitui a orientação de um nutricionista.
          </p>
        </Modal>
      )}
    </header>
  );
}
