import { createFileRoute } from "@tanstack/react-router";
import { StorePage } from "@/components/vigia/StorePage";
import { AdSlot } from "@/components/vigia/AdminAds";

// Endereço curto da loja: nextvita.life/nome-da-loja
export const Route = createFileRoute("/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} · Loja NextVita` },
      { property: "og:title", content: `Loja NextVita · ${params.slug}` },
    ],
  }),
  component: StoreBySlug,
});

function StoreBySlug() {
  const { slug } = Route.useParams();
  return (
    <>
      <AdSlot placement="loja" className="mb-4" />
      <StorePage slug={slug} />
    </>
  );
}
