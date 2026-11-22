import { useEffect, useRef, useState } from "react";

/** Anima um número até o novo valor (450 ms). */
export function useCountUp(target: number) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (typeof requestAnimationFrame === "undefined") {
      setValue(target);
      from.current = target;
      return;
    }
    const start = performance.now(),
      begin = from.current;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 450),
        eased = 1 - Math.pow(1 - p, 3);
      const current = begin + (target - begin) * eased;
      from.current = current;
      setValue(current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}
