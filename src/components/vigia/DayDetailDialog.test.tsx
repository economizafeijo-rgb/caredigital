import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DayDetailDialog } from "./DayDetailDialog";
import { GoalFxProvider } from "./GoalFx";
import { emptyRaw } from "@/lib/day-metrics";

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { target_ml: 2500 } }) })) })) })) } }));
vi.mock("@/lib/period-data", async (importActual) => ({ ...(await importActual<typeof import("@/lib/period-data")>()), loadPeriodRaw: mocks.load }));

const prefs = { objective: "equilibrio", weightKg: 80, kcal: 2000, protein: 100, carbs: 250, fat: 60, targetWeightKg: null };
beforeAll(() => { (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }; });
beforeEach(() => {
  mocks.load.mockImplementation(async (_p: string, _o: string, day: string) => {
    const raw = emptyRaw();
    raw.water.push({ at: `${day}T10:00:00-05:00`, ml: 1200 });
    return { raw, prefs, warnings: [] };
  });
});
afterEach(() => cleanup());

const mount = (day: string | null, onClose = vi.fn()) => render(<GoalFxProvider><DayDetailDialog patientId="p" ownerId="o" day={day} onClose={onClose} /></GoalFxProvider>);

describe("Detalhes do dia", () => {
  it("não aparece sem um dia selecionado", () => {
    mount(null);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("abre o dia de 24 horas com as metas, a hidratação e as observações", async () => {
    mount("2026-11-10");
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/terça-feira, 10 de novembro de 2026/i)).toBeTruthy();
    expect(await screen.findByText("Metas do dia")).toBeTruthy();
    expect(screen.getByText("Hidratação nas 24 horas")).toBeTruthy();
    expect(screen.getByText("Observações do dia")).toBeTruthy();
    expect(mocks.load).toHaveBeenCalledWith("p", "o", "2026-11-10", "2026-11-10");
  });

  it("navega para o dia anterior e fecha com Esc ou no botão", async () => {
    const onClose = vi.fn();
    mount("2026-11-10", onClose);
    await screen.findByText("Metas do dia");
    fireEvent.click(screen.getByLabelText("Dia anterior"));
    await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("p", "o", "2026-11-09", "2026-11-09"));
    expect(screen.getByText(/segunda-feira, 9 de novembro de 2026/i)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Fechar detalhes"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("avisa quando o dia não pôde ser carregado", async () => {
    mocks.load.mockRejectedValueOnce(new Error("rede"));
    mount("2026-11-10");
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
