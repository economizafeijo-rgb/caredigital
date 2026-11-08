import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const internalStyles = readFileSync(new URL("../components/vigia/internal-premium.css", import.meta.url), "utf8");

describe("CareDigital semantic design tokens", () => {
  it("defines the approved light theme from semantic variables", () => {
    expect(styles).toMatch(/--background:\s*#f4f7f6/);
    expect(styles).toMatch(/--foreground:\s*#20343a/);
    expect(styles).toMatch(/--primary:\s*#1c6665/);
    expect(styles).toMatch(/--border:\s*#dce6e3/);
    expect(styles).toMatch(/--ring:\s*#278b83/);
  });

  it("defines a matching dark semantic theme", () => {
    expect(styles).toMatch(/:root\.dark\s*\{[^}]*--background:\s*#172327/s);
    expect(styles).toMatch(/:root\.dark\s*\{[^}]*--surface:\s*#202f34/s);
    expect(styles).toMatch(/:root\.dark\s*\{[^}]*--primary:\s*#8dd7c7/s);
    expect(styles).toMatch(/:root\.dark\s*\{[^}]*--ring:\s*#a5e7d9/s);
  });

  it("keeps internal workspaces on the global semantic theme contract", () => {
    expect(internalStyles).not.toMatch(/--(?:background|foreground|surface|card|primary|muted|border|ring)\s*:/);
    expect(internalStyles).toContain("var(--foreground)");
    expect(internalStyles).toContain("var(--primary)");
  });

  it("provides visible focus and reduced-motion support globally", () => {
    expect(styles).toContain(":focus-visible");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
