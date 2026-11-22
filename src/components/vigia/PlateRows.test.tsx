// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PlateRows } from "./PlateBuilder";

function Harness({ start }: { start: string }) {
  const [text, setText] = useState(start);
  return (
    <>
      <PlateRows description={text} onDescription={setText} />
      <output data-testid="out">{text}</output>
    </>
  );
}

describe("PlateRows", () => {
  it("mostra uma linha para cada alimento, inclusive de trechos compostos", () => {
    render(<Harness start="arroz 250 g, feijão 210 g, mixto de carnes assadas, ovo cozido 50 g" />);
    expect(screen.getAllByLabelText(/^Quantidade de /)).toHaveLength(6);
  });

  it("edita o peso em tempo real, sem perder o foco ao digitar", () => {
    render(<Harness start="arroz 250 g, mixto de carnes assadas" />);
    const input = screen.getByLabelText(/Quantidade de Linguiça/) as HTMLInputElement;
    input.focus();
    fireEvent.change(input, { target: { value: "90" } });
    expect((screen.getByLabelText(/Quantidade de Linguiça/) as HTMLInputElement).value).toBe("90");
    expect(screen.getByTestId("out").textContent).toContain("90 g");
    expect(screen.getByTestId("out").textContent).toContain("250 g");
  });

  it("remove um alimento de um trecho composto sem apagar os outros", () => {
    render(<Harness start="mixto de carnes assadas" />);
    fireEvent.click(screen.getByLabelText(/Remover Linguiça/));
    expect(screen.getAllByLabelText(/^Quantidade de /)).toHaveLength(2);
  });
});
