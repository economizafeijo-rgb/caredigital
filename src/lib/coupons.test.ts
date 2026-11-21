import { describe, expect, it } from "vitest";
import {
  acreDateTime,
  buildCouponPayload,
  couponErrorMessage,
  couponStatusLabel,
  discountLabel,
  normalizeCode,
  type CouponForm,
} from "./coupons";

const base: CouponForm = {
  code: "mae10",
  kind: "percent",
  value: "10",
  startDate: "2026-05-01",
  endDate: "2026-05-10",
  minOrder: "",
  maxUses: "",
  perCustomer: "1",
  scope: "loja",
  productIds: [],
};

describe("normalizeCode", () => {
  it("maiúsculo e sem espaços", () => {
    expect(normalizeCode("  mae 10 ")).toBe("MAE10");
  });
});

describe("acreDateTime", () => {
  it("fim do dia no horário do Acre", () => {
    expect(acreDateTime("2026-05-10", true)).toBe("2026-05-10T23:59:59-05:00");
    expect(acreDateTime("2026-05-01", false)).toBe("2026-05-01T00:00:00-05:00");
  });
});

describe("buildCouponPayload", () => {
  it("monta payload de cupom percentual", () => {
    const r = buildCouponPayload(base);
    expect(r).toEqual({
      ok: true,
      payload: {
        code: "MAE10",
        kind: "percent",
        value: 10,
        starts_at: "2026-05-01T00:00:00-05:00",
        ends_at: "2026-05-10T23:59:59-05:00",
        min_order_cents: 0,
        max_uses: null,
        per_customer_limit: 1,
        scope: "loja",
        product_ids: [],
      },
    });
  });

  it("converte valor fixo em centavos e aceita vírgula", () => {
    const r = buildCouponPayload({ ...base, kind: "fixed", value: "15,5", minOrder: "100" });
    expect(r.ok && r.payload.value).toBe(1550);
    expect(r.ok && r.payload.min_order_cents).toBe(10000);
  });

  it("recusa percentual fora de 1 a 90", () => {
    expect(buildCouponPayload({ ...base, value: "0" }).ok).toBe(false);
    expect(buildCouponPayload({ ...base, value: "91" }).ok).toBe(false);
    expect(buildCouponPayload({ ...base, value: "10.5" }).ok).toBe(false);
  });

  it("recusa fixo menor que R$ 1,00", () => {
    const r = buildCouponPayload({ ...base, kind: "fixed", value: "0,50" });
    expect(r).toEqual({ ok: false, error: "Desconto fixo de pelo menos R$ 1,00." });
  });

  it("recusa código inválido", () => {
    expect(buildCouponPayload({ ...base, code: "ab" }).ok).toBe(false);
    expect(buildCouponPayload({ ...base, code: "MAE-10" }).ok).toBe(false);
  });

  it("recusa fim antes do início", () => {
    expect(buildCouponPayload({ ...base, endDate: "2026-04-30" }).ok).toBe(false);
  });

  it("recusa escopo produtos sem produto", () => {
    expect(buildCouponPayload({ ...base, scope: "produtos" }).ok).toBe(false);
  });

  it("zera product_ids quando o escopo é loja", () => {
    const r = buildCouponPayload({ ...base, productIds: ["x"] });
    expect(r.ok && r.payload.product_ids).toEqual([]);
  });

  it("limite de usos vazio vira null; zero é recusado", () => {
    expect(buildCouponPayload({ ...base, maxUses: "" }).ok && true).toBe(true);
    expect(buildCouponPayload({ ...base, maxUses: "0" }).ok).toBe(false);
  });
});

describe("discountLabel", () => {
  it("percentual e fixo", () => {
    expect(discountLabel("percent", 10)).toBe("10% de desconto");
    expect(discountLabel("fixed", 1500)).toBe("R$ 15,00 de desconto");
  });
});

describe("couponStatusLabel", () => {
  const start = "2026-05-01T00:00:00-05:00";
  const end = "2026-05-10T23:59:59-05:00";
  const during = Date.parse("2026-05-05T12:00:00-05:00");
  it("respeita pausa e encerramento antes do período", () => {
    expect(couponStatusLabel("pausado", start, end, during)).toBe("Pausado");
    expect(couponStatusLabel("encerrado", start, end, during)).toBe("Encerrado");
  });
  it("calcula agendado, ativo e vencido", () => {
    expect(couponStatusLabel("ativo", start, end, Date.parse("2026-04-20T00:00:00-05:00"))).toBe(
      "Agendado",
    );
    expect(couponStatusLabel("ativo", start, end, during)).toBe("Ativo");
    expect(couponStatusLabel("ativo", start, end, Date.parse("2026-05-20T00:00:00-05:00"))).toBe(
      "Vencido",
    );
  });
});

describe("couponErrorMessage", () => {
  it("traduz motivos conhecidos", () => {
    expect(couponErrorMessage("ERROR: Coupon: expired")).toBe("Este cupom já venceu.");
    expect(couponErrorMessage("Coupon: min_order")).toMatch(/valor mínimo/);
  });
  it("usa texto genérico para erro desconhecido", () => {
    expect(couponErrorMessage("boom")).toBe("Não foi possível aplicar o cupom.");
  });
});
