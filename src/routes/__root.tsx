import { SiteIntro } from "@/components/vigia/SiteIntro";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "@/components/vigia/AppShell";
import { SessionGuard } from "@/components/vigia/SessionGuard";
import { OfflineSync } from "@/components/vigia/OfflineSync";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Voltar ao painel
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}

// Endereço oficial (sem redirecionamento): é o que redes sociais e buscadores devem usar.
const SITE_URL = "https://www.nextvita.life";
const SHARE_IMAGE = `${SITE_URL}/share-card-v3.jpg`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "NextVita — Bem-estar conectado" },
      {
        name: "description",
        content:
          "NextVita: nutrição, hidratação, evolução do peso, suplementos e rotina de autocuidado em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "NextVita — Bem-estar conectado" },
      {
        property: "og:description",
        content: "Seu hub pessoal para cuidar do corpo, acompanhar hábitos e evoluir com clareza.",
      },
      { property: "og:site_name", content: "NextVita" },
      { property: "og:url", content: SITE_URL },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:image", content: SHARE_IMAGE },
      { property: "og:image:secure_url", content: SHARE_IMAGE },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "NextVita: seu corpo, sua saúde e sua rotina em um só app, agora com loja de suplementos e moda fitness. Grátis para teste." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "NextVita — Bem-estar conectado" },
      { name: "twitter:description", content: "Medicação, hidratação, alimentação, treinos, sono e peso em uma rotina só. Grátis para teste." },
      { name: "twitter:image", content: SHARE_IMAGE },
      { name: "twitter:image:alt", content: "NextVita: seu corpo, sua saúde e sua rotina em um só app, agora com loja. Grátis para teste." },
      { name: "theme-color", content: "#0c8063" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "NextVita" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: SITE_URL },
      { rel: "icon", href: "/caredigital-icon.svg", type: "image/svg+xml" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        {/* Escuro é o padrão; só fica claro se a pessoa escolheu. Roda antes da pintura para não piscar. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('caredigital-theme')==='light')document.documentElement.classList.remove('dark')}catch(e){}" }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <SessionGuard />
      <OfflineSync />
      <SiteIntro />
      <AppShell>
        <Outlet />
      </AppShell>
    </QueryClientProvider>
  );
}
