import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  Droplets,
  Dumbbell,
  HeartPulse,
  Leaf,
  Moon,
  Pill,
  Scale,
  ShoppingCart,
  Timer,
  Utensils,
} from "lucide-react";

/** Coluna lateral em toda a altura da página: linha de pulso contínua com pulso de luz percorrendo e ícones soltos, sem molduras. */
function SideColumn({ side }: { side: "left" | "right" }) {
  const flip = side === "right";
  const icons = flip ? [Dumbbell, Moon, Pill, Activity] : [Droplets, Leaf, HeartPulse, Timer];
  // Um batimento a cada 200 unidades, repetido por toda a altura.
  const beat = (y: number) =>
    `L20 ${y + 70} L14 ${y + 82} L28 ${y + 104} L16 ${y + 128} L22 ${y + 140} L20 ${y + 152}`;
  let d = "M20 0";
  for (let y = 0; y < 800; y += 200) d += ` L20 ${y + 40}` + beat(y) + ` L20 ${y + 200}`;
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed bottom-0 top-14 z-0 hidden w-12 overflow-hidden min-[1280px]:block ${flip ? "right-0" : "left-0"}`}
    >
      <svg
        className="absolute inset-0 size-full text-primary"
        preserveAspectRatio="none"
        viewBox="0 0 40 800"
      >
        <defs>
          <linearGradient id={`nv-side-fade-${side}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset=".15" stopColor="currentColor" stopOpacity=".5" />
            <stop offset=".85" stopColor="currentColor" stopOpacity=".5" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id={`nv-side-edge-${side}`}
            x1={flip ? "1" : "0"}
            y1="0"
            x2={flip ? "0" : "1"}
            y2="0"
          >
            <stop offset="0" stopColor="currentColor" stopOpacity=".16" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="40" height="800" fill={`url(#nv-side-edge-${side})`} />
        <path
          d={d}
          fill="none"
          stroke={`url(#nv-side-fade-${side})`}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pathLength={100}
          className="nv-side-run"
          style={{
            animationDelay: flip ? "-3.5s" : "0s",
            filter: "drop-shadow(0 0 4px currentColor)",
          }}
        />
      </svg>
      {icons.map((Icon, i) => (
        <span
          key={i}
          className="nv-float absolute left-1/2 -ml-2.5 text-primary/55"
          style={{ top: `${12 + i * 24}%`, animationDelay: `${i * 1.3}s` }}
        >
          <Icon size={20} strokeWidth={1.6} />
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

/** Relógio compartilhado do timer de suplementos (conta para trás e reinicia). */
function useCountdown(start: number) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setLeft((l) => (l <= 0 ? start : l - 1)), 1000);
    return () => window.clearInterval(t);
  }, [start]);
  const m = String(Math.floor(left / 60)).padStart(2, "0");
  const sec = String(left % 60).padStart(2, "0");
  return `00:${m}:${sec}`;
}

function Card({
  icon: Icon,
  color,
  title,
  value,
  children,
  dup,
}: {
  icon: typeof Droplets;
  color: string;
  title: string;
  value: string;
  children: ReactNode;
  dup?: boolean;
}) {
  return (
    <li
      aria-hidden={dup || undefined}
      className="nv-svc flex w-56 shrink-0 flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.05] p-4 backdrop-blur"
      style={{ ["--c" as string]: color }}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span
            className="grid size-7 place-items-center rounded-lg"
            style={{ background: `${color}26`, color }}
          >
            <Icon size={15} aria-hidden="true" />
          </span>
          {title}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-white/50">
          <span className="nv-live size-1.5 rounded-full" style={{ background: color }} /> ao vivo
        </span>
      </div>
      <div className="grid h-20 place-items-center">{children}</div>
      <p className="text-xs text-white/65">{value}</p>
    </li>
  );
}

function ServiceCards({ timer, dup = false }: { timer: string; dup?: boolean }) {
  return (
    <>
      <Card
        dup={dup}
        icon={Droplets}
        color="#38bdf8"
        title="Hidratação"
        value="1,8 L de 2,5 L hoje"
      >
        <svg viewBox="0 0 60 80" className="h-20">
          <rect x="16" y="6" width="28" height="8" rx="3" fill="#ffffff33" />
          <rect
            x="10"
            y="14"
            width="40"
            height="62"
            rx="10"
            fill="none"
            stroke="#ffffff55"
            strokeWidth="2"
          />
          <clipPath id={dup ? "nv-bottle-2" : "nv-bottle"}>
            <rect x="11" y="15" width="38" height="60" rx="9" />
          </clipPath>
          <g clipPath={dup ? "url(#nv-bottle-2)" : "url(#nv-bottle)"}>
            <rect x="0" y="0" width="60" height="80" fill="#38bdf8" className="nv-m-fill" />
          </g>
        </svg>
      </Card>
      <Card
        dup={dup}
        icon={Pill}
        color="#fb7185"
        title="Medicação"
        value="3 de 3 doses confirmadas"
      >
        <ul className="grid w-full gap-1.5 text-[11px]">
          {["08:00 Vitamina D3", "12:00 Ômega 3", "20:00 Magnésio"].map((d, i) => (
            <li key={d} className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1">
              <span
                className="nv-m-check grid size-4 place-items-center rounded-full bg-emerald-500"
                style={{ animationDelay: `${i * 0.7}s` }}
              >
                <Check size={10} />
              </span>
              {d}
            </li>
          ))}
        </ul>
      </Card>
      <Card
        dup={dup}
        icon={Utensils}
        color="#34d399"
        title="Alimentação"
        value="Proteína, carboidrato e gordura"
      >
        <svg viewBox="0 0 42 42" className="h-20 -rotate-90">
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#ffffff1a" strokeWidth="5" />
          <circle
            cx="21"
            cy="21"
            r="15.9"
            fill="none"
            stroke="#34d399"
            strokeWidth="5"
            pathLength="100"
            strokeDasharray="40 60"
            className="nv-m-donut"
          />
          <circle
            cx="21"
            cy="21"
            r="15.9"
            fill="none"
            stroke="#facc15"
            strokeWidth="5"
            pathLength="100"
            strokeDasharray="35 65"
            strokeDashoffset="-40"
            className="nv-m-donut"
            style={{ animationDelay: ".4s" }}
          />
          <circle
            cx="21"
            cy="21"
            r="15.9"
            fill="none"
            stroke="#f472b6"
            strokeWidth="5"
            pathLength="100"
            strokeDasharray="25 75"
            strokeDashoffset="-75"
            className="nv-m-donut"
            style={{ animationDelay: ".8s" }}
          />
        </svg>
      </Card>
      <Card
        dup={dup}
        icon={Timer}
        color="#a78bfa"
        title="Suplementos"
        value="Próxima dose: creatina"
      >
        <span className="font-mono text-2xl font-bold tabular-nums text-violet-200">{timer}</span>
      </Card>
      <Card
        dup={dup}
        icon={Activity}
        color="#fb923c"
        title="Treinos"
        value="5,2 km · ritmo 5'48&quot;/km"
      >
        <svg viewBox="0 0 160 70" className="h-20 w-full">
          <path
            d="M8 58 C 30 20, 50 64, 72 34 S 112 6, 128 30 S 150 60, 154 18"
            fill="none"
            stroke="#ffffff22"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M8 58 C 30 20, 50 64, 72 34 S 112 6, 128 30 S 150 60, 154 18"
            fill="none"
            stroke="#fb923c"
            strokeWidth="4"
            strokeLinecap="round"
            pathLength="1"
            className="nv-m-route"
          />
        </svg>
      </Card>
      <Card dup={dup} icon={HeartPulse} color="#f43f5e" title="Sono" value="Nota 86 · 58 bpm agora">
        <svg viewBox="0 0 200 60" className="h-16 w-full">
          <polyline
            className="nv-heart"
            fill="none"
            stroke="#fb7185"
            strokeWidth="2.5"
            strokeLinejoin="round"
            points="0,35 30,35 40,35 48,12 56,52 64,30 74,35 110,35 120,35 128,14 136,50 144,32 154,35 200,35"
          />
        </svg>
      </Card>
      <Card dup={dup} icon={Scale} color="#e879f9" title="Peso" value="-2,4 kg em 8 semanas">
        <svg viewBox="0 0 160 70" className="h-20 w-full">
          <path
            d="M6 14 L30 22 L54 20 L78 34 L102 38 L126 50 L154 56"
            fill="none"
            stroke="#e879f9"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            className="nv-m-route"
          />
        </svg>
      </Card>
      <Card
        dup={dup}
        icon={ShoppingCart}
        color="#fbbf24"
        title="Loja"
        value="Whey Protein 900 g no carrinho"
      >
        <div className="relative flex items-center gap-3">
          <img
            src="/loja/v2/whey.webp"
            alt=""
            className="nv-m-drop size-14 rounded-xl object-cover"
          />
          <span className="relative grid size-11 place-items-center rounded-xl bg-amber-400/20 text-amber-300">
            <ShoppingCart size={20} />
            <span className="nv-m-badge absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-amber-400 text-[10px] font-bold text-slate-950">
              1
            </span>
          </span>
        </div>
      </Card>
      <Card
        dup={dup}
        icon={BarChart3}
        color="#2dd4bf"
        title="Métricas"
        value="Meta de água em 6 de 7 dias"
      >
        <div className="flex h-16 w-full items-end gap-1.5">
          {[45, 62, 50, 78, 70, 88, 95].map((h, i) => (
            <span
              key={i}
              className="nv-m-bar flex-1 rounded-t bg-teal-400"
              style={{ height: `${h}%`, animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      </Card>
    </>
  );
}

/** Faixa final: trilho contínuo de cartões mostrando cada serviço da plataforma funcionando ao vivo. */
export function HomeBottomArt() {
  const timer = useCountdown(14 * 60 + 59);
  return (
    <section
      aria-labelledby="nv-bottom-title"
      className="nv-dark relative isolate overflow-hidden rounded-2xl bg-[#060d0b] py-6 text-white"
    >
      <div
        aria-hidden="true"
        className="nv-aurora-a pointer-events-none absolute -left-20 -top-32 -z-10 h-72 w-[34rem] rounded-full"
      />
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 sm:px-7">
        <div>
          <h2
            id="nv-bottom-title"
            className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
          >
            Tudo isso funcionando para você, todos os dias.
          </h2>
          <p className="mt-1 text-sm text-white/65">
            Cada ferramenta da NextVita em ação. Passe o mouse para pausar.
          </p>
        </div>
        <a
          href="/entrar?mode=signup"
          className="nv-cta inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-slate-950"
          style={{ ["--area" as string]: "#34d399" }}
        >
          Criar conta grátis <ArrowRight size={16} aria-hidden="true" className="nv-cta-arrow" />
        </a>
      </div>
      <div className="nv-marquee relative mt-5 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
        <ul className="nv-marquee-track flex w-max gap-3 px-3">
          <ServiceCards timer={timer} />
          <ServiceCards timer={timer} dup />
        </ul>
      </div>
    </section>
  );
}
