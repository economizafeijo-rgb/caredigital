import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Btn, Field, PageHeader, Panel, Tag } from "@/components/vigia/ui";

describe("shared CareDigital UI primitives", () => {
  it("renders a primary action with a comfortable touch target", () => {
    render(<Btn variant="primary">Salvar alterações</Btn>);
    const button = screen.getByRole("button", { name: "Salvar alterações" });
    expect(button).toHaveClass("min-h-10", "bg-primary", "text-primary-foreground");
  });

  it("keeps disabled actions disabled", () => {
    render(<Btn disabled>Salvar</Btn>);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("renders a semantic section heading and panel content", () => {
    render(
      <Panel title="Resumo">
        <p>Conteúdo do painel</p>
      </Panel>,
    );
    expect(screen.getByRole("heading", { name: "Resumo" })).toBeInTheDocument();
    expect(screen.getByText("Conteúdo do painel")).toBeInTheDocument();
  });

  it("renders page headings and associated field labels", () => {
    render(
      <>
        <PageHeader eyebrow="PAINEL" title="Meu acompanhamento" />
        <Field label="Peso atual">
          <input aria-label="Peso atual" />
        </Field>
      </>,
    );
    expect(screen.getByRole("heading", { name: "Meu acompanhamento" })).toBeInTheDocument();
    expect(screen.getByText("Peso atual")).toBeInTheDocument();
  });

  it("renders status tags with their supplied content", () => {
    render(<Tag tone="success">Confirmado</Tag>);
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
  });
});
