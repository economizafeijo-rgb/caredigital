import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/hidratacao")({
  head: () => ({ meta: [
    { title: "Hidratação — CareDigital" },
    { name: "description", content: "Conheça o programa individual de hidratação, lembretes, copos ilustrados e confirmações do CareDigital." },
  ] }),
  component: Hidratacao,
});

function Hidratacao() {
  return <PublicCareShowcase kind="hydration"/>;
}
