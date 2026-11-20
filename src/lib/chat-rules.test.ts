import { describe, expect, it } from "vitest";
import { computeQueue, validateChatText } from "./chat-rules";

const m = (customer: string, vendor: boolean, at: string, extra = {}) =>
  ({
    id: Math.random().toString(),
    customer_id: customer,
    customer_name: customer,
    from_vendor: vendor,
    created_at: at,
    body: "x",
    ...extra,
  }) as any;

describe("validateChatText", () => {
  it("aceita dúvida comum", () => expect(validateChatText("Tem o whey de 900 g hoje?")).toBeNull());
  it("barra links", () => {
    expect(validateChatText("veja www.loja.com")).not.toBeNull();
    expect(validateChatText("https://x.co/abc")).not.toBeNull();
    expect(validateChatText("meusite.com.br")).not.toBeNull();
  });
  it("barra telefones, mesmo separados", () => {
    expect(validateChatText("me chama 68 99999-0000")).not.toBeNull();
    expect(validateChatText("6 8 9 9 9 9 9 0 0 0 0")).not.toBeNull();
  });
  it("barra redes e e-mail", () => {
    expect(validateChatText("chama no zap")).not.toBeNull();
    expect(validateChatText("@minhaloja")).not.toBeNull();
    expect(validateChatText("a@b.c")).not.toBeNull();
  });
  it("permite preços", () => expect(validateChatText("custa R$ 1.234,56?")).toBeNull());
});

describe("computeQueue", () => {
  const now = Date.parse("2026-11-20T12:00:00Z");
  it("separa atendimento e fila por ordem de chegada", () => {
    const q = computeQueue(
      [
        m("a", false, "2026-11-20T11:50:00Z"),
        m("a", true, "2026-11-20T11:55:00Z"),
        m("b", false, "2026-11-20T11:40:00Z"),
        m("c", false, "2026-11-20T11:45:00Z"),
      ],
      now,
    );
    expect(q.active.map((x) => x.id)).toEqual(["a"]);
    expect(q.waiting.map((x) => x.id)).toEqual(["b", "c"]);
    expect(q.waiting[1].position).toBe(2);
  });
});
