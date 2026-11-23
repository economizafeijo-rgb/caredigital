import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, MapPin, Store } from "lucide-react";
import { money } from "@/lib/marketplace";
import { useLiveStores } from "./LiveStores";
import { StoreLed } from "./store/StoreLed";

const FOREST = "#041f1d";
const SAND = "#e7cfa6";

const promises = [
  {
    title: "Compre de quem é daqui",
    text: "O dinheiro fica na cidade: com o comerciante que você encontra na rua e que emprega gente de Feijó.",
  },
  {
    title: "Peça pelo celular",
    text: "Escolha, monte o carrinho e acompanhe o pedido pelo app, sem fila e sem ligar para perguntar se tem.",
  },
  {
    title: "Retire ou receba em casa",
    text: "Cada loja informa se faz entrega, retirada ou os dois, e mostra na página se está aberta agora.",
  },
  {
    title: "Cupons nas datas que importam",
    text: "As lojas criam cupons e promoções para Dia das Mães, Natal, Black Friday e outras ocasiões.",
  },
];

const merchantBenefits = [
  "Cadastro grátis, sem mensalidade no plano inicial",
  "Vitrine própria com a sua logomarca e o selo de loja verificada",
  "Painel de pedidos, estoque, clientes e caixa",
  "Cupons e promoções para as datas comemorativas",
];

/** Página pública que apresenta as lojas parceiras da NextVita e convida a cidade a comprar local. */
export function PartnersShowcase() {
  const { vendors, products } = useLiveStores();

  const cards = useMemo(
    () =>
      vendors.map((v) => ({
        vendor: v,
        items: products.filter((p) => p.vendor_id === v.id).slice(0, 3),
      })),
    [vendors, products],
  );

  return (
    <div className="grid gap-10 pb-10">
      {/* Abertura */}
      <section
        aria-labelledby="parceiros-titulo"
        className="relative overflow-hidden rounded-3xl text-white"
        style={{ background: `linear-gradient(135deg, ${FOREST} 0%, #0a3f39 55%, #0c8063 100%)` }}
      >
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:p-14">
          <div className="flex flex-col justify-center">
            <p
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold"
              style={{ color: SAND }}
            >
              <MapPin size={13} aria-hidden="true" /> Começamos em Feijó, no Acre
            </p>
            <h1
              id="parceiros-titulo"
              className="mt-4 max-w-[16ch] font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl"
            >
              Quem é de Feijó compra de Feijó.
            </h1>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-white/85 sm:text-lg">
              A NextVita nasceu aqui. As lojas parceiras são do nosso chão: você escolhe pelo
              celular, retira na loja ou recebe em casa, e quem vende é o vizinho que você conhece.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#lojas"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-slate-950 transition hover:bg-emerald-50"
              >
                Ver as lojas parceiras <ArrowRight size={16} aria-hidden="true" />
              </a>
              <Link
                to="/parceiros"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/40 px-6 text-sm font-semibold transition hover:bg-white/10"
              >
                Tenho uma loja em Feijó
              </Link>
            </div>
          </div>

          <div aria-hidden="true" className="relative hidden min-h-[22rem] lg:block">
            <img
              src="/loja/v2/conjunto-preto.webp"
              alt=""
              className="absolute right-0 top-0 h-60 w-48 rounded-2xl border border-white/20 object-cover shadow-2xl"
            />
            <img
              src="/loja/v2/kit-whey-coqueteleira.webp"
              alt=""
              className="absolute bottom-0 left-2 h-56 w-56 rounded-2xl border border-white/20 object-cover shadow-2xl"
            />
            <img
              src="/loja/v2/cha-camomila.webp"
              alt=""
              className="absolute bottom-10 right-6 h-36 w-36 rounded-2xl border border-white/20 object-cover shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Comercial */}
      <section aria-labelledby="porque-titulo" className="max-md:order-3">
        <h2
          id="porque-titulo"
          className="max-w-[28ch] font-display text-2xl font-extrabold tracking-tight sm:text-4xl"
        >
          Comprar perto é cuidar da cidade e de você.
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {promises.map((p) => (
            <li key={p.title} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display text-base font-extrabold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Parceiros */}
      <section id="lojas" aria-labelledby="lojas-titulo" className="scroll-mt-24 max-md:order-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="lojas-titulo"
              className="font-display text-2xl font-extrabold tracking-tight sm:text-4xl"
            >
              Lojas parceiras
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {cards.length > 0
                ? `${cards.length} ${cards.length === 1 ? "loja já está" : "lojas já estão"} na NextVita. Entre e confira a vitrine.`
                : "Estamos abrindo as primeiras vitrines. Em breve elas aparecem aqui."}
            </p>
          </div>
        </div>

        {cards.length > 0 && (
          <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {cards.map(({ vendor: v, items }) => (
              <li key={v.id}>
                <Link
                  to="/loja"
                  search={{ loja: v.slug } as never}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-lg"
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-full"
                    style={{ background: v.accent_hex ?? "#0e7a5f" }}
                  />
                  <span className="flex items-center gap-3 p-5 pb-3">
                    <span
                      className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl text-white"
                      style={{ background: v.accent_hex ?? "#0e7a5f" }}
                    >
                      {v.logo_url ? (
                        <img src={v.logo_url} alt="" className="size-full object-cover" />
                      ) : (
                        <Store size={20} aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-display text-base font-extrabold">
                        <span className="truncate">{v.name}</span>
                        {v.verified && (
                          <BadgeCheck
                            size={15}
                            className="shrink-0 text-sky-600"
                            aria-label="Loja verificada"
                          />
                        )}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <StoreLed open={!!v.is_open} />
                        {v.is_open ? "Aberta agora" : "Fechada agora"}
                        {v.opening_hours && <span>· {v.opening_hours}</span>}
                      </span>
                    </span>
                  </span>

                  {items.length > 0 && (
                    <span className="grid grid-cols-3 gap-2 px-5 pb-3">
                      {items.map((p) => (
                        <span key={p.id} className="block">
                          <span className="block aspect-square overflow-hidden rounded-lg bg-muted">
                            {p.image_url && (
                              <img
                                src={p.image_url}
                                alt=""
                                loading="lazy"
                                className="size-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            )}
                          </span>
                          <span className="mt-1 block text-xs font-bold tabular-nums">
                            {money(p.price_cents)}
                          </span>
                        </span>
                      ))}
                    </span>
                  )}

                  <span className="mt-auto flex items-center justify-between border-t border-border px-5 py-3 text-sm font-semibold">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin size={13} aria-hidden="true" /> {v.city || "Feijó, AC"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-foreground">
                      Entrar na loja
                      <ArrowRight
                        size={15}
                        aria-hidden="true"
                        className="transition group-hover:translate-x-0.5"
                      />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Propaganda para lojistas */}
      <section
        aria-labelledby="venda-titulo"
        className="grid gap-6 rounded-3xl border border-border bg-card p-6 max-md:order-4 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      >
        <div>
          <h2
            id="venda-titulo"
            className="max-w-[20ch] font-display text-2xl font-extrabold tracking-tight sm:text-4xl"
          >
            Sua loja na frente de Feijó inteira.
          </h2>
          <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
            Comércio, farmácia, academia, moda ou autônomo: abra sua vitrine na NextVita e venda
            para quem já usa o app todos os dias para cuidar da saúde.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/parceiros"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:brightness-110"
            >
              Quero ser parceiro <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              to="/lojista"
              className="inline-flex h-12 items-center rounded-xl border border-border px-6 text-sm font-semibold transition hover:bg-muted"
            >
              Já tenho cadastro
            </Link>
          </div>
        </div>
        <ul className="grid content-center gap-3">
          {merchantBenefits.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm sm:text-base">
              <BadgeCheck size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>
      </section>

      {/* Fechamento */}
      <section
        className="rounded-3xl p-8 text-center text-white max-md:order-5 sm:p-12"
        style={{ background: FOREST }}
      >
        <p className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
          Feijó primeiro. Depois, o Acre.
        </p>
        <p className="mx-auto mt-3 max-w-[56ch] text-sm leading-relaxed text-white/80 sm:text-base">
          Estamos começando pela nossa cidade e vamos crescendo junto com quem acredita no comércio
          local. Se você é de Feijó, venha fazer parte.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="#lojas"
            className="inline-flex h-12 items-center rounded-xl bg-white px-6 text-sm font-bold text-slate-950 hover:bg-emerald-50"
          >
            Conhecer as lojas
          </a>
          <Link
            to="/parceiros"
            className="inline-flex h-12 items-center rounded-xl border border-white/40 px-6 text-sm font-semibold hover:bg-white/10"
          >
            Quero vender na NextVita
          </Link>
        </div>
      </section>
    </div>
  );
}
