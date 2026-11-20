import { useMemo, useState } from "react";
import { GainPlanner } from "./GainPlanner";
import { Beef, Droplets, Info, Sparkles, Wheat, Zap, type LucideIcon } from "lucide-react";
import {
  amdr,
  guideGoals,
  macroInfo,
  micros,
  type GuideGoalKey,
  type Micro,
} from "@/lib/nutrient-guide";

type MacroKey = "protein" | "carbs" | "fat";
type Tab = MacroKey | "minerais" | "vitaminas";

const macroColor: Record<MacroKey, string> = {
  protein: "#0d9488",
  carbs: "#d97706",
  fat: "#6366f1",
};
const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "protein", label: "Proteínas", icon: Beef },
  { key: "carbs", label: "Carboidratos", icon: Wheat },
  { key: "fat", label: "Gorduras", icon: Droplets },
  { key: "minerais", label: "Minerais", icon: Zap },
  { key: "vitaminas", label: "Vitaminas", icon: Sparkles },
];
const num = (n: number, d = 0) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });

function Donut({
  split,
  active,
  onPick,
}: {
  split: [number, number, number];
  active: MacroKey;
  onPick: (k: MacroKey) => void;
}) {
  const keys: MacroKey[] = ["protein", "carbs", "fat"];
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-40 w-40 shrink-0"
      role="img"
      aria-label="Divisão da energia entre proteínas, carboidratos e gorduras"
    >
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity=".08"
        strokeWidth="16"
      />
      {keys.map((k, i) => {
        const len = (split[i] / 100) * c;
        const el = (
          <circle
            key={k}
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={macroColor[k]}
            strokeWidth={active === k ? 20 : 16}
            strokeDasharray={`${Math.max(len - 1.5, 0)} ${c}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 60 60)"
            className="cursor-pointer transition-all duration-300"
            opacity={active === k ? 1 : 0.55}
            onClick={() => onPick(k)}
            onMouseEnter={() => onPick(k)}
          />
        );
        offset += len;
        return el;
      })}
      <text
        x="60"
        y="58"
        textAnchor="middle"
        className="fill-foreground text-[18px] font-extrabold"
      >
        {split[keys.indexOf(active)]}%
      </text>
      <text x="60" y="73" textAnchor="middle" className="fill-muted-foreground text-[8px]">
        da energia
      </text>
    </svg>
  );
}

function RangeBar({ k, value }: { k: MacroKey; value: number }) {
  const [lo, hi] = amdr[k];
  const pos = (v: number) => `${Math.min(Math.max(v, 0), 70) / 0.7}%`;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="font-semibold">{macroInfo[k].name}</span>
        <span className="text-muted-foreground">
          faixa recomendada {lo}–{hi}%
        </span>
      </div>
      <div
        className="relative mt-1 h-2 bg-muted"
        role="img"
        aria-label={`${macroInfo[k].name}: ${value}% da energia, faixa ${lo} a ${hi}%`}
      >
        <span
          className="absolute inset-y-0 opacity-25"
          style={{ left: pos(lo), width: `${((hi - lo) / 70) * 100}%`, background: macroColor[k] }}
        />
        <span
          className="absolute -top-0.5 h-3 w-1"
          style={{ left: pos(value), background: macroColor[k] }}
        />
      </div>
    </div>
  );
}

function MicroCard({ m, focus }: { m: Micro; focus: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className={`border p-2.5 text-left transition hover:bg-muted/40 ${focus ? "border-foreground/40" : "border-border"}`}
    >
      <span className="flex items-center justify-between gap-2">
        <strong className="text-sm">{m.name}</strong>
        {focus && (
          <span className="bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background">
            Atenção
          </span>
        )}
      </span>
      <span className="mt-0.5 block text-[11px] text-muted-foreground">{m.ref}</span>
      <span className="mt-1.5 block text-xs">{m.role}</span>
      {open && (
        <span className="nv-fade-in mt-2 block border-t border-border pt-2 text-xs">
          <span className="block">
            <b>Onde encontrar:</b> {m.sources}
          </span>
          {m.note && <span className="mt-1 block text-muted-foreground">{m.note}</span>}
        </span>
      )}
    </button>
  );
}

export function NutrientGuide() {
  const [goalKey, setGoalKey] = useState<GuideGoalKey>("manutencao");
  const [tab, setTab] = useState<Tab>("protein");
  const [weight, setWeight] = useState("");
  const [kcal, setKcal] = useState("");
  const goal = guideGoals.find((g) => g.key === goalKey) ?? guideGoals[0];
  const kg = Number(weight.replace(",", "."));
  const energy = Number(kcal.replace(",", "."));
  const split = goal.split;
  const idx: Record<MacroKey, number> = { protein: 0, carbs: 1, fat: 2 };
  const activeMacro: MacroKey = tab === "minerais" || tab === "vitaminas" ? "protein" : tab;

  const grams = useMemo(() => {
    const out: Partial<Record<MacroKey, string>> = {};
    if (kg > 0) {
      out.protein =
        goal.proteinKg[0] === goal.proteinKg[1]
          ? `≈ ${num(kg * goal.proteinKg[0])} g/dia`
          : `${num(kg * goal.proteinKg[0])}–${num(kg * goal.proteinKg[1])} g/dia`;
    }
    if (energy > 0) {
      out.carbs = `≈ ${num((energy * split[1]) / 100 / 4)} g/dia`;
      out.fat = `≈ ${num((energy * split[2]) / 100 / 9)} g/dia`;
      if (!out.protein) out.protein = `≈ ${num((energy * split[0]) / 100 / 4)} g/dia`;
    }
    return out;
  }, [kg, energy, goal, split]);

  const isMacro = tab === "protein" || tab === "carbs" || tab === "fat";
  const list = micros.filter((m) => m.kind === (tab === "minerais" ? "mineral" : "vitamina"));

  return (
    <section className="space-y-3" aria-label="Guia de nutrientes">
      <div className="border border-border bg-card p-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold">Qual é o seu objetivo?</h3>
            <p className="text-xs text-muted-foreground">
              Escolha e veja o que priorizar em cada nutriente.
            </p>
          </div>
          <div className="flex gap-2">
            <label className="text-[11px] font-semibold">
              Peso (kg)
              <input
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="ex.: 70"
                className="mt-0.5 block h-8 w-24 border border-border bg-background px-2 text-sm font-normal"
              />
            </label>
            <label className="text-[11px] font-semibold">
              Calorias/dia
              <input
                inputMode="numeric"
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                placeholder="opcional"
                className="mt-0.5 block h-8 w-24 border border-border bg-background px-2 text-sm font-normal"
              />
            </label>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Objetivo">
          {guideGoals.map((g) => (
            <button
              key={g.key}
              type="button"
              aria-pressed={goalKey === g.key}
              onClick={() => setGoalKey(g.key)}
              className={
                "border px-2.5 py-1.5 text-xs font-semibold transition " +
                (goalKey === g.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              {g.label}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-sm">{goal.summary}</p>
      </div>

      {(goalKey === "hipertrofia" || goalKey === "ganho_peso") && (
        <GainPlanner
          weightKg={kg > 0 ? kg : 0}
          maintenanceKcal={energy > 0 ? energy : 0}
          proteinKg={goal.proteinKg}
          fatPct={split[2]}
          mode={goalKey === "hipertrofia" ? "massa" : "peso"}
        />
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="border border-border bg-card p-3">
          <h3 className="text-sm font-bold">Divisão ideal da energia</h3>
          <div className="mt-2 grid justify-items-center gap-3">
            <Donut split={split} active={activeMacro} onPick={(k) => setTab(k)} />
            <ul className="w-full min-w-0 space-y-1.5 text-xs">
              {(["protein", "carbs", "fat"] as MacroKey[]).map((k) => (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => setTab(k)}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    <span className="h-2.5 w-2.5 shrink-0" style={{ background: macroColor[k] }} />
                    <span className="flex-1 font-semibold">{macroInfo[k].name}</span>
                    <span className="tabular-nums">{split[idx[k]]}%</span>
                  </button>
                  {grams[k] && <p className="pl-4 text-[11px] text-muted-foreground">{grams[k]}</p>}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 space-y-2.5">
            {(["protein", "carbs", "fat"] as MacroKey[]).map((k) => (
              <RangeBar key={k} k={k} value={split[idx[k]]} />
            ))}
          </div>
          <p className="mt-3 flex gap-1.5 text-[11px] text-muted-foreground">
            <Info size={13} className="mt-px shrink-0" />
            Proteína sugerida:{" "}
            {goal.proteinKg[0] === goal.proteinKg[1]
              ? num(goal.proteinKg[0], 2)
              : `${num(goal.proteinKg[0], 2)}–${num(goal.proteinKg[1], 2)}`}{" "}
            g por kg de peso. Informe o peso ou as calorias para ver em gramas.
          </p>
        </div>

        <div className="border border-border bg-card">
          <nav className="flex overflow-x-auto border-b border-border" aria-label="Nutrientes">
            {tabs.map((t) => {
              const Icon = t.icon;
              const on = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-current={on ? "page" : undefined}
                  className={
                    "-mb-px inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap border-b-2 px-1.5 text-xs font-semibold " +
                    (on
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground")
                  }
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </nav>
          <div key={tab + goalKey} className="nv-fade-in p-3">
            {isMacro ? (
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-bold" style={{ color: macroColor[tab] }}>
                    {macroInfo[tab].name} · {macroInfo[tab].kcal} kcal por grama
                  </h4>
                  <p className="mt-1">{macroInfo[tab].role}</p>
                </div>
                <div
                  className="border-l-2 bg-muted/40 p-2.5"
                  style={{ borderColor: macroColor[tab] }}
                >
                  <p className="text-[11px] font-bold">O que fazer no seu objetivo</p>
                  <p className="mt-0.5">{goal.actions[tab]}</p>
                </div>
                <p>
                  <b>Boas fontes:</b> {macroInfo[tab].sources}
                </p>
                <p className="text-muted-foreground">{macroInfo[tab].tip}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-l-2 border-foreground bg-muted/40 p-2.5 text-sm">
                  <p className="text-[11px] font-bold">O que fazer no seu objetivo</p>
                  <p className="mt-0.5">{goal.actions.micro}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {list.map((m) => (
                    <MicroCard key={m.id} m={m} focus={goal.focus.includes(m.id)} />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Valores para adultos saudáveis (DRIs). Toque em um nutriente para ver as fontes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="flex gap-2 border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
        <Info size={14} className="mt-px shrink-0" />
        {goal.care} Conteúdo educativo com base em DRIs, OMS, ACSM e ISSN; não substitui
        acompanhamento com nutricionista ou médico.
      </p>
      <p className="text-[11px] text-muted-foreground">
        Fontes:{" "}
        {[
          ["DRIs: proteína", "https://nap.edu/read/11537/chapter/14"],
          ["DRIs: carboidratos", "https://pmc.ncbi.nlm.nih.gov/articles/PMC9314892/table/tbl1"],
          [
            "OMS: alimentação saudável",
            "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
          ],
          ["ISSN: proteína e exercício", "https://pubmed.ncbi.nlm.nih.gov/28642676/"],
          ["ISSN: dietas e composição corporal", "https://pubmed.ncbi.nlm.nih.gov/28630601/"],
          ["Revisão: ganho de peso em atletas", "https://pubmed.ncbi.nlm.nih.gov/35233712/"],
          [
            "NHS: ganhar peso",
            "https://www.nhs.uk/live-well/healthy-weight/keeping-your-weight-up-in-later-life/",
          ],
          [
            "ACSM: nutrição e desempenho",
            "https://journals.lww.com/acsm-msse/Fulltext/2016/03000/Nutrition_and_Athletic_Performance.25.aspx",
          ],
          ["NIH ODS: gestação", "https://ods.od.nih.gov/factsheets/Pregnancy/"],
        ].map(([t, u], i) => (
          <span key={u}>
            {i > 0 && " · "}
            <a
              href={u}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              {t}
            </a>
          </span>
        ))}
        .
      </p>
    </section>
  );
}
