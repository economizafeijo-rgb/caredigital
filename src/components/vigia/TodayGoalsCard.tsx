import { useState } from "react";
import { ChevronDown, ChevronRight, Flame } from "lucide-react";
import { acreDateKey, acreTimeLabel } from "@/lib/acre-time";
import { microTargets } from "@/lib/food-parser";
import { useDailyNutrition } from "./DailyNutritionPanel";
import { useHealthLimits } from "./useHealthLimits";
import { useIntakeRecords } from "./useIntakeRecords";
import { NutrientDetailSheet, type DetailInfo, type DetailItem } from "./NutrientDetailSheet";

const nf = (n: number, d = 0) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });

/** Preenche a coluna dos indicadores: quanto do dia já foi consumido em relação às metas. */
export function TodayGoalsCard({
  patientId,
  ownerId,
  revision,
}: {
  patientId: string;
  ownerId: string;
  revision: number;
}) {
  const d = useDailyNutrition(patientId, ownerId, revision);
  const { limits } = useHealthLimits(patientId);
  const intake = useIntakeRecords(patientId, ownerId, 2);
  const today = acreDateKey();
  const cafMg = intake.caffeine
    .filter((r) => acreDateKey(r.at) === today)
    .reduce((a, r) => a + r.mg, 0);
  const lacG = intake.lactose
    .filter((r) => acreDateKey(r.at) === today && !r.free)
    .reduce((a, r) => a + r.g, 0);
  const sugarG = intake.sugar
    .filter((r) => acreDateKey(r.at) === today)
    .reduce((a, r) => a + r.g, 0);
  const satG = intake.satFat
    .filter((r) => acreDateKey(r.at) === today)
    .reduce((a, r) => a + r.g, 0);
  // OMS: açúcar livre abaixo de 10% e gordura saturada abaixo de 10% das calorias do dia.
  const kcalGoal = d.target.kcal || 2000;
  const sugarLimit = Math.round((kcalGoal * 0.1) / 4);
  const satLimit = Math.round((kcalGoal * 0.1) / 9);
  const micro: Row[] = (Object.keys(microTargets) as (keyof typeof microTargets)[]).map((k) => ({
    id: k,
    label: microTargets[k].label,
    v: d.total[k],
    t: microTargets[k].target,
    u: microTargets[k].unit,
    c: "#2dd4bf",
  }));
  const fats: Row[] = [
    {
      id: "sugar",
      label: "Açúcar adicionado",
      v: sugarG,
      t: sugarLimit,
      u: "g",
      c: "#f472b6",
      limit: true,
    },
    {
      id: "satfat",
      label: "Gordura saturada",
      v: satG,
      t: satLimit,
      u: "g",
      c: "#fb923c",
      limit: true,
    },
  ];
  const watch: Row[] = [
    {
      id: "caffeine",
      label: "Cafeína",
      v: cafMg,
      t: limits.caffeineDayMg ?? 400,
      u: "mg",
      c: "#f59e0b",
      limit: true,
    },
    {
      id: "lactose",
      label: "Lactose",
      v: lacG,
      t: (limits.lactoseIntolerant ? limits.lactoseDayG : null) ?? 18,
      u: "g",
      c: "#10b981",
      limit: true,
    },
  ];
  const rows: Row[] = [
    { id: "kcal", label: "Energia", v: d.total.kcal, t: d.target.kcal, u: "kcal", c: "#fb923c" },
    {
      id: "protein",
      label: "Proteínas",
      v: d.total.protein,
      t: d.target.protein,
      u: "g",
      c: "#fb7185",
    },
    {
      id: "carbs",
      label: "Carboidratos",
      v: d.total.carbs,
      t: d.target.carbs,
      u: "g",
      c: "#fbbf24",
    },
    { id: "fat", label: "Gorduras", v: d.total.fat, t: d.target.fat, u: "g", c: "#2dd4bf" },
    { id: "fiber", label: "Fibras", v: d.total.fiber, t: d.target.fiber, u: "g", c: "#a3e635" },
  ];
  const [pick, setPick] = useState<Row | null>(null);
  const todayOnly = <T extends { at: string }>(l: T[]) =>
    l.filter((r) => acreDateKey(r.at) === today);
  const nutrientItems = (key: string): DetailItem[] =>
    d.entries.flatMap((e, ei) => {
      const when = acreTimeLabel(e.at);
      if (e.foods.length)
        return e.foods.map((f, i) => ({
          id: `${ei}-${i}`,
          name: f.name,
          sub: `${when} · ${Math.round(f.grams)} g${f.estimatedPortion ? " (porção estimada)" : ""}`,
          v: Number((f.nutrients as unknown as Record<string, number>)[key]) || 0,
        }));
      if (e.direct)
        return [
          {
            id: `${ei}-d`,
            name: e.foodName ?? e.text,
            sub: `${when}${e.amountMl ? ` · ${e.amountMl} ml` : e.grams ? ` · ${Math.round(e.grams)} g` : ""}`,
            v: Number((e.direct as unknown as Record<string, number>)[key]) || 0,
          },
        ];
      return [];
    });
  const detail = (r: Row): DetailInfo => {
    const base = { label: r.label, unit: r.u, color: r.c, total: r.v, target: r.t, limit: r.limit };
    const ABOUT: Record<string, string> = {
      kcal: "Energia vem de carboidratos, proteínas e gorduras de tudo o que você registrou.",
      protein: "A proteína ajuda a manter músculos e a saciedade.",
      carbs: "Carboidratos são a principal fonte de energia do corpo.",
      fat: "Gorduras fornecem energia e ajudam a absorver vitaminas A, D, E e K.",
      fiber: "As fibras vêm de frutas, verduras, legumes, grãos e leguminosas.",
      vitC: "A vitamina C vem sobretudo de frutas cítricas, acerola, goiaba e pimentão.",
      vitA: "A vitamina A vem de cenoura, abóbora, folhas escuras, ovos e fígado.",
      calcium: "O cálcio vem de leite, iogurte, queijos e folhas verde-escuras.",
      iron: "O ferro vem de carnes, feijão, lentilha e folhas escuras; a vitamina C ajuda a absorver.",
      potassium: "O potássio vem de banana, feijão, batata, tomate e laranja.",
      caffeine:
        "A cafeína é somada de café, chás, refrigerantes, energéticos, chocolate e pré-treino.",
      lactose: "A lactose é somada de leite, iogurte, queijos e outros laticínios.",
      sugar:
        "Açúcar livre: o adicionado a alimentos e bebidas, mais mel e sucos. Limite de 10% das calorias.",
      satfat:
        "Gordura saturada: manteiga, queijos, carnes gordas, frituras e embutidos. Limite de 10% das calorias.",
    };
    const about = ABOUT[r.id] ?? "";
    if (r.id === "caffeine")
      return {
        ...base,
        about,
        items: todayOnly(intake.caffeine).map((x) => ({
          id: x.id,
          name: x.label,
          sub: `${acreTimeLabel(x.at)}${x.ml ? ` · ${x.ml} ml` : ""}`,
          v: x.mg,
        })),
      };
    if (r.id === "lactose")
      return {
        ...base,
        about,
        items: todayOnly(intake.lactose)
          .filter((x) => !x.free)
          .map((x) => ({
            id: x.id,
            name: x.label,
            sub: `${acreTimeLabel(x.at)} · ${x.amount} g/ml`,
            v: x.g,
          })),
      };
    if (r.id === "sugar")
      return {
        ...base,
        about,
        items: todayOnly(intake.sugar).map((x) => ({
          id: x.id,
          name: x.label,
          sub: acreTimeLabel(x.at),
          v: x.g,
        })),
      };
    if (r.id === "satfat")
      return {
        ...base,
        about,
        items: todayOnly(intake.satFat).map((x) => ({
          id: x.id,
          name: x.label,
          sub: acreTimeLabel(x.at),
          v: x.g,
        })),
      };
    return { ...base, about, items: nutrientItems(r.id) };
  };
  const meals = d.entries.filter((e) => e.entryType !== "beverage").length;
  return (
    <section
      aria-label="Consumo de hoje"
      className="flex flex-1 flex-col border border-border bg-card p-3.5 shadow-card"
      style={{ ["--ca" as string]: "#fb923c" }}
    >
      <div className="care-overview-section-heading shrink-0">
        <div>
          <span className="care-overview-eyebrow">Hoje</span>
          <h3>Consumo em relação às metas</h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Flame size={12} className="text-orange-400" /> {meals}{" "}
          {meals === 1 ? "refeição" : "refeições"}
        </span>
      </div>
      <Group title="Macronutrientes" rows={rows} onPick={setPick} />
      <Group
        title="Açúcar e gordura"
        rows={fats}
        onPick={setPick}
        className="mt-4"
        note="Limites de 10% das calorias da sua meta (OMS). Estimado pelos alimentos registrados."
      />
      <Group
        title="Vitaminas, minerais e fibras"
        rows={micro}
        className="mt-4"
        collapsed
        onPick={setPick}
      />
      <Group
        title="Atenção do dia"
        rows={watch}
        onPick={setPick}
        className="mt-4"
        note={
          limits.lactoseIntolerant
            ? "Limites calculados do seu perfil."
            : "Cafeína pelo seu perfil; lactose em valor de referência."
        }
      />
      {pick && <NutrientDetailSheet info={detail(pick)} onClose={() => setPick(null)} />}
    </section>
  );
}

type Row = {
  id: string;
  label: string;
  v: number;
  t: number;
  u: string;
  c: string;
  limit?: boolean;
};

/** Bloco de barras de progresso; nos itens com limite, passar do valor deixa a barra vermelha. */
function Group({
  title,
  rows,
  className = "",
  note,
  collapsed = false,
  onPick,
}: {
  title: string;
  rows: Row[];
  className?: string;
  note?: string;
  collapsed?: boolean;
  onPick: (r: Row) => void;
}) {
  const [open, setOpen] = useState(!collapsed);
  const hit = rows.filter((r) => r.t > 0 && r.v / r.t >= 1).length;
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex min-h-9 w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-xs font-bold text-foreground">{title}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {!open && `${hit}/${rows.length} atingidos`}
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {open && (
        <ul className="grid gap-2.5">
          {rows.map((r) => {
            const ratio = r.t > 0 ? r.v / r.t : 0;
            const over = r.limit && ratio > 1;
            return (
              <li key={r.label}>
                <button
                  type="button"
                  onClick={() => onPick(r)}
                  aria-label={`Ver detalhes de ${r.label}`}
                  className="grid w-full gap-1 rounded-xl p-1.5 text-left transition hover:bg-muted/50 active:scale-[0.99]"
                >
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-semibold">{r.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      <b className={over ? "text-red-400" : "text-foreground"}>
                        {nf(r.v, r.u === "kcal" || r.u === "mg" || r.u === "mcg" ? 0 : 1)}
                      </b>{" "}
                      / {nf(r.t)} {r.u} · {nf(ratio * 100)}%
                      <ChevronRight size={12} className="ml-1 inline" aria-hidden="true" />
                    </span>
                  </div>
                  <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <i
                      className="block h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${Math.min(100, ratio * 100)}%`,
                        background: over
                          ? "#ef4444"
                          : `linear-gradient(90deg, ${r.c}, color-mix(in srgb, ${r.c} 60%, #fff))`,
                      }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && note && <p className="mt-2 text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}
