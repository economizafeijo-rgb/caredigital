import { createFileRoute } from "@tanstack/react-router";
import { StorePage } from "@/components/vigia/StorePage";
import { AdSlot } from "@/components/vigia/AdminAds";

export const Route = createFileRoute("/loja")({
  head: () => ({
    meta: [
      { title: "Loja NextVita · suplementos, vitaminas e moda fitness" },
      { name: "description", content: "Suplementos, vitaminas, nutrição e roupas esportivas masculinas e femininas. Loja virtual NextVita (em desenvolvimento)." },
      { property: "og:title", content: "Loja NextVita" },
      { property: "og:description", content: "Suplementos, vitaminas, moda fitness e acessórios para academia." },
    ],
  }),
  component: LojaWithAds,
});

function LojaWithAds() {
  return (
    <>
      <AdSlot placement="loja" className="mb-4" />
      <StorePage />
    </>
  );
}
