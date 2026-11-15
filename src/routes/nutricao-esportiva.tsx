import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/nutricao-esportiva")({
  head: () => ({
    meta: [
      { title: "Nutrição esportiva — NextVita" },
      { name: "description", content: "Conheça como o NextVita apresenta objetivos alimentares, horários de refeições e acompanhamento de forma educativa e privada." },
      { property: "og:title", content: "Nutrição esportiva — NextVita" },
      { property: "og:description", content: "Uma introdução clara à organização da rotina alimentar para quem pratica atividades físicas." },
    ],
  }),
  component: NutricaoEsportiva,
});

function NutricaoEsportiva() {
  return <PublicCareShowcase kind="sports" />;
}
