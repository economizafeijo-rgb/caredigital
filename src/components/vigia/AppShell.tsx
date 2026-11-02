import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Droplets, Ellipsis, Home, LogIn, LogOut, Maximize, Minimize, Moon, Sun, Pill, Utensils, Users, X } from "lucide-react";
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
  { to: "/prontuario", label: "Prontuários", icon: Users },
  { to: "/pacientes", label: "Clientes", icon: Users },
  { to: "/medicamentos", label: "Medicamentos", icon: Pill },
  { to: "/admin", label: "Administração", icon: Ellipsis },
  { to: "/entrar", label: "Entrar na equipe", icon: LogIn },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const now = useNow(30000);
  const isClientPage = useRouterState({select: state => state.location.pathname === "/cliente"});
  const [moreOpen, setMoreOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const stored = window.localStorage.getItem("caredigital-theme");
    const enabled = stored === "dark" || (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", enabled);
    document.documentElement.style.colorScheme = enabled ? "dark" : "light";
    setDarkMode(enabled);
  }, []);
  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    window.localStorage.setItem("caredigital-theme", next ? "dark" : "light");
  };
  const [fullScreen, setFullScreen] = useState(false);
  const [fullScreenError, setFullScreenError] = useState("");
  useEffect(() => {
    const sync = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else { setFullScreenError("Tela cheia indisponível neste dispositivo."); return; }
      setFullScreenError("");
    } catch { setFullScreenError("O navegador não permitiu ativar tela cheia."); }
  };
  const [clientOnly, setClientOnly] = useState(false);
  const [adminAccess, setAdminAccess] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [clientName, setClientName] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [authError, setAuthError] = useState("");
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setAuthError("");
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) { setAuthError("Não foi possível sair. Tente novamente."); return; }
    setSignedIn(false); setClientOnly(false); setClientName("");
    window.location.assign("/");
  }
  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) { if (active) { setClientOnly(false); setAdminAccess(false); setSignedIn(false); setClientName(""); } return; }
      if (active) setSignedIn(true);
      const admin = (data.user.email ?? "").trim().toLowerCase() === "francdenisbr@gmail.com";
      if (active) setAdminAccess(admin);
      if (admin) { if (active) { setClientOnly(false); setClientName(""); } return; }
      const { data: grants } = await (supabase as any).from("care_patient_access").select("patient_id").eq("user_id",data.user.id).limit(1);
      const patientId = grants?.[0]?.patient_id;
      if (active) setClientOnly(Boolean(patientId));
      if (!patientId) { if (active) setClientName(""); return; }
      const person = await (supabase as any).from("care_patients").select("full_name").eq("id",patientId).limit(1);
      if (active) setClientName(person.data?.[0]?.full_name ?? "Meu acompanhamento");
    };
    void check();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { void check(); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  const visibleNav = clientOnly ? primaryNav.filter(item => item.to === "/" || item.to === "/hidratacao") : primaryNav;

  return (
    <HydrationProvider>
      <div className="care-shell relative flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-32 -top-40 size-[420px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-40 top-1/3 size-[380px] rounded-full bg-sky/15 blur-3xl" />
        </div>

        <header className="relative z-30 shrink-0 border-b border-border/70 bg-background/90 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2.5 px-3 md:h-[68px] md:gap-3 md:px-6">
            <Link to="/" className="flex shrink-0 items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-foreground font-display text-xl leading-none text-primary-foreground md:size-10">V</div>
              <div className="leading-none">
                <div className="font-display text-lg tracking-tight md:text-xl">VIGIA</div>
                <div className="mt-1 hidden font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:block">Cuidado digital</div>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 md:flex lg:gap-1.5" aria-label="Navegação principal">
              {visibleNav.map(({to,label,icon:Icon}) => (
                <Link key={to} to={to} title={label} aria-label={label} activeOptions={{ exact: to === "/" }}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent px-3 text-xs font-bold tracking-[.015em] text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground lg:h-11 lg:px-3.5 lg:text-[13px]"
                  activeProps={{ className: "!border-primary !bg-primary !text-primary-foreground shadow-sm" }}>
                  <Icon size={17} strokeWidth={2.2}/><span className="hidden lg:inline">{label}</span>
                </Link>
              ))}
              {!clientOnly && <button type="button" title="Mais seções" aria-label="Mais seções" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}
                className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all lg:h-11 lg:px-3.5 lg:text-[13px] ${moreOpen ? "border-primary/30 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"}`}>
                <Ellipsis size={18} strokeWidth={2.2}/><span className="hidden lg:inline">Mais</span>
              </button>}
            </nav>

            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="hidden items-center gap-2 font-mono text-[11px] text-muted-foreground xl:flex">
                <span className="size-1.5 rounded-full bg-success" />{fmtClock(now)}
              </div>
              {clientOnly && <Link to="/cliente" title="Abrir meu painel" className="hidden max-w-[215px] flex-col items-start rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 sm:flex"><span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Cliente conectado</span><span className="max-w-full truncate text-sm font-bold text-foreground">{clientName || "Meu painel"}</span></Link>}
              {clientOnly && <Link to="/cliente" className="hidden rounded-lg border border-border bg-primary/10 px-3 py-2 text-xs font-semibold text-primary sm:flex sm:items-center sm:gap-1.5"><Users size={15}/> Área do cliente</Link>}
              <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullScreen ? "Sair da tela cheia" : "Ativar tela cheia"} title={fullScreen ? "Sair da tela cheia" : "Tela cheia"} aria-pressed={fullScreen} className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-foreground transition hover:border-primary/30 hover:bg-muted">{fullScreen ? <Minimize size={18}/> : <Maximize size={18}/>}</button>
              <button type="button" onClick={toggleTheme} aria-label={darkMode ? "Ativar tema claro" : "Ativar tema escuro"} title={darkMode ? "Modo claro" : "Modo escuro"} aria-pressed={darkMode} className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-foreground transition-colors hover:border-primary/30 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{darkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
              {signedIn ? <button type="button" onClick={() => void signOut()} disabled={signingOut} aria-label="Sair da conta" title="Sair da conta" className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-60"><LogOut size={16}/><span className="hidden sm:inline">{signingOut ? "Saindo…" : "Sair"}</span></button> : <Link to="/entrar" aria-label="Entrar na conta" title="Entrar" className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90 lg:text-[13px]"><LogIn size={16}/><span className="hidden sm:inline">Entrar</span></Link>}
            </div>
          </div>
        </header>

        {moreOpen && !clientOnly && <>
          <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setMoreOpen(false)} />
          <nav className="fixed right-4 top-[4.75rem] z-40 grid w-64 gap-1 rounded-2xl border border-border bg-background p-2 shadow-xl md:right-[max(1.5rem,calc((100vw-80rem)/2))]" aria-label="Mais seções">
            <div className="flex items-center justify-between px-3 py-2"><span className="label-mono text-muted-foreground">Mais áreas</span><button type="button" onClick={() => setMoreOpen(false)} aria-label="Fechar"><X size={15} /></button></div>
            {moreNav.filter(item => adminAccess || (item.to !== "/admin" && item.to !== "/prontuario" && item.to !== "/pacientes")).map(({ to, label, icon: Icon }) => <Link key={to} to={to} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground hover:bg-foreground/5 hover:text-foreground" activeProps={{ className: "!bg-primary/10 !text-primary" }}><Icon size={17} />{label}</Link>)}
          </nav>
        </>}

        {authError && <p role="alert" className="relative z-20 mx-auto max-w-7xl px-3 py-2 text-xs text-destructive">{authError}</p>}
        {fullScreenError && <p role="alert" className="relative z-20 mx-auto max-w-7xl px-3 py-2 text-xs text-destructive">{fullScreenError}</p>}
        <main id="care-content" className={`relative z-10 mx-auto min-h-0 w-full max-w-7xl flex-1 px-3 pt-2 sm:px-5 md:px-6 md:pt-3 ${isClientPage ? "overflow-y-auto pb-[70px] md:overflow-hidden md:pb-3" : "overflow-y-auto overscroll-contain pb-[80px] md:pb-4"}`}>{children}</main>

        <nav className={`fixed inset-x-0 bottom-0 z-50 grid ${clientOnly ? "grid-cols-3" : "grid-cols-5"} border-t border-border/80 bg-background/95 px-1 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden`} aria-label="Navegação do app">
          {visibleNav.map(({ to, label, icon: Icon }) => <Link key={to} to={to} activeOptions={{ exact: to === "/" }} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-muted-foreground" activeProps={{ className: "!text-primary" }}><Icon size={19} strokeWidth={2} /><span className="text-[10px] font-semibold">{label}</span></Link>)}
          {clientOnly && <Link to="/cliente" className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-primary"><Users size={19}/><span className="text-[10px] font-semibold">Meu painel</span></Link>}
          {!clientOnly && <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl ${moreOpen ? "text-primary" : "text-muted-foreground"}`}><Ellipsis size={20} /><span className="text-[10px] font-semibold">Mais</span></button>}
        </nav>

        {adminAccess && <HydrationReminder />}
      </div>
    </HydrationProvider>
  );
}
