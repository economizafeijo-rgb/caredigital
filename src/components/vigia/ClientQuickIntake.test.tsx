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

  it("Bebidas: mesmo modelo dos alimentos, com cartões, outras bebidas e informações (i)", () => {
    open("drink");
    fireEvent.click(document.querySelector('[data-intake-kind="cafe"]') as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Escolher Café com leite em pó" }));
    expect((screen.getByLabelText("Nome da bebida") as HTMLInputElement).value).toBe(
      "Café com leite em pó",
    );
    // outras bebidas continuam à mão, sem prender à categoria
    fireEvent.click(screen.getByRole("button", { name: "Escolher Suco de graviola" }));
    expect((screen.getByLabelText("Nome da bebida") as HTMLInputElement).value).toBe(
      "Suco de graviola",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Informações nutricionais de Suco de graviola" }),
    );
    expect(screen.getByRole("button", { name: /Registrar agora/ })).toBeTruthy();
  });

  it("Bebidas: a busca acha bebida de qualquer tipo", () => {
    open("drink");
    fireEvent.change(screen.getByPlaceholderText("Buscar bebida…"), {
      target: { value: "cerveja" },
    });
    expect(screen.getByRole("button", { name: /Escolher Cerveja/ })).toBeTruthy();
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

  it("trocar entre Alimentos e Bebidas, ou de categoria, não apaga o que foi escolhido", async () => {
    render(
      <DialogProvider>
        <ClientQuickIntake patientId="p1" mode="all" />
      </DialogProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Registrar/ }));
    fireEvent.change(screen.getByLabelText(/O que você comeu/), {
      target: { value: "Arroz 100 g" },
    });
    // troca de refeição: mantém o prato
    fireEvent.click(document.querySelector('[data-intake-kind="jantar"]') as HTMLElement);
    expect((screen.getByLabelText(/O que você comeu/) as HTMLTextAreaElement).value).toBe(
      "Arroz 100 g",
    );
    // vai para bebidas, escolhe uma e volta: prato continua lá
    fireEvent.click(screen.getByRole("button", { name: /Bebidas/ }));
    fireEvent.click(screen.getByRole("button", { name: "Escolher Suco de graviola" }));
    // o resumo consolidado mostra a refeição E a bebida, em qualquer aba
    const summary = screen.getByLabelText("Resumo do registro");
    expect(summary.textContent).toContain("2 itens");
    expect(summary.textContent).toContain("Soma do registro");
    expect(summary.textContent).toMatch(/Arroz/);
    expect(summary.textContent).toMatch(/graviola/i);
    fireEvent.click(screen.getByRole("button", { name: /Alimentos/ }));
    expect((screen.getByLabelText(/O que você comeu/) as HTMLTextAreaElement).value).toBe(
      "Arroz 100 g",
    );
    fireEvent.click(screen.getByRole("button", { name: /Bebidas/ }));
    expect((screen.getByLabelText("Nome da bebida") as HTMLInputElement).value).toMatch(
      /graviola/i,
    );
  });

  it("pergunta qual refeição é na confirmação, já sugerida", async () => {
    render(
      <DialogProvider>
        <ClientQuickIntake patientId="p1" mode="all" />
      </DialogProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Registrar/ }));
    fireEvent.change(screen.getByLabelText(/O que você comeu/), {
      target: { value: "Arroz 100 g" },
    });
    fireEvent.click(document.querySelector('[data-intake-kind="jantar"]') as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: /Registrar agora/ }));
    expect(await screen.findByText("Confirmar registro?")).toBeTruthy();
    const chooser = screen.getByRole("group", { name: "Qual refeição é esta?" });
    const pressed = Array.from(chooser.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-pressed") === "true",
    );
    expect(pressed?.textContent).toBe("Jantar");
    expect(chooser.textContent).toContain("Café da manhã");
  });

  it("aceita café com leite junto com a comida no prato do café da manhã", async () => {
    render(
      <DialogProvider>
        <ClientQuickIntake patientId="p1" mode="all" />
      </DialogProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Registrar/ }));
    fireEvent.change(screen.getByLabelText(/O que você comeu/), {
      target: {
        value: "Café com leite (meio a meio) 70 ml, biscoito salgado tipo cream cracker 40 g",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /Registrar agora/ }));
    expect(await screen.findByText("Confirmar registro?")).toBeTruthy();
  });

  it("aceita qualquer bebida junto com a comida no prato", async () => {
    render(
      <DialogProvider>
        <ClientQuickIntake patientId="p1" mode="all" />
      </DialogProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Registrar/ }));
    fireEvent.change(screen.getByLabelText(/O que você comeu/), {
      target: { value: "Arroz 100 g, suco de laranja 300 ml" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Registrar agora/ }));
    expect(await screen.findByText("Confirmar registro?")).toBeTruthy();
  });
});
