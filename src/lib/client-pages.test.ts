import { describe, expect, it } from "vitest";
import { clientSectionFromHash, clientSectionHash, clientSectionLabels, type ClientSection } from "./client-pages";

const sections:ClientSection[]=["hoje","agenda","hidratacao","historico","alimentacao","cardapios","medicacao","atividade","indicadores"];

describe("CareDigital: páginas independentes do cliente",()=>{
  it("mapeia cada seção em um endereço único",()=>{
    const hashes=sections.map(clientSectionHash);
    expect(new Set(hashes).size).toBe(sections.length);
    for(const section of sections)expect(clientSectionFromHash(clientSectionHash(section))).toBe(section);
  });
  it("abre visão geral em endereços sem seção reconhecida",()=>{
    expect(clientSectionFromHash("")).toBe("hoje");
    expect(clientSectionFromHash("#desconhecido")).toBe("hoje");
  });
  it("retorna à visão geral quando o hash contém codificação inválida",()=>{
    expect(clientSectionFromHash("#%E0%A4%A")).toBe("hoje");
  });
  it("cada seção possui título, descrição e identificador próprios",()=>{
    for(const section of sections){
      expect(clientSectionLabels[section].title.length).toBeGreaterThan(4);
      expect(clientSectionLabels[section].subtitle.length).toBeGreaterThan(20);
      expect(clientSectionLabels[section].tagline).toBeTruthy();
    }
  });
});
