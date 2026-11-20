import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClientQuickIntake } from "./ClientQuickIntake";
import { DialogProvider } from "@/lib/dialog";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));
afterEach(() => cleanup());

const kinds = () =>
  Array.from(document.querySelectorAll("[data-intake-kind]")).map((el) =>
    el.getAttribute("data-intake-kind"),
  );
const groups = () =>
  new Set(
    Array.from(document.querySelectorAll("[data-intake-group]")).map((el) =>
      el.getAttribute("data-intake-group"),
    ),
  );
const open = (mode: "water" | "food" | "drink") => {
  render(
    <DialogProvider>
      <ClientQuickIntake patientId="p1" mode={mode} />
    </DialogProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Registrar (água|refeição|bebida)/ }));
};

describe("registro de consumo por área", () => {
  it("Água: abre direto o formulário de água, sem painéis para escolher", () => {
    open("water");
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Registrar água" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Selecionar tipo de consumo" })).toBeNull();
    expect(kinds()).toEqual([]);
    expect(screen.getByLabelText(/Quantidade consumida/)).toBeTruthy();
  });

  it("Alimentação: mostra só as categorias de alimento, sem as de líquidos", () => {
    open("food");
    expect(screen.getByRole("heading", { name: "Registrar refeição" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Selecionar tipo de consumo" })).toBeNull();
    expect(groups()).toEqual(new Set(["food"]));
    expect(kinds()).toContain("almoco");
    expect(kinds()).not.toContain("cha");
    expect(kinds()).not.toContain("energetico");
    expect(screen.getByText("O que você comeu?")).toBeTruthy();
  });

  it("Bebidas: mostra só as bebidas, sem alimentos", () => {
    open("drink");
    expect(groups()).toEqual(new Set(["beverage"]));
    expect(kinds()).toContain("cha");
    expect(kinds()).not.toContain("almoco");
    expect(screen.getByText("Nome da bebida")).toBeTruthy();
  });

  it("Bebidas: toca numa opção, vê outras com 'Ver todas' e abre as informações (i)", () => {
    open("drink");
    fireEvent.click(document.querySelector('[data-intake-kind="cafe"]') as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Café com leite em pó" }));
    expect((screen.getByLabelText("Nome da bebida") as HTMLInputElement).value).toBe(
      "Café com leite em pó",
    );
    expect(screen.queryByRole("button", { name: "Suco de graviola" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ver todas as bebidas" }));
    fireEvent.click(screen.getByRole("button", { name: "Suco de graviola" }));
    expect((screen.getByLabelText("Nome da bebida") as HTMLInputElement).value).toBe(
      "Suco de graviola",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Informações nutricionais: Suco de graviola" }),
    );
    expect(
      screen.getByRole("region", { name: /Informações nutricionais: Suco de graviola/ }),
    ).toBeTruthy();
  });

  it("Relógio da refeição: abre pelo sinal e pede confirmação com Cancelar", async () => {
    const ui = (n: number) => (
      <DialogProvider>
        <ClientQuickIntake patientId="p1" mode="food" openSignal={n} />
      </DialogProvider>
    );
    const view = render(ui(0));
    view.rerender(ui(1));
    expect(screen.getByRole("heading", { name: "Registrar refeição" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/O que você comeu/), {
      target: { value: "Arroz com feijão e frango" },
    });
    const actions = document.querySelector("[data-intake-actions]") as HTMLElement;
    expect(actions.className).toContain("sticky");
    expect(actions.textContent).toContain("Cancelar");
    fireEvent.click(screen.getByRole("button", { name: /Registrar agora/ }));
    expect(await screen.findByText("Confirmar registro?")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Cancelar" }).length).toBeGreaterThan(1);
    expect(screen.getByRole("button", { name: "Confirmar registro" })).toBeTruthy();
  });
});
