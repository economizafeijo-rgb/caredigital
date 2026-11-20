import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { foodKinds } from "@/lib/care-intake-categories";
import { MealBoard } from "./MealBoard";
import { foodVisual } from "./FoodArt";

const noop = () => {};
const render = (kind: (typeof foodKinds)[number]["value"], description = "") =>
  renderToStaticMarkup(
    <MealBoard
      kind={kind}
      onKind={noop}
      description={description}
      onDescription={noop}
      portion=""
      onPortion={noop}
      consumedAt="2026-11-20T08:00"
      onConsumedAt={noop}
      error=""
      saving={false}
      onCancel={noop}
    />,
  );

describe("MealBoard", () => {
  it("não mistura líquidos com alimentos", () => {
    for (const { value } of foodKinds) {
      const html = render(value);
      expect(html).not.toContain("Bebidas que acompanham");
      expect(html).not.toMatch(
        /aria-label="(Adicionar|Remover) (Café|Leite|Suco|Chá|Nescau|Achocolatado)/,
      );
    }
  });
  it("mostra todos os setores coloridos e o prato", () => {
    const html = render("almoco", "arroz, feijão");
    expect(html.match(/data-intake-group="food"/g)?.length).toBe(foodKinds.length);
    expect(html).toContain("Seu prato");
    expect(html).toContain("kcal no prato");
  });
  it("usa imagem genérica quando não reconhece o alimento", () => {
    expect(foodVisual("xyzzy", "xyzzy").generic).toBe(true);
    expect(foodVisual("banana", "Banana").generic).toBe(false);
  });
});
