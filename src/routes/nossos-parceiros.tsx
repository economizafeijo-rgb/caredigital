import { createFileRoute } from "@tanstack/react-router";
import { PartnersShowcase } from "@/components/vigia/PartnersShowcase";

export const Route = createFileRoute("/nossos-parceiros")({
  head: () => ({
    meta: [
      { title: "Lojas parceiras em Feijó · NextVita" },
      {
        name: "description",
        content:
          "Conheça as lojas parceiras da NextVita em Feijó, no Acre. Compre de quem é daqui, retire na loja ou receba em casa.",
      },
      { property: "og:title", content: "Lojas parceiras em Feijó · NextVita" },
      {
        property: "og:description",
        content: "Quem é de Feijó compra de Feijó. Conheça as lojas parceiras da NextVita.",
      },
    ],
  }),
  component: PartnersShowcase,
});
