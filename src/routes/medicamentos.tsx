import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/medicamentos")({
  head: () => ({ meta: [
    { title: "Medicamentos — CareDigital" },
    { name: "description", content: "Entenda como o CareDigital organiza horários, alertas, confirmações e histórico de medicamentos com acesso individual." },
  ] }),
  component: Medicamentos,
});

function Medicamentos() {
  return <PublicCareShowcase kind="medication"/>;
}
