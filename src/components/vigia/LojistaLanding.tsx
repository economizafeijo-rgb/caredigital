import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, CheckCircle2, CreditCard, HeartPulse, Megaphone, Percent, ShoppingBag, Star, Store, Truck, Users } from "lucide-react";
import { bestPlanFor, money, PLANS, platformRevenue, pct, SEGMENTS, type PlanKey } from "@/lib/marketplace";

const segmentIcon = { roupas: ShoppingBag, suplementos: HeartPulse, farmacia: BadgeCheck, naturais: Star, autonomo: Users, outros: Store } as const;
const steps = [
  { icon: Store, title: "Cadastre sua loja", text: "Informe nome, segmento, contato e se faz entrega ou retirada." },
  { icon: BadgeCheck, title: "Aprovação rápida", text: "A equipe NextVita confere e libera sua vitrine, com selo da sua loja." },
  { icon: ShoppingBag, title: "Publique seus produtos", text: "Fotos, preços e estoque. Você gerencia tudo no seu painel." },
  { icon: CreditCard, title: "Venda e acompanhe", text: "Receba os pedidos, atualize o andamento e veja quanto vendeu." },
] as const;

/** Página de captação de lojistas: proposta, planos e simulador de quanto cada plano custa. */
export function LojistaLanding({ onStart }: { onStart: () => void }) {
  const [sales, setSales] = useState(3000);
  const best = useMemo(() => bestPlanFor(sales * 100), [sales]);
  return (
    <div className="grid gap-6">
      <section aria-labelledby="loj-title" className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-pop">
        <img src="/loja/mulher1.webp" alt="" aria-hidden="true" className="absolute inset-0 -z-20 size-full object-cover opacity-50" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/85 to-emerald-900/40" />
        <div className="grid gap-6 p-6 sm:p-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-slate-950"><Megaphone size={14} /> Para lojistas e autônomos</span>
            <h1 id="loj-title" className="mt-4 text-balance font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">Venda seus produtos para quem <span className="text-emerald-300">já cuida da saúde.</span></h1>
            <p className="mt-3 max-w-xl text-base text-slate-200 sm:text-lg">A NextVita reúne lojas de roupas fitness, suplementos, farmácias e produtos naturais da cidade num só lugar. Cada loja tem sua vitrine, seu selo, avaliações do público e seu painel de vendas.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={onStart} className="inline-flex h-14 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-200 px-8 text-lg font-extrabold text-slate-950 shadow-lg transition hover:-translate-y-0.5 active:scale-95">Quero vender na NextVita <ArrowRight size={19} /></button>
              <a href="#planos" className="inline-flex h-14 items-center rounded-2xl border border-white/30 px-6 text-sm font-bold backdrop-blur hover:bg-white/10">Ver planos e preços</a>
            </div>
          </div>
          <ul className="grid gap-2 text-sm font-semibold">
            {[[Users, "Clientes que já usam o app para se cuidar"], [Truck, "Entrega ou retirada: você escolhe"], [Star, "Avaliações reais dos seus clientes"], [Percent, "Só paga comissão sobre o que vender"]].map(([I, t]) => { const Icon = I as typeof Users; return <li key={t as string} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"><Icon size={20} className="text-emerald-300" />{t as string}</li>; })}
          </ul>
        </div>
      </section>

      <section aria-label="Quem pode vender" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SEGMENTS.map((s) => { const Icon = segmentIcon[s.key]; return (
          <div key={s.key} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
            <span className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white"><Icon size={22} /></span>
            <div><strong className="block text-sm">{s.label}</strong><span className="text-xs text-muted-foreground">{s.hint}</span></div>
          </div>); })}
      </section>

      <section aria-label="Como funciona" className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7">
        <h2 className="font-display text-2xl font-extrabold">Como funciona</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl bg-muted/50 p-4">
              <span className="absolute right-3 top-3 text-3xl font-extrabold text-primary/15">{i + 1}</span>
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><s.icon size={20} /></span>
              <strong className="mt-3 block text-sm">{s.title}</strong><span className="text-xs leading-snug text-muted-foreground">{s.text}</span>
            </li>))}
        </ol>
      </section>

      <section id="planos" aria-label="Planos" className="grid gap-3 lg:grid-cols-3">
        {(Object.keys(PLANS) as PlanKey[]).map((key) => { const p = PLANS[key]; const hot = key === "vitrine"; return (
          <article key={key} className={`relative flex flex-col rounded-3xl border p-5 shadow-card ${hot ? "border-emerald-500 bg-gradient-to-b from-emerald-500/10 to-card ring-2 ring-emerald-500/30" : "border-border bg-card"}`}>
            {hot && <span className="absolute -top-3 left-5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">Mais escolhido</span>}
            <h3 className="font-display text-xl font-extrabold">{p.label}</h3><p className="text-xs text-muted-foreground">{p.tagline}</p>
            <p className="mt-3"><strong className="text-3xl font-extrabold">{p.feeCents ? money(p.feeCents) : "R$ 0"}</strong><span className="text-sm text-muted-foreground"> /mês</span></p>
            <p className="text-sm font-bold text-primary">+ {pct(p.bps)} por venda</p>
            <ul className="mt-3 grid gap-1.5 text-sm">{p.perks.map((t) => <li key={t} className="flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />{t}</li>)}</ul>
          </article>); })}
      </section>

      <section aria-label="Simulador" className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7">
        <h2 className="font-display text-2xl font-extrabold">Quanto custa para você?</h2>
        <p className="text-sm text-muted-foreground">Arraste e veja o custo de cada plano para o seu volume de vendas mensal.</p>
        <label className="mt-4 block text-sm font-semibold">Vendas por mês: <strong className="text-primary">{money(sales * 100)}</strong>
          <input type="range" min={500} max={20000} step={100} value={sales} onChange={(e) => setSales(Number(e.target.value))} aria-label="Vendas por mês" className="mt-2 w-full accent-emerald-600" />
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(Object.keys(PLANS) as PlanKey[]).map((key) => { const r = platformRevenue(sales * 100, key); const isBest = key === best; return (
            <div key={key} className={`rounded-2xl border p-4 ${isBest ? "border-emerald-500 bg-emerald-500/10" : "border-border"}`}>
              <div className="flex items-center justify-between"><strong>{PLANS[key].label}</strong>{isBest && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">Melhor para você</span>}</div>
              <p className="mt-2 text-xs text-muted-foreground">Custo total ({money(r.fee)} + comissão {money(r.commission)})</p>
              <p className="text-xl font-extrabold">{money(r.total)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Você fica com <strong className="text-foreground">{money(r.vendorKeeps)}</strong></p>
            </div>); })}
        </div>
        <p className="mt-4 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground"><strong className="text-foreground">Como você recebe:</strong> o pagamento é combinado direto entre você e o cliente (Pix, cartão ou dinheiro na retirada). A NextVita emite uma fatura por mês com a mensalidade do plano e a comissão das vendas confirmadas. Em breve, o pagamento online dividirá a comissão automaticamente.</p>
      </section>

      <div className="text-center"><button type="button" onClick={onStart} className="inline-flex h-14 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-10 text-lg font-extrabold text-white shadow-lg transition hover:brightness-110 active:scale-95">Quero abrir minha loja <ArrowRight size={19} /></button></div>
    </div>
  );
}
