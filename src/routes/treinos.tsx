import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/treinos")({
  head: () => ({
    meta: [
      { title: "Treinos e corridas — NextVita" },
      { name: "description", content: "Rastreie caminhadas e corridas por GPS e acompanhe seus treinos." },
      { property: "og:title", content: "Treinos e corridas — NextVita" },
      { property: "og:description", content: "Rastreie caminhadas e corridas por GPS e acompanhe seus treinos." },
    ],
  }),
  component: Treinos,
});

function Treinos() {
  return <PublicCareShowcase kind="training" />;
}
