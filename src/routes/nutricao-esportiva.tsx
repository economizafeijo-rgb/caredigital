import { createFileRoute } from "@tanstack/react-router";
import { SportsNutritionLibrary } from "@/components/vigia/SportsNutritionLibrary";

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
  return <>
    <section className="relative isolate mb-5 overflow-hidden rounded-3xl bg-foreground bg-cover bg-center px-4 py-5 text-primary-foreground sm:px-6 md:mb-7 md:px-8 md:py-7" style={{ backgroundImage: "linear-gradient(90deg, rgba(7, 20, 33, .97) 0%, rgba(7, 20, 33, .86) 48%, rgba(7, 20, 33, .38) 100%), url('/images/caredigital-nutrition-hero.webp')" }}>
      <div className="label-mono text-primary-foreground/65">Alimentação, treino e suplementação</div>
      <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Nutrição esportiva</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-foreground/80">Planos de refeições e informações responsáveis sobre suplementos para seus objetivos.</p>
    </section>
    <SportsNutritionLibrary />
  </>;
}
