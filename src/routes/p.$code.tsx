import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Link curto de produto: nextvita.life/p/<código> leva à loja com o produto aberto.
export const Route = createFileRoute("/p/$code")({
  head: () => ({
    meta: [{ title: "Produto · Loja NextVita" }, { name: "robots", content: "noindex" }],
  }),
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
