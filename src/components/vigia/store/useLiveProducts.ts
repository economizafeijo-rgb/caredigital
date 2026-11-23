import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { VendorProduct } from "@/lib/marketplace";

type Patch = Partial<VendorProduct> & { id: string };
type Channel = {
  on: (t: string, f: Record<string, string>, cb: (p: { new: Patch }) => void) => Channel;
  subscribe: () => Channel;
};
type Db = {
  channel: (n: string) => Channel;
  removeChannel: (c: Channel) => Promise<unknown>;
  from: (t: string) => {
    select: (c: string) => { eq: (k: string, v: string) => Promise<{ data: Patch[] | null }> };
  };
};

const FIELDS = "id,stock,availability,price_cents,old_price_cents,active,display_limit";

/**
 * Produtos da loja com estoque, preço e disponibilidade atualizados em tempo real
 * (realtime do banco + conferência a cada 30 s, caso a conexão caia).
 */
export function useLiveProducts(vendorId: string, initial: VendorProduct[]) {
  const [products, setProducts] = useState(initial);
  useEffect(() => setProducts(initial), [initial]);

  useEffect(() => {
    const db = supabase as unknown as Db;
    const apply = (rows: Patch[]) =>
      setProducts((cur) =>
        cur
          .map((p) => {
            const r = rows.find((x) => x.id === p.id);
            return r ? { ...p, ...r } : p;
          })
          .filter((p) => p.active !== false),
      );
    const ch = db
      .channel(`live-stock-${vendorId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "care_store_products",
          filter: `vendor_id=eq.${vendorId}`,
        },
        (payload) => apply([payload.new]),
      )
      .subscribe();
    const poll = () =>
      void db
        .from("care_store_products")
        .select(FIELDS)
        .eq("vendor_id", vendorId)
        .then(({ data }) => data && apply(data));
    const t = window.setInterval(poll, 30000);
    const onFocus = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onFocus);
      void db.removeChannel(ch);
    };
  }, [vendorId]);

  return products;
}
