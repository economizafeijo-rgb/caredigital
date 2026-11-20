import { BellRing, LineChart, Pill, Ruler, ShieldCheck, WifiOff } from "lucide-react";
import { InstallAppButton } from "./InstallApp";
import { ProductDemo } from "./ProductDemo";

/** Seção compacta do aplicativo: recursos à esquerda e a demonstração animada do produto à direita. */
export function AppShowcase() {
  const feats: [typeof Pill, string][] = [
    [BellRing, "Lembretes com alerta no horário"],
    [LineChart, "Evolução em gráficos claros"],
    [Ruler, "Novo: medidas do corpo"],
    [WifiOff, "Instala como app no celular"],
    [ShieldCheck, "Dados individuais e protegidos"],
  ];
  return (
    <section
      aria-labelledby="nv-app-title"
      className="nv-dark relative isolate overflow-hidden rounded-2xl border border-white/[.06] bg-[#04110e] text-white"
    >
      <div
        aria-hidden
        className="absolute -right-16 -top-16 -z-10 size-72 rounded-full bg-emerald-500/15 blur-3xl"
      />
      <div className="grid items-center gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <div className="grid min-w-0 gap-4">
          <div>
            <h2
              id="nv-app-title"
              className="text-balance font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.7rem]"
            >
              Sua rotina de saúde, no bolso.
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href="/entrar?mode=signup"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
              >
                Começar grátis
              </a>
              <InstallAppButton />
            </div>
          </div>
          <ul className="grid gap-x-6 gap-y-1.5 text-sm text-white/75 sm:grid-cols-2">
            {feats.map(([I, t]) => (
              <li key={t} className="flex items-center gap-2">
                <I size={15} className="shrink-0 text-emerald-300" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <ProductDemo />
      </div>
    </section>
  );
}
