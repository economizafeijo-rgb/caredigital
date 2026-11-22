import { describe, expect, it } from "vitest";
import { estimateNextHydration, planHydrationSchedule } from "./hydration-goal";

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

describe("planHydrationSchedule: plano até o horário-limite", () => {
  const cutoff = Date.parse("2026-11-11T20:00:00-05:00");
  const check = (r: ReturnType<typeof planHydrationSchedule>, from: number) => {
    // nunca mais que 500 ml em qualquer janela de 1 h
    r.doses.forEach((d) => {
      const win = r.doses.filter((o) => o.at > d.at - 3_600_000 && o.at <= d.at);
      expect(win.reduce((s, o) => s + o.ml, 0)).toBeLessThanOrEqual(500 + 1);
      expect(d.at).toBeGreaterThanOrEqual(from);
      expect(d.at).toBeLessThanOrEqual(cutoff);
    });
  };
  it("meta que cabe: termina antes do limite com doses de 100 a 300 ml", () => {
    const now = Date.parse("2026-11-11T14:00:00-05:00");
    const r = planHydrationSchedule({
      remainingMl: 1000,
      lastIntakeAt: now - 30 * 60_000,
      lastAmountMl: 250,
      now,
      cutoff,
    });
    expect(r.reachable).toBe(true);
    expect(r.unreachableMl).toBe(0);
    expect(r.doses.reduce((s, d) => s + d.ml, 0)).toBeGreaterThanOrEqual(990);
    r.doses.forEach((d) => {
      expect(d.ml).toBeGreaterThanOrEqual(10);
      expect(d.ml).toBeLessThanOrEqual(300);
    });
    check(r, now);
  });
  it("atrasado demais: não compensa de uma vez e informa o que não cabe", () => {
    const now = Date.parse("2026-11-11T18:30:00-05:00");
    const r = planHydrationSchedule({
      remainingMl: 2000,
      lastIntakeAt: now - 3 * 3_600_000,
      lastAmountMl: 250,
      now,
      cutoff,
    });
    expect(r.reachable).toBe(false);
    expect(r.unreachableMl).toBeGreaterThan(900);
    check(r, now);
  });
  it("com pouco tempo até o limite o intervalo é calculado a partir de agora", () => {
    const now = Date.parse("2026-11-11T17:00:00-05:00");
    const r = estimateNextHydration({
      remainingMl: 750,
      lastIntakeAt: now - 4 * 3_600_000,
      lastAmountMl: 250,
      now,
      cutoff,
    })!;
    // 3 h restantes para 3 porções: nunca mais de 60 min entre os copos.
    expect(r.intervalMin).toBeLessThanOrEqual(60);
  });
});
