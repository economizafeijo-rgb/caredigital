import { useEffect, useRef, useState } from "react";

/** Número que "sobe" até o valor novo (e acompanha mudanças ao vivo). Sem animação se o usuário reduz movimento. */
export function useCountUp(value: number, ms = 900) {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(reduced ? value : 0);
  const from = useRef(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = a + (value - a) * eased;
      from.current = current;
      setShown(current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms, reduced]);
  return shown;
}
