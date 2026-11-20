import { describe, expect, it } from "vitest";
import { estimateNextHydration } from "./hydration-goal";

const H = 3_600_000;
describe("estimateNextHydration", () => {
  const cutoff = Date.parse("2026-11-11T23:00:00-05:00");
  it("distribui o restante até 23h a partir do último líquido", () => {
    const last = cutoff - 10 * H; // 13h
    const r = estimateNextHydration({
      remainingMl: 1500,
      lastIntakeAt: last,
      lastAmountMl: 250,
      now: last + 60_000,
      cutoff,
    })!;
    expect(r.portions).toBe(6);
    expect(r.suggestedMl).toBe(250);
    expect(r.intervalMin).toBe(100);
    expect(r.at).toBe(last + 100 * 60_000);
  });
  it("respeita intervalo mínimo após grande volume", () => {
    const last = cutoff - 2 * H;
    const r = estimateNextHydration({
      remainingMl: 1500,
      lastIntakeAt: last,
      lastAmountMl: 800,
      now: last,
      cutoff,
    })!;
    expect(r.intervalMin).toBe(96); // 800 ml a 500 ml/h
  });
  it("não deixa o ritmo passar de 500 ml/h e avisa quando o restante não cabe com segurança", () => {
    const now = cutoff - 1 * H;
    const r = estimateNextHydration({
      remainingMl: 2000,
      lastIntakeAt: now,
      lastAmountMl: 250,
      now,
      cutoff,
    })!;
    expect(r.intervalMin).toBeGreaterThanOrEqual(30); // 250 ml a cada 30 min = 500 ml/h
    expect(r.reachable).toBe(false);
    expect(r.safeRemainingMl).toBe(500);
    const ok = estimateNextHydration({
      remainingMl: 400,
      lastIntakeAt: now,
      lastAmountMl: 250,
      now,
      cutoff,
    })!;
    expect(ok.reachable).toBe(true);
  });
  it("sem registro ou atrasado sugere agora", () => {
    const now = cutoff - 5 * H;
    expect(
      estimateNextHydration({ remainingMl: 500, lastIntakeAt: null, lastAmountMl: 0, now, cutoff })!
        .at,
    ).toBe(now);
  });
  it("meta atingida ou após 23h não sugere", () => {
    expect(
      estimateNextHydration({
        remainingMl: 0,
        lastIntakeAt: null,
        lastAmountMl: 0,
        now: 0,
        cutoff,
      }),
    ).toBeNull();
    expect(
      estimateNextHydration({
        remainingMl: 500,
        lastIntakeAt: null,
        lastAmountMl: 0,
        now: cutoff,
        cutoff,
      }),
    ).toBeNull();
  });

  it("qualquer gole, a qualquer hora, recalcula o próximo a partir dele", () => {
    const now = cutoff - 8 * H;
    const base = { remainingMl: 1500, cutoff, now };
    const before = estimateNextHydration({
      ...base,
      lastIntakeAt: now - 3 * H,
      lastAmountMl: 250,
    })!;
    const after = estimateNextHydration({
      ...base,
      remainingMl: 1300,
      lastIntakeAt: now,
      lastAmountMl: 200,
      recent: [{ at: now, ml: 200 }],
    })!;
    expect(before.at).toBe(now);
    expect(after.at).toBeGreaterThanOrEqual(now + 45 * 60_000);
  });

  it("não avisa com menos de 45 min de intervalo e usa porções de 100 a 300 ml", () => {
    const now = cutoff - 8 * H;
    const r = estimateNextHydration({
      remainingMl: 2000,
      lastIntakeAt: now,
      lastAmountMl: 100,
      now,
      cutoff,
      recent: [{ at: now, ml: 100 }],
    })!;
    expect(r.intervalMin).toBeGreaterThanOrEqual(45);
    expect(r.suggestedMl).toBeGreaterThanOrEqual(100);
    expect(r.suggestedMl).toBeLessThanOrEqual(300);
    const small = estimateNextHydration({
      remainingMl: 60,
      lastIntakeAt: now,
      lastAmountMl: 200,
      now,
      cutoff,
    })!;
    expect(small.suggestedMl).toBe(60);
  });
});
