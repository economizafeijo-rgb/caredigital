import { createFileRoute, Link } from "@tanstack/react-router";
import { LogIn, UserRound } from "lucide-react";
import { HomeClientCard } from "@/components/vigia/HomeClientCard";
import { LicenseGate } from "@/components/vigia/LicenseGate";
import { useAccess } from "@/lib/use-access";

export const Route = createFileRoute("/cliente")({
  head: () => ({ meta: [{ title: "Meu acompanhamento — CareDigital" }] }),
  component: ClientPage,
});

function ClientPage() {
  const { status, name } = useAccess();
  if (status === "loading") return <div role="status" className="grid h-full place-items-center text-sm text-muted-foreground">Verificando seu acesso…</div>;
  if (status === "public") return <section className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
    <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground"><UserRound size={24}/></span>
    <h1 className="mt-4 text-xl font-bold">Área do paciente</h1>
    <p className="mt-2 text-sm text-muted-foreground">Entre com sua conta para consultar seu acompanhamento.</p>
    <Link to="/entrar" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"><LogIn size={16}/> Entrar</Link>
  </section>;
  if (status === "unlinked") return <section className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
    <h1 className="text-lg font-bold">Prontuário não vinculado</h1>
    <p className="mt-2 text-sm text-muted-foreground">Sua conta está conectada, mas não foi possível localizar um prontuário autorizado. Solicite acesso ao administrador.</p>
    <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Voltar ao início</Link>
  </section>;
  // O administrador também pode abrir esta área: o painel carrega o primeiro prontuário de sua propriedade.
  return <LicenseGate><HomeClientCard {...(status === "client" ? { patientName: name } : {})}/></LicenseGate>;
}
