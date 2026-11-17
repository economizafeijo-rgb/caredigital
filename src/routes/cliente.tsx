import { createFileRoute } from "@tanstack/react-router";
import { HomeClientCard } from "@/components/vigia/HomeClientCard";
import { ActivateTrialCard } from "@/components/vigia/TrialStart";
import { LicenseGate } from "@/components/vigia/LicenseGate";
import { PatientAreaGate } from "@/components/vigia/PatientAreaGate";
import { useAccess } from "@/lib/use-access";

export const Route = createFileRoute("/cliente")({
  head: () => ({ meta: [{ title: "Meu acompanhamento — NextVita" }] }),
  component: ClientPage,
});

function ClientPage() {
  const { status, name } = useAccess();
  if (status === "loading") return <div role="status" className="grid h-full place-items-center text-sm text-muted-foreground">Verificando seu acesso…</div>;
  if (status === "public") return <PatientAreaGate/>;
  if (status === "unlinked") return <ActivateTrialCard/>;
  // O administrador também pode abrir esta área: o painel carrega o primeiro prontuário de sua propriedade.
  return <LicenseGate><HomeClientCard {...(status === "client" ? { patientName: name } : {})}/></LicenseGate>;
}
