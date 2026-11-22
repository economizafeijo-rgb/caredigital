import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { pushChatToast } from "../chat/ChatToasts";

/**
 * Avisa o cliente quando a loja responde e o chat está fechado: conta respostas não lidas,
 * toca o som e mostra o aviso. Zera ao abrir o chat.
 */
export function useVendorReplies(vendorId: string, vendorName: string, chatOpen: boolean) {
  const [unread, setUnread] = useState(0);
  const openRef = useRef(chatOpen);
  openRef.current = chatOpen;
  useEffect(() => {
    if (chatOpen) setUnread(0);
  }, [chatOpen]);
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    let ch: ReturnType<typeof db.channel> | null = null;
    let alive = true;
    void (async () => {
      const { data } = await db.auth.getUser();
      const uid = data?.user?.id as string | undefined;
      if (!uid || !alive) return;
      const { count } = await db
        .from("care_store_messages")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendorId)
        .eq("customer_id", uid)
        .eq("from_vendor", true)
        .is("read_at", null)
        .is("deleted_at", null);
      if (alive && !openRef.current) setUnread(count ?? 0);
      ch = db
        .channel(`vendor-replies-${vendorId}-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "care_store_messages",
            filter: `customer_id=eq.${uid}`,
          },
          (p: { new: { vendor_id: string; from_vendor: boolean; body: string } }) => {
            const m = p.new;
            if (m.vendor_id !== vendorId || !m.from_vendor || openRef.current) return;
            setUnread((n) => n + 1);
            pushChatToast({ title: vendorName, body: m.body, tone: "message" }, "incoming");
          },
        )
        .subscribe();
    })();
    return () => {
      alive = false;
      if (ch) void db.removeChannel(ch);
    };
  }, [vendorId, vendorName]);
  return unread;
}
