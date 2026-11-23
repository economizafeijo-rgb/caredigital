import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Vendor } from "@/lib/marketplace";
import { SellerDashboard } from "./seller/SellerDashboard";
import { LojistaLanding } from "./LojistaLanding";
import { SellerRequestForm } from "./SellerRequestForm";

/** Área do lojista: apresenta a proposta, cadastra a loja e entrega o painel de vendas. */
export function LojistaPage() {
  const [state, setState] = useState<"loading" | "out" | "none" | "vendor" | "error">("loading");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const form = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setState("out");
      return;
    }
    // O administrador abre o painel de qualquer loja; o lojista, só as próprias.
    const isAdmin = (data.user.email ?? "").toLowerCase() === "francdenisbr@gmail.com";
    let query = (supabase as any).from("care_store_vendors").select("*").order("name");
    if (!isAdmin) query = query.eq("owner_id", data.user.id);
    let { data: rows, error } = await query;
    // Funcionário: entra nas lojas em que foi cadastrado, com acesso restrito.
    if (!isAdmin && !error && !rows?.length) {
      const st = await (supabase as any)
        .from("care_store_staff")
        .select("vendor_id")
        .eq("user_id", data.user.id)
        .eq("active", true);
      const ids = (st.data ?? []).map((r: { vendor_id: string }) => r.vendor_id);
      if (ids.length) {
        const sv = await (supabase as any)
          .from("care_store_vendors")
          .select("*")
          .in("id", ids)
          .order("name");
        rows = sv.data ?? [];
        setStaffIds(ids);
      }
    }
    if (error) {
      setState("error");
      return;
    }
    if (rows?.length) {
      setVendors(rows as Vendor[]);
      setState("vendor");
    } else {
      setVendors([]);
      setState("none");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  // Novos lojistas não criam loja sozinhos: enviam uma solicitação para a administração.
  function start() {
    form.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (state === "loading")
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground"
      >
        <Loader2 className="animate-spin" size={18} /> Carregando…
      </p>
    );
  if (state === "vendor" && vendors.length) {
    const wanted =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("loja")
        : null;
    return (
      <SellerDashboard
        vendors={vendors}
        initialId={wanted ?? undefined}
        staffVendorIds={staffIds}
        onChanged={() => void load()}
      />
    );
  }
  return (
    <div className="grid gap-6">
      {state === "error" && (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
        >
          Não foi possível consultar a sua loja. A atualização do banco para lojistas ainda precisa
          ser aplicada.
        </p>
      )}
      <LojistaLanding onStart={start} fit={state !== "none"} />
      {(state === "none" || state === "out") && (
        <div ref={form} id="cadastro" className="scroll-mt-20">
          <SellerRequestForm />
          {state === "out" && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Já tem uma loja aprovada?{" "}
              <a href="/entrar?mode=lojista" className="font-semibold text-primary hover:underline">
                Entrar no painel do lojista
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
