/**
 * Lógica pura dos timers de cozimento. O tempo é calculado a partir de `endsAt`
 * (um carimbo de data/hora), por isso continua correto com a aba em segundo plano.
 */
export type TimerStatus = "running" | "paused" | "done";

export type CookTimer = {
  id: string;
  foodId: string;
  presetKey: string;
  qty: number;
  totalMs: number;
  status: TimerStatus;
  /** Instante previsto para o fim (só quando `running`). */
  endsAt: number;
  /** Tempo que faltava quando pausou (só quando `paused`). */
  remainingMs: number;
  /** Quando terminou (só quando `done`). */
  doneAt: number;
};

export const MINUTE = 60_000;
const MAX_TOTAL = 6 * 60 * MINUTE;

export const remainingOf = (t: CookTimer, now: number) =>
  t.status === "running" ? Math.max(0, t.endsAt - now) : t.status === "paused" ? t.remainingMs : 0;

/** Progresso de 0 a 1. */
export const progressOf = (t: CookTimer, now: number) =>
  t.status === "done"
    ? 1
    : t.totalMs <= 0
      ? 1
      : Math.min(1, Math.max(0, 1 - remainingOf(t, now) / t.totalMs));

export function makeTimer(
  input: { id: string; foodId: string; presetKey: string; qty: number; minutes: number },
  now: number,
): CookTimer {
  const totalMs = Math.min(MAX_TOTAL, Math.max(MINUTE / 2, Math.round(input.minutes * MINUTE)));
  return {
    id: input.id,
    foodId: input.foodId,
    presetKey: input.presetKey,
    qty: input.qty,
    totalMs,
    status: "running",
    endsAt: now + totalMs,
    remainingMs: totalMs,
    doneAt: 0,
  };
}

export const pauseTimer = (t: CookTimer, now: number): CookTimer =>
  t.status === "running"
    ? { ...t, status: "paused", remainingMs: Math.max(0, t.endsAt - now), endsAt: 0 }
    : t;

export const resumeTimer = (t: CookTimer, now: number): CookTimer =>
  t.status === "paused" ? { ...t, status: "running", endsAt: now + t.remainingMs } : t;

/** Soma tempo ao timer; se já tinha terminado, ele volta a contar. */
export function addMs(t: CookTimer, ms: number, now: number): CookTimer {
  const total = Math.min(MAX_TOTAL, t.totalMs + ms);
  if (t.status === "running") return { ...t, totalMs: total, endsAt: t.endsAt + ms };
  if (t.status === "paused") return { ...t, totalMs: total, remainingMs: t.remainingMs + ms };
  return { ...t, status: "running", totalMs: ms, endsAt: now + ms, remainingMs: ms, doneAt: 0 };
}

export const restartTimer = (t: CookTimer, now: number): CookTimer => ({
  ...t,
  status: "running",
  endsAt: now + t.totalMs,
  remainingMs: t.totalMs,
  doneAt: 0,
});

/** Marca como concluído o timer cujo tempo acabou. */
export const settle = (t: CookTimer, now: number): CookTimer =>
  t.status === "running" && t.endsAt <= now
    ? { ...t, status: "done", doneAt: t.endsAt, endsAt: 0, remainingMs: 0 }
    : t;

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Lê o que foi salvo no navegador, descartando qualquer registro inválido. */
export function parseTimers(raw: string | null): CookTimer[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const out: CookTimer[] = [];
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const t = item as Record<string, unknown>;
      if (
        typeof t.id !== "string" ||
        typeof t.foodId !== "string" ||
        typeof t.presetKey !== "string"
      )
        continue;
      if (!isNum(t.qty) || !isNum(t.totalMs) || t.totalMs <= 0 || t.totalMs > MAX_TOTAL) continue;
      if (t.status !== "running" && t.status !== "paused" && t.status !== "done") continue;
      out.push({
        id: t.id,
        foodId: t.foodId,
        presetKey: t.presetKey,
        qty: t.qty,
        totalMs: t.totalMs,
        status: t.status,
        endsAt: isNum(t.endsAt) ? t.endsAt : 0,
        remainingMs: isNum(t.remainingMs) ? t.remainingMs : 0,
        doneAt: isNum(t.doneAt) ? t.doneAt : 0,
      });
    }
    return out.slice(0, 12);
  } catch {
    return [];
  }
}
