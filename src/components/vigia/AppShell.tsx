import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity, Apple, BookOpen, CalendarDays, ClipboardList, Droplets, Dumbbell, HeartPulse, History, Home,
  LayoutDashboard, LogIn, LogOut, Maximize, Menu, Minimize, Moon, Pill, Scale, Settings2, Sun, Target, Utensils, X,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clientSectionHashes, type ClientSection } from "@/lib/client-pages";
import { useAccess, type AccessStatus } from "@/lib/use-access";
import { clientSectionTheme, type SectionTheme } from "@/lib/client-section-theme";
import { fmtClock, useNow } from "./ui";
import { HydrationProvider, HydrationReminder } from "./HydrationTracker";

type NavItem = { to: string; hash?: string; label: string; icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

const section = (key: ClientSection, label: string, icon: LucideIcon): NavItem =>
  ({ to: "/cliente", hash: clientSectionHashes[key], label, icon });

const sectionThemeByHash: Record<string, SectionTheme> = Object.fromEntries(
  (Object.keys(clientSectionHashes) as ClientSection[]).map(key => [clientSectionHashes[key], clientSectionTheme[key]]));

const contentGroup: NavGroup = {
  title: "Conteúdo",
  items: [
    { to: "/protocolos", label: "Protocolos", icon: HeartPulse },
    { to: "/dietas", label: "Dietas", icon: Utensils },
    { to: "/nutricao-esportiva", label: "Nutrição esportiva", icon: Dumbbell },
    { to: "/biblioteca-alimentar", label: "Biblioteca alimentar", icon: Apple },
  ],
};

// Um mapa de navegação por perfil: cada área aparece uma única vez.
const navByProfile: Record<Exclude<AccessStatus, "loading">, NavGroup[]> = {
  public: [{
    title: "CareDigital",
    items: [
      { to: "/", label: "Início", icon: Home },
      { to: "/protocolos", label: "Como funciona", icon: HeartPulse },
      { to: "/medicamentos", label: "Medicamentos", icon: Pill },
      { to: "/hidratacao", label: "Hidratação", icon: Droplets },
      { to: "/dietas", label: "Dietas", icon: Utensils },
      { to: "/nutricao-esportiva", label: "Nutrição esportiva", icon: Dumbbell },
    ],
  }],
  client: [
    { title: "Meu dia", items: [
      section("hoje", "Visão geral", LayoutDashboard),
      section("agenda", "Agenda", CalendarDays),
      section("historico", "Histórico", History),
    ] },
    { title: "Cuidados", items: [
      section("medicacao", "Medicação", Pill),
      section("hidratacao", "Hidratação", Droplets),
      section("alimentacao", "Alimentação", Utensils),
      section("atividade", "Atividade", Activity),
    ] },
    { title: "Saúde", items: [
      section("peso", "Peso e evolução", Scale),
      section("indicadores", "Indicadores", Target),
      section("cardapios", "Cardápios e dietas", BookOpen),
      { to: "/biblioteca-alimentar", label: "Biblioteca alimentar", icon: Apple },
    ] },
  ],
  admin: [
    { title: "Gestão", items: [
      { to: "/admin", label: "Painel", icon: Settings2 },
      { to: "/prontuario", label: "Prontuários", icon: ClipboardList },
    ] },
    contentGroup,
  ],
  unlinked: [{ title: "CareDigital", items: [{ to: "/", label: "Início", icon: Home }] }, contentGroup],
};

function Brand({ onDark = false }: { onDark?: boolean }) {
  return <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="CareDigital — início">
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><HeartPulse size={19} strokeWidth={2.4}/></span>
    <span className={`font-display text-[17px] font-extrabold tracking-tight ${onDark ? "text-white" : "text-foreground"}`}>Care<span className={onDark ? "text-[#8fb2ff]" : "text-primary"}>Digital</span></span>
  </Link>;
}

const iconButton = "grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground";

export function AppShell({ children }: { children: ReactNode }) {
  const now = useNow(30000);
  const access = useAccess();
  const location = useRouterState({ select: state => state.location });
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [shellError, setShellError] = useState("");

  useEffect(() => {
    const enabled = window.localStorage.getItem("caredigital-theme") === "dark";
    document.documentElement.classList.toggle("dark", enabled);
    setDarkMode(enabled);
    const sync = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  useEffect(() => { setMenuOpen(false); }, [location.pathname, location.hash]);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("caredigital-theme", next ? "dark" : "light");
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setShellError("");
    } catch { setShellError("O navegador não permitiu ativar a tela cheia."); }
  };
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) { setShellError("Não foi possível sair. Tente novamente."); return; }
    window.location.assign("/");
  }

  const profile = access.status === "loading" ? "public" : access.status;
  const signedIn = profile !== "public";
  const groups = navByProfile[profile];
  const items = groups.flatMap(group => group.items);
  const currentHash = location.hash || clientSectionHashes.hoje;
  const isActive = (item: NavItem) => item.to === location.pathname && (!item.hash || item.hash === currentHash);
  const current = items.find(isActive);
  const panelHome = profile === "client" ? "/cliente" : profile === "admin" ? "/admin" : null;

  const tools = <>
    <button type="button" onClick={() => void toggleFullscreen()} aria-pressed={fullScreen} aria-label={fullScreen ? "Sair da tela cheia" : "Ativar tela cheia"} title="Tela cheia" className={`${iconButton} hidden sm:grid`}>{fullScreen ? <Minimize size={17}/> : <Maximize size={17}/>}</button>
    <button type="button" onClick={toggleTheme} aria-pressed={darkMode} aria-label={darkMode ? "Ativar tema claro" : "Ativar tema escuro"} title={darkMode ? "Tema claro" : "Tema escuro"} className={iconButton}>{darkMode ? <Sun size={17}/> : <Moon size={17}/>}</button>
  </>;
  const loginButton = <Link to="/entrar" className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"><LogIn size={16}/> Entrar</Link>;

  const sideLink = (item: NavItem) => {
    const active = isActive(item);
    const Icon = item.icon;
    const theme = item.hash ? sectionThemeByHash[item.hash] : undefined;
    return <Link key={item.to + (item.hash ?? "")} to={item.to} {...(item.hash ? { hash: item.hash } : {})} activeOptions={{ exact: true, includeHash: true }} aria-current={active ? "page" : undefined}
      className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors ${active ? `${theme?.pill ?? "bg-primary"} text-white shadow-sm` : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
      <span className={`grid size-6 shrink-0 place-items-center rounded-md ${active ? "bg-white/20" : theme ? theme.pill + " text-white opacity-90" : ""}`}><Icon size={14} strokeWidth={2.2}/></span><span className="truncate">{item.label}</span>
    </Link>;
  };
  const sidebarBody = <>
    <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3" aria-label="Navegação principal">
      {groups.map(group => <div key={group.title}>
        <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-slate-500">{group.title}</p>
        <div className="grid gap-0.5">{group.items.map(sideLink)}</div>
      </div>)}
    </nav>
    <div className="shrink-0 border-t border-white/10 p-3">
      <div className="flex items-center gap-2.5 rounded-lg bg-white/5 p-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white" aria-hidden="true">{(access.name || access.email || "C").slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13px] font-semibold text-white">{access.name || "Conta conectada"}</span>
          <span className="block truncate text-[11px] text-slate-400">{profile === "admin" ? "Gestão" : profile === "client" ? "Paciente" : "Sem prontuário vinculado"}</span>
        </span>
        <button type="button" onClick={() => void signOut()} disabled={signingOut} aria-label="Sair da conta" title="Sair da conta" className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"><LogOut size={16}/></button>
      </div>
    </div>
  </>;

  return (
    <HydrationProvider>
      <div className="care-shell flex h-dvh min-h-0 overflow-hidden bg-background text-foreground">
        {signedIn && <aside className="hidden w-60 shrink-0 flex-col bg-sidebar xl:flex">
          <div className="flex h-14 shrink-0 items-center border-b border-white/10 px-4"><Brand onDark/></div>
          {sidebarBody}
        </aside>}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/90 px-3 backdrop-blur sm:px-5">
            {signedIn ? <>
              <button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" aria-expanded={menuOpen} className={`${iconButton} xl:hidden`}><Menu size={18}/></button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[15px] font-bold leading-tight">{current?.label ?? (location.pathname === "/" ? "Página inicial" : "CareDigital")}</p>
                <p className="truncate text-[11px] text-muted-foreground">{fmtClock(now)} · horário do Acre</p>
              </div>
            </> : <>
              <Brand/>
              <nav className="ml-4 hidden min-w-0 flex-1 items-center gap-0.5 lg:flex" aria-label="Navegação principal">
                {items.map(item => <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === "/" }}
                  className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  activeProps={{ className: "!bg-accent !text-accent-foreground" }}>{item.label}</Link>)}
              </nav>
              <span className="flex-1 lg:hidden"/>
            </>}
            <div className="flex shrink-0 items-center gap-1.5">
              {signedIn && (location.pathname === "/"
                ? panelHome && <Link to={panelHome} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110" title="Voltar ao meu painel"><LayoutDashboard size={16}/><span className="hidden sm:inline">Meu painel</span></Link>
                : <Link to="/" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:border-primary/40" title="Ir à página inicial sem sair da conta"><Home size={16}/><span className="hidden sm:inline">Página inicial</span></Link>)}
              {tools}
              {!signedIn && access.status !== "loading" && loginButton}
              {!signedIn && <button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" aria-expanded={menuOpen} className={`${iconButton} lg:hidden`}><Menu size={18}/></button>}
            </div>
          </header>

          {shellError && <p role="alert" className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive">{shellError}</p>}
          <main id="care-content" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-4 lg:p-5">{children}</main>
        </div>

        {menuOpen && <div className={`fixed inset-0 z-50 ${signedIn ? "xl:hidden" : "lg:hidden"}`} role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)}/>
          <div className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-sidebar shadow-2xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
              <Brand onDark/>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" className="grid size-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"><X size={18}/></button>
            </div>
            {signedIn ? sidebarBody : <nav className="grid gap-0.5 p-3" aria-label="Navegação principal">
              {items.map(sideLink)}
              <Link to="/entrar" className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white"><LogIn size={16}/> Entrar</Link>
            </nav>}
          </div>
        </div>}

        {profile === "admin" && <HydrationReminder />}
      </div>
    </HydrationProvider>
  );
}
