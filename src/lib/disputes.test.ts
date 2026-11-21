import { describe, expect, it } from "vitest";
import {
  canOpenDispute,
  disputeReasonLabel,
  disputeStatusLabel,
  validateDescription,
  validateRefund,
} from "./disputes";

const DAY = 86_400_000;

describe("canOpenDispute", () => {
  const created = new Date("2026-10-01T12:00:00Z");
  it("aceita no último instante da janela de 30 dias", () => {
    const now = new Date(created.getTime() + 30 * DAY);
    expect(canOpenDispute(created.toISOString(), "entregue", now)).toEqual({ ok: true });
  });
  it("recusa após a janela de 30 dias", () => {
    const now = new Date(created.getTime() + 30 * DAY + 60_000);
    const r = canOpenDispute(created.toISOString(), "entregue", now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/prazo/i);
  });
  it("recusa pedido cancelado", () => {
    const r = canOpenDispute(created.toISOString(), "cancelado", created);
    expect(r.ok).toBe(false);
  });
});

describe("validateDescription", () => {
  it("recusa texto curto depois do trim", () => {
    expect(validateDescription("  curto  ")).not.toBeNull();
  });
  it("aceita 10 caracteres úteis", () => {
    expect(validateDescription("   dez letras  ")).toBeNull();
  });
  it("recusa mais de 1000 caracteres", () => {
    expect(validateDescription("a".repeat(1001))).not.toBeNull();
  });
});

describe("validateRefund", () => {
  it("aceita reembolso parcial igual ao total", () => {
    expect(validateRefund(10000, "reembolso_parcial", 10000)).toBeNull();
  });
  it("recusa reembolso parcial acima do total", () => {
    expect(validateRefund(10000, "reembolso_parcial", 10001)).not.toBeNull();
  });
  it("recusa reembolso parcial zero ou vazio", () => {
    expect(validateRefund(10000, "reembolso_parcial", 0)).not.toBeNull();
    expect(validateRefund(10000, "reembolso_parcial", null)).not.toBeNull();
  });
  it("aceita reembolso total e recusa sem valor", () => {
    expect(validateRefund(10000, "reembolso_total", null)).toBeNull();
    expect(validateRefund(10000, "recusada", null)).toBeNull();
  });
});

describe("rótulos", () => {
  it("traduz status e motivos", () => {
    expect(disputeStatusLabel("aberta")).toBe("Aguardando a loja");
    expect(disputeReasonLabel("nao_entregue")).toBe("Não recebi o pedido");
  });
});
