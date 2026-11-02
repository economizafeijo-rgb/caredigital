import { describe, expect, it } from "vitest";
import { clientSectionFromHash, clientSectionHash, clientSectionLabels } from "./client-pages";

describe("CareDigital: páginas independentes do cliente",()=>{
  it("mapeia os cinco menus em endereços de seção únicos",()=>{
    const sections=["hoje","agenda","hidratacao","historico","alimentacao"] as const;
    const hashes=sections.map(clientSectionHash);
    expect(new Set(hashes).size).toBe(5);
    for(const section of sections)expect(clientSectionFromHash(clientSectionHash(section))).toBe(section);
  });
  it("abre visão geral em endereços sem seção reconhecida",()=>{
    expect(clientSectionFromHash("")).toBe("hoje");
    expect(clientSectionFromHash("#desconhecido")).toBe("hoje");
  });
  it("páginas possuem títulos e descrições próprios",()=>{
    const sections=["hoje","agenda","hidratacao","historico","alimentacao"] as const;
    for(const section of sections){
      expect(clientSectionLabels[section].title.length).toBeGreaterThan(4);
      expect(clientSectionLabels[section].subtitle.length).toBeGreaterThan(20);
      expect(clientSectionLabels[section].tagline).toBeTruthy();
    }
  });
});
