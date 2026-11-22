import { Link } from "@tanstack/react-router";
import { ArrowRight, Dumbbell, Package, Store, UserRound, type LucideIcon } from "lucide-react";

const audiences: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Store, title: "Lojas", text: "Vitrine própria com pedidos e entrega." },
  { icon: Dumbbell, title: "Academias", text: "Planos, aulas e horários divulgados." },
  { icon: UserRound, title: "Personal trainers", text: "Alunos que já registram a rotina." },
  { icon: Package, title: "Marcas e produtos", text: "Suplementos, moda fitness e naturais." },
];

/**
 * Convite para vender e anunciar na plataforma: um bloco fixo, sem animação, no mesmo padrão
 * das outras seções. Substitui o comercial em cenas na página inicial.
 */
export function HomePartnerBand() {
  return (
    <section
      aria-labelledby="partner-band-title"
      className="grid gap-6 rounded-2xl border border-border bg-card p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-10"
    >
      <div className="min-w-0">
        <h2
          id="partner-band-title"
          className="font-display text-xl font-extrabold tracking-tight sm:text-2xl"
        >
          Venda e anuncie na NextVita
        </h2>
        <p className="mt-1.5 max-w-[46ch] text-[13.5px] leading-relaxed text-muted-foreground sm:text-sm">
          Apareça para quem acompanha alimentação, treinos e saúde todos os dias. O plano inicial
          não tem mensalidade.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/parceiros"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-bold text-primary-foreground transition hover:brightness-110"
          >
            Quero vender aqui <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <Link
            to="/lojista"
            className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-[13px] font-semibold transition-colors hover:border-primary/60 hover:text-primary"
          >
            Ver como funciona
          </Link>
        </div>
      </div>
      <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
        {audiences.map((a) => (
          <li key={a.title} className="flex items-start gap-3 bg-card p-3.5 sm:p-4">
            <a.icon size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 leading-tight">
              <strong className="block text-sm font-semibold">{a.title}</strong>
              <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{a.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
