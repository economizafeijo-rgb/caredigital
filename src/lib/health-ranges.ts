import { acreAddDays, acreDateKey } from "./acre-time";

export type RangeId = "hoje" | "7d" | "14d" | "30d" | "6m" | "1a";
export const RANGES: { id: RangeId; label: string; days: number; unit: string }[] = [
  { id: "hoje", label: "Hoje", days: 1, unit: "hora" },
  { id: "7d", label: "7 dias", days: 7, unit: "dia" },
  { id: "14d", label: "14 dias", days: 14, unit: "dia" },
  { id: "30d", label: "30 dias", days: 30, unit: "dia" },
  { id: "6m", label: "6 meses", days: 182, unit: "semana" },
  { id: "1a", label: "1 ano", days: 365, unit: "mês" },
];
export const rangeDays = (id: RangeId) => RANGES.find((r) => r.id === id)!.days;
export const rangeLabel = (id: RangeId) => RANGES.find((r) => r.id === id)!.label;

export type Bucket = { label: string; long: string; startMs: number; endMs: number };
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const startOf = (key: string) => Date.parse(`${key}T00:00:00-05:00`);
const dm = (key: string) => `${key.slice(8)}/${key.slice(5, 7)}`;

/** Divide o período em horas (hoje), dias (até 30 dias), semanas (6 meses) ou meses (1 ano). */
export function makeBuckets(id: RangeId): Bucket[] {
  const today = acreDateKey();
  if (id === "hoje") {
    const s = startOf(today);
    return Array.from({ length: 24 }, (_, h) => ({
      label: `${h}h`,
      long: `${String(h).padStart(2, "0")}:00 às ${String(h).padStart(2, "0")}:59`,
      startMs: s + h * 3_600_000,
      endMs: s + (h + 1) * 3_600_000,
    }));
  }
  if (id === "7d" || id === "14d" || id === "30d") {
    const n = rangeDays(id);
    return Array.from({ length: n }, (_, i) => {
      const k = acreAddDays(today, -(n - 1 - i));
      return {
        label: k.slice(8),
        long: dm(k),
        startMs: startOf(k),
        endMs: startOf(acreAddDays(k, 1)),
      };
    });
  }
  if (id === "6m") {
    return Array.from({ length: 26 }, (_, i) => {
      const a = acreAddDays(today, -(26 - i) * 7 + 1);
      const b = acreAddDays(a, 6);
      return {
        label: dm(a),
        long: `${dm(a)} a ${dm(b)}`,
        startMs: startOf(a),
        endMs: startOf(acreAddDays(b, 1)),
      };
    });
  }
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (11 - i), 1));
    const ky = d.getUTCFullYear();
    const km = d.getUTCMonth() + 1;
    const next = new Date(Date.UTC(ky, km, 1));
    const key = (x: Date) =>
      `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-01`;
    return {
      label: MONTHS[km - 1],
      long: `${MONTHS[km - 1]}/${ky}`,
      startMs: startOf(key(d)),
      endMs: startOf(key(next)),
    };
  });
}

export const bucketIndex = (buckets: Bucket[], iso: string) => {
  const t = Date.parse(iso);
  return buckets.findIndex((b) => t >= b.startMs && t < b.endMs);
};

/** Soma (ou conta) os itens em cada intervalo. */
export function aggregate<T extends { at: string }>(
  buckets: Bucket[],
  items: T[],
  value: (x: T) => number = () => 1,
): number[] {
  const out = buckets.map(() => 0);
  for (const it of items) {
    const i = bucketIndex(buckets, it.at);
    if (i >= 0) out[i] += value(it);
  }
  return out.map((v) => Math.round(v * 10) / 10);
}

/** Dias cobertos por cada intervalo (para converter total em média diária). */
export const bucketDays = (b: Bucket) =>
  Math.max(1, Math.round((b.endMs - b.startMs) / 86_400_000));
