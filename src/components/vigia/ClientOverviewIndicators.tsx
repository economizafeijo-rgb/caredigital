import { Activity, Droplets, Flame, Scale, Wheat, Beef } from "lucide-react";

type Props = {
  heightCm: number | null;
  weightKg: number | null;
  waterTarget: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  kcal: number | null;
};

const numberPt = (value: number | null, digits = 0) =>
  value == null || !Number.isFinite(value) || value <= 0
    ? "—"
    : value.toLocaleString("pt-BR", { maximumFractionDigits: digits });

export function ClientOverviewIndicators({ heightCm, weightKg, waterTarget, protein, carbs, fat, kcal }: Props) {
  const bmi = heightCm && heightCm > 0 && weightKg && weightKg > 0
    ? weightKg / ((heightCm / 100) ** 2)
    : null;
  const bmiLabel = bmi == null ? "Dados incompletos"
    : bmi < 18.5 ? "Abaixo da faixa de referência"
    : bmi < 25 ? "Faixa de referência"
    : bmi < 30 ? "Acima da faixa de referência"
    : "Faixa elevada";
  const items = [
    { key: "bmi", label: "IMC", value: numberPt(bmi, 1), unit: "", note: bmiLabel, icon: Scale, detail: "O IMC é uma relação entre peso e altura. É um indicador de triagem e não substitui avaliação clínica individual." },
    { key: "water", label: "Água por dia", value: numberPt(waterTarget), unit: "ml", note: waterTarget ? "Meta cadastrada" : "Meta não disponível", icon: Droplets, detail: "Meta diária apresentada conforme o objetivo de hidratação disponível no prontuário. Restrições de líquidos devem seguir a orientação profissional." },
    { key: "protein", label: "Proteínas", value: numberPt(protein), unit: "g", note: protein ? "Meta diária" : "Não definida", icon: Beef, detail: "Meta nutricional cadastrada para proteínas. Não é uma recomendação nova nem uma prescrição gerada por esta tela." },
    { key: "carbs", label: "Carboidratos", value: numberPt(carbs), unit: "g", note: carbs ? "Meta diária" : "Não definida", icon: Wheat, detail: "Meta nutricional cadastrada para carboidratos. Consulte os detalhes do perfil para entender a distribuição individual." },
    { key: "fat", label: "Gorduras", value: numberPt(fat), unit: "g", note: fat ? "Meta diária" : "Não definida", icon: Activity, detail: "Meta nutricional cadastrada para gorduras. O valor é exibido como consta no perfil." },
    { key: "energy", label: "Energia", value: numberPt(kcal), unit: "kcal", note: kcal ? "Meta diária" : "Não definida", icon: Flame, detail: "Meta energética diária cadastrada. A tela não recalcula nem altera esse objetivo." },
  ];
  return <section className="care-overview-indicators" aria-label="Indicadores de saúde">
    <div className="care-overview-section-heading">
      <div><span className="care-overview-eyebrow">SEUS INDICADORES</span><h3>Saúde e nutrição</h3></div>
      <span className="care-overview-heading-note">Dados do perfil</span>
    </div>
    <div className="care-overview-indicator-grid">
      {items.map(item => {
        const Icon = item.icon;
        return <details key={item.key} className="care-overview-indicator">
          <summary>
            <span className="care-overview-indicator-icon"><Icon size={15}/></span>
            <span className="care-overview-indicator-copy"><span>{item.label}</span><strong>{item.value}<small>{item.unit}</small></strong><em>{item.note}</em></span>
          </summary>
          <p>{item.detail}</p>
        </details>;
      })}
    </div>
  </section>;
}
