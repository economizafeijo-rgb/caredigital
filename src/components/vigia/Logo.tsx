import { useId } from "react";

/** Marca NextVita: "N" geométrico com o ponto verde de "vita" no topo da haste direita. */
export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="NextVita"
      className={className}
    >
      <defs>
        <linearGradient id={`bg${id}`} x1="4" y1="2" x2="60" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#14a37f" />
          <stop offset=".5" stopColor="#0c8063" />
          <stop offset="1" stopColor="#05332f" />
        </linearGradient>
        <linearGradient id={`gl${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fff" stopOpacity=".18" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#bg${id})`} />
      <rect x="2" y="2" width="60" height="30" rx="16" fill={`url(#gl${id})`} />
      <path
        d="M19 45V19L45 45V27"
        fill="none"
        stroke="#fff"
        strokeWidth="6.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="45" cy="18" r="4.4" fill="#7ef0cc" />
    </svg>
  );
}
