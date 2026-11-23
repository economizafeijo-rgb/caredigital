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
      className="nv-scan min-w-0 border border-border bg-card p-3 shadow-card"
      style={{ ["--ca" as string]: levelColor[worst] }}
    >
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
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
      <div className="grid gap-2.5 md:grid-cols-3">
        {risks.map((r) => {
          const Icon = ICONS[r.key];
          const col = levelColor[r.level];
          const nc = NUTRIENT_COLOR[r.key];
          const fill = Math.min(1.3, r.pct) / 1.3;
          return (
            <article
              key={r.key}
              className={`relative overflow-hidden border p-2.5 pr-[4.75rem] ${r.level === "severe" ? "nv-due" : ""}`}
              style={{
                borderColor: `color-mix(in srgb, ${nc} 55%, transparent)`,
                boxShadow: `inset 0 3px 0 ${nc}`,
                background: `linear-gradient(135deg, color-mix(in srgb, ${nc} ${r.level === "ok" ? 20 : 26}%, #12151c), color-mix(in srgb, ${nc} 6%, #12151c) 70%)`,
                ["--due" as string]: col,
              }}
            >
              <NutrientArt
                kind={r.key}
                className="pointer-events-none absolute -bottom-1 right-1 size-[4.5rem] opacity-95"
              />
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span
                    className="grid size-6 place-items-center rounded-md"
                    style={{ background: `${nc}33`, color: NUTRIENT_INK[r.key] }}
                  >
                    <Icon size={14} />
                  </span>{" "}
                  {r.label}
                </span>
                <span className="tabular-nums">
                  <b className="text-sm">{Math.round(r.value).toLocaleString("pt-BR")}</b>
                  <span className="text-muted-foreground">
                    /{Math.round(r.limit).toLocaleString("pt-BR")} {r.unit}
                  </span>
                </span>
              </div>
              <div
                className="relative mt-2 h-2.5 bg-black/10 dark:bg-white/10"
                role="meter"
                aria-label={`${r.label}: ${Math.round(r.pct * 100)}% do limite`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(r.pct * 100)}
              >
                <i
                  className="absolute inset-y-0 left-0 transition-[width] duration-700"
                  style={{
                    width: `${fill * 100}%`,
                    background: `linear-gradient(90deg, #10b981 0%, #f59e0b ${(0.8 / 1.3) * 100}%, ${col} 100%)`,
                  }}
                />
                {/* marcas: 80% (perto) e 100% (limite) */}
                <b
                  className="absolute inset-y-[-3px] w-px bg-amber-400"
                  style={{ left: `${(0.8 / 1.3) * 100}%` }}
                />
                <b
                  className="absolute inset-y-[-3px] w-0.5 bg-rose-500"
                  style={{ left: `${(1 / 1.3) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 flex items-center justify-between text-[11px]">
                <b style={{ color: levelInk[r.level] }}>{levelText[r.level]}</b>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(r.pct * 100)}% do limite
                </span>
              </p>
              <p className="mt-1 text-xs leading-snug text-foreground/90">{advice(r)}</p>
              {r.culprits.length > 0 && r.value > 0 && (
                <ul className="mt-1.5 flex flex-wrap gap-1">
                  {r.culprits.map((c) => (
                    <li
                      key={c.id}
                      className="border border-border bg-card px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums"
                      title={`${c.name}: ${fmt(c.amount, r.unit)}`}
                    >
                      {c.name} · {fmt(c.amount, r.unit)}
                    </li>
                  ))}
                </ul>
              )}
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
      <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground">
        Limites: sódio abaixo de 2.000 mg/dia e açúcar livre abaixo de 10% das calorias (OMS);
        gordura pela sua meta. Açúcar livre inclui o açúcar adicionado, o mel, os xaropes e os
        sucos. Valores estimados (TACO/TBCA e rótulos) a partir do que você registrou; sal de mesa,
        açúcar de colher e molhos só entram se forem registrados. Limonada sem a indicação "sem
        açúcar" é contada como adoçada (estimativa de 10 g a cada 200 ml). Não substitui orientação
        de médico ou nutricionista.
      </p>
    </section>
  );
}

type Toast = { id: string; risk: RiskInfo; fresh: boolean };

/** Monitor em tempo real: avisa na tela, com som e vibração, ao chegar perto ou passar de um limite. */
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const armed = useRef(false);
  const key = (k: string) => `nv-risk-${patientId}-${dayKey()}-${k}`;

  // Atualização em tempo real: o hook já escuta "nv-intake-changed"; reforça ao voltar para a aba e a cada 30 s.
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
    const fired: Toast[] = [];
    for (const r of risks) {
      let last = 0;
      try {
        last = Number(localStorage.getItem(key(r.key)) ?? 0);
      } catch {
        /* ok */
      }
      const rank = levelRank[r.level];
      if (rank > last) {
        fired.push({ id: `${r.key}-${rank}-${Date.now()}`, risk: r, fresh: armed.current });
        try {
          localStorage.setItem(key(r.key), String(rank));
        } catch {
          /* ok */
        }
      } else if (rank < last) {
        // Registro corrigido ou excluído: rearma para avisar de novo se voltar a subir.
        try {
          localStorage.setItem(key(r.key), String(rank));
        } catch {
          /* ok */
        }
      }
    }
    if (fired.length) {
      setToasts((t) => [...fired, ...t].slice(0, 3));
      const worst = fired.reduce((a, b) =>
        levelRank[b.risk.level] > levelRank[a.risk.level] ? b : a,
      );
      if (armed.current) {
        if (alertSoundOn()) playWarning(worst.risk.level as "near" | "over" | "severe");
        try {
          navigator.vibrate?.(worst.risk.level === "near" ? [120] : [200, 100, 200, 100, 300]);
        } catch {
          /* ok */
        }
        try {
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            document.visibilityState !== "visible"
          )
            new Notification(`NextVita · ${levelText[worst.risk.level]}: ${worst.risk.label}`, {
              body: advice(worst.risk),
              tag: "nv-risk-" + worst.risk.key,
            });
        } catch {
          /* ok */
        }
      }
    }
    armed.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risks, data.loaded]);

  if (!toasts.length) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[10001] grid w-[min(24rem,calc(100vw-2rem))] gap-2"
      role="region"
      aria-label="Alertas de limite nutricional"
    >
      {toasts.map((t) => {
        const col = levelColor[t.risk.level];
        const Icon = t.risk.level === "near" ? AlertTriangle : AlertOctagon;
        return (
          <div
            key={t.id}
            role="alert"
            className="nv-fade-in nv-due pointer-events-auto relative overflow-hidden border border-white/15 bg-[#14171f] p-3 text-white shadow-2xl"
            style={{ borderLeft: `4px solid ${col}`, ["--due" as string]: col }}
          >
            <button
              type="button"
              aria-label="Fechar alerta"
              onClick={() => setToasts((l) => l.filter((x) => x.id !== t.id))}
              className="absolute right-1.5 top-1.5 grid size-6 place-items-center text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X size={14} />
            </button>
            <p
              className="flex items-center gap-2 pr-6 text-sm font-extrabold"
              style={{ color: levelInk[t.risk.level] }}
            >
              <Icon size={16} /> {levelText[t.risk.level]}: {t.risk.label}
            </p>
            <p className="mt-1 text-xs tabular-nums text-white/85">
              {fmt(t.risk.value, t.risk.unit)} de {fmt(t.risk.limit, t.risk.unit)} (
              {Math.round(t.risk.pct * 100)}%)
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-white/70">{advice(t.risk)}</p>
            {onOpen && (
              <button
                type="button"
                onClick={() => {
                  onOpen();
                  setToasts((l) => l.filter((x) => x.id !== t.id));
                }}
                className="mt-2 h-7 border border-white/25 px-2.5 text-[11px] font-bold hover:bg-white/10"
              >
                Ver detalhes
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
