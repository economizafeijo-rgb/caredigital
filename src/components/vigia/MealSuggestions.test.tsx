import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { MealSuggestions } from "./MealSuggestions";

function Harness() {
  const [text, setText] = useState("");
  return (
    <>
      <MealSuggestions
        title="Sugestões"
        items={[
          { label: "Banana", text: "1 banana" },
          { label: "Ovo", text: "2 ovos cozidos" },
        ]}
        description={text}
        onChange={setText}
      />
      <output data-testid="out">{text}</output>
    </>
  );
}

describe("MealSuggestions", () => {
  it("adiciona e remove sugestões da descrição", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Banana" }));
    fireEvent.click(screen.getByRole("button", { name: "Ovo" }));
    expect(screen.getByTestId("out").textContent).toBe("1 banana, 2 ovos cozidos");
    fireEvent.click(screen.getByRole("button", { name: "Banana" }));
    expect(screen.getByTestId("out").textContent).toBe("2 ovos cozidos");
  });

  it("o ícone (i) abre macros, vitaminas e minerais sem alterar a descrição", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Informações nutricionais de Banana" }));
    const card = screen.getByRole("region", { name: /Informações nutricionais: Banana/ });
    expect(card.textContent).toMatch(/Calorias/);
    expect(card.textContent).toMatch(/Proteínas/);
    expect(card.textContent).toMatch(/Vitamina C/);
    expect(card.textContent).toMatch(/Potássio/);
    expect(screen.getByTestId("out").textContent).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Fechar informações" }));
    expect(screen.queryByRole("region", { name: /Informações nutricionais: Banana/ })).toBeNull();
  });
});
