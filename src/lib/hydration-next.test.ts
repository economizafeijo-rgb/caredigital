import { describe, expect, it } from "vitest";
import { estimateNextHydration } from "./hydration-goal";

const H = 3_600_000;
describe("estimateNextHydration", () => {
  const cutoff = Date.parse("2026-11-11T23:00:00-05:00");
  it("distribui o restante até 23h a partir do último líquido", () => {
    const last = cutoff - 10 * H; // 13h
    const r = estimateNextHydration({ remainingMl: 1500, lastIntakeAt: last, lastAmountMl: 250, now: last + 60_000, cutoff })!;
    expect(r.portions).toBe(6);
    expect(r.suggestedMl).toBe(250);
    expect(r.intervalMin).toBe(100);
    expect(r.at).toBe(last + 100 * 60_000);
  });
  it("respeita intervalo mínimo após grande volume", () => {
    const last = cutoff - 2 * H;
    const r = estimateNextHydration({ remainingMl: 1500, lastIntakeAt: last, lastAmountMl: 800, now: last, cutoff })!;
    expect(r.intervalMin).toBe(60);
  });
  it("sem registro ou atrasado sugere agora", () => {
    const now = cutoff - 5 * H;
    expect(estimateNextHydration({ remainingMl: 500, lastIntakeAt: null, lastAmountMl: 0, now, cutoff })!.at).toBe(now);
  });
  it("meta atingida ou após 23h não sugere", () => {
    expect(estimateNextHydration({ remainingMl: 0, lastIntakeAt: null, lastAmountMl: 0, now: 0, cutoff })).toBeNull();
    expect(estimateNextHydration({ remainingMl: 500, lastIntakeAt: null, lastAmountMl: 0, now: cutoff, cutoff })).toBeNull();
  });
});
