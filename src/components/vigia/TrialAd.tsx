import { ArrowRight, CreditCard, Gift, HeartPulse, ShieldCheck, Sparkles, Timer } from "lucide-react";

const perks = [
  { icon: CreditCard, title: "Sem cartão de crédito", text: "Cadastro rápido, sem cobrança e sem compromisso." },
  { icon: Sparkles, title: "Painel completo liberado", text: "Hidratação, dieta, peso, sono, treinos e medicação." },
  { icon: Timer, title: "Sem prazo para acabar", text: "Use o tempo que quiser: não há período de teste nem mensalidade." },
  { icon: ShieldCheck, title: "Seus dados protegidos", text: "Acesso individual, só você vê o seu acompanhamento." },
] as const;
const shots = ["/images/caredigital-alimentacao.webp", "/images/caredigital-hidratacao.webp", "/images/show-sono.webp"];

/** Propaganda "Grátis para teste": convite de cadastro para novos clientes (página inicial, sem login). */
export function TrialAd() {
  return (
    <section aria-labelledby="trial-ad-title" className="nv-dark relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#03211f] via-[#0a4a41] to-[#0e8a6a] text-white shadow-pop">
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 -z-10 size-96 rounded-full bg-emerald-300/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 right-0 -z-10 size-[28rem] rounded-full bg-cyan-300/15 blur-3xl" />
      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:p-10">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[.18em] text-slate-950 shadow-lg"><Gift size={15} /> Plataforma gratuita</span>
          <h2 id="trial-ad-title" className="mt-4 text-balance font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Use o NextVita <span className="text-emerald-300">de graça, sem prazo.</span>
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-emerald-50/90 sm:text-lg">
            Organize medicação, água, alimentação, peso e sono em um só app, com lembretes, gráficos e histórico. Crie sua conta em menos de um minuto e acompanhe a sua saúde todos os dias, sem custo.
          </p>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {perks.map((p) => (
              <li key={p.title} className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/[.07] p-3 backdrop-blur">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-300/30"><p.icon size={20} /></span>
                <span><strong className="block text-sm font-bold">{p.title}</strong><span className="text-xs leading-snug text-emerald-50/75">{p.text}</span></span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="/entrar?mode=signup" className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-200 px-8 text-lg font-extrabold text-slate-950 shadow-[0_10px_40px_-10px_rgba(52,211,153,.9)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-95">
              <Gift size={21} aria-hidden="true" /> Criar conta grátis <ArrowRight size={19} aria-hidden="true" />
            </a>
            <a href="/entrar" className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/30 px-6 text-sm font-bold text-white/90 backdrop-blur transition hover:bg-white/10">Entrar na minha conta</a>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-emerald-50/70"><HeartPulse size={14} className="text-emerald-300" /> Feito em Feijó, Acre. Gratuito, sem cartão e sem compromisso.</p>
        </div>
        <div className="relative mx-auto hidden w-full max-w-md grid-cols-2 gap-3 sm:grid" aria-hidden="true">
          <img src={shots[0]} alt="" loading="lazy" className="row-span-2 h-full min-h-[18rem] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-white/25" />
          <img src={shots[1]} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-white/25" />
          <img src={shots[2]} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-white/25" />
          <span className="absolute -left-3 top-6 inline-flex -rotate-6 items-center gap-1.5 rounded-2xl bg-white px-3 py-2 text-xs font-extrabold text-emerald-800 shadow-2xl"><Gift size={14} /> 100% gratuito</span>
        </div>
      </div>
    </section>
  );
}
