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
      className="nv-dark relative isolate grid gap-6 overflow-hidden rounded-3xl bg-[#0b2b29] p-5 text-white sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-10"
    >
      <img
        src="/images/hero-metricas.webp"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 -z-20 size-full object-cover opacity-30"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-[#062321]/95 to-[#0c8063]/55"
      />
      <div className="min-w-0">
        <h2
          id="partner-band-title"
          className="font-display text-xl font-extrabold tracking-tight sm:text-2xl"
        >
          Empreendedor de Feijó: coloque seu negócio na vitrine
        </h2>
        <p className="mt-1.5 max-w-[46ch] text-[13.5px] leading-relaxed text-white/75 sm:text-sm">
          Seus produtos aparecem para quem acompanha alimentação, treinos e saúde todos os dias.
          Cadastro simples e plano inicial sem mensalidade.
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
            className="inline-flex h-10 items-center rounded-xl border border-white/30 px-4 text-[13px] font-semibold transition-colors hover:bg-white/10"
          >
            Ver como funciona
          </Link>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/15 bg-white/15 backdrop-blur">
        {audiences.map((a) => (
          <li key={a.title} className="flex items-start gap-2 bg-black/35 p-2.5 sm:gap-3 sm:p-4">
            <a.icon size={18} className="mt-0.5 shrink-0 text-[#3fe0c8]" aria-hidden="true" />
            <span className="min-w-0 leading-tight">
              <strong className="block text-sm font-semibold">{a.title}</strong>
              <span className="mt-0.5 block text-[12.5px] text-white/75 max-sm:hidden">
                {a.text}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
