import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...r }: any) => (
    <a href={to} {...r}>
      {children}
    </a>
  ),
}));
import { PartnersPage } from "./PartnersPage";

describe("PartnersPage", () => {
  it("exige nome e WhatsApp antes de enviar", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<PartnersPage />);
    fireEvent.click(screen.getByRole("button", { name: /Enviar pelo WhatsApp/ }));
    expect(screen.getByRole("alert").textContent).toMatch(/nome/i);
    expect(open).not.toHaveBeenCalled();
  });
  it("abre o WhatsApp com os dados da enquete", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<PartnersPage />);
    fireEvent.change(screen.getByLabelText(/Seu nome/), { target: { value: "Maria" } });
    fireEvent.change(screen.getByLabelText(/WhatsApp com DDD/), {
      target: { value: "68999990000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar pelo WhatsApp/ }));
    expect(open).toHaveBeenCalledOnce();
    const url = String(open.mock.calls[0][0]);
    expect(url).toContain("wa.me/5568992031340");
    expect(decodeURIComponent(url)).toContain("Nome: Maria");
  });
});
