import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowRight, Droplets, Leaf, Pill, Dumbbell, HeartPulse, Moon } from "lucide-react";

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

const weeks = [38, 44, 41, 55, 60, 58, 71, 78];

/** Faixa de encerramento: aurora com foco de luz que segue o ponteiro e gráfico de evolução interativo (exemplo). */
export function HomeBottomArt() {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<SVGSVGElement>(null);
  const [seen, setSeen] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const W = 520, H = 150, pad = 14;
  const pts = weeks.map((v, i) => [pad + (i * (W - pad * 2)) / (weeks.length - 1), H - pad - (v / 100) * (H - pad * 2)] as const);
  const line = pts.map(([x, y], i) => {
    if (i === 0) return `M${x} ${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `C${cx} ${py} ${cx} ${y} ${x} ${y}`;
  }).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]} ${H} L${pts[0][0]} ${H}Z`;

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const onChart = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = chart.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    pts.forEach(([px], i) => { if (Math.abs(px - x) < Math.abs(pts[best][0] - x)) best = i; });
    setHover(best);
  };

  return (
    <section
      ref={box}
      onPointerMove={onMove}
      aria-labelledby="nv-bottom-title"
      className={`nv-aurora nv-dark relative isolate grid gap-5 overflow-hidden rounded-2xl bg-[#05110e] p-5 text-white sm:p-7 lg:grid-cols-[1fr_1.1fr] lg:items-center ${seen ? "nv-seen" : ""}`}
    >
      <div aria-hidden="true" className="nv-aurora-a pointer-events-none absolute -left-20 -top-28 -z-10 h-80 w-[36rem] rounded-full" />
      <div aria-hidden="true" className="nv-aurora-b pointer-events-none absolute -bottom-32 right-0 -z-10 h-80 w-[40rem] rounded-full" />
      <div aria-hidden="true" className="nv-spotlight pointer-events-none absolute inset-0 -z-10" />

      <div className="max-w-[34rem]">
        <h2 id="nv-bottom-title" className="text-balance font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
          Cuidar de si é acompanhar a sua evolução.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/70 sm:text-[15px]">
          Cada copo de água, refeição e dose registrada vira um gráfico. Semana após semana, você vê o que está funcionando.
        </p>
        <a href="/entrar?mode=signup" className="nv-cta mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-slate-950" style={{ ["--area" as string]: "#34d399" }}>
          Começar a acompanhar <ArrowRight size={16} aria-hidden="true" className="nv-cta-arrow" />
        </a>
      </div>

      <figure className="relative rounded-2xl border border-white/10 bg-white/[.04] p-4 backdrop-blur" aria-label="Exemplo de evolução das metas em 8 semanas">
        <figcaption className="flex items-center justify-between text-xs text-white/60">
          <span>Metas cumpridas por semana</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5">exemplo</span>
        </figcaption>
        <svg ref={chart} viewBox={`0 0 ${W} ${H}`} className="mt-2 h-36 w-full touch-none" onPointerMove={onChart} onPointerLeave={() => setHover(null)} role="img" aria-label="Linha subindo de 38% para 78% em 8 semanas">
          <defs>
            <linearGradient id="nv-evo-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#34d399" stopOpacity=".35" />
              <stop offset="1" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={pad} x2={W - pad} y1={H * g} y2={H * g} stroke="#ffffff" strokeOpacity=".08" strokeDasharray="3 5" />)}
          <path d={area} fill="url(#nv-evo-fill)" className="nv-evo-area" />
          <path d={line} fill="none" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" className="nv-evo-line" pathLength={1} />
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={hover === i ? 6 : 3.5} fill={hover === i ? "#ffffff" : "#6ee7b7"} className="nv-evo-dot" style={{ animationDelay: `${600 + i * 90}ms`, transition: "r .2s" }} />
          ))}
          {hover !== null && (
            <g>
              <line x1={pts[hover][0]} x2={pts[hover][0]} y1={pad} y2={H} stroke="#ffffff" strokeOpacity=".35" />
              <g transform={`translate(${Math.min(Math.max(pts[hover][0] - 46, 0), W - 92)} ${Math.max(pts[hover][1] - 44, 0)})`}>
                <rect width="92" height="32" rx="8" fill="#ffffff" />
                <text x="46" y="13" textAnchor="middle" fontSize="10" fill="#475569">Semana {hover + 1}</text>
                <text x="46" y="26" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">{weeks[hover]}% das metas</text>
              </g>
            </g>
          )}
        </svg>
      </figure>
    </section>
  );
}
