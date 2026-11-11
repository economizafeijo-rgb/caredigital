import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/dietas")({
  head: () => ({ meta: [
    { title: "Alimentação e rotinas — CareDigital" },
    { name: "description", content: "Entenda como o CareDigital apresenta refeições, lembretes e acompanhamento alimentar individual em um ambiente protegido." },
  ] }),
  component: Dietas,
});

function Dietas() {
  return <PublicCareShowcase kind="diet"/>;
}
