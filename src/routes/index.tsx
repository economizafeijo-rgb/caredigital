import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccess } from "@/lib/use-access";
import { HomeMarketplace } from "@/components/vigia/HomeMarketplace";
import { HomeStage } from "@/components/vigia/HomeStage";
import { HomeToolAds } from "@/components/vigia/HomeToolAds";
import { QrEnlarge } from "@/components/vigia/QrEnlarge";
import { InstallAppButton } from "@/components/vigia/InstallApp";
import { LogoMark } from "@/components/vigia/Logo";
import { HomePartnerBand } from "@/components/vigia/HomePartnerBand";
import { HomeNextCareCard } from "@/components/vigia/CareTimer";
import { HomeModalityTimers } from "@/components/vigia/HomeModalityTimers";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NextVita — Bem-estar organizado" },
      {
        name: "description",
        content:
          "Organize nutrição, hidratação, peso, suplementos e sua rotina de bem-estar em um só lugar.",
      },
      { property: "og:title", content: "NextVita — Bem-estar organizado" },
      {
        property: "og:description",
        content: "Um hub pessoal para acompanhar hábitos, evolução e autocuidado com clareza.",
      },
    ],
  }),
  component: Homepage,
});

function Homepage() {
  const { status, name } = useAccess();
  // Ao abrir (inclusive pelo app instalado), a página inicial sempre começa do topo.
  // Link curto das lojas: nextvita.life/?l=nome-da-loja abre a loja.
  useEffect(() => {
    const l = new URLSearchParams(window.location.search).get("l");
    if (l && /^[a-z0-9-]{2,60}$/.test(l)) window.location.replace(`/loja?loja=${l}`);
  }, []);
  useEffect(() => {
    try {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    } catch {
      /* navegador antigo */
    }
    document.getElementById("care-content")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, []);

  if (status === "loading")
    return (
      <div role="status" className="grid h-full place-items-center text-sm text-muted-foreground">
        Preparando sua página…
      </div>
    );
  const client = status === "client";
  const panel = client ? "/cliente" : status === "admin" ? "/admin" : null;
  const firstName = (name || "usuário").split(" ")[0];

  return (
    <>
      <div className="relative z-10 mx-auto flex w-full max-w-[84rem] flex-col gap-10 max-sm:px-3 sm:max-lg:px-4 lg:gap-14 min-[1280px]:px-[1.75rem]">
        {status === "unlinked" && (
          <p
            role="status"
            className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm"
          >
            Sua conta está conectada, mas ainda não há um prontuário vinculado. Solicite o acesso ao
            administrador.
          </p>
        )}

        <HomeStage client={client} panel={panel} firstName={firstName} />

        {client && (
          <div className="rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 p-1">
            <HomeNextCareCard panel="/cliente" />
          </div>
        )}

        <HomeMarketplace middle={<HomeToolAds client={client} />} />

        <HomePartnerBand />

        {client && <HomeModalityTimers />}

        <footer className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 lg:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <Link to="/" className="inline-flex items-center gap-2">
                <LogoMark size={26} />
                <span className="font-display text-base font-extrabold">
                  Next<span className="text-primary">Vita</span>
                </span>
              </Link>
              <span className="hidden max-w-[16rem] text-xs leading-snug text-muted-foreground xl:block">
                Bem-estar organizado: rotina, lembretes e loja no mesmo app.
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-8 gap-y-2">
              {(
                [
                  [
                    "Ferramentas",
                    [
                      ["/hidratacao", "Hidratação"],
                      ["/medicamentos", "Medicação"],
                      ["/dietas", "Alimentação"],
                      ["/treinos", "Treinos"],
                      ["/sono", "Sono"],
                    ],
                  ],
                  [
                    "Plataforma",
                    [
                      ["/loja", "Loja"],
                      ["/lojista", "Seja lojista"],
                      ["/metricas", "Métricas"],
                      ["/protocolos", "Como funciona"],
                    ],
                  ],
                  [
                    "Empresa",
                    [
                      ["/sobre", "Sobre"],
                      ["/entrar?mode=signup", "Criar conta"],
                      ["/entrar", "Entrar"],
                      ["/parceiros", "Parcerias"],
                    ],
                  ],
                ] as const
              ).map(([title, links]) => (
                <nav key={title} aria-label={title} className="min-w-0">
                  <p className="text-[11px] font-bold text-foreground">{title}</p>
                  <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                    {links.map(([to, label]) => (
                      <li key={to}>
                        <a
                          href={to}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="hidden overflow-hidden rounded-[3px] bg-white sm:block">
                <QrEnlarge
                  variant="footer"
                  thumb={52}
                  big={280}
                  label="Abra o NextVita no celular"
                />
              </span>
              <div className="min-w-0">
                <p className="hidden text-[11px] font-semibold sm:block">Abra no celular</p>
                <div className="sm:mt-1 [&_button]:!h-7 [&_button]:!px-2.5 [&_button]:!text-xs">
                  <InstallAppButton />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-t border-border px-4 py-1.5 text-[11px] text-muted-foreground lg:px-5">
            <span>© {new Date().getFullYear()} NextVita. Todos os direitos reservados.</span>
            <span>
              Desenvolvido por{" "}
              <Link to="/sobre" className="font-semibold text-foreground hover:underline">
                Franc D&apos;nis
              </Link>{" "}
              · Feijó, Acre
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
