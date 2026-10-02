import { createFileRoute } from "@tanstack/react-router";
import { SportsNutritionLibrary } from "@/components/vigia/SportsNutritionLibrary";
import { PageHeader } from "@/components/vigia/ui";

export const Route = createFileRoute("/nutricao-esportiva")({
  head: () => ({
    meta: [
      { title: "Nutrição esportiva — Vigia" },
      { name: "description", content: "Planos de refeições por objetivo e referências educativas para suplementos esportivos." },
    ],
  }),
  component: NutricaoEsportiva,
});

function NutricaoEsportiva() {
  return <><PageHeader eyebrow="Alimentação, treino e suplementação" title="Nutrição esportiva" /><SportsNutritionLibrary /></>;
}
