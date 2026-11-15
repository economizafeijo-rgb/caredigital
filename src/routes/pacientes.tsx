import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/pacientes")({
  head: () => ({ meta: [{ title: "Clientes — NextVita" }] }),
  component: () => <Navigate to="/prontuario" replace />,
});
