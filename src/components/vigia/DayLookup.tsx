import { CalendarSearch } from "lucide-react";
import { acreDateKey } from "@/lib/acre-time";

/** Escolhe um dia específico (do início do uso da plataforma até hoje) para consultar os registros. */
export function DayLookup({
  value,
  min,
  onPick,
  label = "Consultar outro dia",
}: {
  value?: string;
  min: string | null;
  onPick: (day: string) => void;
  label?: string;
}) {
  const today = acreDateKey();
  return (
    <label className="flex flex-wrap items-center gap-2 border border-border bg-card px-2.5 py-1.5 text-xs font-semibold">
      <CalendarSearch size={15} className="shrink-0 text-primary" aria-hidden="true" />
      <span>{label}</span>
      <input
        type="date"
        value={value ?? ""}
        min={min ?? undefined}
        max={today}
        onChange={(event) => {
          const day = event.target.value;
          if (!day || day > today || (min && day < min)) return;
          onPick(day);
        }}
        style={{ cursor: "pointer", colorScheme: "dark light" }}
        className="h-8 border border-border bg-background px-2 text-xs font-semibold"
      />
      {min && (
        <span className="text-[10px] font-normal text-muted-foreground">
          registros desde {min.slice(8)}/{min.slice(5, 7)}/{min.slice(0, 4)}
        </span>
      )}
    </label>
  );
}
