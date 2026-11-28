import { useEffect, useState } from "react";
import { Droplets, Moon, Salad, X } from "lucide-react";

/** Faixa de fim de ano: aparece de 15/11 a 06/01 e pode ser fechada (lembra por ano, neste aparelho). */
function inSeason(d = new Date()) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return (m === 11 && day >= 15) || m === 12 || (m === 1 && day <= 6);
}

const FLAKES = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 2 + (i % 3),
  delay: (i * 0.7) % 9,
  dur: 9 + (i % 5) * 2,
  drift: i % 2 ? 14 : -14,
}));

function Ornament({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 80" className={className} aria-hidden="true">
      <line x1="32" y1="0" x2="32" y2="14" stroke="#e8c36a" strokeWidth="1.5" />
      <rect x="26" y="12" width="12" height="7" rx="2" fill="#e8c36a" />
      <circle cx="32" cy="46" r="27" fill="url(#nvOrn)" />
      <path d="M8 44 Q32 54 56 44" stroke="#fff" strokeOpacity=".35" strokeWidth="2" fill="none" />
      <path
        d="M10 34 Q32 42 54 34"
        stroke="#e8c36a"
        strokeOpacity=".7"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="22" cy="36" r="5" fill="#fff" fillOpacity=".35" />
      <defs>
        <radialGradient id="nvOrn" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ff6b8b" />
          <stop offset=".55" stopColor="#c81d4b" />
          <stop offset="1" stopColor="#5d0b25" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function HolidayBanner() {
  const year = new Date().getFullYear();
  const key = `nv-holiday-closed-${new Date().getMonth() === 0 ? year - 1 : year}`;
  const [show, setShow] = useState(false);
  useEffect(() => {
    let closed = false;
    try {
      closed = localStorage.getItem(key) === "1";
    } catch {
      /* sem armazenamento */
    }
    setShow(inSeason() && !closed);
  }, [key]);
  if (!show) return null;

  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* só não lembra */
    }
  };

  return (
    <section
      aria-label="Boas festas"
      className="nv-dark relative isolate overflow-hidden rounded-2xl border border-[#e8c36a]/25 bg-[#071a17] text-white shadow-card"
    >
      <style>{`
        @keyframes nvSnow { from { transform: translate3d(0,-10px,0); opacity: 0 } 10% { opacity: .9 } to { transform: translate3d(var(--dx),150px,0); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .nv-flake { animation: none !important; opacity: .5 !important } }
      `}</style>
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(70%_120%_at_0%_0%,rgba(31,122,90,.55),transparent_60%),radial-gradient(60%_120%_at_100%_100%,rgba(200,29,75,.35),transparent_60%)]"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {FLAKES.map((f, i) => (
          <i
            key={i}
            className="nv-flake absolute top-0 rounded-full bg-white"
            style={
              {
                left: `${f.left}%`,
                width: f.size,
                height: f.size,
                animation: `nvSnow ${f.dur}s linear ${f.delay}s infinite`,
                ["--dx" as string]: `${f.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </span>
      <span
        aria-hidden="true"
        className="block h-[3px] w-full bg-gradient-to-r from-[#1f7a5a] via-[#e8c36a] to-[#c81d4b]"
      />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1">
          <Ornament className="h-14 w-11 drop-shadow-[0_6px_12px_rgba(200,29,75,.45)]" />
          <Ornament className="-ml-3 mt-4 h-10 w-8 opacity-90 [filter:hue-rotate(140deg)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold leading-tight sm:text-xl">
            Boas festas da <span className="text-[#e8c36a]">NextVita</span>
          </p>
          <p className="text-[13px] text-white/75">
            Neste fim de ano, cuide de quem você ama começando por você.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2 text-[12px]">
          {[
            [Salad, "Ceia com metade do prato em salada e legumes"],
            [Droplets, "Um copo de água entre as bebidas"],
            [Moon, "Durma no horário mesmo nas festas"],
          ].map(([Icon, text]) => {
            const I = Icon as typeof Salad;
            return (
              <li
                key={text as string}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[.06] px-2.5 py-1"
              >
                <I size={13} className="text-[#e8c36a]" /> {text as string}
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={close}
          aria-label="Fechar mensagem de boas festas"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </section>
  );
}
