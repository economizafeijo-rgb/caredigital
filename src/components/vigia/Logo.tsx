import { useId } from "react";

/** Marca NextVita: "N" contínuo que sobe (evolução) com uma folha (vida). */
export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="NextVita" className={className}>
      <defs><linearGradient id={`bg${id}`} x1="6" y1="2" x2="58" y2="62" gradientUnits="userSpaceOnUse"><stop stopColor="#12b886"/><stop offset=".55" stopColor="#0e8a6a"/><stop offset="1" stopColor="#064e4f"/></linearGradient>
<linearGradient id={`sh${id}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff" stopOpacity=".22"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
<linearGradient id={`lf${id}`} x1="38" y1="10" x2="54" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#d9fbe9"/><stop offset="1" stopColor="#7ee8c4"/></linearGradient></defs>
<rect x="2" y="2" width="60" height="60" rx="17" fill={`url(#bg${id})`}/><rect x="2" y="2" width="60" height="31" rx="17" fill={`url(#sh${id})`}/>
<path d="M18 47V22.5c0-3.4 4.2-5 6.5-2.4L40 37.6c2.300 2.600 6.500 1 6.500-2.400V27" fill="none" stroke="#fff" strokeWidth="6.400" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M46.500 26.500c-6.600.300-9.700-3.100-9.500-9.500 6.500-.300 9.800 3 9.500 9.500Z" fill={`url(#lf${id})`}/>
<path d="M39.500 19.500l5 5" stroke="#0e8a6a" strokeWidth="1.500" strokeLinecap="round" opacity=".7"/>
    </svg>
  );
}
