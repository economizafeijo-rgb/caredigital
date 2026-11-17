import { describe, expect, it } from "vitest";
import { QR_MATRIX, QR_URLS, type QrVariant } from "./qr-data";

describe("QR Codes do NextVita", () => {
  for (const variant of Object.keys(QR_URLS) as QrVariant[]) {
    it(`${variant}: matriz quadrada, só 0 e 1, com os três cantos de posição`, () => {
      const rows = QR_MATRIX[variant];
      const n = rows.length;
      expect(n).toBeGreaterThanOrEqual(21);
      expect(rows.every((r) => r.length === n && /^[01]+$/.test(r))).toBe(true);
      expect(rows[0].startsWith("1111111")).toBe(true); // canto superior esquerdo
      expect(rows[0].endsWith("1111111")).toBe(true); // canto superior direito
      expect(rows[n - 1].startsWith("1111111")).toBe(true); // canto inferior esquerdo
    });
    it(`${variant}: aponta para o site do NextVita`, () => { expect(QR_URLS[variant]).toMatch(/^https:\/\/www\.nextvita\.life\//); });
  }
});
