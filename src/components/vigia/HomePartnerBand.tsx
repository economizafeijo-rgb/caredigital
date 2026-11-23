import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BellRing,
  Check,
  MessageCircle,
  QrCode,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { PLANS, money, pct, type PlanKey } from "@/lib/marketplace";

const benefits: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ShoppingBag,
    title: "Loja própria com endereço e QR Code",
    text: "Vitrine com fotos, preços, estoque e entrega ou retirada.",
  },
  {
    icon: BellRing,
    title: "Pedidos e chat em tempo real",
    text: "Aviso de pedido novo, conversa com o cliente e caixa no mesmo painel.",
  },
  {
    icon: QrCode,
    title: "Montamos a loja para você",
    text: "Você envia a solicitação; a equipe cria a loja e entrega o seu acesso.",
  },
];

/** Vitrine de exemplo com fotos reais de uma loja parceira. */
const preview = [
  { img: "/loja/sophia-store/caneta-pastel.webp", name: "Canetas tons pastel", price: 2490 },
  { img: "/loja/sophia-store/kit-pulseiras.webp", name: "Kit pulseiras", price: 1990 },
  { img: "/loja/sophia-store/scrunchies-candy.webp", name: "Scrunchies de cetim", price: 2990 },
];

/** Convite comercial para lojistas: benefícios, planos reais e prévia de uma vitrine. */
export function HomePartnerBand() {
  return (
    <section
      aria-labelledby="partner-band-title"
      className="nv-dark relative isolate overflow-hidden rounded-3xl bg-[#071c1b] text-white"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(70%_90%_at_100%_0%,rgba(63,224,200,.22),transparent_60%),radial-gradient(60%_80%_at_0%_100%,rgba(14,122,95,.35),transparent_60%)]"
      />
      <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:p-10">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-semibold text-[#7ff0dc]">
            <span className="size-1.5 rounded-full bg-[#3fe0c8]" aria-hidden="true" />
            Para lojistas e empreendedores de Feijó
          </p>
          <h2
            id="partner-band-title"
            className="mt-3 max-w-[18ch] text-balance font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-tight sm:text-4xl"
          >
            Sua loja vendendo online em Feijó, sem complicação
          </h2>
          <p className="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-white/75">
            Coloque seus produtos na frente de quem já usa a NextVita todos os dias para cuidar da
            alimentação, dos treinos e da saúde.
          </p>

          <ul className="mt-6 grid gap-3.5">
            {benefits.map((b) => (
              <li key={b.title} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#3fe0c8]/15 text-[#3fe0c8] ring-1 ring-[#3fe0c8]/25">
                  <b.icon size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-[14.5px] font-bold">{b.title}</strong>
                  <span className="block text-[13px] text-white/65">{b.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/lojista"
              hash="cadastro"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#3fe0c8] px-6 text-[15px] font-extrabold text-slate-950 shadow-lg shadow-[#3fe0c8]/20 transition hover:bg-[#6ae9d6] active:scale-[.98]"
            >
              Solicitar minha loja <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link
              to="/lojista"
              className="inline-flex h-12 items-center rounded-xl border border-white/25 px-5 text-sm font-semibold transition-colors hover:bg-white/10"
            >
              Ver planos e como funciona
            </Link>
          </div>
          <p className="mt-3 text-[12.5px] text-white/55">
            Comece no plano Básico: sem mensalidade, você só paga comissão quando vender.
          </p>
        </div>

        <div className="relative min-w-0">
          <div className="relative overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-white/10">
            <div className="relative h-24 overflow-hidden sm:h-28">
              <img
                src="/loja/sophia-store/banner.webp"
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="size-full object-cover"
              />
              <span className="absolute inset-0 bg-gradient-to-r from-[#701a75]/85 via-[#701a75]/40 to-transparent" />
              <div className="absolute inset-y-0 left-4 flex items-center gap-3">
                <img
                  src="/loja/sophia-store/logo-512.png"
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="size-11 rounded-xl bg-white shadow-md"
                />
                <span className="text-white">
                  <strong className="block text-[15px] leading-tight">Sophia Store</strong>
                  <span className="text-[11.5px] text-white/85">Loja parceira · Feijó</span>
                </span>
              </div>
            </div>
            <ul className="grid grid-cols-3 gap-2 p-3 sm:pb-8">
              {preview.map((p) => (
                <li
                  key={p.name}
                  className="min-w-0 overflow-hidden rounded-xl border border-slate-200"
                >
                  <img
                    src={p.img}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  <span className="block p-2">
                    <span className="block truncate text-[11.5px] font-semibold">{p.name}</span>
                    <strong className="text-[13px] tabular-nums">{money(p.price)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div
            aria-hidden="true"
            className="absolute -top-5 right-4 hidden items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-slate-900 shadow-xl ring-1 ring-black/5 sm:flex"
          >
            <span className="grid size-8 place-items-center rounded-full bg-emerald-500 text-white">
              <Check size={16} />
            </span>
            <span className="leading-tight">
              <strong className="block text-[12.5px]">Novo pedido recebido</strong>
              <span className="text-[11.5px] text-slate-500">Retirada na loja</span>
            </span>
          </div>
          <div
            aria-hidden="true"
            className="absolute -bottom-5 -left-3 hidden items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-slate-900 shadow-xl ring-1 ring-black/5 sm:flex"
          >
            <span className="grid size-8 place-items-center rounded-full bg-sky-500 text-white">
              <MessageCircle size={15} />
            </span>
            <span className="leading-tight">
              <strong className="block text-[12.5px]">Cliente no chat</strong>
              <span className="text-[11.5px] text-slate-500">“Tem pronta entrega?”</span>
            </span>
          </div>
        </div>
      </div>

      <dl className="grid border-t border-white/10 sm:grid-cols-3">
        {(Object.keys(PLANS) as PlanKey[]).map((k, i) => (
          <div
            key={k}
            className={`flex items-baseline justify-between gap-3 px-5 py-4 sm:block sm:px-8 ${i > 0 ? "border-t border-white/10 sm:border-l sm:border-t-0" : ""}`}
          >
            <dt className="text-[13px] font-semibold text-white/70">Plano {PLANS[k].label}</dt>
            <dd className="sm:mt-1">
              <strong className="text-lg font-extrabold tabular-nums">
                {PLANS[k].feeCents ? `${money(PLANS[k].feeCents)}/mês` : "Sem mensalidade"}
              </strong>
              <span className="ml-1.5 text-[12.5px] text-white/60">
                + {pct(PLANS[k].bps)} por venda
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
