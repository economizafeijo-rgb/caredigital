import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pub = join(process.cwd(), "public");
const manifest = JSON.parse(readFileSync(join(pub, "manifest.webmanifest"), "utf8"));
const onDisk = (src: string) => existsSync(join(pub, src.replace(/^\//, "")));

describe("PWA", () => {
  it("manifesto cumpre os critérios de instalação", () => {
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.name && manifest.short_name).toBeTruthy();
    const sizes = manifest.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toContain("192x192:any");
    expect(sizes).toContain("512x512:any");
    expect(sizes).toContain("512x512:maskable");
  });
  it("todos os ícones, atalhos e capturas existem em public/", () => {
    const files = [...manifest.icons, ...manifest.screenshots, ...manifest.shortcuts.flatMap((s: { icons: unknown[] }) => s.icons)] as { src: string }[];
    for (const f of files) expect(onDisk(f.src), f.src).toBe(true);
    expect(manifest.screenshots.some((s: { form_factor: string }) => s.form_factor === "wide")).toBe(true);
    expect(manifest.screenshots.some((s: { form_factor: string }) => s.form_factor === "narrow")).toBe(true);
  });
  it("service worker guarda a casca e nunca dados de saúde", () => {
    const sw = readFileSync(join(pub, "sw.js"), "utf8");
    expect(sw).toContain("/offline.html");
    expect(sw).toContain("origin !== self.location.origin");
  });
});
