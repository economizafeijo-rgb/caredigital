import { describe, expect, it } from "vitest";
import { currentStreak, fillDays, withTrend } from "@/components/vigia/SectionInsights";

describe("gráficos por área", () => {
  it("preenche dias sem registro com zero, em ordem", () => {
    const rows = fillDays(new Map([["2026-11-14", { a: 500, b: 0 }]]), 3, "2026-11-15");
    expect(rows.map(r => r.day)).toEqual(["2026-11-13", "2026-11-14", "2026-11-15"]);
    expect(rows.map(r => r.a)).toEqual([0, 500, 0]);
  });
  it("conta a sequência atual, tolerando hoje ainda vazio", () => {
    const mk = (values: number[]) => values.map((a, i) => ({ day: String(i), a, b: 0 }));
    expect(currentStreak(mk([0, 1, 1, 1]))).toBe(3);
    expect(currentStreak(mk([1, 1, 1, 0]))).toBe(3);
    expect(currentStreak(mk([1, 0, 1, 0]))).toBe(1);
    expect(currentStreak(mk([0, 0, 0, 0]))).toBe(0);
  });
  it("calcula a linha de tendência como média móvel de 3 dias", () => {
    const rows = withTrend([3, 6, 9, 0].map((a, i) => ({ day: String(i), a, b: 0 })));
    expect(rows.map(r => r.t)).toEqual([3, 4.5, 6, 5]);
  });
});
