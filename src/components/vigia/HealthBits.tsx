import { useState, type ReactNode } from "react";
import { ChevronDown, Coffee, Lock, Milk, UserRound } from "lucide-react";
import { RANGES, type RangeId } from "@/lib/health-ranges";
import type { Limits } from "@/lib/health-limits";

/** Filtro de período: hoje, 7, 14, 30 dias, 6 meses e 1 ano. */
export function RangeTabs({
  value,
  onChange,
  accent = "bg-emerald-500 text-slate-950",
}: {
  value: RangeId;
  onChange: (id: RangeId) => void;
  accent?: string;
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
      <div
        className="grid min-w-[21rem] grid-cols-6 gap-1 rounded-2xl bg-muted/60 p-1"
        role="group"
        aria-label="Período"
      >
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={value === r.id}
            onClick={() => onChange(r.id)}
            className={`h-9 rounded-xl px-1 text-[12px] font-bold transition active:scale-95 ${value === r.id ? `${accent} shadow` : "text-muted-foreground hover:bg-muted"}`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Limites calculados do perfil. Não há campo editável: mudam apenas quando o perfil muda. */
export function LimitsCard({
  limits,
  focus,
  collapsible = false,
}: {
  limits: Limits;
  focus?: "caffeine" | "lactose";
  collapsible?: boolean;
}) {
  const openProfile = () => window.dispatchEvent(new Event("nv-open-profile"));
  const inner = (
    <div className={collapsible ? "" : "rounded-3xl border border-border bg-card p-4"}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold">
            <Lock size={14} className="text-emerald-500" /> Seus limites
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {limits.complete
              ? `Calculados do seu perfil${limits.age !== null ? ` (${limits.age} anos)` : ""} e travados para sua segurança.`
              : "Provisórios: complete idade, sexo e peso no perfil para personalizar."}
          </p>
        </div>
        <button
          type="button"
          onClick={openProfile}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold hover:bg-muted"
        >
          <UserRound size={13} /> Perfil
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {focus !== "lactose" && (
          <div className="rounded-2xl bg-amber-500/10 p-3 ring-1 ring-amber-500/25">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              <Coffee size={13} /> Cafeína
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums">
              {limits.caffeineDayMg}
              <span className="ml-1 text-xs font-semibold text-muted-foreground">mg/dia</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Até {limits.caffeineDoseMg} mg por dose · sem cafeína {limits.caffeineCutoffH} h antes
              de dormir
            </p>
          </div>
        )}
        {focus !== "caffeine" && (
          <div className="rounded-2xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/25">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <Milk size={13} /> Lactose
            </p>
            {limits.lactoseIntolerant ? (
              <>
                <p className="mt-1 text-2xl font-black tabular-nums">
                  {limits.lactoseDayG}
                  <span className="ml-1 text-xs font-semibold text-muted-foreground">g/dia</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Até {limits.lactoseMealG} g por refeição
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Sem intolerância no perfil. Acompanhamento opcional.
              </p>
            )}
          </div>
        )}
      </div>
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-semibold text-foreground">
          Por que esses valores?
        </summary>
        <ul className="mt-1 grid list-disc gap-1 pl-4">
          {(focus === "lactose"
            ? limits.lactoseReasons
            : focus === "caffeine"
              ? limits.caffeineReasons
              : [...limits.caffeineReasons, ...limits.lactoseReasons]
          ).map((r) => (
            <li key={r}>{r}</li>
          ))}
          <li>Cafeína não muda por sexo, só por idade, peso, gestação e condições de saúde.</li>
        </ul>
      </details>
    </div>
  );
  if (!collapsible) return inner;
  return (
    <Collapsible
      title="Seus limites"
      summary={
        focus === "lactose"
          ? limits.lactoseIntolerant
            ? `${limits.lactoseDayG} g por dia · ${limits.lactoseMealG} g por refeição`
            : "Sem intolerância no perfil"
          : `${limits.caffeineDayMg} mg por dia · até ${limits.caffeineDoseMg} mg por dose`
      }
      icon={<Lock size={16} className="text-emerald-500" />}
    >
      {inner}
    </Collapsible>
  );
}

/** Seção retrátil: cabeçalho com título, resumo curto e seta; o conteúdo só ocupa espaço quando aberto. */
export function Collapsible({
  title,
  summary,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-muted/60"
      >
        {icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{title}</span>
          {summary && (
            <span className="block truncate text-[11px] text-muted-foreground">{summary}</span>
          )}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-border px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}
