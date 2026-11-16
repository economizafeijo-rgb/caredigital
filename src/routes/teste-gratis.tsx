import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/** Endereço antigo do teste grátis: o cadastro agora é único e fica em /entrar. */
export const Route = createFileRoute("/teste-gratis")({
  head: () => ({ meta: [{ title: "Teste grátis por 7 dias — NextVita" }] }),
  component: FreeTrialRedirect,
});

function FreeTrialRedirect() {
  useEffect(() => { window.location.replace("/entrar?mode=signup"); }, []);
  return <div role="status" className="grid h-full place-items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={22}/>Abrindo seu teste grátis…</div>;
}
