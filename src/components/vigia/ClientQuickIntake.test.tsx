import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClientQuickIntake } from "./ClientQuickIntake";
import { DialogProvider } from "@/lib/dialog";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));
afterEach(() => cleanup());

const kinds = () => Array.from(document.querySelectorAll("[data-intake-kind]")).map((el) => el.getAttribute("data-intake-kind"));
const groups = () => new Set(Array.from(document.querySelectorAll("[data-intake-group]")).map((el) => el.getAttribute("data-intake-group")));
const open = (mode: "water" | "food" | "drink") => {
  render(<DialogProvider><ClientQuickIntake patientId="p1" mode={mode} /></DialogProvider>);
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
});
