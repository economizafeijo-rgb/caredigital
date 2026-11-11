import { createFileRoute } from "@tanstack/react-router";
import { PublicCareShowcase } from "@/components/vigia/PublicCareShowcase";

export const Route = createFileRoute("/protocolos")({
  head: () => ({ meta: [
    { title: "Como funcionam os protocolos — CareDigital" },
    { name: "description", content: "Conheça como o CareDigital organiza a rotina individual de cuidados, confirmações e histórico com acesso protegido." },
  ] }),
  component: Protocolos,
});

function Protocolos() {
  return <PublicCareShowcase kind="protocols"/>;
}
