import { describe, expect, it } from "vitest";
import { explicit } from "./PlateBuilder";
import { mealCombos, typicalFoods } from "@/lib/care-intake-categories";
import { parseFoodText } from "@/lib/food-parser";

describe("explicit (quantidade do prato)", () => {
  it("consegue reescrever a quantidade de todo alimento das sugestões", () => {
    const texts = [
      "BAIÃO DE DOIS",
      ...Object.values(mealCombos).flatMap((l) => l.map((i) => i.text)),
      ...Object.values(typicalFoods).flatMap((l) => l.map((i) => i.text)),
    ];
    const failed: string[] = [];
    for (const text of texts) {
      for (const food of parseFoodText(text)) {
        if (explicit(food, food.grams + 10) === null) failed.push(`${text} → ${food.id}`);
      }
    }
    expect(failed).toEqual([]);
  });
});
