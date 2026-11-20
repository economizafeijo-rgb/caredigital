import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { emptyRaw } from "@/lib/day-metrics";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(async () => ({ data: "2026-11-17T12:00:00Z", error: null })),
  insert: vi.fn(async () => ({ error: null })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: mocks.rpc,
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } } })) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { target_ml: 2500 } }) }) }),
      insert: mocks.insert,
    }),
  },
}));
vi.mock("@/lib/period-data", async () => {
  const actual = await vi.importActual<typeof import("@/lib/period-data")>("@/lib/period-data");
  return {
    ...actual,
    loadPeriodRaw: vi.fn(async () => ({
      raw: emptyRaw(),
      prefs: {
        objective: null,
        weightKg: 80,
        kcal: null,
        protein: null,
        carbs: null,
        fat: null,
        targetWeightKg: null,
      },
      warnings: [],
    })),
  };
});

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  mocks.rpc.mockClear();
  mocks.insert.mockClear();
});
afterEach(() => cleanup());

async function openLive() {
  const { LiveModeButton } = await import("./LiveMode");
  render(<LiveModeButton patientId="p1" ownerId="o1" heightCm={175} name="Teste" />);
  fireEvent.click(screen.getByRole("button", { name: /Abrir painel ao vivo/ }));
  await screen.findByRole("button", { name: "Registrar 250 ml de água" });
}

describe("modo ao vivo: nada é gravado sem confirmação", () => {
  it("água: pede confirmação, cancelar não grava e confirmar grava", async () => {
    await openLive();
    fireEvent.click(screen.getByRole("button", { name: "Registrar 250 ml de água" }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Registrar 250 ml de água" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar registro" }));
    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith(
        "care_log_unscheduled_intake",
        expect.objectContaining({ p_amount_ml: 250 }),
      ),
    );
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("água com outro valor: Enter no campo não grava", async () => {
    await openLive();
    fireEvent.click(screen.getByRole("button", { name: /Outro valor/ }));
    const input = screen.getByLabelText("Quantidade de água em ml");
    fireEvent.change(input, { target: { value: "300" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("peso: pede confirmação antes de gravar", async () => {
    await openLive();
    fireEvent.change(screen.getByLabelText("Peso de hoje em kg"), { target: { value: "80,5" } });
    fireEvent.click(screen.getByRole("button", { name: /Registrar peso de hoje/ }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    expect(mocks.insert).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(mocks.insert).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Registrar peso de hoje/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar registro" }));
    await waitFor(() =>
      expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ weight_kg: 80.5 })),
    );
  });
});
