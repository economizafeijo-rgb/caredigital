import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Vendor } from "@/lib/marketplace";
import { LojistaDashboard } from "./LojistaDashboard";
import { LojistaLanding } from "./LojistaLanding";
import { LojistaSignup } from "./LojistaSignup";

/** Área do lojista: apresenta a proposta, cadastra a loja e entrega o painel de vendas. */
export function LojistaPage() {
  const [state, setState] = useState<"loading" | "out" | "none" | "vendor" | "error">("loading");
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const form = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setState("out"); return; }
    const { data: rows, error } = await (supabase as any).from("care_store_vendors").select("*").eq("owner_id", data.user.id).limit(1);
    if (error) { setState("error"); return; }
    if (rows?.[0]) { setVendor(rows[0] as Vendor); setState("vendor"); } else { setVendor(null); setState("none"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function start() {
    if (state === "out") {
      try { window.sessionStorage.setItem("nv_after_login", "/lojista"); } catch { /* ok */ }
      window.location.assign("/entrar?mode=signup");
      return;
    }
    form.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (state === "loading") return <p role="status" className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={18} /> Carregando…</p>;
  if (state === "vendor" && vendor) return <LojistaDashboard vendor={vendor} onChanged={() => void load()} />;
  return (
    <div className="grid gap-6">
      {state === "error" && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">Não foi possível consultar a sua loja. A atualização do banco para lojistas ainda precisa ser aplicada.</p>}
      <LojistaLanding onStart={start} />
      {state === "none" && <div ref={form} id="cadastro"><LojistaSignup onCreated={() => void load()} /></div>}
    </div>
  );
}
