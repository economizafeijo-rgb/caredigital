import { createFileRoute } from "@tanstack/react-router";
import { PartnersPage } from "@/components/vigia/PartnersPage";

export const Route = createFileRoute("/parceiros")({
  head: () => ({
    meta: [
      { title: "Venda na NextVita · cadastro grátis para lojistas" },
      { name: "description", content: "Lojas, comerciantes e autônomos: cadastro grátis para vender na loja virtual da NextVita, a plataforma de saúde e bem-estar." },
      { property: "og:title", content: "Venda na NextVita · cadastro grátis" },
      { property: "og:description", content: "Abra a sua loja sem custo e venda para quem já cuida da saúde." },
    ],
  }),
  component: PartnersPage,
});
