import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { MANUAL_SIGNOUT_KEY } from "./SessionGuard";
import {
  Activity,
  Apple,
  BarChart3,
  BedDouble,
  BookOpen,
  ChevronDown,
  CalendarDays,
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
  Users,
  Ruler,
  Megaphone,
  Wallet,
  TrendingUp,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { LogoMark } from "./Logo";
import { supabase } from "@/integrations/supabase/client";
import { clientSectionHashes, type ClientSection } from "@/lib/client-pages";
import { useAccess, type AccessStatus } from "@/lib/use-access";
import { clientSectionTheme, type SectionTheme } from "@/lib/client-section-theme";
import { fmtClock, useNow } from "./ui";
import { InstallAppButton } from "./InstallApp";
import { LiveModeLauncher } from "./LiveMode";
import { HydrationProvider } from "./HydrationTracker";
import { ProductQuickViewHost } from "./StoreViews";
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
      title: "Hoje",
      items: [
        section("hoje", "Visão geral", LayoutDashboard),
        section("agenda", "Meu dia", CalendarDays),
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
        section("medidas", "Medidas do corpo", Ruler),
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
      title: "Administração",
      items: [
        { to: "/admin", hash: "visao", label: "Visão geral", icon: Settings2 },
        { to: "/admin", hash: "clientes", label: "Clientes", icon: Users },
        { to: "/admin", hash: "lojas", label: "Lojas e estabelecimentos", icon: Store },
      ],
    },
    {
      title: "Negócio",
      items: [
        { to: "/admin", hash: "vendas", label: "Vendas e faturamento", icon: TrendingUp },
        { to: "/admin", hash: "propagandas", label: "Propagandas", icon: Megaphone },
        { to: "/admin", hash: "pagamentos", label: "Pagamentos", icon: Wallet },
      ],
    },
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
              ? "text-[#7ef0cc]"
              : "text-primary"
          }
        >
          Vita
        </span>
      </span>
    </Link>
  );
}

const primaryPublic = [
  { to: "/", label: "Início" },
  { to: "/protocolos", label: "Como funciona" },
] as const;
const resourceLinks = [
  { to: "/medicamentos", label: "Medicamentos", icon: Pill },
  { to: "/hidratacao", label: "Hidratação", icon: Droplets },
  { to: "/dietas", label: "Dietas", icon: Utensils },
  { to: "/suplementos", label: "Suplementos", icon: Sparkles },
  { to: "/peso", label: "Peso", icon: Scale },
  { to: "/sono", label: "Sono", icon: BedDouble },
  { to: "/treinos", label: "Treinos", icon: Activity },
  { to: "/metricas", label: "Métricas", icon: BarChart3 },
] as const;
const resourceColors: Record<string, string> = { "/medicamentos": "#fb7185", "/hidratacao": "#38bdf8", "/dietas": "#34d399", "/suplementos": "#a78bfa", "/peso": "#e879f9", "/sono": "#818cf8", "/treinos": "#fb923c", "/metricas": "#2dd4bf" };

/** Menu superior para visitantes: poucos itens visíveis e as áreas de saúde agrupadas em "Recursos". */
function PublicTopNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const resourceActive = resourceLinks.some((r) => r.to === pathname);
  const linkCls = "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
  return (
    <nav className="ml-4 hidden flex-1 items-center gap-1 lg:flex" aria-label="Navegação principal">
      {primaryPublic.map((item) => (
        <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === "/" }} className={linkCls} activeProps={{ className: "!bg-accent !text-accent-foreground" }}>
          {item.label}
        </Link>
      ))}
      <div ref={wrap} className="relative">
        <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}
          className={`${linkCls} gap-1 ${resourceActive ? "!bg-accent !text-accent-foreground" : ""}`}>
          Recursos <ChevronDown size={15} aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="nv-fade-in absolute left-0 top-full z-40 mt-2 grid w-[26rem] grid-cols-2 gap-1 rounded-2xl border border-border bg-surface p-2 shadow-pop">
            {resourceLinks.map((r) => (
              <Link key={r.to} to={r.to} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted" activeProps={{ className: "!bg-accent !text-accent-foreground" }}>
                <r.icon size={16} aria-hidden="true" className="text-primary" /> {r.label}
              </Link>
            ))}
          </div>
        )}
      </div>
      <Link to="/loja" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted" activeProps={{ className: "!bg-accent !text-accent-foreground" }}>
        <ShoppingBag size={16} aria-hidden="true" className="text-amber-600" /> Loja
      </Link>
      <Link to="/lojista" className={linkCls} activeProps={{ className: "!bg-accent !text-accent-foreground" }}>Seja lojista</Link>
      <Link to="/sobre" className={linkCls} activeProps={{ className: "!bg-accent !text-accent-foreground" }}>Sobre</Link>
    </nav>
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
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const hoverTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    try { setSidebarPinned(localStorage.getItem("nv-sidebar-pinned") === "1"); } catch { /* sem armazenamento */ }
  }, []);
  const togglePin = () => setSidebarPinned((v) => {
    try { localStorage.setItem("nv-sidebar-pinned", v ? "0" : "1"); } catch { /* sem armazenamento */ }
    return !v;
  });
  // Atalho de teclado: [ fixa ou solta o menu lateral.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "[" || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable) return;
      togglePin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const openRail = () => { window.clearTimeout(hoverTimer.current); hoverTimer.current = window.setTimeout(() => setSidebarExpanded(true), 120); };
  const closeRail = () => { window.clearTimeout(hoverTimer.current); setSidebarExpanded(false); };
  const railOpen = sidebarExpanded || sidebarPinned;
  const [darkMode, setDarkMode] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [shellError, setShellError] = useState("");

  useEffect(() => {
    const enabled = window.localStorage.getItem("caredigital-theme") !== "light"; // escuro é o padrão
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
  const currentHash = location.hash || (location.pathname === "/admin" ? "visao" : clientSectionHashes.hoje);
  const isActive = (item: NavItem) =>
    item.to === location.pathname && (!item.hash || item.hash === currentHash);
  const current = items.find(isActive);
  const panelHome = profile === "client" ? "/cliente" : profile === "admin" ? "/admin" : null;
  // A barra inferior do celular aparece fora das páginas internas: botões flutuantes sobem acima dela.
  useEffect(() => {
    if (internalPage) document.body.removeAttribute("data-bottom-nav");
    else document.body.setAttribute("data-bottom-nav", "");
    return () => document.body.removeAttribute("data-bottom-nav");
  }, [internalPage]);

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
        title={railOpen ? undefined : item.label}
        className={`nv-rail-link group relative flex h-11 items-center gap-3 rounded-[14px] px-2 text-[13px] font-semibold transition-colors ${active ? "bg-white/[.08] text-white ring-1 ring-inset ring-white/[.08]" : "text-slate-400 hover:bg-white/[.05] hover:text-white"}`}
      >
        <span className={`nv-rail-icon relative grid size-8 shrink-0 place-items-center rounded-[10px] transition-all duration-300 ${active ? `${theme?.pill ?? "bg-primary"} text-white shadow-[0_6px_18px_-6px_rgba(16,185,129,.6)]` : "text-slate-400 group-hover:bg-white/[.07] group-hover:text-white"}`}>
          <Icon size={17} strokeWidth={2.1} />
          {active && <i aria-hidden="true" className="absolute -right-1 -top-1 size-2 rounded-full bg-white ring-2 ring-[#0b1219]" />}
        </span>
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };
  const sidebarBody = (
    <>
      <nav
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2 py-3 [scrollbar-width:none]"
        aria-label="Navegação principal"
      >
        {groups.map((group) => (
          <div key={group.title}>
            <p className="flex h-5 items-center gap-2 px-2 pb-1 text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">
              <span className="nv-rail-label whitespace-nowrap">{group.title}</span><i className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
            </p>
            <div className="grid gap-0.5">{group.items.map(sideLink)}</div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-white/[.07] p-2">
        <div className="flex items-center gap-2.5 rounded-[14px] bg-white/[.04] p-1.5 ring-1 ring-inset ring-white/[.06]">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-bold text-white ring-2 ring-emerald-300/30"
            aria-hidden="true"
          >
            {(access.name || access.email || "C").slice(0, 1).toUpperCase()}
          </span>
          <span className="sidebar-account-copy min-w-0 flex-1 leading-tight">
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
            className="sidebar-account-action grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <LogOut size={16} />
          </button>
        </div>
        <p className="nv-rail-label mt-2 whitespace-nowrap text-center text-[10px] leading-tight text-slate-500">
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
        <ProductQuickViewHost />
        <div className="care-shell flex h-dvh min-h-0 overflow-hidden bg-background text-foreground">
          {internalPage && (
            <div className={`relative hidden shrink-0 transition-[width] duration-300 ease-out xl:block ${fullScreen ? "w-0" : sidebarPinned ? "w-[16.5rem]" : "w-[5.5rem]"}`}>
              {fullScreen && (
                <div aria-hidden="true" onMouseEnter={openRail} className="absolute inset-y-0 left-0 z-50 w-2" title="Menu" />
              )}
              <aside
                onMouseEnter={openRail}
                onMouseLeave={closeRail}
                onFocusCapture={() => setSidebarExpanded(true)}
                onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSidebarExpanded(false); }}
                data-collapsed={railOpen ? undefined : ""}
                className={`sidebar-shell absolute inset-y-3 left-3 z-40 flex flex-col overflow-hidden rounded-[22px] border border-white/[.08] bg-[linear-gradient(180deg,#0f1b24_0%,#0b1219_55%,#0a1016_100%)] shadow-[0_24px_60px_-24px_rgba(0,0,0,.7)] transition-[width,box-shadow,transform] duration-300 ease-out ${railOpen || fullScreen ? "w-60" : "w-16"} ${fullScreen && !sidebarExpanded ? "-translate-x-[calc(100%+1.5rem)]" : ""} ${sidebarExpanded && !sidebarPinned ? "shadow-[24px_0_48px_-20px_rgba(0,0,0,.55)]" : ""}`}
              >
                <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full bg-emerald-400/20 blur-3xl" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-16 size-44 rounded-full bg-sky-500/10 blur-3xl" />
                <div className="relative flex h-16 shrink-0 items-center gap-2 px-[13px]">
                  <Brand onDark />
                </div>
                {sidebarBody}
                <button
                  type="button"
                  onClick={togglePin}
                  aria-pressed={sidebarPinned}
                  title={sidebarPinned ? "Recolher menu ( [ )" : "Fixar menu aberto ( [ )"}
                  className="relative mx-2 mb-2 flex h-10 shrink-0 items-center gap-3 rounded-[14px] px-2 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-white/[.06] hover:text-white"
                >
                  <span className="grid size-8 shrink-0 place-items-center">{sidebarPinned ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}</span>
                  <span className="nv-rail-label truncate">{sidebarPinned ? "Recolher menu" : "Fixar menu aberto"}</span>
                  <kbd className="nv-rail-label ml-auto rounded border border-white/15 px-1.5 text-[10px] text-slate-500">[</kbd>
                </button>
              </aside>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="z-30 flex h-14 shrink-0 items-center gap-2.5 border-b border-border bg-surface/90 px-2.5 backdrop-blur sm:px-4">
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
                  <PublicTopNav pathname={location.pathname} />
                  <span className="flex-1 lg:hidden" />
                </>
              )}
              <div className="flex shrink-0 items-center gap-2">
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
                      <span className="hidden 2xl:inline">Página inicial</span>
                    </Link>
                  ))}
                {signedIn && profile !== "admin" && !location.pathname.startsWith("/cliente") && <LiveModeLauncher iconOnlyOnMobile />}
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
                    <span className="hidden 2xl:inline">{signingOut ? "Saindo…" : "Sair"}</span>
                  </button>
                )}
                {!signedIn && access.status !== "loading" && loginButton}
                {!signedIn && (
                  <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Abrir menu"
                    aria-expanded={menuOpen}
                    className={`${iconButton} lg:hidden`}
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
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2 sm:p-3 lg:p-4"
            >
              {children}
              {location.pathname !== "/" && (
                <p className="nv-shell-credit mt-3 border-t border-border pt-3 text-center text-xs text-muted-foreground">
                  NextVita · Desenvolvido por{" "}
                  <Link to="/sobre" className="font-semibold text-foreground underline-offset-2 hover:underline">Franc D&apos;nis</Link> ·
                  Feijó, Acre
                </p>
              )}
            </main>
          </div>

          {!internalPage && (
            <nav aria-label="Navegação rápida" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
              <div className="mx-auto grid max-w-md grid-cols-4">
                {[
                  { key: "home", label: "Início", icon: Home, to: "/" },
                  { key: "menu", label: "Recursos", icon: LayoutDashboard },
                  { key: "loja", label: "Loja", icon: ShoppingBag, to: "/loja" },
                  { key: "conta", label: signedIn ? "Painel" : "Entrar", icon: signedIn ? Settings2 : LogIn, to: panelHome ?? "/entrar" },
                ].map((it) => {
                  const active = it.to ? (it.to === "/" ? location.pathname === "/" : location.pathname.startsWith(it.to)) : menuOpen;
                  const cls = `nv-tab relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`;
                  const inner = (<><it.icon size={21} className={`transition-transform ${active ? "-translate-y-0.5 scale-110" : ""}`} />{it.label}{active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}</>);
                  return it.to
                    ? <Link key={it.key} to={it.to} className={cls} aria-current={active ? "page" : undefined}>{inner}</Link>
                    : <button key={it.key} type="button" onClick={() => setMenuOpen(true)} className={cls} aria-expanded={menuOpen}>{inner}</button>;
                })}
              </div>
            </nav>
          )}

          {menuOpen && (
            <div
              className={`fixed inset-0 z-50 ${signedIn ? "xl:hidden" : "lg:hidden"}`}
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
              <div className={`nv-drawer absolute inset-y-0 left-0 flex flex-col bg-sidebar shadow-2xl ${internalPage ? "w-[min(18rem,85vw)]" : "w-[min(22rem,90vw)]"}`}>
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
                  <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 text-white" aria-label="Navegação principal">
                    <div className="grid grid-cols-2 gap-2">
                      <a href="/entrar?mode=signup" className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-400 text-sm font-bold text-slate-950">Criar conta grátis</a>
                      <Link to="/entrar" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/20 text-sm font-semibold"><LogIn size={16} /> Entrar</Link>
                    </div>
                    <div>
                      <p className="px-1 pb-2 text-xs font-semibold text-slate-400">Navegar</p>
                      <div className="grid gap-1">
                        {[{ to: "/", label: "Início", icon: Home }, { to: "/protocolos", label: "Como funciona", icon: HeartPulse }, { to: "/loja", label: "Loja NextVita", icon: ShoppingBag }, { to: "/lojista", label: "Seja lojista", icon: Store }, { to: "/sobre", label: "Sobre", icon: Info }].map((it) => (
                          <Link key={it.to} to={it.to} activeOptions={{ exact: it.to === "/" }} className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-200 hover:bg-white/10" activeProps={{ className: "!bg-white/10 !text-white" }}>
                            <it.icon size={18} className="text-emerald-300" /> {it.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="px-1 pb-2 text-xs font-semibold text-slate-400">Recursos gratuitos</p>
                      <div className="grid grid-cols-2 gap-2">
                        {resourceLinks.map((r, i) => (
                          <Link key={r.to} to={r.to} className="nv-drawer-item flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.04] p-2.5 text-[13px] font-semibold text-slate-100" style={{ animationDelay: `${i * 35}ms` }} activeProps={{ className: "!border-emerald-300/50 !bg-emerald-400/10" }}>
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `${resourceColors[r.to]}33`, color: resourceColors[r.to] }}><r.icon size={16} /></span>
                            {r.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <a href="https://wa.me/5568992031340" target="_blank" rel="noopener noreferrer" className="mt-auto flex items-center gap-3 rounded-xl border border-white/10 p-3 text-xs text-slate-300">
                      <span className="grid size-9 place-items-center rounded-lg bg-[#25d366]/20 text-[#25d366]"><Sparkles size={16} /></span>
                      <span><strong className="block text-sm text-white">Fale com a NextVita</strong>Dúvidas, parcerias e projetos pelo WhatsApp</span>
                    </a>
                  </nav>
                )}
              </div>
            </div>
          )}

        </div>
      </HydrationProvider>
    </DialogProvider>
  );
}
