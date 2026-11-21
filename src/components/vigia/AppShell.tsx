import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { MANUAL_SIGNOUT_KEY } from "./SessionGuard";
import { releaseStoreDevice } from "@/lib/store-devices";
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
  ShoppingCart,
  ArrowRight,
  Ruler,
  Megaphone,
  Wallet,
  TrendingUp,
  Lock,
  LockOpen,
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
import { money, STORE_LIVE, useCart } from "@/lib/store";
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
      title: "Rotina diária",
      items: [
        section("medicacao", "Medicação", Pill),
        section("suplementos", "Suplementos", Sparkles),
        section("hidratacao", "Hidratação", Droplets),
        section("alimentacao", "Alimentação", Utensils),
        section("atividade", "Atividade", Activity),
        section("sono", "Sono", BedDouble),
      ],
    },
    {
      title: "Corpo e evolução",
      items: [
        section("peso", "Peso e evolução", Scale),
        section("medidas", "Medidas do corpo", Ruler),
        section("batimentos", "Batimentos cardíacos", HeartPulse),
        section("indicadores", "Indicadores", Target),
      ],
    },
    {
      title: "Nutrição",
      items: [
        section("cardapios", "Cardápios e dietas", BookOpen),
        { to: "/biblioteca-alimentar", label: "Biblioteca alimentar", icon: Apple },
      ],
    },
    {
      title: "Loja",
      items: [
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
        { to: "/lojista", label: "Painel das lojas", icon: LayoutDashboard },
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
  vendor: [
    { title: "Minha loja", items: [{ to: "/lojista", label: "Painel da loja", icon: Store }] },
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
        <span className={onDark ? "text-[#7ef0cc]" : "text-primary"}>Vita</span>
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
const resourceColors: Record<string, string> = {
  "/medicamentos": "#fb7185",
  "/hidratacao": "#38bdf8",
  "/dietas": "#34d399",
  "/suplementos": "#a78bfa",
  "/peso": "#e879f9",
  "/sono": "#818cf8",
  "/treinos": "#fb923c",
  "/metricas": "#2dd4bf",
};

/** Menu superior para visitantes: poucos itens visíveis e as áreas de saúde agrupadas em "Recursos". */
function PublicTopNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const resourceActive = resourceLinks.some((r) => r.to === pathname);
  const linkCls =
    "nv-tab relative inline-flex h-14 items-center gap-1.5 px-3.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground";
  const activeCls = { className: "nv-tab-on !text-foreground" };
  return (
    <nav
      className="mx-auto hidden items-center gap-0.5 self-stretch lg:flex"
      aria-label="Navegação principal"
    >
      {primaryPublic.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.to === "/" }}
          className={linkCls}
          activeProps={activeCls}
        >
          {item.label}
        </Link>
      ))}
      <div ref={wrap} className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((o) => !o)}
          className={`${linkCls} ${resourceActive || open ? "nv-tab-on !text-foreground" : ""}`}
        >
          Recursos{" "}
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="nv-pop absolute left-1/2 top-full z-40 mt-0 grid w-[30rem] -translate-x-1/2 grid-cols-2 gap-1 rounded-2xl border border-border bg-surface/95 p-2 shadow-pop backdrop-blur-xl">
            {resourceLinks.map((r) => (
              <Link
                key={r.to}
                to={r.to}
                className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors hover:bg-muted"
                activeProps={{ className: "!bg-accent !text-accent-foreground" }}
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-white shadow-sm transition-transform group-hover:scale-110"
                  style={{ background: resourceColors[r.to] }}
                >
                  <r.icon size={15} aria-hidden="true" />
                </span>
                {r.label}
              </Link>
            ))}
          </div>
        )}
      </div>
      <Link to="/loja" className={`${linkCls} !text-foreground`} activeProps={activeCls}>
        <ShoppingBag size={15} aria-hidden="true" className="text-amber-400" /> Loja
      </Link>
      <Link to="/lojista" className={linkCls} activeProps={activeCls}>
        Seja lojista
      </Link>
      <Link to="/sobre" className={linkCls} activeProps={activeCls}>
        Sobre
      </Link>
    </nav>
  );
}

/** Carrinho no topo: mostra o que foi separado; compras liberadas quando as lojas publicarem produtos oficiais. */
function HeaderCart() {
  const { lines, count, subtotal } = useCart();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Carrinho, ${count} ${count === 1 ? "item" : "itens"}`}
        title="Carrinho"
        className={`${iconButton} relative`}
      >
        <ShoppingCart size={17} />
        {count > 0 && (
          <span
            key={count}
            className="nv-heart-pop absolute -right-1 -top-1 grid min-w-[1.15rem] place-items-center rounded-full bg-emerald-400 px-1 text-[11px] font-extrabold leading-[1.15rem] text-slate-950 ring-2 ring-surface"
          >
            {count}
          </span>
        )}
      </button>
      {open && (
        <div className="nv-pop absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-border bg-surface/95 shadow-pop backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <strong className="text-sm">Carrinho</strong>
            {!STORE_LIVE && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                Em breve
              </span>
            )}
          </div>
          {lines.length ? (
            <ul className="grid max-h-56 gap-1 overflow-y-auto p-2">
              {lines.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                  <img
                    src={l.product.img}
                    alt=""
                    className="size-10 rounded-lg bg-muted object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{l.product.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {l.qty} × {money(l.product.priceCents)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-center text-xs text-muted-foreground">
              Seu carrinho está vazio.
            </p>
          )}
          <div className="border-t border-border p-3">
            {lines.length > 0 && (
              <p className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <strong className="tabular-nums">{money(subtotal)}</strong>
              </p>
            )}
            {!STORE_LIVE && (
              <p className="mb-2.5 rounded-xl bg-muted/60 p-2.5 text-[11px] leading-snug text-muted-foreground">
                As compras serão liberadas quando as lojas parceiras publicarem seus produtos
                oficiais. Você já pode separar o que quer comprar.
              </p>
            )}
            <Link
              to="/loja"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-bold text-slate-950 transition hover:brightness-110"
            >
              {STORE_LIVE ? "Finalizar compra" : "Ver vitrine da loja"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

const iconButton =
  "grid size-9 shrink-0 place-items-center rounded-full border border-border/70 bg-muted/30 text-muted-foreground transition-[color,background-color,border-color,transform] duration-200 hover:border-border hover:bg-muted hover:text-foreground active:scale-90";

export function AppShell({ children }: { children: ReactNode }) {
  const now = useNow(30000);
  const access = useAccess();
  const location = useRouterState({ select: (state) => state.location });
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarLocked, setSidebarLocked] = useState(false);
  const hoverTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    try {
      setSidebarPinned(localStorage.getItem("nv-sidebar-pinned") === "1");
      setSidebarLocked(localStorage.getItem("nv-sidebar-locked") === "1");
    } catch {
      /* sem armazenamento */
    }
  }, []);
  const togglePin = () =>
    setSidebarPinned((v) => {
      try {
        localStorage.setItem("nv-sidebar-pinned", v ? "0" : "1");
      } catch {
        /* sem armazenamento */
      }
      return !v;
    });
  // Trava o estado atual (aberto ou recolhido): o menu deixa de expandir ao passar o mouse.
  const toggleLock = () => {
    const next = !sidebarLocked;
    setSidebarLocked(next);
    if (next) {
      setSidebarPinned(sidebarPinned || sidebarExpanded);
      setSidebarExpanded(false);
    }
    try {
      localStorage.setItem("nv-sidebar-locked", next ? "1" : "0");
      if (next)
        localStorage.setItem("nv-sidebar-pinned", sidebarPinned || sidebarExpanded ? "1" : "0");
    } catch {
      /* sem armazenamento */
    }
  };
  // Atalho de teclado: [ fixa ou solta o menu lateral.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (
        e.key !== "[" ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        /INPUT|TEXTAREA|SELECT/.test(t.tagName) ||
        t.isContentEditable
      )
        return;
      togglePin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const openRail = () => {
    if (sidebarLocked) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setSidebarExpanded(true), 120);
  };
  const closeRail = () => {
    window.clearTimeout(hoverTimer.current);
    setSidebarExpanded(false);
  };
  const railOpen = sidebarLocked ? sidebarPinned : sidebarExpanded || sidebarPinned;
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
    try {
      window.sessionStorage.setItem(MANUAL_SIGNOUT_KEY, "1");
    } catch {
      /* sem armazenamento */
    }
    await releaseStoreDevice();
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) {
      try {
        window.sessionStorage.removeItem(MANUAL_SIGNOUT_KEY);
      } catch {
        /* sem armazenamento */
      }
      setShellError("Não foi possível sair. Tente novamente.");
      return;
    }
    window.location.assign("/");
  }

  const profile = access.status === "loading" ? "public" : access.status;
  const signedIn = profile !== "public";
  const internalPage = signedIn && location.pathname !== "/";
  // Painel do lojista tem navegação própria: a lateral global não aparece nele.
  const lojistaArea = location.pathname.startsWith("/lojista");
  const groups = navByProfile[profile];
  const items = groups.flatMap((group) => group.items);
  const currentHash =
    location.hash || (location.pathname === "/admin" ? "visao" : clientSectionHashes.hoje);
  const isActive = (item: NavItem) =>
    item.to === location.pathname && (!item.hash || item.hash === currentHash);
  const current = items.find(isActive);
  const panelHome =
    profile === "client"
      ? "/cliente"
      : profile === "admin"
        ? "/admin"
        : profile === "vendor"
          ? "/lojista"
          : null;
  // Administrador e lojista ficam presos ao próprio painel: a homepage e as áreas públicas são de clientes e visitantes.
  const staff = profile === "admin" || profile === "vendor";
  const navigateTo = useNavigate();
  const searchParams = (location.search ?? {}) as Record<string, unknown>;
  const previewStore = location.pathname === "/loja" && typeof searchParams.loja === "string"; // pré-visualizar a página pública da loja
  const staffBlocked =
    access.status === "admin"
      ? !(
          location.pathname.startsWith("/admin") ||
          location.pathname.startsWith("/lojista") ||
          previewStore
        )
      : access.status === "vendor"
        ? !(location.pathname.startsWith("/lojista") || previewStore)
        : false;
  useEffect(() => {
    if (staffBlocked)
      void navigateTo({ to: access.status === "admin" ? "/admin" : "/lojista", replace: true });
  }, [staffBlocked, access.status, navigateTo]);
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
      className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 pl-3.5 pr-3 text-sm font-bold text-slate-950 shadow-[0_6px_18px_-8px_rgba(52,211,153,.8)] transition hover:brightness-110 active:scale-[.97]"
    >
      <LogIn size={15} /> Entrar{" "}
      <ArrowRight size={14} className="-ml-0.5 transition-transform group-hover:translate-x-0.5" />
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
        className={`nv-rail-link group relative flex h-10 items-center gap-3 rounded-lg px-1.5 text-[13px] font-semibold transition-colors duration-200 ${active ? "bg-white/[.08] text-white" : "text-slate-400 hover:bg-white/[.05] hover:text-white"}`}
      >
        <i
          aria-hidden="true"
          className={`absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.8)] transition-all duration-300 ${active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"}`}
        />
        <span
          className={`nv-rail-icon relative grid size-7 shrink-0 place-items-center rounded-md transition-all duration-300 ${active ? `${theme?.pill ?? "bg-primary"} text-white shadow-[0_8px_20px_-8px_rgba(16,185,129,.85),inset_0_1px_0_rgba(255,255,255,.35)]` : "text-slate-400 group-hover:text-white"}`}
        >
          <Icon size={18} strokeWidth={1.9} />
        </span>
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };
  const sidebarBody = (
    <>
      <nav
        className="nv-rail-nav min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-2 py-2 [scrollbar-width:none]"
        aria-label="Navegação principal"
      >
        {groups.map((group) => (
          <div key={group.title}>
            <p className="nv-rail-group flex h-6 items-center gap-2 px-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-500">
              <span className="nv-rail-label whitespace-nowrap">{group.title}</span>
              <i className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
            </p>
            <div className="grid gap-0.5">{group.items.map(sideLink)}</div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-white/[.07] px-2 pt-1.5">
        <div className="nv-rail-account flex items-center gap-2 p-0.5">
          <span
            className="relative grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-[11px] font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35)]"
            aria-hidden="true"
          >
            {(access.name || access.email || "C").slice(0, 1).toUpperCase()}
            <i className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-300 ring-2 ring-[#0b1219]" />
          </span>
          <span className="sidebar-account-copy min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-white">
              {access.name || "Conta conectada"}
            </span>
            <span className="block truncate text-[11px] text-slate-400">
              {profile === "admin"
                ? "Gestão"
                : profile === "vendor"
                  ? "Lojista"
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
            className="sidebar-account-action grid size-7 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <DialogProvider>
      <HydrationProvider>
        <ProductQuickViewHost />
        <div className="care-shell flex h-dvh min-h-0 overflow-hidden bg-background text-foreground">
          {internalPage && !fullScreen && !lojistaArea && (
            <div
              className={`relative hidden shrink-0 transition-[width] duration-300 ease-out xl:block ${fullScreen ? "w-0" : sidebarPinned ? "w-60" : "w-14"}`}
            >
              {fullScreen && (
                <div
                  aria-hidden="true"
                  onMouseEnter={openRail}
                  className="absolute inset-y-0 left-0 z-50 w-2"
                  title="Menu"
                />
              )}
              <aside
                onMouseEnter={openRail}
                onMouseLeave={closeRail}
                onFocusCapture={() => !sidebarLocked && setSidebarExpanded(true)}
                onBlurCapture={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setSidebarExpanded(false);
                }}
                data-collapsed={railOpen ? undefined : ""}
                className={`sidebar-shell absolute inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-white/[.08] bg-[#0b1219] transition-[width,box-shadow,transform] duration-300 ease-out ${railOpen || fullScreen ? "w-60" : "w-14"} ${fullScreen && !sidebarExpanded ? "-translate-x-full" : ""} ${sidebarExpanded && !sidebarPinned ? "shadow-[24px_0_48px_-20px_rgba(0,0,0,.55)]" : ""}`}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full bg-emerald-400/20 blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-20 -right-16 size-44 rounded-full bg-sky-500/10 blur-3xl"
                />
                <div className="relative flex h-14 shrink-0 items-center gap-2 border-b border-white/[.08] px-2.5">
                  <Brand onDark />
                </div>
                {sidebarBody}
                <div className="relative flex h-7 shrink-0 items-center gap-1 px-2 pb-1">
                  <p className="nv-rail-label nv-rail-credit min-w-0 flex-1 truncate text-[10px] text-slate-600">
                    Franc D&apos;nis · Feijó, Acre
                  </p>
                  <button
                    type="button"
                    onClick={toggleLock}
                    aria-pressed={sidebarLocked}
                    aria-label={sidebarLocked ? "Destravar menu" : "Travar menu neste estado"}
                    title={
                      sidebarLocked
                        ? "Menu travado: não expande nem recolhe sozinho. Clique para destravar"
                        : "Travar o menu neste estado (aberto ou recolhido)"
                    }
                    className={`mx-auto grid size-6 shrink-0 place-items-center transition-colors hover:bg-white/[.08] hover:text-white ${sidebarLocked ? "bg-emerald-400/15 text-emerald-300" : "text-slate-500"}`}
                  >
                    {sidebarLocked ? <Lock size={13} /> : <LockOpen size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={togglePin}
                    aria-pressed={sidebarPinned}
                    aria-label={sidebarPinned ? "Recolher menu" : "Fixar menu aberto"}
                    title={sidebarPinned ? "Recolher menu ( [ )" : "Fixar menu aberto ( [ )"}
                    className="mx-auto grid size-6 shrink-0 place-items-center text-slate-500 transition-colors hover:bg-white/[.08] hover:text-white"
                  >
                    {sidebarPinned ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
                  </button>
                </div>
              </aside>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="nv-topbar z-30 flex h-12 shrink-0 items-center gap-2.5 border-b border-border bg-surface/90 px-2.5 backdrop-blur sm:px-4">
              {internalPage ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Abrir menu"
                    aria-expanded={menuOpen}
                    className={`${iconButton} ${lojistaArea ? "hidden" : "xl:hidden"}`}
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
                  !staff &&
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
                {signedIn && !staff && !location.pathname.startsWith("/cliente") && (
                  <LiveModeLauncher iconOnlyOnMobile />
                )}
                <InstallAppButton className="max-sm:!hidden" />
                {!internalPage && (
                  <span className="hidden sm:contents">
                    <HeaderCart />
                  </span>
                )}
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
                    <LogOut size={15} />
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
              {staffBlocked ? (
                <p role="status" className="py-24 text-center text-sm text-muted-foreground">
                  Abrindo o seu painel…
                </p>
              ) : (
                children
              )}
              {location.pathname !== "/" && (
                <p className="nv-shell-credit mt-3 border-t border-border pt-3 text-center text-xs text-muted-foreground">
                  NextVita · Desenvolvido por{" "}
                  <Link
                    to="/sobre"
                    className="font-semibold text-foreground underline-offset-2 hover:underline"
                  >
                    Franc D&apos;nis
                  </Link>{" "}
                  · Feijó, Acre
                </p>
              )}
            </main>
          </div>

          {!internalPage && (
            <nav
              aria-label="Navegação rápida"
              className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
            >
              <div className="mx-auto grid max-w-md grid-cols-4">
                {[
                  { key: "home", label: "Início", icon: Home, to: "/" },
                  { key: "menu", label: "Recursos", icon: LayoutDashboard },
                  { key: "loja", label: "Loja", icon: ShoppingBag, to: "/loja" },
                  {
                    key: "conta",
                    label: signedIn ? "Painel" : "Entrar",
                    icon: signedIn ? Settings2 : LogIn,
                    to: panelHome ?? "/entrar",
                  },
                ].map((it) => {
                  const active = it.to
                    ? it.to === "/"
                      ? location.pathname === "/"
                      : location.pathname.startsWith(it.to)
                    : menuOpen;
                  const cls = `nv-tab relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`;
                  const inner = (
                    <>
                      <it.icon
                        size={21}
                        className={`transition-transform ${active ? "-translate-y-0.5 scale-110" : ""}`}
                      />
                      {it.label}
                      {active && (
                        <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
                      )}
                    </>
                  );
                  return it.to ? (
                    <Link
                      key={it.key}
                      to={it.to}
                      className={cls}
                      aria-current={active ? "page" : undefined}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button
                      key={it.key}
                      type="button"
                      onClick={() => setMenuOpen(true)}
                      className={cls}
                      aria-expanded={menuOpen}
                    >
                      {inner}
                    </button>
                  );
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
              <div
                className={`nv-drawer absolute inset-y-0 left-0 flex flex-col bg-sidebar shadow-2xl ${internalPage ? "w-[min(18rem,85vw)]" : "w-[min(22rem,90vw)]"}`}
              >
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
                  <nav
                    className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 text-white"
                    aria-label="Navegação principal"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href="/entrar?mode=signup"
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-400 text-sm font-bold text-slate-950"
                      >
                        Criar conta grátis
                      </a>
                      <Link
                        to="/entrar"
                        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/20 text-sm font-semibold"
                      >
                        <LogIn size={16} /> Entrar
                      </Link>
                    </div>
                    <div>
                      <p className="px-1 pb-2 text-xs font-semibold text-slate-400">Navegar</p>
                      <div className="grid gap-1">
                        {[
                          { to: "/", label: "Início", icon: Home },
                          { to: "/protocolos", label: "Como funciona", icon: HeartPulse },
                          { to: "/loja", label: "Loja NextVita", icon: ShoppingBag },
                          { to: "/lojista", label: "Seja lojista", icon: Store },
                          { to: "/sobre", label: "Sobre", icon: Info },
                        ].map((it) => (
                          <Link
                            key={it.to}
                            to={it.to}
                            activeOptions={{ exact: it.to === "/" }}
                            className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
                            activeProps={{ className: "!bg-white/10 !text-white" }}
                          >
                            <it.icon size={18} className="text-emerald-300" /> {it.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="px-1 pb-2 text-xs font-semibold text-slate-400">
                        Recursos gratuitos
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {resourceLinks.map((r, i) => (
                          <Link
                            key={r.to}
                            to={r.to}
                            className="nv-drawer-item flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.04] p-2.5 text-[13px] font-semibold text-slate-100"
                            style={{ animationDelay: `${i * 35}ms` }}
                            activeProps={{ className: "!border-emerald-300/50 !bg-emerald-400/10" }}
                          >
                            <span
                              className="grid size-8 shrink-0 place-items-center rounded-lg"
                              style={{
                                background: `${resourceColors[r.to]}33`,
                                color: resourceColors[r.to],
                              }}
                            >
                              <r.icon size={16} />
                            </span>
                            {r.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <a
                      href="https://wa.me/5568992031340"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto flex items-center gap-3 rounded-xl border border-white/10 p-3 text-xs text-slate-300"
                    >
                      <span className="grid size-9 place-items-center rounded-lg bg-[#25d366]/20 text-[#25d366]">
                        <Sparkles size={16} />
                      </span>
                      <span>
                        <strong className="block text-sm text-white">Fale com a NextVita</strong>
                        Dúvidas, parcerias e projetos pelo WhatsApp
                      </span>
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
