import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Info, Plus, X } from "lucide-react";
import { measureUnit, microTargets, parseFoodText, sumNutrients } from "@/lib/food-parser";
import { FoodVitamins } from "./FoodVitamins";

export type Suggestion = { label: string; text: string };
const nf = (n: number, digits = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });

/** Informações nutricionais de uma sugestão: tela cheia com macros, distribuição de energia, vitaminas e minerais. Só fecha no botão Sair. */
export function NutritionInfoCard({ item, onClose }: { item: Suggestion; onClose: () => void }) {
  const foods = parseFoodText(item.text);
  const total = sumNutrients(foods.map((f) => f.nutrients));
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  const macros: {
    label: string;
    value: number;
    unit: string;
    ref: number;
    color: string;
    kcal: number;
  }[] = [
    {
      label: "Proteínas",
      value: total.protein,
      unit: "g",
      ref: 50,
      color: "#38bdf8",
      kcal: total.protein * 4,
    },
    {
      label: "Carboidratos",
      value: total.carbs,
      unit: "g",
      ref: 300,
      color: "#fbbf24",
      kcal: total.carbs * 4,
    },
    {
      label: "Gorduras",
      value: total.fat,
      unit: "g",
      ref: 70,
      color: "#fb7185",
      kcal: total.fat * 9,
    },
    { label: "Fibras", value: total.fiber, unit: "g", ref: 25, color: "#34d399", kcal: 0 },
  ];
  const energy = macros.reduce((a, m) => a + m.kcal, 0) || 1;
  const R = 52,
    C = 2 * Math.PI * R;
  let acc = 0;
  const body = (
    <section
      aria-label={`Informações nutricionais: ${item.label}`}
      aria-modal="true"
      className="nv-dark fixed inset-0 z-[11000] flex flex-col bg-[#060d15] text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(60rem_30rem_at_85%_-10%,rgba(56,189,248,.18),transparent),radial-gradient(40rem_26rem_at_0%_100%,rgba(52,211,153,.12),transparent)]"
      />
      <header className="relative flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-8">
        <span className="grid size-9 place-items-center bg-white/10">
          <Info size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-white/55">Informações nutricionais</p>
          <h4 className="truncate font-display text-lg font-extrabold leading-tight sm:text-xl">
            {item.label}
          </h4>
        </div>
        <button
          type="button"
          aria-label="Fechar informações"
          onClick={onClose}
          className="inline-flex h-10 items-center gap-2 border border-white/25 bg-white/10 px-4 text-sm font-bold transition hover:bg-white/20 active:scale-95"
        >
          <X size={16} /> Sair
        </button>
      </header>
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8">
        <div className="mx-auto grid max-w-5xl gap-5">
          {foods.length === 0 ? (
            <p className="text-white/70">Ainda não temos os valores nutricionais deste item.</p>
          ) : (
            <>
              <p className="text-sm text-white/65">
                {foods
                  .map((f) => `${f.name.split(",")[0]} ${f.grams} ${measureUnit(f.id)}`)
                  .join(" · ")}
              </p>
              <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
                <div className="grid place-items-center border border-white/10 bg-white/[.04] p-5">
                  <div className="relative size-40">
                    <svg viewBox="0 0 128 128" className="size-full -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r={R}
                        fill="none"
                        stroke="#ffffff14"
                        strokeWidth="12"
                      />
                      {macros
                        .filter((m) => m.kcal > 0)
                        .map((m) => {
                          const len = (m.kcal / energy) * C;
                          const el = (
                            <circle
                              key={m.label}
                              cx="64"
                              cy="64"
                              r={R}
                              fill="none"
                              stroke={m.color}
                              strokeWidth="12"
                              strokeDasharray={`${Math.max(0, len - 2)} ${C}`}
                              strokeDashoffset={-acc}
                              className="nv-donut-in"
                            />
                          );
                          acc += len;
                          return el;
                        })}
                    </svg>
                    <div className="absolute inset-0 grid place-items-center text-center">
                      <span>
                        <strong className="block font-display text-3xl font-extrabold tabular-nums">
                          {Math.round(total.kcal)}
                        </strong>
                        <span className="text-[11px] font-semibold text-white/60">kcal</span>
                      </span>
                    </div>
                  </div>
                  <ul className="mt-4 grid w-full gap-1.5 text-xs">
                    {macros
                      .filter((m) => m.kcal > 0)
                      .map((m) => (
                        <li key={m.label} className="flex items-center gap-2">
                          <i className="size-2.5" style={{ background: m.color }} />
                          <span className="flex-1 text-white/75">{m.label}</span>
                          <strong className="tabular-nums">
                            {Math.round((m.kcal / energy) * 100)}%
                          </strong>
                        </li>
                      ))}
                  </ul>
                  <p className="mt-2 text-[10px] text-white/45">
                    Parte da energia vinda de cada macronutriente
                  </p>
                </div>
                <div className="grid content-start gap-3 sm:grid-cols-2">
                  {macros.map((m) => {
                    const pct = Math.round((m.value / m.ref) * 100);
                    return (
                      <div key={m.label} className="border border-white/10 bg-white/[.04] p-4">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-semibold text-white/65">{m.label}</span>
                          <span className="text-[11px] tabular-nums text-white/50">
                            {pct}% da referência
                          </span>
                        </div>
                        <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">
                          {nf(m.value)}
                          <span className="ml-1 text-sm font-semibold text-white/55">{m.unit}</span>
                        </p>
                        <span className="mt-2 block h-1.5 bg-white/10" aria-hidden>
                          <span
                            className="nv-grow-x block h-full"
                            style={{ width: `${Math.min(100, pct)}%`, background: m.color }}
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <section
                className="border border-white/10 bg-white/[.04] p-4"
                aria-label="Vitaminas e minerais na porção"
              >
                <h5 className="text-sm font-bold">Vitaminas e minerais na porção</h5>
                <ul className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                  {(Object.keys(microTargets) as (keyof typeof microTargets)[]).map((key) => {
                    const meta = microTargets[key],
                      value = total[key],
                      pct = Math.min(100, Math.round((value / meta.target) * 100));
                    return (
                      <li
                        key={key}
                        className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-xs"
                      >
                        <span className="truncate font-semibold">{meta.label}</span>
                        <span className="h-1.5 bg-white/10" aria-hidden="true">
                          <span
                            className="nv-grow-x block h-full bg-emerald-400"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="tabular-nums text-white/65">
                          {nf(value, value < 10 ? 1 : 0)} {meta.unit}{" "}
                          <span className="text-[10px]">
                            ({Math.round((value / meta.target) * 100)}%)
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
              <FoodVitamins foodIds={foods.map((f) => f.id)} tone="dark" />
              <p className="text-[11px] leading-snug text-white/45">
                Porção estimada pela medida usual. Valores aproximados (TACO, IBGE, TBCA) e
                percentuais sobre a referência diária de um adulto; não substituem a orientação de
                nutricionista.
              </p>
            </>
          )}
        </div>
      </div>
      <footer className="relative flex justify-end border-t border-white/10 px-4 py-3 sm:px-8">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center gap-2 bg-white px-6 text-sm font-bold text-slate-900 transition hover:bg-white/90 active:scale-95"
        >
          <X size={16} /> Sair
        </button>
      </footer>
    </section>
  );
  return typeof document === "undefined" ? body : createPortal(body, document.body);
}

type Props = {
  title: string;
  hint?: string;
  items: Suggestion[];
  description: string;
  onChange: (next: string) => void;
  tone?: "emerald" | "sky";
};

/** Sugestões tocáveis (adicionam ou removem da descrição) com o ícone (i) de informações nutricionais. */
export function MealSuggestions({
  title,
  hint = "toque para adicionar ou remover",
  items,
  description,
  onChange,
  tone = "emerald",
}: Props) {
  const [info, setInfo] = useState<string | null>(null);
  const colors =
    tone === "sky"
      ? {
          on: "border-sky-500 bg-sky-500 text-white",
          off: "border-border bg-card hover:border-sky-500/50 hover:bg-sky-500/[.06]",
          plus: "text-sky-600",
        }
      : {
          on: "border-emerald-500 bg-emerald-500 text-white",
          off: "border-border bg-card hover:border-emerald-500/50 hover:bg-emerald-500/[.06]",
          plus: "text-emerald-600",
        };
  const isOn = (text: string) => description.toLowerCase().includes(text.toLowerCase());
  const toggle = (text: string) => {
    if (isOn(text)) {
      const idx = description.toLowerCase().indexOf(text.toLowerCase());
      const rest = (description.slice(0, idx) + description.slice(idx + text.length))
        .split(/\s*,\s*/)
        .map((part) => part.trim())
        .filter(Boolean);
      onChange(rest.join(", "));
    } else
      onChange(description.trim() ? `${description.trim().replace(/,\s*$/, "")}, ${text}` : text);
  };
  const open = items.find((item) => item.label === info);
  if (!items.length) return null;
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold">
        {title} <span className="font-normal text-muted-foreground">· {hint}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((item) => {
          const on = isOn(item.text),
            shown = info === item.label;
          return (
            <span
              key={item.label}
              className={`inline-flex h-8 items-stretch overflow-hidden rounded-full border text-[11px] font-semibold transition ${on ? colors.on : colors.off}`}
            >
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(item.text)}
                className="inline-flex items-center gap-1 pl-3 pr-2 active:scale-95"
              >
                {on ? <Check size={13} /> : <Plus size={13} className={colors.plus} />}
                {item.label}
              </button>
              <button
                type="button"
                aria-label={`Informações nutricionais de ${item.label}`}
                aria-expanded={shown}
                title="Informações nutricionais"
                onClick={() => setInfo(shown ? null : item.label)}
                className={`grid w-7 place-items-center border-l ${on ? "border-white/30 hover:bg-white/15" : "border-border hover:bg-muted"} ${shown ? "bg-primary text-primary-foreground" : ""}`}
              >
                <Info size={14} />
              </button>
            </span>
          );
        })}
      </div>
      {open && (
        <div className="mt-2">
          <NutritionInfoCard item={open} onClose={() => setInfo(null)} />
        </div>
      )}
    </div>
  );
}
