import { useId } from "react";

/**
 * Medidor de água: copo circular com duas ondas suaves em camadas e anel de progresso fino.
 * O nível sobe com transição; a animação das ondas respeita `prefers-reduced-motion`.
 */
export function WaterGauge({ percent, className = "" }: { percent: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const p = Math.max(0, Math.min(100, percent));
  const level = 92 - (p / 100) * 84; // 92 = vazio, 8 = cheio
  const wave = (amp: number, phase: number) => {
    let d = `M ${-100 + phase} 0`;
    for (let x = -100 + phase; x < 200; x += 50) d += ` q 12.5 ${-amp} 25 0 t 25 0`;
    return `${d} V 120 H ${-100 + phase} Z`;
  };
  return (
    <div
      className={`nv-gauge relative ${className}`}
      role="img"
      aria-label={`Meta de água ${p}% concluída`}
    >
      <svg viewBox="0 0 100 100" className="size-full">
        <defs>
          <clipPath id={`${id}c`}>
            <circle cx="50" cy="50" r="40" />
          </clipPath>
          <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#67e8f9" />
            <stop offset="1" stopColor="#0284c7" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#ffffff22" strokeWidth="3" />
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${p} 100`}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray 1s ease-out" }}
        />
        <circle cx="50" cy="50" r="40" fill="#04263a" fillOpacity=".55" />
        <g clipPath={`url(#${id}c)`}>
          <g style={{ transform: `translateY(${level}px)`, transition: "transform 1.2s ease-out" }}>
            <g className="nv-wave-b" opacity=".45">
              <path d={wave(5, 0)} fill="#38bdf8" />
            </g>
            <g className="nv-wave-a">
              <path d={wave(4, 12)} fill={`url(#${id}w)`} />
            </g>
          </g>
        </g>
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fontSize="22"
          fontWeight="800"
          fill="#fff"
          style={{
            paintOrder: "stroke",
            stroke: "#03203a",
            strokeWidth: 3,
            strokeLinejoin: "round",
          }}
        >
          {Math.round(p)}%
        </text>
      </svg>
    </div>
  );
}
