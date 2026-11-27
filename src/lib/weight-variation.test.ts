import { describe, expect, it } from "vitest";
import { signed, weightVariation } from "./weight-variation";

const pts = (list: [string, number][]) => list.map(([date, kg]) => ({ date, kg }));

describe("variação do peso entre medidas", () => {
  it("calcula a diferença, a porcentagem, os dias e o acumulado de cada medida", () => {
    const { rows } = weightVariation(
      pts([
        ["2026-11-01", 90],
        ["2026-11-08", 89],
        ["2026-11-10", 89.4],
      ]),
    );
    expect(rows[0]).toMatchObject({ delta: null, days: null, cumulative: 0 });
    expect(rows[1]).toMatchObject({ delta: -1, pct: -1.11, days: 7, perWeek: -1, cumulative: -1 });
    expect(rows[2]).toMatchObject({ delta: 0.4, days: 2, perWeek: null, cumulative: -0.6 }); // 2 dias: sem ritmo semanal
  });

  it("resume total, ritmo, maior queda, maior alta e a sequência", () => {
    const { summary } = weightVariation(
      pts([
        ["2026-11-01", 90],
        ["2026-11-08", 89],
        ["2026-11-15", 88.2],
        ["2026-11-22", 88.9],
        ["2026-11-29", 87.5],
      ]),
    );
    expect(summary.total).toBe(-2.5);
    expect(summary.totalPct).toBe(-2.78);
    expect(summary.spanDays).toBe(28);
    expect(summary.perWeek).toBe(-0.63);
    expect(summary.biggestDrop).toEqual({ delta: -1.4, date: "2026-11-29" });
    expect(summary.biggestRise).toEqual({ delta: 0.7, date: "2026-11-22" });
    expect(summary.trend).toBe("down");
    expect(summary.avgGapDays).toBe(7);
    expect(summary.streak).toEqual({ direction: "down", count: 1 });
  });

  it("conta medidas seguidas na mesma direção", () => {
    const { summary } = weightVariation(
      pts([
        ["2026-11-01", 90],
        ["2026-11-03", 89.5],
        ["2026-11-05", 89],
        ["2026-11-07", 88.4],
      ]),
    );
    expect(summary.streak).toEqual({ direction: "down", count: 3 });
  });

  it("não inventa ritmo com período curto nem tendência sem medidas suficientes", () => {
    expect(
      weightVariation(
        pts([
          ["2026-11-01", 80],
          ["2026-11-03", 79],
        ]),
      ).summary.perWeek,
    ).toBeNull();
    const one = weightVariation(pts([["2026-11-01", 80]]));
    expect(one.summary.total).toBeNull();
    expect(one.summary.trend).toBeNull();
    expect(weightVariation([]).rows).toEqual([]);
  });

  it("variação mínima (abaixo de 0,3%) conta como estável e ignora valores inválidos", () => {
    expect(
      weightVariation(
        pts([
          ["2026-11-01", 80],
          ["2026-11-08", 80.1],
        ]),
      ).summary.trend,
    ).toBe("flat");
    expect(
      weightVariation(
        pts([
          ["2026-11-01", 80],
          ["2026-11-02", Number.NaN],
          ["2026-11-03", 79],
        ]),
      ).rows,
    ).toHaveLength(2);
  });

  it("ordena por data e formata o sinal em pt-BR", () => {
    expect(
      weightVariation(
        pts([
          ["2026-11-08", 79],
          ["2026-11-01", 80],
        ]),
      ).rows[0].date,
    ).toBe("2026-11-01");
    expect(signed(-1.25, 1)).toBe("↓ 1,3");
    expect(signed(0.4)).toBe("↑ 0,4");
    expect(signed(0)).toBe("0,0");
  });
});
