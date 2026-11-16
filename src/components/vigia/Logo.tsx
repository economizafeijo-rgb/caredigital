import { useId } from "react";

/** Marca CareDigital: "C" aberto (cuidado) com cruz de saúde e ponto digital. */
export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="CareDigital" className={className}>
    <defs>
      <linearGradient id={`g${id}`} x1="6" y1="4" x2="58" y2="62" gradientUnits="userSpaceOnUse"><stop stopColor="#5b4df5"/><stop offset=".55" stopColor="#1f5eff"/><stop offset="1" stopColor="#0ea5e9"/></linearGradient>
      <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff" stopOpacity=".28"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#g${id})`}/>
    <rect x="2" y="2" width="60" height="30" rx="18" fill={`url(#s${id})`}/>
    <path d="M44.5 21.5A17 17 0 1 0 44.5 42.5" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round"/>
    <path d="M33 24v16M25 32h16" stroke="#a5f3fc" strokeWidth="5" strokeLinecap="round"/>
    <circle cx="47" cy="32" r="3.3" fill="#fff"/>
  </svg>;
}
