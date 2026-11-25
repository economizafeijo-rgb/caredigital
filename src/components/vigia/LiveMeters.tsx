import { useEffect, useRef, useState } from "react";

/** Metros percorridos em tempo real: o número sobe suavemente a cada novo ponto do GPS. */
export function LiveMeters({
  distanceKm,
  active,
  className = "",
}: {
  distanceKm: number;
  active: boolean;
  className?: string;
}) {
  const target = Math.max(0, distanceKm * 1000);
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      const value = origin + (target - origin) * (1 - Math.pow(1 - t, 3));
      from.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  const meters = Math.floor(shown);
  return (
    <span
      className={`inline-flex items-baseline gap-1 tabular-nums ${className}`}
      aria-live="off"
      aria-label={`${meters} metros percorridos`}
    >
      <span className="relative flex size-2 self-center" aria-hidden="true">
        {active && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300/80" />
        )}
        <span className="relative inline-flex size-2 rounded-full bg-emerald-300" />
      </span>
      <strong className="text-2xl font-extrabold leading-none">
        {meters.toLocaleString("pt-BR")}
      </strong>
      <span className="text-xs font-semibold text-white/65">m</span>
    </span>
  );
}
