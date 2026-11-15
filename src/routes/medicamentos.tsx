import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/medicamentos")({
  head: () => ({
    meta: [
      { title: "Medicamentos — NextVita" },
      {
        name: "description",
        content:
          "Entenda como o NextVita oferece uma área opcional para organizar medicamentos, horários, alertas e registros.",
      },
    ],
  }),
  component: Medicamentos,
});

function Medicamentos() {
  return <PublicCareShowcase kind="medication" />;
}
