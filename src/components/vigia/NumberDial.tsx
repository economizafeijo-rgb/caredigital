import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

const parse = (v: string) => Number(v.replace(",", "."));
const fmt = (n: number, d: number) => n.toFixed(d).replace(".", ",");

/**
 * Seletor numérico: valor grande, botões − e + (segure para repetir), barra de arrastar e atalhos.
 * Nunca passa de min a max, então não gera números negativos nem abaixo do mínimo.
 */
export function NumberDial({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step,
  digits,
  color,
  fallback,
  quick,
  hint,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  step: number;
  digits: number;
  color: string;
  /** Valor inicial da barra quando o campo está vazio. */
  fallback: number;
  quick: number[];
  hint?: string;
}) {
  const parsed = parse(value);
  const n = Number.isFinite(parsed) && parsed >= min ? Math.min(max, parsed) : null;
  const shown = n ?? fallback;
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const hold = useRef<number | null>(null);
  const cur = useRef(shown);
  cur.current = shown;

  const set = (x: number) => {
    const c = Math.min(max, Math.max(min, Math.round(x / step) * step));
    onChange(fmt(c, digits));
  };
  const stop = () => {
    if (hold.current) window.clearInterval(hold.current);
    hold.current = null;
  };
  useEffect(() => stop, []);
  const press = (dir: 1 | -1) => {
    set(cur.current + dir * step);
    stop();
    const t = window.setTimeout(() => {
      hold.current = window.setInterval(() => set(cur.current + dir * step), 90);
    }, 350);
    hold.current = t as unknown as number;
  };

  const pct = ((shown - min) / (max - min)) * 100;
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Diminuir ${label}`}
          disabled={shown <= min}
          onPointerDown={() => press(-1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          className="grid size-12 shrink-0 select-none place-items-center rounded-2xl border border-border bg-muted/50 transition active:scale-90 disabled:opacity-40"
        >
          <Minus size={20} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          {typing ? (
            <input
              autoFocus
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/[^\d.,]/g, "").slice(0, 6))}
              onBlur={() => {
                const x = parse(draft);
                if (Number.isFinite(x) && x >= min) set(x);
                setTyping(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              aria-label={label}
              className="h-14 w-full rounded-2xl border-2 bg-background text-center text-4xl font-black tabular-nums outline-none"
              style={{ borderColor: color }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(n === null ? "" : fmt(n, digits));
                setTyping(true);
              }}
              aria-label={`${label}: ${fmt(shown, digits)} ${unit}. Toque para digitar`}
              className="h-14 w-full rounded-2xl text-4xl font-black tabular-nums"
              style={{ color: n === null ? undefined : color, opacity: n === null ? 0.45 : 1 }}
            >
              {fmt(shown, digits)}
              <span className="ml-1 text-base font-semibold text-muted-foreground">{unit}</span>
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          disabled={shown >= max}
          onPointerDown={() => press(1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          className="grid size-12 shrink-0 select-none place-items-center rounded-2xl border border-border bg-muted/50 transition active:scale-90 disabled:opacity-40"
        >
          <Plus size={20} />
        </button>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        aria-label={`Barra de ${label}`}
        onChange={(e) => set(Number(e.target.value))}
        className="h-9 w-full cursor-pointer appearance-none rounded-full bg-transparent [&::-moz-range-thumb]:size-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[var(--dial)] [&::-moz-range-track]:h-3 [&::-moz-range-track]:rounded-full [&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:size-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[var(--dial)] [&::-webkit-slider-thumb]:shadow-lg"
        style={
          {
            "--dial": color,
            background: `linear-gradient(90deg, ${color} ${pct}%, color-mix(in srgb, currentColor 14%, transparent) ${pct}%) center / 100% 12px no-repeat`,
          } as React.CSSProperties
        }
      />
      <div className="flex flex-wrap gap-1.5">
        {quick.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => set(shown + q)}
            className="h-9 rounded-full border border-border px-3 text-xs font-semibold tabular-nums transition active:scale-95"
          >
            {q > 0 ? "+" : "−"}
            {fmt(Math.abs(q), digits)}
          </button>
        ))}
      </div>
    </div>
  );
}
