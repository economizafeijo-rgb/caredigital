import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/hidratacao")({
  head: () => ({
    meta: [
      { title: "Hidratação — NextVita" },
      {
        name: "description",
        content:
          "Conheça o espaço do NextVita para acompanhar hidratação, metas diárias, lembretes e evolução.",
      },
    ],
  }),
  component: Hidratacao,
});

function Hidratacao() {
  return <PublicCareShowcase kind="hydration" />;
}
