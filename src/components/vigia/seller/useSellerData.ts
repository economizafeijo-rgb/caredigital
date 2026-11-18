import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CashEntry, ChatMessage, Invoice, StockMove, VendorOrder, VendorProduct } from "@/lib/marketplace";

export type SellerData = {
  products: VendorProduct[];
  orders: VendorOrder[];
  cash: CashEntry[];
  moves: StockMove[];
  messages: ChatMessage[];
  invoices: Invoice[];
  rating: { avg: number; count: number } | null;
};
const empty: SellerData = { products: [], orders: [], cash: [], moves: [], messages: [], invoices: [], rating: null };

/** Carrega tudo da loja e mantém pedidos e mensagens atualizados em tempo real. */
export function useSellerData(vendorId: string) {
  const [data, setData] = useState<SellerData>(empty);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const db = supabase as any;
    const [p, o, c, m, msg, i, r] = await Promise.all([
      db.from("care_store_products").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false }),
      db.from("care_store_orders").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false }).limit(500),
      db.from("care_store_cash_entries").select("*").eq("vendor_id", vendorId).order("occurred_at", { ascending: false }).limit(800),
      db.from("care_store_stock_moves").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false }).limit(200),
      db.from("care_store_messages").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: true }).limit(1000),
      db.from("care_store_vendor_invoices").select("*").eq("vendor_id", vendorId).order("period", { ascending: false }).limit(24),
      db.from("care_store_vendor_ratings").select("rating_avg,rating_count").eq("vendor_id", vendorId).maybeSingle(),
    ]);
    const failed = [p, o, c, m, msg].find((x: any) => x.error);
    setError(failed ? "Parte dos dados não carregou. Confira a conexão e tente de novo." : "");
    setData({
      products: p.data ?? [], orders: o.data ?? [], cash: c.data ?? [], moves: m.data ?? [], messages: msg.data ?? [], invoices: i.data ?? [],
      rating: r.data ? { avg: Number(r.data.rating_avg), count: Number(r.data.rating_count) } : null,
    });
    setLoaded(true);
  }, [vendorId]);

  useEffect(() => { setLoaded(false); void load(); }, [load]);

  // Tempo real: pedido novo, mudança de etapa e mensagem nova recarregam os dados.
  useEffect(() => {
    const db = supabase as any;
    if (typeof db.channel !== "function") return;
    let timer: number | undefined;
    const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(() => void load(), 400); };
    const ch = db.channel(`seller-${vendorId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "care_store_orders", filter: `vendor_id=eq.${vendorId}` }, soon)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "care_store_messages", filter: `vendor_id=eq.${vendorId}` }, soon)
      .subscribe();
    return () => { window.clearTimeout(timer); void db.removeChannel(ch); };
  }, [vendorId, load]);

  return { data, loaded, error, reload: load };
}
