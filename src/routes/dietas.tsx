import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/dietas")({
  head: () => ({ meta: [
    { title: "Alimentação e rotinas — NextVita" },
    { name: "description", content: "Entenda como o NextVita apresenta refeições, lembretes e acompanhamento alimentar individual em um ambiente protegido." },
  ] }),
  component: Dietas,
});

function Dietas() {
  return <PublicCareShowcase kind="diet"/>;
}
