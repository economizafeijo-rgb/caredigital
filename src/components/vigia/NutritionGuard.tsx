import { useEffect, useMemo, useRef, useState } from "react";
import { AlertOctagon, AlertTriangle, Candy, Droplet, ShieldCheck, Waves, X } from "lucide-react";
import {
  evaluateRisks,
  hazardsFor,
  levelColor,
  levelInk,
  levelRank,
  levelText,
  type RiskInfo,
  type RiskLevel,
} from "@/lib/nutrition-risk";
import { NutrientArt, NUTRIENT_COLOR, NUTRIENT_INK } from "./NutrientArt";
import { alertSoundOn, playWarning } from "./NextUpClock";
import { emptyAlertState, pendingAlerts, type AlertState } from "@/lib/nutrition-alert-policy";
import { useDailyNutrition, type DailyNutrition } from "./DailyNutritionPanel";

const ICONS = { sodium: Waves, sugar: Candy, fat: Droplet } as const;
const tz = "America/Rio_Branco";
const dayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
const fmt = (v: number, unit: string) => `${Math.round(v).toLocaleString("pt-BR")} ${unit}`;

export function useNutritionRisks(data: DailyNutrition): RiskInfo[] {
  return useMemo(
    () => evaluateRisks(data.entries, { kcal: data.target.kcal, fat: data.target.fat }),
    [data.entries, data.target.kcal, data.target.fat],
  );
}

const advice = (r: RiskInfo): string => {
  const top = r.culprits[0]?.name;
  if (r.level === "ok")
    return r.left > 0 ? `Ainda cabem ${fmt(r.left, r.unit)} hoje.` : "Dentro do limite.";
  const over = r.value - r.limit;
  const base =
    r.level === "near"
      ? `Faltam só ${fmt(r.left, r.unit)} para o limite.`
      : `Passou ${fmt(over, r.unit)} do limite.`;
  const tip =
    r.key === "sodium"
      ? "Evite embutidos, caldos prontos e sal extra no resto do dia; beba água."
      : r.key === "sugar"
        ? "Evite bebidas e doces até o fim do dia; prefira fruta."
        : "Prefira grelhados e cozidos nas próximas refeições.";
  return `${base}${top ? ` Maior fonte: ${top}.` : ""} ${tip}`;
};

/** Painel de limites: sódio, açúcar livre e gordura, com faixa de alerta, culpados e perigos do dia. */
export function NutritionGuardPanel({ data }: { data: DailyNutrition }) {
  const risks = useNutritionRisks(data);
  const hazards = useMemo(() => hazardsFor(data.entries), [data.entries]);
  const worst = risks.reduce<RiskLevel>(
    (a, r) => (levelRank[r.level] > levelRank[a] ? r.level : a),
    "ok",
  );
  return (
    <section
      aria-label="Limites de saúde do dia"
      className="min-w-0 border border-border bg-card p-2.5"
      style={{ ["--ca" as string]: levelColor[worst] }}
    >
      <header className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          {worst === "ok" ? (
            <ShieldCheck size={16} className="text-emerald-500" />
          ) : (
            <AlertTriangle size={16} style={{ color: levelInk[worst] }} />
          )}
          <strong className="text-sm font-bold">Limites de saúde de hoje</strong>
        </span>
        <span
          className={`px-2 py-0.5 text-[11px] font-bold ${worst === "near" || worst === "ok" ? "text-slate-950" : "text-white"}`}
          style={{ background: levelColor[worst] }}
        >
          {worst === "ok" ? "Tudo dentro do limite" : levelText[worst]}
        </span>
      </header>
      <div className="grid gap-1.5 md:grid-cols-3">
        {risks.map((r) => {
          const Icon = ICONS[r.key];
          const col = levelColor[r.level];
          const nc = NUTRIENT_COLOR[r.key];
          const fill = Math.min(1.3, r.pct) / 1.3;
          return (
            <article
              key={r.key}
              title={advice(r)}
              className={`min-w-0 border border-border bg-background/40 px-2.5 py-2 ${r.level === "severe" ? "nv-due" : ""}`}
              style={{ borderLeft: `3px solid ${nc}`, ["--due" as string]: col }}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                  <Icon size={13} style={{ color: NUTRIENT_INK[r.key] }} />
                  <span className="truncate">{r.label}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  <b>{Math.round(r.value).toLocaleString("pt-BR")}</b>
                  <span className="text-muted-foreground">
                    /{Math.round(r.limit).toLocaleString("pt-BR")} {r.unit}
                  </span>
                </span>
              </div>
              <div
                className="relative mt-1.5 h-1.5 bg-black/10 dark:bg-white/10"
                role="meter"
                aria-label={`${r.label}: ${Math.round(r.pct * 100)}% do limite`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(r.pct * 100)}
              >
                <i
                  className="absolute inset-y-0 left-0 transition-[width] duration-700"
                  style={{ width: `${fill * 100}%`, background: col }}
                />
              </div>
              <p className="mt-1 flex items-center justify-between text-[10.5px]">
                <b style={{ color: levelInk[r.level] }}>{levelText[r.level]}</b>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(r.pct * 100)}% do limite
                </span>
              </p>
            </article>
          );
        })}
      </div>
      {hazards.length > 0 && (
        <ul className="mt-2.5 grid gap-1">
          {hazards.map((h) => (
            <li
              key={h.id}
              className="flex gap-2 border-l-2 border-amber-500 bg-amber-500/10 px-2.5 py-1.5 text-xs"
            >
              <AlertTriangle size={14} className="mt-px shrink-0 text-amber-500" />
              <span>
                <b>{h.name}:</b> {h.text}
              </span>
            </li>
          ))}
        </ul>
      )}
      <details className="mt-1.5 text-[10.5px] text-muted-foreground">
        <summary style={{ cursor: "pointer" }} className="font-semibold">
          Como os limites são calculados
        </summary>
        <p className="mt-1 leading-snug">
          Limites: sódio abaixo de 2.000 mg/dia e açúcar livre abaixo de 10% das calorias (OMS);
          gordura pela sua meta. Açúcar livre inclui o açúcar adicionado, o mel, os xaropes e os
          sucos. Valores estimados (TACO/TBCA e rótulos) a partir do que você registrou; sal de
          mesa, açúcar de colher e molhos só entram se forem registrados. Limonada sem a indicação
          "sem açúcar" é contada como adoçada (estimativa de 10 g a cada 200 ml). Não substitui
          orientação de médico ou nutricionista.
        </p>
      </details>
    </section>
  );
}

/** Monitor do dia: um único aviso discreto na primeira vez que sódio, açúcar ou gordura passam do limite. */
export function NutritionGuardWatcher({
  patientId,
  ownerId,
  revision = 0,
  onOpen,
}: {
  patientId: string;
  ownerId: string;
  revision?: number;
  onOpen?: () => void;
}) {
  const data = useDailyNutrition(patientId, ownerId, revision);
  const risks = useNutritionRisks(data);
  const [shown, setShown] = useState<RiskInfo[]>([]);
  const armed = useRef(false);
  const stateKey = `nv-risk-state-${patientId}-${dayKey()}`;

  const read = (): AlertState => {
    try {
      const raw = localStorage.getItem(stateKey);
      return raw ? { ...emptyAlertState(), ...JSON.parse(raw) } : emptyAlertState();
    } catch {
      return emptyAlertState();
    }
  };
  const write = (st: AlertState) => {
    try {
      localStorage.setItem(stateKey, JSON.stringify(st));
    } catch {
      /* ok */
    }
  };

  // Atualiza ao voltar para a aba e a cada 30 s (o hook escuta "nv-intake-changed").
  useEffect(() => {
    const bump = () => window.dispatchEvent(new Event("nv-intake-changed"));
    const t = window.setInterval(() => document.visibilityState === "visible" && bump(), 30_000);
    const onVis = () => document.visibilityState === "visible" && bump();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (!data.loaded) return;
    const { fire, next } = pendingAlerts(risks, read());
    if (fire.length) {
      write(next);
      // Na primeira leitura da sessão só marca como visto: não avisa de excessos antigos.
      if (armed.current) {
        setShown((cur) => [...fire, ...cur.filter((c) => !fire.some((f) => f.key === c.key))]);
        if (alertSoundOn()) playWarning("over");
      }
    }
    armed.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risks, data.loaded]);

  if (!shown.length) return null;
  const col = levelColor.over;
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[10001] w-[min(22rem,calc(100vw-2rem))]"
      role="region"
      aria-label="Aviso de limite nutricional"
    >
      <div
        role="status"
        className="nv-fade-in pointer-events-auto relative border border-white/15 bg-[#0b1230] p-3 text-white shadow-2xl"
        style={{ borderLeft: `4px solid ${col}` }}
      >
        <button
          type="button"
          aria-label="Fechar aviso"
          onClick={() => setShown([])}
          className="absolute right-1.5 top-1.5 grid size-6 place-items-center text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
        <p className="flex items-center gap-2 pr-6 text-sm font-extrabold" style={{ color: col }}>
          <AlertTriangle size={16} /> Acima do limite hoje
        </p>
        <ul className="mt-1.5 grid gap-0.5 text-xs tabular-nums text-white/85">
          {shown.map((r) => (
            <li key={r.key}>
              <b>{r.label}:</b> {fmt(r.value, r.unit)} de {fmt(r.limit, r.unit)} (
              {Math.round(r.pct * 100)}%)
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-[11.5px] leading-snug text-white/70">
          Os detalhes ficam nos cartões de nutrição. Este aviso não se repete hoje.
        </p>
        <div className="mt-2 flex gap-2">
          {onOpen && (
            <button
              type="button"
              onClick={() => {
                onOpen();
                setShown([]);
              }}
              className="h-7 border border-white/25 px-2.5 text-[11px] font-bold hover:bg-white/10"
            >
              Ver detalhes
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              write({ ...read(), muted: true });
              setShown([]);
            }}
            className="h-7 px-2.5 text-[11px] font-semibold text-white/70 hover:bg-white/10"
          >
            Silenciar hoje
          </button>
        </div>
      </div>
    </div>
  );
}
