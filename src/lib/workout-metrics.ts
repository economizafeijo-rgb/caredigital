// Métricas estimadas de uma atividade a partir do tempo em movimento, do percurso e (se houver) do batimento.
import type { LivePoint } from "@/components/vigia/LiveWorkoutVisual";
import { haversineKm } from "@/components/vigia/LiveWorkoutVisual";

export type WorkoutMetrics = {
  moving_seconds: number;
  total_seconds: number;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
  avg_pace_s_km: number | null;
  kcal_est: number;
  avg_bpm?: number;
  max_bpm?: number;
  hr_source?: string;
  steps_est: number | null;
  gps_points: number;
  auto_pauses: number;
  splits_s: number[];
  route: [number, number][];
  effort: "leve" | "moderada" | "intensa";
};

const MET: Record<string, number> = { caminhada: 3.8, corrida: 9.8, ciclismo: 7.5 };

/** Reduz o percurso a no máximo `max` pontos (arredondados a ~1 m) para guardar no prontuário. */
export function simplifyRoute(route: LivePoint[], max = 60): [number, number][] {
  if (route.length <= max) return route.map((p) => [round5(p.latitude), round5(p.longitude)]);
  const step = (route.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => {
    const p = route[Math.round(i * step)];
    return [round5(p.latitude), round5(p.longitude)] as [number, number];
  });
}
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

/** Gasto estimado (kcal). Com batimento médio, ajusta o MET pela intensidade relativa à frequência máxima estimada. */
export function estimateKcalFull(
  type: string,
  movingSeconds: number,
  opts: { weightKg?: number; avgBpm?: number; age?: number; avgSpeedKmh?: number | null },
) {
  const weight = opts.weightKg ?? 70;
  let met = MET[type] ?? 5;
  // Caminhada/corrida: o MET acompanha a velocidade real.
  const v = opts.avgSpeedKmh ?? 0;
  if (type === "caminhada" && v > 0) met = v < 3.2 ? 2.8 : v < 4.8 ? 3.5 : v < 6.4 ? 4.8 : 6;
  if (type === "corrida" && v > 0) met = v < 8 ? 8.3 : v < 10 ? 9.8 : v < 12 ? 11 : 12.8;
  if (type === "ciclismo" && v > 0) met = v < 16 ? 5.8 : v < 20 ? 8 : 10;
  if (opts.avgBpm) {
    const hrMax = 220 - (opts.age ?? 35);
    const rel = opts.avgBpm / hrMax;
    met *= Math.max(0.8, Math.min(1.35, rel / 0.7));
  }
  return Math.round(met * weight * (movingSeconds / 3600));
}

export const effortOf = (avgBpm: number | undefined, avgSpeedKmh: number | null, type: string) => {
  if (avgBpm) {
    const rel = avgBpm / 185;
    return rel >= 0.8 ? "intensa" : rel >= 0.62 ? "moderada" : "leve";
  }
  const v = avgSpeedKmh ?? 0;
  const hi = type === "corrida" ? 11 : type === "ciclismo" ? 24 : 6.4;
  const mid = type === "corrida" ? 8 : type === "ciclismo" ? 16 : 4.5;
  return v >= hi ? "intensa" : v >= mid ? "moderada" : "leve";
};

export function buildMetrics(args: {
  type: string;
  route: LivePoint[];
  distanceKm: number;
  movingSeconds: number;
  totalSeconds: number;
  autoPauses: number;
  avgBpm?: number;
  maxBpm?: number;
  weightKg?: number;
}): WorkoutMetrics {
  const { route, distanceKm, movingSeconds } = args;
  const avgSpeed = movingSeconds > 0 && distanceKm > 0 ? distanceKm / (movingSeconds / 3600) : null;
  let maxSpeed = 0;
  for (let i = 1; i < route.length; i++) {
    const dt = ((route[i].t ?? 0) - (route[i - 1].t ?? 0)) / 3_600_000;
    if (dt > 0)
      maxSpeed = Math.max(maxSpeed, Math.min(40, haversineKm(route[i - 1], route[i]) / dt));
  }
  const splits: number[] = [];
  let km = 0;
  let mark = route[0]?.t ?? 0;
  for (let i = 1; i < route.length; i++) {
    km += haversineKm(route[i - 1], route[i]);
    if (km >= splits.length + 1 && route[i].t) {
      splits.push(Math.round(((route[i].t as number) - mark) / 1000));
      mark = route[i].t as number;
    }
  }
  const stride = args.type === "corrida" ? 1.0 : 0.75;
  return {
    moving_seconds: Math.round(movingSeconds),
    total_seconds: Math.round(args.totalSeconds),
    avg_speed_kmh: avgSpeed ? Math.round(avgSpeed * 10) / 10 : null,
    max_speed_kmh: maxSpeed > 0 ? Math.round(maxSpeed * 10) / 10 : null,
    avg_pace_s_km: distanceKm > 0.02 ? Math.round(movingSeconds / distanceKm) : null,
    kcal_est: estimateKcalFull(args.type, movingSeconds, {
      weightKg: args.weightKg,
      avgBpm: args.avgBpm,
      avgSpeedKmh: avgSpeed,
    }),
    ...(args.avgBpm
      ? {
          avg_bpm: Math.round(args.avgBpm),
          max_bpm: args.maxBpm,
          hr_source: "sessão de batimentos",
        }
      : {}),
    steps_est:
      args.type === "ciclismo" || distanceKm <= 0 ? null : Math.round((distanceKm * 1000) / stride),
    gps_points: route.length,
    auto_pauses: args.autoPauses,
    splits_s: splits,
    route: simplifyRoute(route),
    effort: effortOf(args.avgBpm, avgSpeed, args.type),
  };
}

export const mmss = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
export const hms = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
};
