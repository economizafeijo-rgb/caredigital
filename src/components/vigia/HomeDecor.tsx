import { Droplets, Leaf, Pill, Dumbbell, HeartPulse, Moon } from "lucide-react";

/** Coluna de arte gráfica para as faixas laterais vazias em telas largas: anéis, pulso, pontos e ícones flutuando. */
function SideColumn({ side }: { side: "left" | "right" }) {
  const flip = side === "right";
  const icons = flip ? [Dumbbell, Moon, Pill] : [Droplets, Leaf, HeartPulse];
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed bottom-0 top-14 z-0 hidden min-[1440px]:block ${flip ? "right-0" : "left-0"}`}
      style={{ width: "calc((100vw - 1320px) / 2)" }}
    >
      <svg className="absolute inset-0 size-full text-primary" preserveAspectRatio="none" viewBox="0 0 100 800">
        <defs>
          <radialGradient id={`nv-side-glow-${side}`} cx={flip ? "100%" : "0%"} cy="30%" r="90%">
            <stop offset="0" stopColor="currentColor" stopOpacity=".28" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <pattern id={`nv-side-dots-${side}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" opacity=".22" />
          </pattern>
        </defs>
        <rect width="100" height="800" fill={`url(#nv-side-glow-${side})`} />
        <rect x={flip ? 10 : 30} y="430" width="60" height="220" fill={`url(#nv-side-dots-${side})`} />
      </svg>
      <svg className="absolute left-1/2 top-[12%] h-[70%] w-16 -translate-x-1/2 text-primary" viewBox="0 0 40 400" fill="none">
        <path className="nv-side-pulse" d="M20 0V120L8 140 32 170 14 200 26 215 20 230V400" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
      </svg>
      <div className={`absolute top-[8%] size-40 rounded-full border-2 border-primary/25 ${flip ? "-right-16" : "-left-16"}`}>
        <div className="absolute inset-5 rounded-full border border-primary/20" />
        <div className="absolute inset-10 rounded-full bg-primary/10" />
      </div>
      {icons.map((Icon, i) => (
        <span
          key={i}
          className="nv-float absolute grid size-11 place-items-center rounded-2xl border border-primary/25 bg-card/80 text-primary shadow-lg backdrop-blur"
          style={{ top: `${30 + i * 22}%`, [flip ? "right" : "left"]: `${18 + (i % 2) * 34}%`, animationDelay: `${i * 1.3}s` }}
        >
          <Icon size={20} />
        </span>
      ))}
    </div>
  );
}

export function HomeSideArt() {
  return (
    <>
      <SideColumn side="left" />
      <SideColumn side="right" />
    </>
  );
}

/** Faixa gráfica de encerramento da página: ondas da marca, linha de pulso desenhando e frase da NextVita. */
export function HomeBottomArt() {
  return (
    <div aria-hidden="true" className="nv-dark relative isolate h-36 overflow-hidden rounded-2xl bg-gradient-to-br from-[#041f1d] via-[#0a3f39] to-[#0c8063] sm:h-40">
      <svg className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 1200 160">
        <path d="M0 110 C 200 70 380 150 600 105 S 1000 60 1200 100 V160 H0Z" fill="#ffffff" opacity=".06" />
        <path d="M0 130 C 240 100 420 165 640 125 S 1020 95 1200 125 V160 H0Z" fill="#ffffff" opacity=".08" />
        <polyline
          className="nv-bottom-pulse"
          fill="none"
          stroke="#7ef0cc"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points="0,80 180,80 210,80 228,40 246,118 264,68 282,80 520,80 548,80 566,32 584,124 602,64 620,80 860,80 888,80 906,44 924,114 942,70 960,80 1200,80"
        />
      </svg>
      <div className="absolute -left-10 -top-16 size-48 rounded-full bg-emerald-300/15 blur-2xl" />
      <div className="absolute -right-10 bottom-0 size-56 rounded-full bg-teal-200/10 blur-2xl" />
      <p className="absolute inset-x-0 top-5 text-center font-display text-lg font-extrabold text-white/90 sm:text-xl">
        Cuidar de si é acompanhar a sua evolução.
      </p>
    </div>
  );
}
