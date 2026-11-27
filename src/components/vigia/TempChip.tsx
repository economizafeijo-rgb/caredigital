import { Thermometer } from "lucide-react";
import { feel } from "@/lib/weather";

/** Etiqueta discreta com a temperatura da hora do registro (cor muda de frio a muito quente). */
export function TempChip({ temp }: { temp: number | null | undefined }) {
  if (temp === null || temp === undefined) return null;
  const f = feel(temp);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
      style={{ background: `${f.color}22`, color: f.color }}
      title={`Temperatura na hora do registro: ${f.label}`}
    >
      <Thermometer size={11} /> {Math.round(temp)}°
    </span>
  );
}
