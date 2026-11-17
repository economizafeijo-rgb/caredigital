import { createFileRoute } from "@tanstack/react-router";
import { LojistaPage } from "@/components/vigia/LojistaPage";

export const Route = createFileRoute("/lojista")({
  head: () => ({
    meta: [
      { title: "Venda na NextVita · área do lojista" },
      { name: "description", content: "Lojas de roupas fitness, suplementos, farmácias e produtos naturais: venda na NextVita com vitrine própria, avaliações e painel de vendas." },
      { property: "og:title", content: "Venda na NextVita" },
      { property: "og:description", content: "Abra a sua loja na NextVita e venda para quem já cuida da saúde." },
    ],
  }),
  component: LojistaPage,
});
