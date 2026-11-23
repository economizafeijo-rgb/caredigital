// Motor de rastreamento GPS: filtra ruído, soma só o deslocamento real e detecta quando a pessoa parou.
export type Fix = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number | null;
  t: number;
};
export type TrackerCfg = {
  /** Descarta leituras com precisão pior que isto (m). */
  maxAccuracy: number;
  /** Velocidade máxima plausível (m/s); acima disso é salto de GPS. */
  maxSpeed: number;
  /** Velocidade mínima (m/s) para considerar que a pessoa está andando. */
  moveSpeed: number;
  /** Deslocamento mínimo (m) para contar. */
  minStep: number;
};
export type TrackerState = {
  anchor: Fix | null;
  distanceKm: number;
  lastMoveAt: number;
  moving: boolean;
  jumps: number;
};

export const trackerConfig = (type: string): TrackerCfg =>
  type === "ciclismo"
    ? { maxAccuracy: 40, maxSpeed: 22, moveSpeed: 1.5, minStep: 4 }
    : type === "corrida"
      ? { maxAccuracy: 35, maxSpeed: 9, moveSpeed: 1.2, minStep: 3 }
      : { maxAccuracy: 35, maxSpeed: 4.5, moveSpeed: 0.7, minStep: 2.5 };

export const initialTracker = (): TrackerState => ({
  anchor: null,
  distanceKm: 0,
  lastMoveAt: 0,
  moving: false,
  jumps: 0,
});

export function metersBetween(a: Fix, b: Fix) {
  const r = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Processa uma leitura. `accepted` indica um ponto de percurso novo (a pessoa se deslocou). */
export function ingest(
  state: TrackerState,
  fix: Fix,
  cfg: TrackerCfg,
): { state: TrackerState; accepted: boolean } {
  const acc = fix.accuracy ?? 0;
  if (acc > cfg.maxAccuracy) return { state, accepted: false };
  if (!state.anchor) {
    return {
      state: { ...state, anchor: fix, lastMoveAt: fix.t, moving: false },
      accepted: true,
    };
  }
  const dt = (fix.t - state.anchor.t) / 1000;
  if (dt <= 0) return { state, accepted: false };
  const d = metersBetween(state.anchor, fix);
  const implied = d / dt;
  if (implied > cfg.maxSpeed) {
    // Salto de GPS: ignora; se persistir, a pessoa realmente mudou de lugar (ex.: sinal voltou).
    const jumps = state.jumps + 1;
    if (jumps >= 6) return { state: { ...state, anchor: fix, jumps: 0 }, accepted: false };
    return { state: { ...state, jumps }, accepted: false };
  }
  const floor = Math.max(cfg.minStep, acc * 0.5);
  const gps = typeof fix.speed === "number" && fix.speed >= 0 ? fix.speed : null;
  const moved =
    gps !== null
      ? d >= floor && gps >= cfg.moveSpeed
      : d >= floor * 1.5 && implied >= cfg.moveSpeed;
  if (!moved) return { state: { ...state, moving: false, jumps: 0 }, accepted: false };
  return {
    state: {
      anchor: fix,
      distanceKm: state.distanceKm + d / 1000,
      lastMoveAt: fix.t,
      moving: true,
      jumps: 0,
    },
    accepted: true,
  };
}

/** Parado: sem deslocamento do GPS e sem movimento do corpo há tempo suficiente. */
export const isStopped = (
  state: TrackerState,
  now: number,
  lastMotionAt: number,
  idleMs = 7000,
  motionMs = 5000,
) =>
  !!state.anchor &&
  state.lastMoveAt > 0 &&
  now - state.lastMoveAt > idleMs &&
  now - lastMotionAt > motionMs;

export const formatPace = (km: number, seconds: number) => {
  if (km < 0.02 || seconds <= 0) return "—";
  const s = seconds / km;
  if (s > 3600) return "—";
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60) % 60).padStart(2, "0")}`;
};
