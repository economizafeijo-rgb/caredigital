import { ArrowRight, Check } from "lucide-react";
import { InstallAppButton } from "./InstallApp";
import { ToolDemo, toolSlides } from "./SmartBanner";

/** Para onde cada comercial leva: visitante vai à página da ferramenta; cliente, direto ao painel. */
const links: Record<string, { to: string; client: string; clientCta: string }> = {
  "t-medidas": { to: "/entrar?mode=signup", client: "/cliente#medidas", clientCta: "Abrir minhas medidas" },
  "t-agua": { to: "/hidratacao", client: "/cliente#minha-hidratacao", clientCta: "Registrar água" },
  "t-med": { to: "/medicamentos", client: "/cliente#medicacao", clientCta: "Ver minhas doses" },
  "t-sono": { to: "/sono", client: "/cliente#sono", clientCta: "Ver meu sono" },
  "t-metricas": { to: "/metricas", client: "/cliente#indicadores", clientCta: "Ver meus gráficos" },
};

/**
 * Comerciais das ferramentas gratuitas do app, em cartões com a tela animada de cada uma.
 * No celular ocupa a largura toda e desliza de lado; no computador vira uma grade.
 */
export function HomeToolAds({ client }: { client: boolean }) {
  return (
    <section aria-labelledby="tool-ads-title" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <header className="min-w-0">
        <h2
          id="tool-ads-title"
          className="font-display text-xl font-extrabold tracking-tight sm:text-2xl"
        >
          Ferramentas grátis para o seu dia
        </h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground sm:text-sm">
          Veja como cada uma funciona. Sem custo, no celular ou no computador.
        </p>
      </header>

      <div
        role="region"
        aria-label="Ferramentas do app"
        tabIndex={0}
        className="-mx-5 flex snap-x snap-mandatory scroll-px-3 gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden"
      >
        {toolSlides.map((s, i) => {
          const l = links[s.id];
          if (!l) return null;
          return (
            <article
              key={s.id}
              style={{ animationDelay: `${i * 70}ms` }}
              className={`nv-dark nv-rise relative isolate flex w-[84vw] max-w-[24rem] shrink-0 snap-start flex-col overflow-hidden rounded-3xl bg-gradient-to-br ${s.tone} p-4 text-white shadow-card sm:w-auto sm:max-w-none sm:p-5`}
            >
              {s.bg && (
                <>
                  <img
                    src={s.bg}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 -z-10 size-full object-cover opacity-45"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
                  />
                </>
              )}
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 opacity-[.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]"
              />
              <p className="w-fit rounded-full bg-white/15 px-2.5 py-0.5 text-[11.5px] font-bold text-white/90 ring-1 ring-white/20">
                {s.kicker}
              </p>
              <h3 className="mt-2.5 text-balance font-display text-[1.3rem] font-extrabold leading-tight sm:text-[1.4rem]">
                {s.title}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/80">{s.text}</p>
              <div className="my-4 flex min-h-[8.5rem] flex-1 items-center justify-center" aria-hidden="true">
                {s.tool && s.tool !== "dev" ? (
                  <ToolDemo kind={s.tool} />
                ) : (
                  <ul className="grid w-full gap-1.5 text-[13px] font-semibold">
                    {["Cintura, braços e coxas", "Relação cintura-quadril", "Gordura estimada"].map(
                      (t) => (
                        <li
                          key={t}
                          className="flex items-center gap-2 rounded-xl bg-black/30 px-3 py-2 backdrop-blur"
                        >
                          <Check size={15} className="shrink-0 text-emerald-300" /> {t}
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </div>
              <a
                href={client ? l.client : l.to}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-white/90 active:scale-[.98]"
              >
                {client ? l.clientCta : s.cta} <ArrowRight size={16} aria-hidden="true" />
              </a>
            </article>
          );
        })}

        <article
          style={{ animationDelay: `${toolSlides.length * 70}ms` }}
          className="nv-dark nv-rise relative isolate flex w-[84vw] max-w-[24rem] shrink-0 snap-start flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-[#052e2b] to-[#0e7a5f] p-4 text-white shadow-card sm:w-auto sm:max-w-none sm:p-5"
        >
          <p className="w-fit rounded-full bg-white/15 px-2.5 py-0.5 text-[11.5px] font-bold ring-1 ring-white/20">
            Funciona como app
          </p>
          <h3 className="mt-2.5 text-balance font-display text-[1.3rem] font-extrabold leading-tight sm:text-[1.4rem]">
            Instale no celular e receba os lembretes
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/80">
            Abre com um toque, avisa na hora de beber água e tomar cada dose e não ocupa espaço.
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
            <InstallAppButton />
            {!client && (
              <a
                href="/entrar?mode=signup"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
              >
                Criar conta grátis
              </a>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
