import { describe, expect, it } from "vitest";
import { bedtimeRegularity, parseHeartRate, sleepScore } from "@/components/vigia/ClientSleepPage";
import { currentSpeedKmh, estimateKcal, kmSplits, paceLabel } from "@/components/vigia/LiveWorkoutVisual";
import { goalDate, weeklyTrend } from "@/components/vigia/WeightExplorer";
import { nextPlanSlot } from "@/components/vigia/HomeModalityTimers";

const night = (h: number, quality = 4, awakenings = 0) => ({ bed_at: "2026-11-15T03:00:00Z", wake_at: new Date(Date.parse("2026-11-15T03:00:00Z") + h * 3_600_000).toISOString(), quality, awakenings });
describe("sono", () => {
  it("dá nota maior para noites completas e bem avaliadas", () => {
    expect(sleepScore(night(8, 5, 0))).toBe(100);
    expect(sleepScore(night(5, 2, 4))).toBeLessThan(60);
    expect(sleepScore(night(8, 4, 1))).toBeGreaterThan(sleepScore(night(6, 4, 1)));
  });
  it("mede a regularidade do horário de dormir", () => {
    expect(bedtimeRegularity([{ bed_at: "2026-11-13T03:00:00Z" }, { bed_at: "2026-11-14T03:00:00Z" }, { bed_at: "2026-11-15T03:00:00Z" }])).toBe(0);
    expect(bedtimeRegularity([{ bed_at: "2026-11-13T03:00:00Z" }])).toBeNull();
  });
  it("lê batimentos no padrão Bluetooth de 8 e 16 bits", () => {
    expect(parseHeartRate(new DataView(new Uint8Array([0, 62]).buffer))).toBe(62);
    expect(parseHeartRate(new DataView(new Uint8Array([1, 44, 1]).buffer))).toBe(300);
  });
});
describe("treino ao vivo", () => {
  it("usa a velocidade do GPS e calcula ritmo e parciais", () => {
    expect(currentSpeedKmh([{ latitude: 0, longitude: 0, speed: 2.5, t: 0 }])).toBeCloseTo(9);
    expect(paceLabel(10)).toBe("6:00");
    expect(paceLabel(0)).toBe("—");
    const route = Array.from({ length: 13 }, (_, i) => ({ latitude: 0, longitude: i * 0.001, t: i * 30_000 })); // ~111 m a cada 30 s
    expect(kmSplits(route)).toEqual([270]);
    expect(estimateKcal("corrida", 30, 70)).toBe(343);
  });
});
describe("peso e relógios", () => {
  it("calcula tendência semanal e previsão da meta", () => {
    const pts = [0, 7, 14, 21].map((d, i) => ({ day: new Date(Date.UTC(2026, 10, 1 + d)).toISOString().slice(0, 10), weight: 80 - i * 0.5 }));
    expect(weeklyTrend(pts)).toBeCloseTo(-0.5);
    expect(goalDate(78.5, 76.5, -0.5, new Date("2026-11-22T12:00:00Z"))).toBe("2026-12-20");
    expect(goalDate(78.5, 80, -0.5)).toBeNull();
  });
  it("escolhe o próximo horário ainda não marcado", () => {
    const plans = [{ id: "a", name: "X", dose: "1", times: ["08:00", "20:00"] }];
    const now = Date.parse("2026-11-16T12:00:00-05:00");
    expect(nextPlanSlot(plans, new Set(), "2026-11-16", now)?.slot).toBe("20:00");
    expect(nextPlanSlot(plans, new Set(["a|20:00"]), "2026-11-16", now)).toBeNull();
  });
});
