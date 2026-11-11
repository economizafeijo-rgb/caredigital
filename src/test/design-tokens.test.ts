import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
const componentDir = resolve(process.cwd(), "src/components/vigia");

describe("CareDigital semantic design tokens", () => {
  it("defines the light theme from semantic variables", () => {
    expect(styles).toMatch(/:root\s*\{[^}]*--background:\s*#f5f7fb/s);
    expect(styles).toMatch(/:root\s*\{[^}]*--primary:\s*#1f5eff/s);
  });

  it("defines a matching dark semantic theme", () => {
    expect(styles).toMatch(/:root\.dark\s*\{[^}]*--background:\s*#0a1120/s);
    expect(styles).toMatch(/:root\.dark\s*\{[^}]*--primary:\s*#6b9bff/s);
  });

  it("keeps a single source of theme tokens", () => {
    // Só o alerta de relógio mantém folha própria; ele não redefine tokens globais.
    const sheets = readdirSync(componentDir).filter((name) => name.endsWith(".css"));
    expect(sheets).toEqual(["care-clock-alert.css"]);
    const alert = readFileSync(resolve(componentDir, "care-clock-alert.css"), "utf8");
    expect(alert).not.toMatch(
      /--(?:background|foreground|surface|card|primary|muted|border|ring)\s*:/,
    );
  });

  it("provides visible focus and reduced-motion support globally", () => {
    expect(styles).toContain(":focus-visible");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
