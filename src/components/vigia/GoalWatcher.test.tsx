import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { GoalWatcher } from "./GoalWatcher";
import { GoalFxProvider } from "./GoalFx";
import { emptyRaw } from "@/lib/day-metrics";

const mocks = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn(), auth: { getUser: vi.fn() } } }));
vi.mock("@/lib/period-data", async (importActual) => ({ ...(await importActual<typeof import("@/lib/period-data")>()), loadPeriodRaw: mocks.load, saveGoalReviews: mocks.save }));

const prefs = { objective: "equilibrio", weightKg: 80, kcal: null, protein: null, carbs: null, fat: null, targetWeightKg: null };
const waterRaw = (day: string, ml: number) => {
  const raw = emptyRaw();
  raw.water.push({ at: `${day}T10:00:00-05:00`, ml });
  raw.waterGoals.push({ day, target: 2500, consumed: ml, status: "em_andamento" });
  return { raw, prefs, warnings: [] };
};
const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 25)); });
const mount = (revision: number) => <GoalFxProvider><GoalWatcher patientId="p1" ownerId="o1" waterTarget={2500} revision={revision} /></GoalFxProvider>;

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-17T15:00:00-05:00"));
  mocks.save.mockResolvedValue({ saved: 1, error: false });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("observador de metas", () => {
  it("registra a observação da meta não atingida de ontem uma única vez e mostra a animação", async () => {
    mocks.load.mockResolvedValue(waterRaw("2026-11-16", 1200));
    const view = render(mount(0));
    await flush();
    expect(mocks.save).toHaveBeenCalledTimes(1);
    const items = mocks.save.mock.calls[0][2] as { day: string; goal: { metric: string; status: string; actual: number } }[];
    expect(items).toContainEqual(expect.objectContaining({ day: "2026-11-16", goal: expect.objectContaining({ metric: "hidratacao", status: "nao_atingida", actual: 1200 }) }));
    expect(screen.getByRole("status").textContent).toContain("Meta de hidratação não atingida");
    expect(screen.getByRole("status").textContent).toContain("Observação registrada no seu histórico");

    // Uma nova atualização do painel não repete a gravação nem o aviso.
    view.rerender(mount(1));
    await flush();
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("nv-fx-miss:p1:2026-11-16|hidratacao")).toBe("1");
  });

  it("não grava de novo o que o banco já tem registrado", async () => {
    const data = waterRaw("2026-11-16", 1200);
    data.raw.reviews.push({ day: "2026-11-16", metric: "hidratacao", status: "nao_atingida", target: 2500, actual: 1200, unit: "ml", observation: "já registrada" });
    mocks.load.mockResolvedValue(data);
    render(mount(0));
    await flush();
    const saved = (mocks.save.mock.calls[0]?.[2] ?? []) as { goal: { metric: string } }[];
    expect(saved.some((item) => item.goal.metric === "hidratacao")).toBe(false);
  });

  it("celebra só quando a meta é cruzada com o aplicativo aberto, nunca ao abrir a página", async () => {
    mocks.load.mockResolvedValueOnce(waterRaw("2026-11-17", 2000)).mockResolvedValueOnce(waterRaw("2026-11-17", 2600));
    const view = render(mount(0));
    await flush();
    expect(screen.queryByRole("status")).toBeNull();
    view.rerender(mount(1));
    await flush();
    expect(screen.getByRole("status").textContent).toContain("Meta de hidratação atingida!");
    expect(mocks.save).toHaveBeenCalled(); // a conquista também fica no histórico
  });

  it("não celebra uma meta que já estava atingida quando a página abriu", async () => {
    mocks.load.mockResolvedValue(waterRaw("2026-11-17", 2600));
    const view = render(mount(0));
    await flush();
    view.rerender(mount(1));
    await flush();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
