import { createFileRoute, redirect } from "@tanstack/react-router";
import { StorePage } from "@/components/vigia/StorePage";
import { AdSlot } from "@/components/vigia/AdminAds";

export const Route = createFileRoute("/loja")({
  // /loja?loja=nome-da-loja vai para o endereço curto /nome-da-loja (só o nome aparece na barra).
  beforeLoad: ({ search }) => {
    const l = (search as Record<string, unknown> | undefined)?.loja;
    if (typeof l === "string" && /^[a-z0-9-]{2,60}$/.test(l)) {
      throw redirect({ to: "/$slug", params: { slug: l }, replace: true });
    }
  },
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
