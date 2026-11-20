import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "./ShareButton";

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  });
});

describe("ShareButton", () => {
  it("abre as opções e monta o link do WhatsApp com o produto", async () => {
    render(<ShareButton title="Whey" text="Olha o Whey" path="/loja" />);
    fireEvent.click(screen.getByRole("button", { name: /Compartilhar: Whey/ }));
    const wa = screen.getByRole("menuitem", { name: /WhatsApp/ });
    expect(wa.getAttribute("href")).toContain(
      "wa.me/?text=" + encodeURIComponent("Olha o Whey ").slice(0, 10),
    );
    expect(wa.getAttribute("href")).toContain(encodeURIComponent("/loja"));
  });
  it("fecha com Esc", async () => {
    render(<ShareButton title="Whey" text="x" />);
    fireEvent.click(screen.getByRole("button", { name: /Compartilhar/ }));
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("usa a folha nativa quando o aparelho é touch", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
    });
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    render(<ShareButton title="Whey" text="x" />);
    fireEvent.click(screen.getByRole("button", { name: /Compartilhar/ }));
    expect(share).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
