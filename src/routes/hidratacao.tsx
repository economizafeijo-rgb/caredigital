import { createFileRoute } from "@tanstack/react-router";
import { HydrationDashboard } from "@/components/vigia/HydrationTracker";
import { PageHeader } from "@/components/vigia/ui";

export const Route = createFileRoute("/hidratacao")({
  head: () => ({
    meta: [
      { title: "Hidratação e lembretes — Vigia" },
      { name: "description", content: "Cronograma configurável de hidratação, lembretes persistentes e registro diário de água." },
    ],
  }),
  component: Hidratacao,
});

function Hidratacao() {
  return <><PageHeader eyebrow="Rotina diária e lembretes" title="Hidratação" /><HydrationDashboard /></>;
}
