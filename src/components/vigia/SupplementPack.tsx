import { useId } from "react";

export type PackShape = "pote" | "frasco" | "gotas" | "sache";
type Props = { shape: PackShape; color: string; accent?: string; label: string; sub?: string; className?: string; title?: string };

/**
 * Embalagem ilustrada (estilo foto de estúdio) para cada suplemento.
 * Desenhada em SVG: nítida em qualquer tamanho e sem depender de imagens externas.
 */
export function SupplementPack({ shape, color, accent = "#ffffff", label, sub, className = "", title }: Props) {
  const id = useId().replace(/:/g, "");
  const g = (n: string) => `${n}-${id}`;
  const small = label.length > 7;
  return (
    <svg viewBox="0 0 160 190" className={className} role="img" aria-label={title ?? label}>
      <defs>
        {/* Sombreamento cilíndrico: escuro nas bordas, claro no centro-esquerdo. */}
        <linearGradient id={g("body")} x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="1" />
          <stop offset=".18" stopColor="#ffffff" stopOpacity=".28" />
          <stop offset=".32" stopColor={color} stopOpacity="0" />
          <stop offset=".85" stopColor="#000000" stopOpacity=".18" />
          <stop offset="1" stopColor="#000000" stopOpacity=".38" />
        </linearGradient>
        <linearGradient id={g("cap")} x1="0" x2="1">
          <stop offset="0" stopColor="#0f172a" />
          <stop offset=".25" stopColor="#475569" />
          <stop offset=".5" stopColor="#1e293b" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
        <linearGradient id={g("glass")} x1="0" x2="1">
          <stop offset="0" stopColor="#78350f" />
          <stop offset=".22" stopColor="#d97706" />
          <stop offset=".4" stopColor="#92400e" />
          <stop offset="1" stopColor="#451a03" />
        </linearGradient>
        <radialGradient id={g("shadow")} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#000" stopOpacity=".35" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <clipPath id={g("clip")}>
          {shape === "pote" && <rect x="28" y="62" width="104" height="112" rx="14" />}
          {shape === "frasco" && <rect x="40" y="66" width="80" height="108" rx="18" />}
          {shape === "gotas" && <rect x="50" y="84" width="60" height="90" rx="12" />}
          {shape === "sache" && <path d="M34 40 h92 l6 134 h-104z" />}
        </clipPath>
      </defs>

      <ellipse cx="80" cy="178" rx="58" ry="8" fill={`url(#${g("shadow")})`} />

      {shape === "pote" && (
        <>
          <rect x="28" y="62" width="104" height="112" rx="14" fill={color} />
          <rect x="28" y="62" width="104" height="112" rx="14" fill={`url(#${g("body")})`} />
          <rect x="24" y="38" width="112" height="30" rx="9" fill={`url(#${g("cap")})`} />
          {Array.from({ length: 13 }, (_, i) => <rect key={i} x={30 + i * 8} y="41" width="2" height="24" rx="1" fill="#fff" opacity=".08" />)}
          <rect x="24" y="64" width="112" height="4" fill="#000" opacity=".25" />
        </>
      )}
      {shape === "frasco" && (
        <>
          <rect x="40" y="66" width="80" height="108" rx="18" fill={color} />
          <rect x="40" y="66" width="80" height="108" rx="18" fill={`url(#${g("body")})`} />
          <rect x="56" y="52" width="48" height="18" rx="4" fill={color} />
          <rect x="56" y="52" width="48" height="18" rx="4" fill={`url(#${g("body")})`} />
          <rect x="52" y="28" width="56" height="28" rx="7" fill={`url(#${g("cap")})`} />
          {Array.from({ length: 6 }, (_, i) => <rect key={i} x={57 + i * 9} y="31" width="2" height="22" rx="1" fill="#fff" opacity=".1" />)}
        </>
      )}
      {shape === "gotas" && (
        <>
          <rect x="50" y="84" width="60" height="90" rx="12" fill={`url(#${g("glass")})`} />
          <rect x="62" y="72" width="36" height="14" rx="3" fill="#78350f" />
          <rect x="60" y="54" width="40" height="22" rx="5" fill={`url(#${g("cap")})`} />
          <path d="M68 54 C68 30, 92 30, 92 54 Z" fill="#1e293b" />
          <path d="M72 50 C72 36, 80 34, 82 40" stroke="#fff" strokeOpacity=".25" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      {shape === "sache" && (
        <>
          <path d="M34 40 h92 l6 134 h-104z" fill={color} />
          <path d="M34 40 h92 l6 134 h-104z" fill={`url(#${g("body")})`} />
          <path d="M34 40 h92 v10 h-92z" fill="#000" opacity=".15" />
          {Array.from({ length: 11 }, (_, i) => <path key={i} d={`M${36 + i * 8.4} 40 l4 -6 l4 6`} fill={color} />)}
        </>
      )}

      {/* Rótulo */}
      <g clipPath={`url(#${g("clip")})`}>
        {shape === "pote" && <rect x="28" y="92" width="104" height="58" fill={accent} />}
        {shape === "frasco" && <rect x="40" y="92" width="80" height="58" fill={accent} />}
        {shape === "gotas" && <rect x="50" y="106" width="60" height="48" fill={accent} />}
        {shape === "sache" && <rect x="28" y="84" width="110" height="56" fill={accent} />}
        <rect x="0" y={shape === "gotas" ? 106 : shape === "sache" ? 84 : 92} width="160" height="5" fill={color} opacity=".9" />
        <rect x="0" y="0" width="160" height="190" fill={`url(#${g("body")})`} opacity=".55" />
      </g>
      <text x="80" y={shape === "gotas" ? 130 : shape === "sache" ? 113 : 122} textAnchor="middle" fontSize={shape === "gotas" ? (small ? 9 : 12) : small ? 13 : 18} fontWeight="800" letterSpacing=".5" fill={color} style={{ fontFamily: "inherit" }}>{label}</text>
      {sub && <text x="80" y={shape === "gotas" ? 144 : shape === "sache" ? 128 : 139} textAnchor="middle" fontSize={shape === "gotas" ? 7 : 9} fontWeight="600" fill="#334155" opacity=".85" style={{ fontFamily: "inherit" }}>{sub}</text>}

      {/* Reflexo de estúdio */}
      <rect x={shape === "gotas" ? 56 : shape === "frasco" ? 47 : 36} y={shape === "gotas" ? 90 : 70} width="7" height={shape === "gotas" ? 76 : 96} rx="3.5" fill="#fff" opacity=".22" />
    </svg>
  );
}
