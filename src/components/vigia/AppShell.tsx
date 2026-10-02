import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, Droplets, Ellipsis, Home, Pill, Utensils, Users, X } from "lucide-react";
import { fmtClock, useNow } from "./ui";
import { HydrationProvider, HydrationReminder } from "./HydrationTracker";

const primaryNav = [
  { to: "/", label: "Início", icon: Home },
  { to: "/protocolos", label: "Protocolos", icon: Activity },
  { to: "/dietas", label: "Dietas", icon: Utensils },
  { to: "/hidratacao", label: "Água", icon: Droplets },
] as const;

const moreNav = [
  { to: "/nutricao-esportiva", label: "Nutrição esportiva", icon: Activity },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/medicamentos", label: "Medicamentos", icon: Pill },
  { to: "/admin", label: "Administração", icon: Ellipsis },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const now = useNow(30000);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <HydrationProvider>
      <div className="relative min-h-screen bg-background text-foreground">
        <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-32 -top-40 size-[420px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-40 top-1/3 size-[380px] rounded-full bg-sky/15 blur-3xl" />
        </div>

        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 md:h-16 md:px-6">
            <Link to="/" className="flex shrink-0 items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-xl bg-foreground font-display text-lg leading-none text-primary-foreground">V</div>
              <div className="leading-none">
                <div className="font-display text-base tracking-tight md:text-lg">VIGIA</div>
                <div className="mt-1 hidden font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:block">Cuidado digital</div>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 label-mono md:flex" aria-label="Navegação principal">
              {primaryNav.map((item) => (
                <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === "/" }}
                  className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                  activeProps={{ className: "!bg-foreground !text-primary-foreground" }}>
                  {item.label}
                </Link>
              ))}
              <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}
                className={`rounded-lg px-3 py-2 transition-colors hover:bg-foreground/5 ${moreOpen ? "bg-foreground/5 text-foreground" : "text-muted-foreground"}`}>
                Mais
              </button>
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 font-mono text-[10px] text-muted-foreground lg:flex">
                <span className="size-1.5 rounded-full bg-success" />{fmtClock(now)}
              </div>
              <div className="grid size-8 place-items-center rounded-full bg-primary/10 font-display text-xs text-primary">MC</div>
            </div>
          </div>
        </header>

        {moreOpen && <>
          <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setMoreOpen(false)} />
          <nav className="fixed right-4 top-[4.25rem] z-40 grid w-64 gap-1 rounded-2xl border border-border bg-background p-2 shadow-xl md:right-[max(1.5rem,calc((100vw-80rem)/2))]" aria-label="Mais seções">
            <div className="flex items-center justify-between px-3 py-2"><span className="label-mono text-muted-foreground">Mais áreas</span><button type="button" onClick={() => setMoreOpen(false)} aria-label="Fechar"><X size={15} /></button></div>
            {moreNav.map(({ to, label, icon: Icon }) => <Link key={to} to={to} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground hover:bg-foreground/5 hover:text-foreground" activeProps={{ className: "!bg-primary/10 !text-primary" }}><Icon size={17} />{label}</Link>)}
          </nav>
        </>}

        <main className="relative mx-auto max-w-7xl px-3 py-4 pb-32 sm:px-5 md:px-6 md:py-6 md:pb-8">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border/80 bg-background/95 px-1 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden" aria-label="Navegação do app">
          {primaryNav.map(({ to, label, icon: Icon }) => <Link key={to} to={to} activeOptions={{ exact: to === "/" }} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-muted-foreground" activeProps={{ className: "!text-primary" }}><Icon size={19} strokeWidth={2} /><span className="text-[10px] font-semibold">{label}</span></Link>)}
          <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl ${moreOpen ? "text-primary" : "text-muted-foreground"}`}><Ellipsis size={20} /><span className="text-[10px] font-semibold">Mais</span></button>
        </nav>

        <HydrationReminder />
      </div>
    </HydrationProvider>
  );
}
