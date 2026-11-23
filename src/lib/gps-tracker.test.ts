import { describe, expect, it } from "vitest";
import {
  formatPace,
  ingest,
  initialTracker,
  isStopped,
  trackerConfig,
  type Fix,
} from "./gps-tracker";

const M = 1 / 111320; // 1 metro em graus de latitude
const fix = (m: number, t: number, extra: Partial<Fix> = {}): Fix => ({
  latitude: -9.97 + m * M,
  longitude: -67.8,
  accuracy: 8,
  t,
  ...extra,
});
const run = (fixes: Fix[], type = "caminhada") => {
  const cfg = trackerConfig(type);
  let s = initialTracker();
  for (const f of fixes) s = ingest(s, f, cfg).state;
  return s;
};

describe("rastreamento GPS", () => {
  it("parado com oscilação do GPS não acumula distância", () => {
    const jitter = [0, 3, -2, 4, -3, 2, 5, -4, 1, 3].map((m, i) =>
      fix(m, i * 1000, { speed: 0.1 }),
    );
    const s = run(jitter);
    expect(s.distanceKm).toBe(0);
    expect(s.moving).toBe(false);
  });
  it("soma o deslocamento real de uma caminhada (~1,4 m/s)", () => {
    const walk = Array.from({ length: 61 }, (_, i) => fix(i * 1.4, i * 1000, { speed: 1.4 }));
    const s = run(walk);
    expect(s.distanceKm).toBeGreaterThan(0.075);
    expect(s.distanceKm).toBeLessThan(0.09);
    expect(s.moving).toBe(true);
  });
  it("sem velocidade do aparelho, usa o deslocamento calculado", () => {
    const walk = Array.from({ length: 31 }, (_, i) => fix(i * 1.5, i * 1000));
    expect(run(walk).distanceKm).toBeGreaterThan(0.04);
  });
  it("descarta leituras imprecisas e saltos", () => {
    const s = run([
      fix(0, 0),
      fix(500, 1000), // salto impossível
      fix(1.5, 2000, { accuracy: 90, speed: 1.5 }), // impreciso
      fix(3, 3000, { speed: 1.5 }),
    ]);
    expect(s.distanceKm).toBeLessThan(0.005);
  });
  it("detecta quando a pessoa parou e quando o corpo ainda se move", () => {
    const s = run([fix(0, 0), fix(6, 3000, { speed: 1.4 })]);
    expect(isStopped(s, 4000, 0)).toBe(false);
    expect(isStopped(s, 12000, 0)).toBe(true);
    expect(isStopped(s, 12000, 10000)).toBe(false);
  });
  it("formata o ritmo em min/km", () => {
    expect(formatPace(1, 360)).toBe("6:00");
    expect(formatPace(0, 100)).toBe("—");
  });
});

import { buildMetrics, estimateKcalFull, effortOf } from "./workout-metrics";
describe("métricas da atividade", () => {
  it("calcula ritmo, velocidade média e quilocalorias", () => {
    const route = Array.from({ length: 11 }, (_, i) => ({
      latitude: -9.97 + (i * 101) / 111320,
      longitude: -67.8,
      t: i * 71_400,
    }));
    const m = buildMetrics({
      type: "caminhada",
      route,
      distanceKm: 1,
      movingSeconds: 714,
      totalSeconds: 800,
      autoPauses: 1,
    });
    expect(m.avg_pace_s_km).toBe(714);
    expect(m.avg_speed_kmh).toBeCloseTo(5.0, 0);
    expect(m.kcal_est).toBeGreaterThan(30);
    expect(m.route.length).toBe(11);
    expect(m.splits_s.length).toBe(1);
  });
  it("com batimento alto a estimativa de gasto sobe", () => {
    const base = estimateKcalFull("corrida", 1800, { avgSpeedKmh: 9 });
    const hi = estimateKcalFull("corrida", 1800, { avgSpeedKmh: 9, avgBpm: 175 });
    expect(hi).toBeGreaterThan(base);
    expect(effortOf(175, 9, "corrida")).toBe("intensa");
  });
});
