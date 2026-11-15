import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/protocolos")({
  head: () => ({
    meta: [
      { title: "Como funcionam os protocolos — NextVita" },
      {
        name: "description",
        content:
          "Conheça como o NextVita organiza hábitos, metas, registros e evolução pessoal com acesso protegido.",
      },
    ],
  }),
  component: Protocolos,
});

function Protocolos() {
  return <PublicCareShowcase kind="protocols" />;
}
