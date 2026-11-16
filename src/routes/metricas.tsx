import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/metricas")({
  head: () => ({
    meta: [
      { title: "Métricas e gráficos — NextVita" },
      { name: "description", content: "Conheça os gráficos e indicadores de nutrição, hidratação, peso e atividade do NextVita." },
      { property: "og:title", content: "Métricas e gráficos — NextVita" },
      { property: "og:description", content: "Conheça os gráficos e indicadores de nutrição, hidratação, peso e atividade do NextVita." },
    ],
  }),
  component: Metricas,
});

function Metricas() {
  return <PublicCareShowcase kind="metrics" />;
}
