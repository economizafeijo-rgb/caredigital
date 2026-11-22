import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  Camera,
  TrendingUp,
  CheckCircle2,
  CreditCard,
  HeartPulse,
  LayoutGrid,
  Leaf,
  MapPin,
  Pill,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import {
  bestPlanFor,
  money,
  PLANS,
  platformRevenue,
  pct,
  SEGMENTS,
  type PlanKey,
} from "@/lib/marketplace";
import { money as brl, products, vendorById, type VendorId } from "@/lib/store";

const segmentIcon = {
  roupas: ShoppingBag,
  suplementos: HeartPulse,
  farmacia: Pill,
  naturais: Leaf,
  autonomo: Users,
  outros: Store,
} as const;
/** Cada segmento mostra uma vitrine de exemplo montada com lojas e produtos ilustrativos da plataforma. */
const segmentVendor: Record<string, VendorId> = {
  roupas: "studio-move",
  suplementos: "arena",
  farmacia: "farmavida",
  naturais: "erva-viva",
  autonomo: "base-athletic",
  outros: "casa-do-treino",
};
const steps = [
  { icon: Store, title: "Cadastre", text: "Nome, segmento e entrega" },
  { icon: BadgeCheck, title: "Aprovação", text: "Vitrine e selo liberados" },
  { icon: LayoutGrid, title: "Publique", text: "Fotos, preços e estoque" },
  { icon: CreditCard, title: "Venda", text: "Pedidos no seu painel" },
] as const;

function StorefrontPreview({ segment }: { segment: string }) {
  const v = vendorById(segmentVendor[segment]);
  const items = products.filter((p) => p.vendorId === v?.id).slice(0, 3);
  if (!v) return null;
  return (
    <div
      key={segment}
      className="nv-fade-in overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-black/5"
    >
      <div
        className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2"
        aria-hidden="true"
      >
        <span className="size-2 rounded-full bg-rose-400" />
        <span className="size-2 rounded-full bg-amber-400" />
        <span className="size-2 rounded-full bg-emerald-400" />
        <span className="ml-2 truncate rounded bg-white px-2 py-0.5 text-[11px] text-slate-500">
          nextvita.life/loja/{v.id}
        </span>
      </div>
      <div className="flex items-center gap-3 p-4">
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-xl text-base font-bold text-white ${v.color}`}
        >
          {v.initials}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 font-display text-base font-bold">
            {v.name} <BadgeCheck size={16} className="text-sky-600" aria-hidden="true" />
          </p>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={12} aria-hidden="true" /> {v.city} · {v.sector}
          </p>
        </div>
        <span className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
          exemplo
        </span>
      </div>
      <ul className="grid grid-cols-3 gap-2 px-4 pb-4">
        {items.map((p, i) => (
          <li
            key={p.id}
            className="nv-rise overflow-hidden rounded-xl border border-slate-200"
            style={{ animationDelay: `${120 + i * 110}ms` }}
          >
            <img src={p.img} alt="" className="aspect-square w-full bg-[#e6e7e9] object-cover" />
            <p className="truncate px-2 pt-1.5 text-[11px] font-semibold">{p.name}</p>
            <p className="px-2 pb-2 text-xs font-extrabold">{brl(p.priceCents)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Página de captação de lojistas: proposta, como funciona, vitrine de exemplo, planos e simulador. */
export function LojistaLanding({ onStart }: { onStart: () => void; fit?: boolean }) {
  const [segment, setSegment] = useState<string>("suplementos");
  const [sales, setSales] = useState(3000);
  const best = useMemo(() => bestPlanFor(sales * 100), [sales]);
  const cta =
    "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#3fe0c8] px-6 text-sm font-extrabold text-slate-950 transition hover:bg-[#6ae9d6] active:scale-[.98]";
  const h2 = "font-display text-2xl font-extrabold tracking-tight sm:text-3xl";

  return (
    <div className="mx-auto flex w-full max-w-[84rem] flex-col gap-10 lg:gap-14">
      <section
        aria-labelledby="loj-title"
        className="nv-dark relative isolate overflow-hidden rounded-3xl bg-[#0a1226] p-6 text-white ring-1 ring-white/10 sm:p-10 lg:p-14"
      >
        <img
          src="/loja/v2/conjunto-preto.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 size-full object-cover opacity-30"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0a1226] via-[#0a1226]/85 to-[#0a1226]/40"
        />
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#3fe0c8]">
              <Store size={15} aria-hidden="true" /> Para lojas, marcas e autônomos de Feijó
            </p>
            <h1
              id="loj-title"
              className="mt-3 text-balance font-display text-[2.2rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl"
            >
              Sua loja diante de quem já cuida da saúde todos os dias.
            </h1>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-white/80 sm:text-base">
              Vitrine própria, selo da loja, avaliações do público e painel de vendas com pedidos,
              estoque, caixa e relatórios. Comece grátis.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <button type="button" onClick={onStart} className={cta}>
                Quero vender na NextVita <ArrowRight size={17} aria-hidden="true" />
              </button>
              <a
                href="#simulador"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 px-5 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                <Calculator size={16} aria-hidden="true" /> Simular meus custos
              </a>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {[
              [Camera, "Vitrine própria", "Fotos, preços e estoque"],
              [BadgeCheck, "Selo de loja", "Confiança para comprar"],
              [TrendingUp, "Relatórios", "Vendas, margem e metas"],
              [CreditCard, "Caixa e pedidos", "Tudo no mesmo painel"],
            ].map(([I, t, d]) => {
              const Icon = I as typeof Store;
              return (
                <li
                  key={t as string}
                  className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur"
                >
                  <Icon size={20} className="text-[#3fe0c8]" aria-hidden="true" />
                  <strong className="mt-2 block text-sm">{t as string}</strong>
                  <span className="text-[12.5px] text-white/65">{d as string}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-labelledby="loj-steps" className="grid gap-5">
        <h2 id="loj-steps" className={h2}>
          Comece a vender em 4 passos
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((st, i) => (
            <li key={st.title} className="rounded-2xl border border-border bg-card p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <st.icon size={20} aria-hidden="true" />
              </span>
              <p className="mt-3 text-xs font-semibold text-muted-foreground">Passo {i + 1}</p>
              <strong className="block font-display text-lg">{st.title}</strong>
              <span className="text-sm text-muted-foreground">{st.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="loj-quem" className="grid gap-5">
        <div>
          <h2 id="loj-quem" className={h2}>
            Quem vende na NextVita
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha o seu tipo de negócio e veja como a vitrine aparece para o público.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {SEGMENTS.map((sg) => {
              const Icon = segmentIcon[sg.key as keyof typeof segmentIcon];
              const on = segment === sg.key;
              return (
                <li key={sg.key}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSegment(sg.key)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${on ? "border-primary bg-primary/10" : "border-border bg-card hover:border-foreground/30"}`}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-sm">{sg.label}</strong>
                      <span className="block truncate text-xs text-muted-foreground">
                        {sg.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-col justify-center gap-2 rounded-2xl bg-muted/60 p-4 sm:p-6">
            <StorefrontPreview segment={segment} />
            <p className="text-center text-xs text-muted-foreground">
              Loja e produtos ilustrativos.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="loj-planos" className="grid gap-5">
        <div>
          <h2 id="loj-planos" className={h2}>
            Planos simples, sem surpresa
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mensalidade e uma pequena comissão apenas sobre vendas confirmadas.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(Object.keys(PLANS) as PlanKey[]).map((key) => {
            const p = PLANS[key];
            const star = key === "vitrine";
            return (
              <article
                key={key}
                className={`flex flex-col rounded-2xl border p-6 ${star ? "border-primary bg-primary/[.07]" : "border-border bg-card"}`}
              >
                {star && (
                  <span className="mb-2 w-fit rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                    Mais escolhido
                  </span>
                )}
                <strong className="font-display text-xl font-extrabold">{p.label}</strong>
                <span className="text-xs text-muted-foreground">{p.tagline}</span>
                <p className="mt-4">
                  <strong className="text-3xl font-extrabold tabular-nums">
                    {p.feeCents ? money(p.feeCents) : "R$ 0"}
                  </strong>
                  <span className="text-sm text-muted-foreground"> /mês</span>
                </p>
                <p className="text-sm font-semibold text-primary">+ {pct(p.bps)} por venda</p>
                <ul className="mt-4 grid gap-2 text-sm">
                  {p.perks.map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <CheckCircle2
                        size={16}
                        className="mt-0.5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      {t}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={onStart}
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-border text-sm font-semibold transition-colors hover:border-primary/60 hover:text-primary md:mt-auto"
                >
                  Começar com este plano
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="simulador"
        aria-labelledby="loj-sim"
        className="nv-dark scroll-mt-20 rounded-3xl bg-gradient-to-br from-[#0b2b29] to-[#0a1226] p-6 text-white sm:p-10"
      >
        <h2 id="loj-sim" className={h2}>
          Simule quanto custa para você
        </h2>
        <label className="mt-5 block text-sm font-semibold">
          Quanto você vende por mês:{" "}
          <strong className="text-2xl font-extrabold text-[#3fe0c8] tabular-nums">
            {money(sales * 100)}
          </strong>
          <input
            type="range"
            min={500}
            max={20000}
            step={100}
            value={sales}
            onChange={(e) => setSales(Number(e.target.value))}
            aria-label="Vendas por mês"
            className="mt-3 w-full accent-[#3fe0c8]"
          />
        </label>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(Object.keys(PLANS) as PlanKey[]).map((key) => {
            const r = platformRevenue(sales * 100, key);
            const isBest = key === best;
            return (
              <div
                key={key}
                className={`rounded-xl border p-4 ${isBest ? "border-[#3fe0c8] bg-[#3fe0c8]/10" : "border-white/15 bg-black/25"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong>{PLANS[key].label}</strong>
                  {isBest && (
                    <span className="rounded-full bg-[#3fe0c8] px-2 py-0.5 text-[10px] font-bold text-slate-950">
                      Melhor para você
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-white/65">
                  Mensalidade {money(r.fee)} + comissão {money(r.commission)}
                </p>
                <p className="text-xl font-extrabold tabular-nums">{money(r.total)}</p>
                <p className="text-xs text-white/75">
                  Você fica com <strong className="tabular-nums">{money(r.vendorKeeps)}</strong>
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-white/65">
          O pagamento é combinado direto entre você e o cliente. A NextVita emite uma fatura mensal
          com a mensalidade e a comissão das vendas confirmadas.
        </p>
        <button type="button" onClick={onStart} className={`${cta} mt-6`}>
          Quero vender na NextVita <ArrowRight size={17} aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
