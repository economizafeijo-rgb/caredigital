import { acreDateKey } from "./acre-time";

export type CaffeineLog = { id: string; at: string; source: string; ml: number | null; mg: number };
export type CaffeineSource = { id: string; label: string; ml: number; mg: number };

/** Valores médios educativos (mg por porção padrão); o usuário pode editar mg e ml. */
export const CAFFEINE_SOURCES: CaffeineSource[] = [
  { id: "expresso", label: "Café expresso", ml: 50, mg: 65 },
  { id: "coado", label: "Café coado", ml: 150, mg: 90 },
  { id: "capuccino", label: "Capuccino / Latte", ml: 200, mg: 80 },
  { id: "cha_verde", label: "Chá verde", ml: 200, mg: 30 },
  { id: "cha_preto", label: "Chá preto", ml: 200, mg: 45 },
  { id: "energetico", label: "Energético", ml: 250, mg: 80 },
  { id: "refrigerante", label: "Refrigerante (cola)", ml: 350, mg: 35 },
  { id: "pre_treino", label: "Pré-treino", ml: 300, mg: 200 },
];

export const HALF_LIFE_H = 5;
export const DEFAULT_LIMIT_MG = 400;
export const CAFFEINE_NOTE =
  "Estimativas educativas (meia-vida média de 5 h). Gestantes, pessoas com arritmia, ansiedade ou pressão alta devem seguir orientação médica.";

/** mg por 100 ml da fonte, para converter ml digitado em mg. */
export const mgForMl = (s: CaffeineSource, ml: number) => Math.round((s.mg / s.ml) * ml);
export const mlForMg = (s: CaffeineSource, mg: number) => Math.round((s.ml / s.mg) * mg);

export const totalMg = (logs: CaffeineLog[]) => logs.reduce((a, l) => a + l.mg, 0);
export const totalMl = (logs: CaffeineLog[]) => logs.reduce((a, l) => a + (l.ml ?? 0), 0);

/** Cafeína estimada no organismo em um instante (decaimento exponencial). */
export function residualMg(logs: CaffeineLog[], atMs: number): number {
  let sum = 0;
  for (const l of logs) {
    const dt = (atMs - new Date(l.at).getTime()) / 3_600_000;
    if (dt >= 0) sum += l.mg * Math.pow(0.5, dt / HALF_LIFE_H);
  }
  return Math.round(sum);
}

/** Horário limite (hora decimal) para uma dose deixar até `maxAtBedMg` no organismo na hora de dormir. */
export function curfewHour(bedHour: number, doseMg: number, maxAtBedMg = 25): number {
  if (doseMg <= maxAtBedMg) return bedHour;
  return bedHour - HALF_LIFE_H * Math.log2(doseMg / maxAtBedMg);
}

export const fmtHour = (h: number) => {
  const x = ((h % 24) + 24) % 24;
  const hh = Math.floor(x);
  const mm = Math.round((x - hh) * 60);
  return `${String(mm === 60 ? hh + 1 : hh).padStart(2, "0")}:${String(mm === 60 ? 0 : mm).padStart(2, "0")}`;
};

type Sleep = { bed_at: string; wake_at: string; quality: number; awakenings: number };
export type NightRow = {
  night: string;
  totalMg: number;
  lastDoseHour: number | null;
  hours: number;
  quality: number;
  awakenings: number;
  late: boolean;
};

const acreHourDecimal = (iso: string) => {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Rio_Branco",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(iso))
    .split(":");
  return Number(p[0]) + Number(p[1]) / 60;
};

/** Cruza o consumo de cafeína de cada dia com a noite de sono que o segue. */
export function sleepCorrelation(caffeine: CaffeineLog[], sleeps: Sleep[]) {
  const rows: NightRow[] = [];
  for (const s of sleeps) {
    const bedMs = new Date(s.bed_at).getTime();
    // Dormir depois da meia-noite pertence ao dia anterior.
    const night = acreDateKey(bedMs - (acreHourDecimal(s.bed_at) < 6 ? 6 * 3_600_000 : 0));
    const day = caffeine.filter(
      (c) => acreDateKey(c.at) === night && new Date(c.at).getTime() < bedMs,
    );
    const last = day.length ? Math.max(...day.map((c) => acreHourDecimal(c.at))) : null;
    const hours = (new Date(s.wake_at).getTime() - bedMs) / 3_600_000;
    if (hours <= 0 || hours > 16) continue;
    const total = totalMg(day);
    rows.push({
      night,
      totalMg: total,
      lastDoseHour: last,
      hours: Math.round(hours * 10) / 10,
      quality: s.quality,
      awakenings: s.awakenings,
      late: (last !== null && last >= 16) || total > 300,
    });
  }
  const avg = (r: NightRow[], k: "quality" | "hours" | "awakenings") =>
    r.length ? Math.round((r.reduce((a, x) => a + x[k], 0) / r.length) * 10) / 10 : null;
  const late = rows.filter((r) => r.late);
  const calm = rows.filter((r) => !r.late);
  return {
    rows,
    late: {
      n: late.length,
      quality: avg(late, "quality"),
      hours: avg(late, "hours"),
      awakenings: avg(late, "awakenings"),
    },
    calm: {
      n: calm.length,
      quality: avg(calm, "quality"),
      hours: avg(calm, "hours"),
      awakenings: avg(calm, "awakenings"),
    },
  };
}
