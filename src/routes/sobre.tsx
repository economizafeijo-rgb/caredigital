import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/vigia/AboutPage";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre o NextVita e o desenvolvedor" },
      { name: "description", content: "O NextVita nasceu em Feijó, no Acre, criado por Franc D'nis. Conheça o projeto e fale sobre o seu aplicativo ou site." },
      { property: "og:title", content: "Sobre o NextVita" },
      { property: "og:description", content: "Cuidado digital feito em Feijó, Acre. Conheça o projeto e o desenvolvedor." },
    ],
  }),
  component: AboutPage,
});
