import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Store } from "lucide-react";
import { useAccess } from "@/lib/use-access";
import { HomeMarketplace } from "@/components/vigia/HomeMarketplace";
import { HomeStage } from "@/components/vigia/HomeStage";
import { HomeToolAds } from "@/components/vigia/HomeToolAds";
import { QrEnlarge } from "@/components/vigia/QrEnlarge";
import { InstallAppButton } from "@/components/vigia/InstallApp";
import { LogoMark } from "@/components/vigia/Logo";
import { HomeKessiaAd } from "@/components/vigia/HomeKessiaAd";
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
      <div className="relative isolate">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(60rem 32rem at 0% 4%, rgba(63,224,200,.10), transparent 70%), radial-gradient(56rem 30rem at 100% 24%, rgba(200,29,107,.10), transparent 70%), radial-gradient(60rem 32rem at 0% 52%, rgba(99,102,241,.10), transparent 70%), radial-gradient(56rem 30rem at 100% 78%, rgba(63,224,200,.08), transparent 70%)",
          }}
        />
        <div className="relative z-10 mx-auto flex w-full max-w-[96rem] flex-col gap-5 max-sm:px-3 sm:max-lg:px-4 lg:gap-7 min-[1280px]:px-8">
          {status === "unlinked" && (
            <p
              role="status"
              className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm"
            >
              Sua conta está conectada, mas ainda não há um prontuário vinculado. Solicite o acesso
              ao administrador.
            </p>
          )}

          <HomeStage client={client} panel={panel} firstName={firstName} />

          {client && (
            <div className="rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 p-1">
              <HomeNextCareCard panel="/cliente" />
            </div>
          )}

          <HomeKessiaAd />

          <HomeMarketplace middle={<HomeToolAds client={client} />} />

          <HomePartnerBand />

          {client && <HomeModalityTimers />}

          <footer className="nv-dark relative isolate overflow-hidden rounded-2xl bg-[#070d1d] text-white max-sm:-mx-3 max-sm:rounded-none">
            <img
              src="/images/caredigital-care-hero.webp"
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 -z-20 size-full object-cover opacity-[.12]"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_0%_0%,rgba(63,224,200,.18),transparent_60%),radial-gradient(70%_60%_at_100%_100%,rgba(99,102,241,.16),transparent_60%)]"
            />
            <span
              aria-hidden="true"
              className="block h-[3px] w-full bg-gradient-to-r from-[#3fe0c8] via-[#6366f1] to-[#e8368f]"
            />

            <div className="grid gap-6 px-4 pb-5 pt-6 sm:px-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_auto] lg:items-start lg:gap-10 lg:py-7">
              {/* Marca + app */}
              <div className="min-w-0">
                <Link to="/" className="inline-flex items-center gap-2.5">
                  <LogoMark size={34} />
                  <span className="font-display text-xl font-extrabold">
                    Next<span className="text-[#3fe0c8]">Vita</span>
                  </span>
                </Link>
                <p className="mt-2 max-w-[30ch] text-[13px] leading-relaxed text-white/65">
                  Bem-estar organizado: rotina, lembretes e as lojas de Feijó no mesmo app.
                </p>
                <a
                  href="/nossos-parceiros"
                  className="mt-4 flex items-center gap-3 bg-white/[.06] p-3 ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  <span className="grid size-10 shrink-0 place-items-center bg-[#3fe0c8] text-slate-950">
                    <Store size={19} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <strong className="block text-[14px] font-extrabold">Lojas parceiras</strong>
                    <span className="block text-[12px] text-white/60">Compre de quem é daqui</span>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-[#3fe0c8]" />
                </a>
              </div>

              {/* Links */}
              <div className="grid min-w-0 gap-6 sm:grid-cols-3 sm:gap-6">
                {(
                  [
                    [
                      "Ferramentas",
                      "#3fe0c8",
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
                      "#fbbf24",
                      [
                        ["/loja", "Loja"],
                        ["/nossos-parceiros", "Lojas parceiras"],
                        ["/lojista", "Seja lojista"],
                        ["/metricas", "Métricas"],
                        ["/protocolos", "Como funciona"],
                      ],
                    ],
                    [
                      "Empresa",
                      "#a5b4fc",
                      [
                        ["/sobre", "Sobre"],
                        ["/entrar?mode=signup", "Criar conta"],
                        ["/entrar", "Entrar"],
                        ["/parceiros", "Parcerias"],
                      ],
                    ],
                  ] as const
                ).map(([title, color, links]) => (
                  <nav key={title} aria-label={title} className="min-w-0">
                    <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.14em] text-white max-sm:border-b max-sm:border-white/15 max-sm:pb-2">
                      <span
                        aria-hidden="true"
                        className="h-3.5 w-1"
                        style={{ background: color }}
                      />
                      {title}
                    </p>
                    <ul className="mt-1 grid grid-cols-2 gap-x-6 sm:mt-2.5 sm:flex sm:flex-col sm:gap-1">
                      {links.map(([to, label]) => (
                        <li key={to}>
                          <a
                            href={to}
                            className="flex h-11 items-center justify-between border-b border-white/[.07] text-[14px] font-medium text-white/80 transition-colors hover:text-white sm:inline-flex sm:h-auto sm:justify-start sm:border-0 sm:py-0.5 sm:text-[13px] sm:text-white/65"
                          >
                            {label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ))}
              </div>

              {/* Instalar */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-[#3fe0c8]/15 to-transparent p-3 ring-1 ring-[#3fe0c8]/25 lg:flex-col lg:items-start lg:bg-none lg:p-0 lg:ring-0">
                <span className="hidden overflow-hidden bg-white sm:block">
                  <QrEnlarge
                    variant="footer"
                    thumb={64}
                    big={280}
                    label="Abra o NextVita no celular"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-extrabold leading-tight">Leve o app no bolso</p>
                  <p className="text-[12px] text-white/60 lg:hidden">
                    Grátis, direto na tela inicial.
                  </p>
                </div>
                <div className="shrink-0 [&_button]:!h-10 [&_button]:!px-4 [&_button]:!text-[13px] [&_button]:!font-bold">
                  <InstallAppButton />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1 border-t border-white/10 bg-black/30 px-4 py-3 text-[12px] text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span>© {new Date().getFullYear()} NextVita. Todos os direitos reservados.</span>
              <span>
                Desenvolvido por{" "}
                <Link to="/sobre" className="font-bold text-white hover:underline">
                  Franc D&apos;nis
                </Link>{" "}
                · Feijó, Acre
              </span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
