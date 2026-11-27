import { Activity, Droplets, Flame, Scale, Wheat, Beef } from "lucide-react";
import { EvolutionHub } from "./EvolutionHub";
import { estimateActivityFactor, estimateObjectiveNutrition } from "@/lib/objective-nutrition";

type Props = {
  heightCm: number | null;
  weightKg: number | null;
  waterTarget: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  kcal: number | null;
  patientId?: string;
  ownerId?: string;
  revision?: number;
  full?: boolean;
  /** Dados do perfil para estimar metas que ainda não foram definidas manualmente. */
  age?: number | null;
  sex?: string | null;
  objective?: string | null;
  activityMinutes?: number | null;
  onCompleteProfile?: () => void;
};
const numberPt = (value: number | null, digits = 0) =>
  value == null || !Number.isFinite(value) || value <= 0
    ? "—"
    : value.toLocaleString("pt-BR", { maximumFractionDigits: digits });

export function ClientOverviewIndicators({
  heightCm,
  weightKg,
  waterTarget,
  protein,
  carbs,
  fat,
  kcal,
  patientId,
  ownerId,
  revision = 0,
  full = false,
  age = null,
  sex = null,
  objective = null,
  activityMinutes = null,
  onCompleteProfile,
}: Props) {
  const base = {
    weight: weightKg,
    age,
    heightCm,
    sex,
    objective,
    activityFactor: estimateActivityFactor(activityMinutes),
  };
  const exact = estimateObjectiveNutrition(base);
  // Perfil incompleto (idade, sexo ou altura): usa uma estimativa média para não deixar o painel vazio.
  const approximate = !exact.valid && weightKg !== null && weightKg >= 30;
  const est = (() => {
    if (!approximate) return exact;
    const sexes = sex ? [sex] : ["male", "female"];
    const list = sexes.map((sx) =>
      estimateObjectiveNutrition({ ...base, age: age ?? 30, heightCm: heightCm ?? 168, sex: sx }),
    );
    const avg = (f: (e: (typeof list)[number]) => number | null) => {
      const v = list.map(f).filter((x): x is number => x !== null);
      return v.length ? Math.round(v.reduce((x, y) => x + y, 0) / v.length) : null;
    };
    return {
      ...exact,
      target: avg((e) => e.target),
      carbs: avg((e) => e.carbs),
      protein: exact.protein ?? avg((e) => e.protein),
    };
  })();
  const waterEst = weightKg && weightKg > 0 ? Math.round((weightKg * 35) / 50) * 50 : null;
  const pick = (own: number | null, guess: number | null) =>
    own && own > 0
      ? { v: own, note: "Meta diária" }
      : guess
        ? { v: guess, note: approximate ? "Estimativa média" : "Estimado pelo perfil" }
        : { v: null, note: "Complete o perfil" };
  const pw = pick(waterTarget, waterEst),
    pp = pick(protein, est.protein),
    pc = pick(carbs, est.carbs),
    pf = pick(fat, est.fat),
    pk = pick(kcal, est.target);
  const missing = [pw, pp, pc, pf, pk].filter((x) => x.v === null).length;
  const bmi =
    heightCm && heightCm > 0 && weightKg && weightKg > 0 ? weightKg / (heightCm / 100) ** 2 : null;
  const bmiLabel =
    bmi == null
      ? "Dados incompletos"
      : bmi < 18.5
        ? "Abaixo da faixa de referência"
        : bmi < 25
          ? "Faixa de referência"
          : bmi < 30
            ? "Acima da faixa de referência"
            : "Faixa elevada";
  const items = [
    {
      key: "bmi",
      color: "#8b5cf6",
      label: "IMC",
      value: numberPt(bmi, 1),
      unit: "",
      note: bmiLabel,
      icon: Scale,
      detail:
        "O IMC é uma relação entre peso e altura. É um indicador de triagem e não substitui avaliação clínica individual.",
    },
    {
      key: "water",
      color: "#0ea5e9",
      label: "Água por dia",
      value: numberPt(pw.v),
      unit: "ml",
      note: pw.note,
      icon: Droplets,
      detail:
        "Meta diária apresentada conforme o objetivo de hidratação disponível no prontuário. Restrições de líquidos devem seguir a orientação profissional.",
    },
    {
      key: "protein",
      color: "#f43f5e",
      label: "Proteínas",
      value: numberPt(pp.v),
      unit: "g",
      note: pp.note,
      icon: Beef,
      detail:
        "Meta nutricional cadastrada para proteínas. Não é uma recomendação nova nem uma prescrição gerada por esta tela.",
    },
    {
      key: "carbs",
      color: "#eab308",
      label: "Carboidratos",
      value: numberPt(pc.v),
      unit: "g",
      note: pc.note,
      icon: Wheat,
      detail:
        "Meta nutricional cadastrada para carboidratos. Consulte os detalhes do perfil para entender a distribuição individual.",
    },
    {
      key: "fat",
      color: "#14b8a6",
      label: "Gorduras",
      value: numberPt(pf.v),
      unit: "g",
      note: pf.note,
      icon: Activity,
      detail: "Meta nutricional cadastrada para gorduras. O valor é exibido como consta no perfil.",
    },
    {
      key: "energy",
      color: "#f97316",
      label: "Energia",
      value: numberPt(pk.v),
      unit: "kcal",
      note: pk.note,
      icon: Flame,
      detail: "Meta energética diária cadastrada. A tela não recalcula nem altera esse objetivo.",
    },
  ];

  return (
    <section className="care-overview-indicators" aria-label="Indicadores de saúde">
      <div className="care-overview-section-heading">
        <div>
          <span className="care-overview-eyebrow">Seus indicadores</span>
          <h3>Saúde e nutrição</h3>
        </div>
        <span className="care-overview-heading-note">
          {full ? "Histórico por dia, mês e ano" : "Metas do dia"}
        </span>
      </div>
      <div className="care-overview-indicator-grid">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <details
              key={item.key}
              className="care-overview-indicator"
              style={{ "--ind": item.color } as React.CSSProperties}
            >
              <summary>
                <span className="care-overview-indicator-icon">
                  <Icon size={15} />
                </span>
                <span className="care-overview-indicator-copy">
                  <span>{item.label}</span>
                  <strong>
                    {item.value}
                    <small>{item.unit}</small>
                  </strong>
                  <em>{item.note}</em>
                </span>
              </summary>
              <p>{item.detail}</p>
            </details>
          );
        })}
      </div>
      {(missing > 0 || approximate) && onCompleteProfile && (
        <button
          type="button"
          onClick={onCompleteProfile}
          className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-left text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          <span>
            Informe idade, sexo e altura para trocar a estimativa média por metas só suas.
          </span>
          <span aria-hidden="true">→</span>
        </button>
      )}
      {full && patientId && ownerId && (
        <div className="mt-3">
          <EvolutionHub
            patientId={patientId}
            ownerId={ownerId}
            waterTarget={waterTarget}
            revision={revision}
          />
        </div>
      )}
    </section>
  );
}
