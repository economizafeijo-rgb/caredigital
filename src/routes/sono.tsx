import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/sono")({
  head: () => ({
    meta: [
      { title: "Monitoramento do sono — NextVita" },
      { name: "description", content: "Nota do sono, horas dormidas, regularidade e batimentos em tempo real com sensor Bluetooth." },
      { property: "og:title", content: "Monitoramento do sono — NextVita" },
      { property: "og:description", content: "Durma melhor com dados de verdade: nota do sono, evolução e sensor em tempo real." },
    ],
  }),
  component: Sono,
});

function Sono() {
  return <PublicCareShowcase kind="sleep" />;
}
