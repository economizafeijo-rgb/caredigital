import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { fmtClock, useNow } from "./ui";

const nav = [
  { to: "/", label: "Painel" },
  { to: "/pacientes", label: "Pacientes" },
  { to: "/medicamentos", label: "Medicamentos" },
  { to: "/protocolos", label: "Protocolos" },
  { to: "/dietas", label: "Dietas" },
  { to: "/admin", label: "Admin" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const now = useNow(30000);
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-32 -top-40 size-[520px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-40 top-1/3 size-[480px] rounded-full bg-sky/20 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-foreground font-display text-lg leading-none text-primary-foreground">V</div>
            <div className="leading-none">
              <div className="font-display text-lg tracking-tight">VIGIA</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Prontuário de cuidados</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 label-mono md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "!bg-foreground !text-primary-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 font-mono text-[11px] text-muted-foreground sm:flex">
              <span className="size-2 animate-softpulse rounded-full bg-primary" />
              {fmtClock(now)}
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-foreground/90 font-display text-sm text-primary-foreground">MC</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 label-mono md:hidden">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="shrink-0 rounded-md px-3 py-2 text-muted-foreground"
              activeProps={{ className: "!bg-foreground !text-primary-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
