import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GoalCelebration, GoalFxProvider, goalFxItem, useGoalFx, type FxItem } from "./GoalFx";
import type { GoalResult } from "@/lib/day-metrics";

const goal = (patch: Partial<GoalResult>): GoalResult => ({ metric: "hidratacao", label: "Hidratação", unit: "ml", target: 2500, actual: 2600, pct: 104, status: "atingida", rule: "", monotonic: true, ...patch });
const item = (kind: "hit" | "miss", patch: Partial<GoalResult> = {}): FxItem => ({ ...goalFxItem(goal(patch), kind, "2026-11-16"), id: `${kind}-1` });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("avisos de meta", () => {
  it("celebra a meta atingida com o resultado e sem pedir observação", () => {
    render(<GoalCelebration item={item("hit")} onClose={() => undefined} />);
    expect(screen.getByRole("status").textContent).toContain("Meta de hidratação atingida!");
    expect(screen.queryByText(/Observação registrada/)).toBeNull();
  });

  it("explica o que faltou e avisa que a observação foi registrada quando a meta não é atingida", () => {
    render(<GoalCelebration item={item("miss", { status: "nao_atingida", actual: 1450, pct: 58 })} onClose={() => undefined} />);
    const text = screen.getByRole("status").textContent ?? "";
    expect(text).toContain("Meta de hidratação não atingida");
    expect(text).toContain("Faltaram 1.050 ml em 16/11/2026.");
    expect(text).toContain("Observação registrada no seu histórico");
  });

  it("fecha pelo botão, pela tecla Esc e sozinho depois de alguns segundos", () => {
    vi.useFakeTimers();
    const close = vi.fn();
    render(<GoalCelebration item={item("hit")} onClose={close} />);
    fireEvent.click(screen.getByLabelText("Fechar aviso"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(close).toHaveBeenCalledTimes(2);
    act(() => { vi.advanceTimersByTime(8000); });
    expect(close).toHaveBeenCalledTimes(3);
  });

  it("mostra um aviso por vez, sem repetir o mesmo", () => {
    function Trigger() {
      const fx = useGoalFx();
      return <button onClick={() => { fx.push(goalFxItem(goal({}), "hit", "2026-11-16")); fx.push(goalFxItem(goal({}), "hit", "2026-11-16")); fx.push(goalFxItem(goal({ metric: "sono", unit: "h", target: 8, actual: 5, pct: 63, status: "nao_atingida" }), "miss", "2026-11-16")); }}>disparar</button>;
    }
    render(<GoalFxProvider><Trigger /></GoalFxProvider>);
    fireEvent.click(screen.getByText("disparar"));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toContain("Meta de hidratação atingida!");
    fireEvent.click(screen.getByLabelText("Fechar aviso"));
    expect(screen.getByRole("status").textContent).toContain("Meta de sono não atingida");
    fireEvent.click(screen.getByLabelText("Fechar aviso"));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
