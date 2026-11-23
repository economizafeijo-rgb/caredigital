import { createFileRoute } from "@tanstack/react-router";
import { StorePage } from "@/components/vigia/StorePage";
import { AdSlot } from "@/components/vigia/AdminAds";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://www.nextvita.life";
const PLATFORM_IMAGE = `${SITE_URL}/share-card-v3.jpg`;

type ShareVendor = { name: string; logo_url: string | null; description: string | null };

// Endereço curto da loja: nextvita.life/nome-da-loja
// O loader busca só os dados públicos de divulgação (nome, logo e descrição),
// para que a prévia ao compartilhar mostre a marca da loja.
export const Route = createFileRoute("/$slug")({
  loader: async ({ params }): Promise<{ vendor: ShareVendor | null }> => {
    const { data } = await (supabase as any)
      .from("care_store_vendors")
      .select("name,logo_url,description")
      .eq("slug", params.slug)
      .maybeSingle();
    return { vendor: (data as ShareVendor | null) ?? null };
  },
  head: ({ params, loaderData }) => {
    const vendor = loaderData?.vendor;
    if (!vendor) {
      return {
        meta: [
          { title: `${params.slug} · Loja NextVita` },
          { property: "og:title", content: `Loja NextVita · ${params.slug}` },
        ],
      };
    }
    const logo = vendor.logo_url?.startsWith("https://") ? vendor.logo_url : PLATFORM_IMAGE;
    const description = (vendor.description ?? "").trim().slice(0, 160);
    const url = `${SITE_URL}/${params.slug}`;
    return {
      meta: [
        { title: `${vendor.name} · NextVita` },
        { name: "description", content: description || `Compre em ${vendor.name} pelo NextVita.` },
        { property: "og:title", content: vendor.name },
        { property: "og:description", content: description || `Loja ${vendor.name} no NextVita` },
        { property: "og:url", content: url },
        { property: "og:image", content: logo },
        { property: "og:image:secure_url", content: logo },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "512" },
        { property: "og:image:height", content: "512" },
        { property: "og:image:alt", content: `Logo da loja ${vendor.name}` },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:image", content: logo },
      ],
    };
  },
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
