import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/medicamentos")({
  head: () => ({ meta: [
    { title: "Medicamentos — NextVita" },
    { name: "description", content: "Entenda como o NextVita organiza horários, alertas, confirmações e histórico de medicamentos com acesso individual." },
  ] }),
  component: Medicamentos,
});

function Medicamentos() {
  return <PublicCareShowcase kind="medication"/>;
}
