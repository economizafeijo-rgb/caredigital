import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WeightEvolutionChart, WeightVariationPanel } from "./WeightCharts";

beforeAll(() => {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
afterEach(() => cleanup());

const rows = [
  { date: "2026-11-01", label: "01/11", weight: 90, average: 90, bmi: 28, delta: null },
  { date: "2026-11-08", label: "08/11", weight: 89, average: 89.5, bmi: 27.7, delta: -1 },
];

describe("gráficos de peso", () => {
  it("explica que precisa de duas medidas para mostrar a variação", () => {
    render(
      <WeightVariationPanel points={[{ date: "2026-11-01", kg: 90 }]} onPick={() => undefined} />,
    );
    expect(screen.getByText(/pelo menos duas medidas/)).toBeTruthy();
  });

  it("mostra o resumo da variação entre as medidas", () => {
    render(
      <WeightVariationPanel
        points={[
          { date: "2026-11-01", kg: 90 },
          { date: "2026-11-15", kg: 88.5 },
        ]}
        onPick={() => undefined}
      />,
    );
    expect(screen.getByRole("heading", { name: "Variação entre medidas" })).toBeTruthy();
    expect(screen.getByText("Variação total")).toBeTruthy();
    expect(screen.getByText("Maior queda")).toBeTruthy();
    expect(screen.getByText("Em queda")).toBeTruthy();
    expect(screen.getByText(/2 medidas/)).toBeTruthy();
  });

  it("as séries podem ser ligadas e desligadas pelos botões", () => {
    render(
      <WeightVariationPanel
        points={[
          { date: "2026-11-01", kg: 90 },
          { date: "2026-11-15", kg: 88.5 },
        ]}
        onPick={() => undefined}
      />,
    );
    const chip = screen.getByRole("button", { name: "Variação por medida" });
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(chip);
    expect(chip.getAttribute("aria-pressed")).toBe("false");
  });

  it("o gráfico de evolução tem botões para peso, média, faixa e meta", () => {
    const onPick = vi.fn();
    render(<WeightEvolutionChart rows={rows} target={80} healthy={[60, 78]} onPick={onPick} />);
    for (const name of ["Peso", "Média móvel", "Faixa de peso adequado", "Meta"])
      expect(screen.getByRole("button", { name })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Meta" }));
    expect(screen.getByRole("button", { name: "Meta" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("sem meta nem faixa, não mostra esses botões", () => {
    render(
      <WeightEvolutionChart rows={rows} target={null} healthy={null} onPick={() => undefined} />,
    );
    expect(screen.queryByRole("button", { name: "Meta" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Faixa de peso adequado" })).toBeNull();
  });
});
