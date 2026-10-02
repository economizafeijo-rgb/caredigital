import { createFileRoute } from "@tanstack/react-router";
import { DigestiveDietGuides } from "@/components/vigia/DigestiveDietGuides";
import { DigestiveProtocolLibrary } from "@/components/vigia/DigestiveProtocolLibrary";
import { ReadyDigestiveDietPlans } from "@/components/vigia/ReadyDigestiveDietPlans";
import { PageHeader } from "@/components/vigia/ui";

export const Route = createFileRoute("/dietas")({
  head: () => ({
    meta: [
      { title: "Dietas digestivas com horários — Vigia" },
      { name: "description", content: "Cardápios de exemplo com horários e alimentos para gastrite, refluxo, intestino irritável, intolerância à lactose e doença celíaca." },
      { property: "og:title", content: "Dietas digestivas com horários — Vigia" },
      { property: "og:description", content: "Cardápios de exemplo por condição, com horários, fontes e cuidados." },
    ],
  }),
  component: Dietas,
});

function Dietas() {
  return (
    <>
      <PageHeader eyebrow="Alimentação e saúde digestiva" title="Dietas com horários" />
      <div className="mb-8 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-relaxed">
        Dietas podem ajudar a controlar sintomas, mas não curam a maioria das causas de gastrite. A gastrite por H. pylori, por exemplo, precisa de avaliação e tratamento médico. Os cardápios abaixo são exemplos educativos para adultos; ajuste alimentos e horários com sua equipe de saúde.
      </div>
      <ReadyDigestiveDietPlans />
      <DigestiveDietGuides />
      <div className="mt-12"><DigestiveProtocolLibrary /></div>
    </>
  );
}
