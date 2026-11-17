import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { MANUAL_SIGNOUT_KEY } from "./SessionGuard";
import {
  Activity,
  Apple,
  BarChart3,
  BedDouble,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Droplets,
  Dumbbell,
  HeartPulse,
  History,
  Home,
  Info,
  LayoutDashboard,
  LogIn,
  LogOut,
  Maximize,
  Menu,
  Minimize,
  Moon,
  Pill,
  Scale,
  Settings2,
  Sparkles,
  Sun,
  Target,
  Utensils,
  X,
  type LucideIcon,
  ShoppingBag,
  Store,
} from "lucide-react";
import { LogoMark } from "./Logo";
import { supabase } from "@/integrations/supabase/client";
import { clientSectionHashes, type ClientSection } from "@/lib/client-pages";
import { useAccess, type AccessStatus } from "@/lib/use-access";
import { clientSectionTheme, type SectionTheme } from "@/lib/client-section-theme";
import { fmtClock, useNow } from "./ui";
import { InstallAppButton } from "./InstallApp";
import { LiveModeLauncher } from "./LiveMode";
import { QrShareCard } from "./QrShareCard";
import { HydrationProvider, HydrationReminder } from "./HydrationTracker";
import { DialogProvider } from "@/lib/dialog";

type NavItem = { to: string; hash?: string; label: string; icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

const section = (key: ClientSection, label: string, icon: LucideIcon): NavItem => ({
  to: "/cliente",
  hash: clientSectionHashes[key],
  label,
  icon,
});

const sectionThemeByHash: Record<string, SectionTheme> = Object.fromEntries(
  (Object.keys(clientSectionHashes) as ClientSection[]).map((key) => [
    clientSectionHashes[key],
    clientSectionTheme[key],
  ]),
);

const contentGroup: NavGroup = {
  title: "Conteúdo",
  items: [
    { to: "/protocolos", label: "Protocolos", icon: HeartPulse },
    { to: "/dietas", label: "Dietas", icon: Utensils },
    { to: "/nutricao-esportiva", label: "Nutrição esportiva", icon: Dumbbell },
    { to: "/biblioteca-alimentar", label: "Biblioteca alimentar", icon: Apple },
    { to: "/loja", label: "Loja", icon: ShoppingBag },
    { to: "/lojista", label: "Seja lojista", icon: Store },
  ],
};

// Um mapa de navegação por perfil: cada área aparece uma única vez.
const navByProfile: Record<Exclude<AccessStatus, "loading">, NavGroup[]> = {
  public: [
    {
      title: "NextVita",
      items: [
        { to: "/", label: "Início", icon: Home },
        { to: "/protocolos", label: "Como funciona", icon: HeartPulse },
        { to: "/medicamentos", label: "Medicamentos", icon: Pill },
        { to: "/hidratacao", label: "Hidratação", icon: Droplets },
        { to: "/dietas", label: "Dietas", icon: Utensils },
        { to: "/suplementos", label: "Suplementos", icon: Sparkles },
        { to: "/peso", label: "Peso", icon: Scale },
        { to: "/sono", label: "Sono", icon: BedDouble },
        { to: "/treinos", label: "Treinos", icon: Activity },
        { to: "/metricas", label: "Métricas", icon: BarChart3 },
        { to: "/loja", label: "Loja", icon: ShoppingBag },
    { to: "/lojista", label: "Seja lojista", icon: Store },
        { to: "/sobre", label: "Sobre", icon: Info },
      ],
    },
  ],
  client: [
    {
      title: "Meu dia",
      items: [
        section("hoje", "Visão geral", LayoutDashboard),
        section("agenda", "Agenda", CalendarDays),
        section("historico", "Histórico", History),
      ],
    },
    {
      title: "Cuidados",
      items: [
        section("medicacao", "Medicação", Pill),
        section("hidratacao", "Hidratação", Droplets),
        section("alimentacao", "Alimentação", Utensils),
        section("atividade", "Atividade", Activity),
      ],
    },
    {
      title: "Saúde",
      items: [
        section("peso", "Peso e evolução", Scale),
        section("sono", "Sono", BedDouble),
        section("suplementos", "Suplementos", Sparkles),
        section("indicadores", "Indicadores", Target),
        section("cardapios", "Cardápios e dietas", BookOpen),
        { to: "/biblioteca-alimentar", label: "Biblioteca alimentar", icon: Apple },
        { to: "/loja", label: "Loja", icon: ShoppingBag },
    { to: "/lojista", label: "Seja lojista", icon: Store },
      ],
    },
  ],
  admin: [
    {
      title: "Gestão",
      items: [
        { to: "/admin", label: "Painel", icon: Settings2 },
        { to: "/prontuario", label: "Prontuários", icon: ClipboardList },
      ],
    },
    contentGroup,
  ],
  unlinked: [
    { title: "NextVita", items: [{ to: "/", label: "Início", icon: Home }] },
    contentGroup,
  ],
};

function Brand({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="NextVita — início">
      <LogoMark size={38} className="shrink-0 drop-shadow-sm" />
      <span
        className={`sidebar-brand-wordmark font-display text-[19px] font-extrabold tracking-tight ${onDark ? "text-white" : "text-foreground"}`}
      >
        Next
        <span
          className={
            onDark
              ? "text-[#9be9da]"
              : "bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent"
          }
        >
          Vita
        </span>
      </span>
    </Link>
  );
}

const iconButton =
  "grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground";

export function AppShell({ children }: { children: ReactNode }) {
  const now = useNow(30000);
  const access = useAccess();
  const location = useRouterState({ select: (state) => state.location });
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
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
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

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
    } catch {
      setShellError("O navegador não permitiu ativar a tela cheia.");
    }
  };
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try { window.sessionStorage.setItem(MANUAL_SIGNOUT_KEY, "1"); } catch { /* sem armazenamento */ }
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) {
      try { window.sessionStorage.removeItem(MANUAL_SIGNOUT_KEY); } catch { /* sem armazenamento */ }
      setShellError("Não foi possível sair. Tente novamente.");
      return;
    }
    window.location.assign("/");
  }

  const profile = access.status === "loading" ? "public" : access.status;
  const signedIn = profile !== "public";
  const internalPage = signedIn && location.pathname !== "/";
  const groups = navByProfile[profile];
  const items = groups.flatMap((group) => group.items);
  const publicItems = navByProfile.public[0].items;
  const currentHash = location.hash || clientSectionHashes.hoje;
  const isActive = (item: NavItem) =>
    item.to === location.pathname && (!item.hash || item.hash === currentHash);
  const current = items.find(isActive);
  const panelHome = profile === "client" ? "/cliente" : profile === "admin" ? "/admin" : null;

  const tools = (
    <>
      <button
        type="button"
        onClick={() => void toggleFullscreen()}
        aria-pressed={fullScreen}
        aria-label={fullScreen ? "Sair da tela cheia" : "Ativar tela cheia"}
        title="Tela cheia"
        className={`${iconButton} hidden sm:grid`}
      >
        {fullScreen ? <Minimize size={17} /> : <Maximize size={17} />}
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        aria-pressed={darkMode}
        aria-label={darkMode ? "Ativar tema claro" : "Ativar tema escuro"}
        title={darkMode ? "Tema claro" : "Tema escuro"}
        className={iconButton}
      >
        {darkMode ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </>
  );
  const loginButton = (
    <Link
      to="/entrar"
      className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
    >
      <LogIn size={16} /> Entrar
    </Link>
  );

  const sideLink = (item: NavItem) => {
    const active = isActive(item);
    const Icon = item.icon;
    const theme = item.hash ? sectionThemeByHash[item.hash] : undefined;
    return (
      <Link
        key={item.to + (item.hash ?? "")}
        to={item.to}
        {...(item.hash ? { hash: item.hash } : {})}
        activeOptions={{ exact: true, includeHash: true }}
        aria-current={active ? "page" : undefined}
        className={`group relative flex h-10 items-center gap-3 rounded-xl px-2.5 text-[13px] font-semibold transition-all ${active ? `${theme?.pill ?? "bg-primary"} text-white shadow-lg ring-1 ring-white/20` : "text-slate-300 hover:translate-x-0.5 hover:bg-white/[.07] hover:text-white"}`}
      >
        <span
          className={`grid size-7 shrink-0 place-items-center rounded-lg transition ${active ? "bg-white/25" : theme ? theme.pill + " text-white opacity-90 group-hover:opacity-100" : "bg-white/10"}`}
        >
          <Icon size={15} strokeWidth={2.2} />
        </span>
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };
  const sidebarBody = (
    <>
      <nav
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4"
        aria-label="Navegação principal"
      >
        {groups.map((group) => (
          <div key={group.title}>
            <p className="flex items-center gap-2 px-2.5 pb-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">
              {group.title}<i className="h-px flex-1 bg-white/10" />
            </p>
            <div className="grid gap-0.5">{group.items.map(sideLink)}</div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-white/5 p-2">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white"
            aria-hidden="true"
          >
            {(access.name || access.email || "C").slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-white">
              {access.name || "Conta conectada"}
            </span>
            <span className="block truncate text-[11px] text-slate-400">
              {profile === "admin"
                ? "Gestão"
                : profile === "client"
                  ? "Paciente"
                  : "Sem prontuário vinculado"}
            </span>
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            aria-label="Sair da conta"
            title="Sair da conta"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <LogOut size={16} />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] leading-tight text-slate-500">
          Desenvolvido por <span className="font-semibold text-slate-300">Franc D&apos;nis</span>
          <br />
          Feijó, Acre
        </p>
      </div>
    </>
  );

  return (
    <DialogProvider>
      <HydrationProvider>
        <div className="care-shell flex h-dvh min-h-0 overflow-hidden bg-background text-foreground">
          {internalPage && (
            <aside
              onMouseEnter={() => setSidebarExpanded(true)}
              onMouseLeave={() => setSidebarExpanded(false)}
              className={`sidebar-shell hidden shrink-0 flex-col bg-sidebar transition-[width] duration-200 xl:flex ${sidebarExpanded ? "w-60" : "w-16"}`}
            >
              <div
                className={`flex h-14 shrink-0 items-center border-b border-white/10 ${sidebarExpanded ? "px-4" : "justify-center px-2"}`}
              >
                <Brand onDark />
              </div>
              {sidebarBody}
            </aside>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="z-30 flex h-12 shrink-0 items-center gap-2.5 border-b border-border bg-surface/90 px-2.5 backdrop-blur sm:px-4">
              {internalPage ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Abrir menu"
                    aria-expanded={menuOpen}
                    className={`${iconButton} xl:hidden`}
                  >
                    <Menu size={18} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[15px] font-bold leading-tight">
                      {current?.label ??
                        (location.pathname === "/" ? "Página inicial" : "NextVita")}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {fmtClock(now)} · horário do Acre
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Brand />
                  <nav
                    className="ml-2 hidden min-w-0 flex-1 items-center justify-start gap-0 overflow-hidden min-[1180px]:flex xl:ml-4 xl:gap-0.5"
                    aria-label="Navegação principal"
                  >
                    {publicItems.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        activeOptions={{ exact: item.to === "/" }}
                        className="shrink-0 whitespace-nowrap rounded-lg px-2 py-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground xl:px-3 xl:text-[13px]"
                        activeProps={{ className: "!bg-accent !text-accent-foreground" }}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                  <span className="flex-1 min-[1180px]:hidden" />
                </>
              )}
              <div className="flex shrink-0 items-center gap-1.5">
                {signedIn &&
                  (location.pathname === "/" ? (
                    panelHome && (
                      <Link
                        to={panelHome}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
                        title="Voltar ao meu painel"
                      >
                        <LayoutDashboard size={16} />
                        <span className="hidden sm:inline">Meu painel</span>
                      </Link>
                    )
                  ) : (
                    <Link
                      to="/"
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:border-primary/40"
                      title="Ir à página inicial sem sair da conta"
                    >
                      <Home size={16} />
                      <span className="hidden sm:inline">Página inicial</span>
                    </Link>
                  ))}
                {signedIn && <LiveModeLauncher iconOnlyOnMobile />}
                <InstallAppButton className="max-sm:!hidden" />
                {tools}
                {signedIn && (
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    disabled={signingOut}
                    aria-label="Sair da conta"
                    title="Sair da conta"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
                  >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">{signingOut ? "Saindo…" : "Sair"}</span>
                  </button>
                )}
                {!signedIn && access.status !== "loading" && loginButton}
                {!signedIn && (
                  <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Abrir menu"
                    aria-expanded={menuOpen}
                    className={`${iconButton} min-[1180px]:hidden`}
                  >
                    <Menu size={18} />
                  </button>
                )}
              </div>
            </header>

            {shellError && (
              <p
                role="alert"
                className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive"
              >
                {shellError}
              </p>
            )}
            <main
              id="care-content"
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2 sm:p-4 lg:p-5"
            >
              {children}
              {location.pathname === "/" && (
                <QrShareCard variant="footer" className="nv-qr-footer mx-auto mt-4 max-w-2xl" />
              )}
              {location.pathname !== "/" && (
                <p className="mt-3 border-t border-border pt-3 text-center text-xs text-muted-foreground">
                  NextVita · Desenvolvido por{" "}
                  <Link to="/sobre" className="font-semibold text-foreground underline-offset-2 hover:underline">Franc D&apos;nis</Link> ·
                  Feijó, Acre
                </p>
              )}
            </main>
          </div>

          <aside
            aria-label="Marca NextVita"
            className="pointer-events-none fixed left-0 top-14 z-20 hidden h-[calc(100dvh-3.5rem)] w-0 items-center justify-center xl:flex"
          >
            <div className="pointer-events-none fixed left-1 top-16 bottom-3 flex flex-col items-center justify-between py-2">
              <span className="[writing-mode:vertical-rl] rotate-180 text-[8px] font-extrabold uppercase tracking-[.28em] text-primary">
                NextVita
              </span>
              <span className="[writing-mode:vertical-rl] rotate-180 text-[7px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
                Bem-estar conectado
              </span>
            </div>
          </aside>
          <aside
            aria-label="Assinatura do desenvolvedor"
            className="pointer-events-none fixed right-0 top-14 z-20 hidden h-[calc(100dvh-3.5rem)] w-0 items-center justify-center xl:flex"
          >
            <div className="pointer-events-none fixed right-1 top-16 bottom-3 flex flex-col items-center justify-between py-2">
              <span className="[writing-mode:vertical-rl] rotate-180 text-[7px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
                Desenvolvido por Franc D&apos;nis
              </span>
              <span className="[writing-mode:vertical-rl] rotate-180 text-[7px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
                Feijó, Acre · Cuidar de si é acompanhar sua evolução
              </span>
            </div>
          </aside>

          {menuOpen && (
            <div
              className={`fixed inset-0 z-50 ${signedIn ? "xl:hidden" : "min-[1180px]:hidden"}`}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
            >
              <button
                type="button"
                aria-label="Fechar menu"
                className="absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-sm"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-sidebar shadow-2xl">
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
                  <Brand onDark />
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Fechar menu"
                    className="grid size-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
                {internalPage ? (
                  sidebarBody
                ) : (
                  <nav className="grid gap-0.5 p-3" aria-label="Navegação principal">
                    {publicItems.map(sideLink)}
                    <Link
                      to="/entrar"
                      className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white"
                    >
                      <LogIn size={16} /> Entrar
                    </Link>
                  </nav>
                )}
              </div>
            </div>
          )}

          {profile === "admin" && <HydrationReminder />}
        </div>
      </HydrationProvider>
    </DialogProvider>
  );
}
