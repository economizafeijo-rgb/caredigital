/** Barras por hora (0–23), com uma segunda série opcional para cruzar dados. */
export function HourBars({
  a,
  b,
  aLabel,
  bLabel,
  aColor = "#0ea5e9",
  bColor = "#f59e0b",
}: {
  a: number[];
  b?: number[];
  aLabel: string;
  bLabel?: string;
  aColor?: string;
  bColor?: string;
}) {
  const maxA = Math.max(1, ...a);
  const maxB = Math.max(1, ...(b ?? [1]));
  return (
    <figure className="min-w-0">
      <div
        className="flex h-28 items-end gap-[3px]"
        role="img"
        aria-label={`${aLabel} por hora do dia`}
      >
        {a.map((v, h) => (
          <div key={h} className="relative flex h-full flex-1 items-end justify-center gap-px">
            <span
              className="w-full rounded-t-sm"
              style={{ height: `${(v / maxA) * 100}%`, background: aColor, minHeight: v ? 3 : 0 }}
              title={`${h}h · ${v}`}
            />
            {b && (
              <span
                className="absolute bottom-0 w-1/2 rounded-t-sm opacity-90"
                style={{
                  height: `${((b[h] ?? 0) / maxB) * 100}%`,
                  background: bColor,
                  right: 0,
                  minHeight: b[h] ? 3 : 0,
                }}
                title={`${h}h · ${b[h]}`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        {[0, 6, 12, 18, 23].map((h) => (
          <span key={h}>{h}h</span>
        ))}
      </div>
      <figcaption className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <i className="size-2 rounded-sm" style={{ background: aColor }} />
          {aLabel}
        </span>
        {b && bLabel && (
          <span className="inline-flex items-center gap-1">
            <i className="size-2 rounded-sm" style={{ background: bColor }} />
            {bLabel}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
