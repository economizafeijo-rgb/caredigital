import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CookingTimer } from "./CookingTimer";

describe("CookingTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("mostra o ovo cozido e inicia a contagem", () => {
    render(<CookingTimer patientId="p1" />);
    expect(screen.getByRole("heading", { name: "Ovo cozido" })).toBeTruthy();
    expect(screen.getByRole("timer").textContent).toBe("11:00");
    fireEvent.click(screen.getByRole("button", { name: /gema mole/i }));
    expect(screen.getByRole("timer").textContent).toBe("06:00");
    fireEvent.click(screen.getByRole("button", { name: /iniciar timer/i }));
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByRole("timer").textContent).toBe("05:55");
    fireEvent.click(screen.getByRole("button", { name: /pausar/i }));
    expect(screen.getByText("Pausado")).toBeTruthy();
  });

  it("avisa quando o tempo termina", () => {
    render(<CookingTimer patientId="p2" />);
    fireEvent.click(screen.getByRole("button", { name: /gema mole/i }));
    fireEvent.click(screen.getByRole("button", { name: /iniciar timer/i }));
    act(() => {
      vi.advanceTimersByTime(6 * 60_000 + 500);
    });
    expect(screen.getByRole("alert").textContent).toMatch(/Ovo cozido pronto/);
  });
});
