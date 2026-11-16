import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/peso")({
  head: () => ({
    meta: [
      { title: "Controle de peso — NextVita" },
      { name: "description", content: "Registre seu peso e acompanhe a evolução, o IMC e a meta com gráficos." },
      { property: "og:title", content: "Controle de peso — NextVita" },
      { property: "og:description", content: "Registre seu peso e acompanhe a evolução, o IMC e a meta com gráficos." },
    ],
  }),
  component: Peso,
});

function Peso() {
  return <PublicCareShowcase kind="weight" />;
}
