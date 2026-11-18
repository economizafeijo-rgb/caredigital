import { BellRing, Check, Droplets, LineChart, Pill, Ruler, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import { InstallAppButton } from "./InstallApp";

function Spark({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points), min = Math.min(...points);
  const d = points.map((v, i) => `${i ? "L" : "M"}${(i / (points.length - 1)) * 100},${30 - ((v - min) / Math.max(1, max - min)) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-full">
      <path d={`${d} L100,32 L0,32Z`} fill={color} opacity=".15" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}

/** Seção compacta que apresenta o aplicativo: recursos à esquerda e um painel fixo de indicadores à direita. */
export function AppShowcase() {
  const feats: [typeof Pill, string][] = [
    [BellRing, "Lembretes com alerta no horário"],
    [LineChart, "Evolução em gráficos claros"],
    [Ruler, "Novo: medidas do corpo"],
    [WifiOff, "Instala como app no celular"],
    [ShieldCheck, "Dados individuais e protegidos"],
  ];
  const tiles = [
    { icon: Check, label: "Meu dia", value: "8 de 10", note: "itens concluídos hoje", color: "#a78bfa", points: [3, 4, 4, 6, 5, 7, 8] },
    { icon: Droplets, label: "Hidratação", value: "1,8 L", note: "de 3,0 L · próximo copo 15:30", color: "#38bdf8", points: [0, 0.5, 0.9, 1.1, 1.5, 1.7, 1.8] },
    { icon: LineChart, label: "Peso", value: "84,4 kg", note: "−1,85 kg em 10 dias", color: "#e879f9", points: [86.3, 86.2, 85.9, 85.6, 85.1, 84.6, 84.4] },
  ];
  return (
    <section aria-labelledby="nv-app-title" className="nv-dark relative isolate overflow-hidden rounded-2xl border border-white/[.06] bg-[#04110e] text-white">
      <div aria-hidden className="absolute -right-16 -top-16 -z-10 size-72 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="grid items-center gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300"><Smartphone size={13} /> Aplicativo NextVita</span>
          <h2 id="nv-app-title" className="mt-1 text-balance font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.7rem]">Sua rotina de saúde, no bolso.</h2>
          <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-white/75 sm:grid-cols-2">
            {feats.map(([I, t]) => <li key={t} className="flex items-center gap-2"><I size={15} className="shrink-0 text-emerald-300" />{t}</li>)}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a href="/entrar?mode=signup" className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-300">Começar grátis</a>
            <InstallAppButton />
          </div>
        </div>
        <div aria-hidden className="grid gap-2 sm:grid-cols-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl border border-white/10 bg-white/[.04] p-3.5 transition-colors hover:border-white/20 hover:bg-white/[.06]">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/60"><span className="grid size-6 place-items-center rounded-lg" style={{ background: `${t.color}26`, color: t.color }}><t.icon size={13} /></span>{t.label}</p>
              <p className="mt-2 text-xl font-extrabold tabular-nums">{t.value}</p>
              <p className="truncate text-[11px] text-white/55">{t.note}</p>
              <div className="mt-2"><Spark points={t.points} color={t.color} /></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
