// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClientBeverageTracker } from "./ClientBeverageTracker";
import { DialogProvider } from "@/lib/dialog";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
      }),
    }),
  },
}));
afterEach(() => cleanup());

const open = () =>
  render(
    <DialogProvider>
      <ClientBeverageTracker patientId="p1" ownerId="o1" revision={0} />
    </DialogProvider>,
  );

describe("Chás e bebidas", () => {
  it("tem campo de busca e acha Água com limão", () => {
    open();
    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: "limão" } });
    expect(screen.getByRole("button", { name: "Escolher Água com limão" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Escolher Água com limão inteiro" })).toBeTruthy();
  });

  it("escolher uma bebida preenche nome e volume e mostra as calorias", () => {
    open();
    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: "graviola" } });
    fireEvent.click(screen.getByRole("button", { name: "Escolher Suco de graviola" }));
    expect((screen.getByLabelText("Nome da bebida") as HTMLInputElement).value).toMatch(/graviola/i);
    expect(screen.getByText(/kcal/).textContent).toMatch(/\d+ kcal/);
    expect(screen.getByRole("button", { name: /Registrar bebida agora/ })).toBeTruthy();
  });
});
