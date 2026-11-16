import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/suplementos")({
  head: () => ({
    meta: [
      { title: "Controle de suplementação — NextVita" },
      { name: "description", content: "Programe suplementos com dose, horário, timer e biblioteca de dicas." },
      { property: "og:title", content: "Controle de suplementação — NextVita" },
      { property: "og:description", content: "Programe suplementos com dose, horário, timer e biblioteca de dicas." },
    ],
  }),
  component: Suplementos,
});

function Suplementos() {
  return <PublicCareShowcase kind="supplements" />;
}
