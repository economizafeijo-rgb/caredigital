import { describe, expect, it } from "vitest";
import { storeBlockMessage, STORE_DEVICE_LIMIT } from "./store-devices";

describe("storeBlockMessage", () => {
  it("explica o limite de dispositivos sem culpar o usuário", () => {
    const msg = storeBlockMessage("limit");
    expect(msg).toContain(String(STORE_DEVICE_LIMIT));
    expect(msg).toMatch(/dispositivos/i);
  });
  it("informa o expediente do painel", () => {
    const msg = storeBlockMessage("expediente");
    expect(msg).toMatch(/8h às 17h/);
    expect(msg).toMatch(/sábado/);
  });
  it("não gera mensagem para estados que não bloqueiam", () => {
    expect(storeBlockMessage("ok")).toBeNull();
    expect(storeBlockMessage("not_store")).toBeNull();
    expect(storeBlockMessage("error")).toBeNull();
  });
});
