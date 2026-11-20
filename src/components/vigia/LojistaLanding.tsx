import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
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
import { useFitWindow } from "@/lib/use-fit-window";

type Tab = "quem" | "planos" | "simulador";
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

/** Página de captação de lojistas em tela fixa: proposta, vitrine de exemplo, planos e simulador. */
/** fit=false quando o formulário de cadastro aparece abaixo (a página precisa rolar até ele). */
export function LojistaLanding({ onStart, fit = true }: { onStart: () => void; fit?: boolean }) {
  const fitRef = useFitWindow<HTMLDivElement>();
  const [tab, setTab] = useState<Tab>("quem");
  const [segment, setSegment] = useState<string>("suplementos");
  const [plan, setPlan] = useState<PlanKey>("vitrine");
  const [sales, setSales] = useState(3000);
  const best = useMemo(() => bestPlanFor(sales * 100), [sales]);
  const tabs: { key: Tab; label: string; icon: typeof Store }[] = [
    { key: "quem", label: "Quem vende", icon: Store },
    { key: "planos", label: "Planos", icon: Sparkles },
    { key: "simulador", label: "Simulador", icon: Calculator },
  ];

  return (
    <div
      ref={fit ? fitRef : undefined}
      className="mx-auto flex w-full max-w-[1680px] flex-col gap-3"
    >
      <div className="nv-dark relative isolate grid min-h-0 flex-1 gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b1022] via-[#141a3a] to-[#2a1d0b] p-5 text-white lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-amber-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-10 size-96 rounded-full bg-indigo-500/20 blur-3xl"
        />

        <section aria-labelledby="loj-title" className="flex min-h-0 flex-col justify-center gap-4">
          <span className="nv-rise inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">
            <Store size={14} aria-hidden="true" /> Para lojas, marcas e autônomos
          </span>
          <h1
            id="loj-title"
            className="nv-rise text-balance font-display text-3xl font-extrabold leading-[1.06] tracking-tight xl:text-5xl"
            style={{ animationDelay: "60ms" }}
          >
            Sua loja diante de quem já cuida da saúde todos os dias.
          </h1>
          <p
            className="nv-rise max-w-[52ch] text-[15px] leading-relaxed text-white/80"
            style={{ animationDelay: "120ms" }}
          >
            Vitrine própria, selo da loja, avaliações do público e painel de vendas para
            suplementos, moda fitness, farmácias e produtos naturais.
          </p>
          <div className="nv-rise flex flex-wrap gap-2" style={{ animationDelay: "180ms" }}>
            <button
              type="button"
              onClick={onStart}
              className="nv-cta inline-flex h-12 items-center gap-2 rounded-xl bg-amber-400 px-6 text-sm font-bold text-slate-950"
              style={{ ["--area" as string]: "#f59e0b" }}
            >
              Quero vender na NextVita{" "}
              <ArrowRight size={17} aria-hidden="true" className="nv-cta-arrow" />
            </button>
            <button
              type="button"
              onClick={() => setTab("simulador")}
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 px-5 text-sm font-semibold hover:bg-white/10"
            >
              <Calculator size={16} aria-hidden="true" /> Simular meus custos
            </button>
          </div>
          <ol className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="nv-rise rounded-xl border border-white/10 bg-white/[.05] p-3"
                style={{ animationDelay: `${260 + i * 80}ms` }}
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-amber-200">
                  <s.icon size={14} aria-hidden="true" /> Etapa {i + 1}
                </span>
                <strong className="mt-1 block text-sm">{s.title}</strong>
                <span className="text-xs text-white/65">{s.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Explore" className="flex min-h-0 flex-col gap-3">
          <div
            role="tablist"
            aria-label="Seções"
            className="inline-flex w-fit gap-1 rounded-xl bg-white/10 p-1"
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition-colors ${tab === t.key ? "bg-white text-slate-950" : "text-white/75 hover:text-white"}`}
              >
                <t.icon size={15} aria-hidden="true" /> {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" key={tab} className="nv-fade-in flex min-h-0 flex-1 flex-col gap-3">
            {tab === "quem" && (
              <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[0.9fr_1.1fr]">
                <ul className="grid content-start gap-2">
                  {SEGMENTS.map((s) => {
                    const Icon = segmentIcon[s.key as keyof typeof segmentIcon];
                    const on = segment === s.key;
                    return (
                      <li key={s.key}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => setSegment(s.key)}
                          onFocus={() => setSegment(s.key)}
                          className={`nv-tile flex w-full items-center gap-3 rounded-xl border p-2.5 text-left ${on ? "border-amber-300/70 bg-amber-300/10" : "border-white/10 bg-white/[.04]"}`}
                          style={{ ["--tile" as string]: "#f59e0b" }}
                        >
                          <span className="nv-tile-icon grid size-9 shrink-0 place-items-center rounded-lg bg-amber-300/15 text-amber-200">
                            <Icon size={18} aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <strong className="block text-sm">{s.label}</strong>
                            <span className="block truncate text-xs text-white/60">{s.hint}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex flex-col justify-center gap-2">
                  <StorefrontPreview segment={segment} />
                  <p className="text-center text-xs text-white/60">
                    Assim a sua vitrine aparece para o público. Loja e produtos ilustrativos.
                  </p>
                </div>
              </div>
            )}

            {tab === "planos" && (
              <div className="grid min-h-0 flex-1 content-center gap-3 md:grid-cols-3">
                {(Object.keys(PLANS) as PlanKey[]).map((key) => {
                  const p = PLANS[key];
                  const on = plan === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setPlan(key)}
                      className={`nv-tile flex h-full flex-col rounded-2xl border p-5 text-left ${on ? "border-amber-300 bg-white text-slate-950" : "border-white/15 bg-white/[.05]"}`}
                      style={{ ["--tile" as string]: "#f59e0b" }}
                    >
                      {key === "vitrine" && (
                        <span
                          className={`mb-2 w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${on ? "bg-amber-400 text-slate-950" : "bg-amber-300/20 text-amber-200"}`}
                        >
                          Mais escolhido
                        </span>
                      )}
                      <strong className="font-display text-xl font-extrabold">{p.label}</strong>
                      <span className={`text-xs ${on ? "text-slate-500" : "text-white/60"}`}>
                        {p.tagline}
                      </span>
                      <span className="mt-3">
                        <strong className="text-3xl font-extrabold">
                          {p.feeCents ? money(p.feeCents) : "R$ 0"}
                        </strong>
                        <span className={`text-sm ${on ? "text-slate-500" : "text-white/60"}`}>
                          {" "}
                          /mês
                        </span>
                      </span>
                      <span
                        className={`text-sm font-semibold ${on ? "text-amber-700" : "text-amber-200"}`}
                      >
                        + {pct(p.bps)} por venda
                      </span>
                      <ul className="mt-3 grid gap-1.5 text-sm">
                        {p.perks.map((t) => (
                          <li key={t} className="flex items-start gap-2">
                            <CheckCircle2
                              size={15}
                              className={`mt-0.5 shrink-0 ${on ? "text-emerald-600" : "text-emerald-300"}`}
                              aria-hidden="true"
                            />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            )}

            {tab === "simulador" && (
              <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-5">
                <label className="block text-sm font-semibold">
                  Quanto você vende por mês:{" "}
                  <strong className="text-2xl font-extrabold text-amber-300 tabular-nums">
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
                    className="mt-3 w-full accent-amber-400"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(Object.keys(PLANS) as PlanKey[]).map((key) => {
                    const r = platformRevenue(sales * 100, key);
                    const isBest = key === best;
                    return (
                      <div
                        key={key}
                        className={`rounded-xl border p-4 transition-colors ${isBest ? "border-amber-300 bg-amber-300/10" : "border-white/10"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong>{PLANS[key].label}</strong>
                          {isBest && (
                            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                              Melhor para você
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-white/60">
                          Mensalidade {money(r.fee)} + comissão {money(r.commission)}
                        </p>
                        <p className="text-xl font-extrabold tabular-nums">{money(r.total)}</p>
                        <p className="text-xs text-white/70">
                          Você fica com{" "}
                          <strong className="text-white tabular-nums">
                            {money(r.vendorKeeps)}
                          </strong>
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-white/60">
                  O pagamento é combinado direto entre você e o cliente. A NextVita emite uma fatura
                  mensal com a mensalidade e a comissão das vendas confirmadas.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
