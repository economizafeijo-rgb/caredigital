import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/pacientes")({
  head: () => ({ meta: [{ title: "Clientes — CareDigital" }] }),
  component: () => <Navigate to="/prontuario" replace />,
});
