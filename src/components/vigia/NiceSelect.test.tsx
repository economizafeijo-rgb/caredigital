import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NiceSelect } from "./NiceSelect";

function Demo() {
  const [v, setV] = useState("a");
  return (
    <>
      <NiceSelect
        ariaLabel="Categoria"
        value={v}
        onChange={setV}
        options={[
          { value: "a", label: "Água" },
          { value: "b", label: "Chá" },
        ]}
      />
      <output>{v}</output>
    </>
  );
}

describe("NiceSelect", () => {
  it("abre a lista, troca a opção e fecha", () => {
    render(<Demo />);
    fireEvent.click(screen.getByRole("combobox", { name: "Categoria" }));
    fireEvent.click(screen.getByRole("option", { name: /Chá/ }));
    expect(screen.getByRole("status").textContent).toBe("b");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
  it("fecha com Esc sem mudar o valor", () => {
    render(<Demo />);
    fireEvent.click(screen.getByRole("combobox", { name: "Categoria" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("a");
  });
});
