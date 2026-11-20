/** Variação do peso entre medidas: tudo calculado a partir das datas e dos valores registrados, sem estimativas. */

export type WeightPoint = { date: string; kg: number };
export type VariationRow = {
  date: string;
  kg: number;
  /** Diferença em kg para a medida anterior (null na primeira). */
  delta: number | null;
  /** Diferença percentual para a medida anterior. */
  pct: number | null;
  /** Dias entre esta medida e a anterior. */
  days: number | null;
  /** Ritmo entre as duas medidas, em kg por semana (só quando passaram 3 dias ou mais, para não exagerar). */
  perWeek: number | null;
  /** Variação acumulada desde a primeira medida do período. */
  cumulative: number;
};
export type VariationSummary = {
  count: number;
  first: WeightPoint | null;
  last: WeightPoint | null;
  total: number | null;
  totalPct: number | null;
  spanDays: number;
  /** Ritmo médio do período em kg por semana; null se o período tem menos de 7 dias. */
  perWeek: number | null;
  biggestDrop: { delta: number; date: string } | null;
  biggestRise: { delta: number; date: string } | null;
  avgGapDays: number | null;
  trend: "down" | "up" | "flat" | null;
  /** Medidas seguidas em queda (ou em alta) até a última. */
  streak: { direction: "down" | "up"; count: number } | null;
};

const DAY = 86_400_000;
const dayNumber = (date: string) => Math.round(Date.parse(date.slice(0, 10) + "T12:00:00Z") / DAY);
const round = (value: number, digits = 2) => Number(value.toFixed(digits));

export function weightVariation(points: WeightPoint[]): {
  rows: VariationRow[];
  summary: VariationSummary;
} {
  const sorted = points
    .filter((p) => Number.isFinite(p.kg) && p.kg > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const rows: VariationRow[] = sorted.map((point, index) => {
    const previous = index > 0 ? sorted[index - 1] : null;
    const delta = previous ? round(point.kg - previous.kg) : null;
    const days = previous ? Math.max(1, dayNumber(point.date) - dayNumber(previous.date)) : null;
    return {
      date: point.date,
      kg: point.kg,
      delta,
      pct: previous && delta !== null ? round((delta / previous.kg) * 100) : null,
      days,
      perWeek: delta !== null && days !== null && days >= 3 ? round((delta / days) * 7) : null,
      cumulative: round(point.kg - sorted[0].kg),
    };
  });

  const first = sorted[0] ?? null;
  const last = sorted.at(-1) ?? null;
  const changes = rows.filter((row) => row.delta !== null);
  const total = first && last && sorted.length > 1 ? round(last.kg - first.kg) : null;
  const spanDays = first && last ? dayNumber(last.date) - dayNumber(first.date) : 0;
  const drop = changes.reduce<VariationRow | null>(
    (best, row) => (row.delta! < 0 && (!best || row.delta! < best.delta!) ? row : best),
    null,
  );
  const rise = changes.reduce<VariationRow | null>(
    (best, row) => (row.delta! > 0 && (!best || row.delta! > best.delta!) ? row : best),
    null,
  );

  let streak: VariationSummary["streak"] = null;
  for (let i = changes.length - 1; i >= 0; i -= 1) {
    const direction = changes[i].delta! < 0 ? "down" : changes[i].delta! > 0 ? "up" : null;
    if (!direction) break;
    if (!streak) streak = { direction, count: 1 };
    else if (streak.direction === direction) streak.count += 1;
    else break;
  }

  const gaps = changes.map((row) => row.days!).filter((d) => d > 0);
  const flatBand = first ? first.kg * 0.003 : 0; // menos de 0,3% do peso não conta como mudança

  return {
    rows,
    summary: {
      count: sorted.length,
      first,
      last,
      total,
      totalPct: total !== null && first ? round((total / first.kg) * 100) : null,
      spanDays,
      perWeek: total !== null && spanDays >= 7 ? round((total / spanDays) * 7) : null,
      biggestDrop: drop ? { delta: drop.delta!, date: drop.date } : null,
      biggestRise: rise ? { delta: rise.delta!, date: rise.date } : null,
      avgGapDays: gaps.length ? round(gaps.reduce((a, b) => a + b, 0) / gaps.length, 1) : null,
      trend:
        total === null ? null : Math.abs(total) <= flatBand ? "flat" : total < 0 ? "down" : "up",
      streak,
    },
  };
}

export const signed = (value: number, digits = 1) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
