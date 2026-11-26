import { useMemo, useState } from "react";
import { Coffee, Flame, Milk, Egg, Wheat, Droplet, Leaf } from "lucide-react";
import { acreAddDays, acreDateKey } from "@/lib/acre-time";
import { DEFAULT_LIMIT_MG } from "@/lib/caffeine";
import { LACTOSE_THRESHOLDS } from "@/lib/intake-detect";
import { usePeriodNutrition } from "./usePeriodNutrition";
import { useIntakeRecords } from "./useIntakeRecords";

const PERIODS = [
  { n: 1, label: "Hoje" },
  { n: 7, label: "7 dias" },
  { n: 30, label: "30 dias" },
] as const;
const MICROS = [
  { k: "fiber", label: "Fibras", unit: "g", ref: 25, color: "#a3e635" },
  { k: "vitC", label: "Vitamina C", unit: "mg", ref: 90, color: "#fb923c" },
  { k: "vitA", label: "Vitamina A", unit: "mcg", ref: 900, color: "#fbbf24" },
  { k: "calcium", label: "Cálcio", unit: "mg", ref: 1000, color: "#e2e8f0" },
  { k: "iron", label: "Ferro", unit: "mg", ref: 14, color: "#f87171" },
  { k: "potassium", label: "Potássio", unit: "mg", ref: 3500, color: "#c084fc" },
] as const;
const nf = (v: number) => Math.round(v).toLocaleString("pt-BR");

function Meter({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, Math.max(2, pct))}%`, background: color }}
      />
    </div>
  );
}

/** Ingestão por período (hoje, 7 e 30 dias): energia, macros, micronutrientes, cafeína e lactose. */
export function LiveIntake({
  patientId,
  ownerId,
  targets,
}: {
  patientId: string;
  ownerId: string;
  targets: { kcal: number; protein: number; carbs: number; fat: number };
}) {
  const [n, setN] = useState<1 | 7 | 30>(7);
  const { byDay, loaded } = usePeriodNutrition(patientId, ownerId, 30);
  const intake = useIntakeRecords(patientId, ownerId, 30);
  const today = acreDateKey();
  const keys = useMemo(
    () => Array.from({ length: n }, (_, i) => acreAddDays(today, -(n - 1 - i))),
    [n, today],
  );
  const tot = useMemo(() => {
    const t = {
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      vitC: 0,
      vitA: 0,
      calcium: 0,
      iron: 0,
      potassium: 0,
    };
    let withData = 0;
    for (const k of keys) {
      const d = byDay[k];
      if (!d) continue;
      withData++;
      (Object.keys(t) as (keyof typeof t)[]).forEach((f) => (t[f] += d[f] ?? 0));
    }
    return { t, withData };
  }, [byDay, keys]);
  const div = Math.max(1, n === 1 ? 1 : tot.withData);
  const caf = intake.caffeine.filter((r) => keys.includes(acreDateKey(r.at)));
  const lac = intake.lactose.filter((r) => keys.includes(acreDateKey(r.at)));
  const cafMg = caf.reduce((s, r) => s + r.mg, 0);
  const lacG = Math.round(lac.reduce((s, r) => s + r.g, 0) * 10) / 10;
  let cafLimit: number = DEFAULT_LIMIT_MG;
  try {
    cafLimit = Number(localStorage.getItem("nv-caffeine-limit")) || DEFAULT_LIMIT_MG;
  } catch {
    /* ok */
  }
  const macroKcal = tot.t.protein * 4 + tot.t.carbs * 4 + tot.t.fat * 9 || 1;
  const bars = keys.map((k) => byDay[k]?.kcal ?? 0);
  const barMax = Math.max(targets.kcal || 0, ...bars, 1);
  const kcalTarget = targets.kcal * n;

  return (
    <div className="col-span-2 grid gap-2.5 sm:col-span-6 lg:col-span-12">
      <div
        className="grid grid-cols-3 gap-1 rounded-2xl bg-white/[.06] p-1 ring-1 ring-white/10"
        role="group"
        aria-label="Período da ingestão"
      >
        {PERIODS.map((p) => (
          <button
            key={p.n}
            type="button"
            aria-pressed={n === p.n}
            onClick={() => setN(p.n)}
            className={`h-10 rounded-xl text-[13px] font-bold transition active:scale-95 ${n === p.n ? "bg-emerald-400 text-slate-950 shadow-lg" : "text-white/70 hover:bg-white/10"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-orange-500/25 via-white/[.06] to-white/[.03] p-4 ring-1 ring-white/15">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
              <Flame size={14} className="text-orange-300" /> Energia{" "}
              {n === 1 ? "de hoje" : `em ${n} dias`}
            </p>
            <p className="mt-1 text-4xl font-black leading-none tabular-nums">
              {nf(tot.t.kcal)}
              <span className="ml-1 text-sm font-semibold text-white/50">kcal</span>
            </p>
            <p className="mt-1.5 text-[11px] text-white/60">
              {n > 1 && `média ${nf(tot.t.kcal / div)} kcal por dia registrado · `}
              {kcalTarget
                ? `${Math.round((tot.t.kcal / kcalTarget) * 100)}% da meta (${nf(kcalTarget)})`
                : "sem meta definida"}
            </p>
          </div>
        </div>
        {n > 1 && (
          <div
            className="mt-3 flex h-14 items-end gap-[3px]"
            role="img"
            aria-label="Calorias por dia"
          >
            {bars.map((v, i) => (
              <span
                key={keys[i]}
                title={`${keys[i].slice(8)}/${keys[i].slice(5, 7)}: ${nf(v)} kcal`}
                className="flex-1 rounded-t-sm bg-gradient-to-t from-orange-500 to-amber-300"
                style={{
                  height: `${Math.max(v ? 6 : 0, (v / barMax) * 100)}%`,
                  opacity: keys[i] === today ? 1 : 0.7,
                }}
              />
            ))}
          </div>
        )}
        <div
          className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10"
          role="img"
          aria-label="Divisão de macronutrientes"
        >
          <span
            style={{ width: `${((tot.t.protein * 4) / macroKcal) * 100}%`, background: "#4ade80" }}
          />
          <span
            style={{ width: `${((tot.t.carbs * 4) / macroKcal) * 100}%`, background: "#fbbf24" }}
          />
          <span
            style={{ width: `${((tot.t.fat * 9) / macroKcal) * 100}%`, background: "#fb7185" }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(
            [
              ["Proteína", tot.t.protein, targets.protein, "#4ade80", Egg],
              ["Carboidratos", tot.t.carbs, targets.carbs, "#fbbf24", Wheat],
              ["Gorduras", tot.t.fat, targets.fat, "#fb7185", Droplet],
            ] as const
          ).map(([label, v, tg, color, Icon]) => (
            <div key={label} className="rounded-2xl bg-black/25 p-2.5 ring-1 ring-white/10">
              <p className="flex items-center gap-1 text-[11px] font-semibold text-white/65">
                <Icon size={12} style={{ color }} /> <span className="truncate">{label}</span>
              </p>
              <p className="mt-1 text-xl font-extrabold tabular-nums">
                {nf(v)}
                <span className="ml-0.5 text-[11px] font-semibold text-white/50">g</span>
              </p>
              {n > 1 && <p className="text-[10px] text-white/50">{nf(v / div)} g/dia</p>}
              {tg > 0 && <Meter pct={(v / (tg * n)) * 100} color={color} />}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-white/[.05] p-4 ring-1 ring-white/10">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white/70">
          <Leaf size={14} className="text-emerald-300" /> Fibras, vitaminas e minerais
        </p>
        <ul className="grid grid-cols-2 gap-2">
          {MICROS.map((m) => {
            const v = tot.t[m.k];
            const pct = (v / (m.ref * n)) * 100;
            return (
              <li key={m.k} className="rounded-2xl bg-black/20 p-2.5 ring-1 ring-white/10">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="truncate text-[11px] font-semibold text-white/70">
                    {m.label}
                  </span>
                  <span className="text-[10px] font-bold tabular-nums text-white/55">
                    {Math.round(pct)}%
                  </span>
                </div>
                <p className="text-lg font-extrabold tabular-nums">
                  {nf(v)}
                  <span className="ml-0.5 text-[10px] font-semibold text-white/50">{m.unit}</span>
                </p>
                <Meter pct={pct} color={m.color} />
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[10px] text-white/45">
          Percentual sobre valores de referência diários (adulto) × dias do período. Estimativa a
          partir dos alimentos registrados.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => {
            window.location.hash = "cafeina";
          }}
          className="rounded-3xl bg-gradient-to-br from-amber-500/25 to-white/[.04] p-3.5 text-left ring-1 ring-amber-300/25 active:scale-[.98]"
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
            <Coffee size={14} className="text-amber-300" /> Cafeína
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums">
            {nf(cafMg)}
            <span className="ml-1 text-xs font-semibold text-white/50">mg</span>
          </p>
          <p className="text-[11px] text-white/60">
            {caf.length} {caf.length === 1 ? "dose" : "doses"}
            {n > 1 ? ` · ${nf(cafMg / n)} mg/dia` : ` · limite ${cafLimit} mg`}
          </p>
          <Meter
            pct={(cafMg / (cafLimit * n)) * 100}
            color={cafMg > cafLimit * n ? "#ef4444" : "#fbbf24"}
          />
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.hash = "lactose";
          }}
          className="rounded-3xl bg-gradient-to-br from-emerald-500/25 to-white/[.04] p-3.5 text-left ring-1 ring-emerald-300/25 active:scale-[.98]"
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
            <Milk size={14} className="text-emerald-300" /> Lactose
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums">
            {lacG}
            <span className="ml-1 text-xs font-semibold text-white/50">g</span>
          </p>
          <p className="text-[11px] text-white/60">
            {lac.length} {lac.length === 1 ? "item" : "itens"}
            {n > 1
              ? ` · ${Math.round((lacG / n) * 10) / 10} g/dia`
              : ` · ideal até ${LACTOSE_THRESHOLDS.dayOk} g`}
          </p>
          <Meter
            pct={(lacG / (LACTOSE_THRESHOLDS.dayOk * n)) * 100}
            color={lacG > LACTOSE_THRESHOLDS.dayOk * n ? "#ef4444" : "#34d399"}
          />
        </button>
      </div>
      {!loaded && <p className="text-center text-[11px] text-white/50">Carregando ingestão…</p>}
    </div>
  );
}
