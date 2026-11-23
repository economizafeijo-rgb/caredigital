import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://www.nextvita.life";
const PLATFORM_IMAGE = `${SITE_URL}/share-card-v3.jpg`;

type ShareProduct = {
  name: string;
  price_cents: number;
  image_url: string | null;
  description: string | null;
  vendor: { name: string; logo_url: string | null } | null;
};

const absUrl = (u: string | null | undefined) =>
  !u ? null : u.startsWith("http") ? u : `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`;
const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Link curto de produto: nextvita.life/p/<código> leva à loja com o produto aberto.
// O loader busca os dados públicos do produto para que a prévia (WhatsApp, Instagram, Facebook...)
// mostre a foto, o nome e o preço, já que os robôs das redes não executam JavaScript.
export const Route = createFileRoute("/p/$code")({
  loader: async ({ params }): Promise<{ product: ShareProduct | null }> => {
    try {
      const { data } = await (supabase as any)
        .from("care_store_products")
        .select("name,price_cents,image_url,description,vendor:care_store_vendors(name,logo_url)")
        .eq("share_code", params.code.toLowerCase())
        .eq("active", true)
        .maybeSingle();
      return { product: (data as ShareProduct | null) ?? null };
    } catch {
      return { product: null };
    }
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.product;
    if (!p) {
      return {
        meta: [{ title: "Produto · Loja NextVita" }, { name: "robots", content: "noindex" }],
      };
    }
    const own = absUrl(p.image_url);
    // Redes sociais não exibem SVG: usa a foto do produto quando é raster, senão a logo/imagem da plataforma.
    const raster = (u: string | null) => {
      if (!u) return null;
      if (!/\.svg(\?|$)/i.test(u)) return u;
      // Fotos ilustrativas das lojas têm versão raster ao lado do SVG.
      if (u.includes("/loja/bela-vista/")) return u.replace(/\.svg.*$/i, ".png");
      if (u.includes("/loja/sophia-store/")) return u.replace(/\.svg.*$/i, ".webp");
      return null;
    };
    const image = raster(own) ?? raster(absUrl(p.vendor?.logo_url)) ?? PLATFORM_IMAGE;
    const title = `${p.name} · ${brl(p.price_cents)}`;
    const store = p.vendor?.name ? `Na ${p.vendor.name}, pelo NextVita.` : "Pelo NextVita.";
    const description = `${(p.description ?? "").trim().slice(0, 120)} ${store}`.trim();
    const url = `${SITE_URL}/p/${params.code}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:secure_url", content: image },
        { property: "og:image:alt", content: p.name },
        { property: "product:price:amount", content: (p.price_cents / 100).toFixed(2) },
        { property: "product:price:currency", content: "BRL" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
    };
  },
  component: ProductShortLink,
});

function ProductShortLink() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const db = supabase as any;
      const { data: p } = await db
        .from("care_store_products")
        .select("share_code,vendor_id")
        .eq("share_code", code.toLowerCase())
        .eq("active", true)
        .maybeSingle();
      if (!alive) return;
      if (!p) {
        setMissing(true);
        return;
      }
      const { data: v } = await db
        .from("care_store_vendors")
        .select("slug")
        .eq("id", p.vendor_id)
        .maybeSingle();
      if (!alive) return;
      if (!v?.slug) {
        setMissing(true);
        return;
      }
      void navigate({
        to: "/$slug",
        params: { slug: v.slug },
        search: { produto: p.share_code } as never,
        replace: true,
      });
    })();
    return () => {
      alive = false;
    };
  }, [code, navigate]);

  if (!missing) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Abrindo o produto…</p>;
  }
  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <p className="font-semibold">Este produto não está mais disponível.</p>
      <a href="/loja" className="mt-3 inline-block text-sm font-semibold underline">
        Ver a loja NextVita
      </a>
    </div>
  );
}
