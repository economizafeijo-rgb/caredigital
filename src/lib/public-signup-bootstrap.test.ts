import { describe, expect, it } from "vitest";
import { parseSignupMetadata } from "./public-signup-bootstrap";

const user = (metadata: Record<string, unknown>) =>
  ({
    id: "00000000-0000-0000-0000-000000000001",
    email: "ana@example.com",
    user_metadata: metadata,
  }) as any;

describe("public signup bootstrap metadata", () => {
  it("parses validated registration metadata", () => {
    expect(
      parseSignupMetadata(
        user({
          nextvita_signup: {
            fullName: " Ana Silva ",
            cpf: "529.982.247-25",
            phone: "+55 (68) 99999-1234",
            birthDate: "1990-02-28",
            weightKg: 70,
            heightCm: 170,
          },
        }),
      ),
    ).toEqual({
      fullName: "Ana Silva",
      cpf: "52998224725",
      phone: "68999991234",
      birthDate: "1990-02-28",
      weightKg: 70,
      heightCm: 170,
    });
  });

  it("rejects incomplete or invalid metadata", () => {
    expect(
      parseSignupMetadata(
        user({
          nextvita_signup: {
            fullName: "Ana",
            cpf: "11111111111",
            phone: "68",
            birthDate: "2990-01-01",
            weightKg: 70,
            heightCm: 170,
          },
        }),
      ),
    ).toBeNull();
  });
});
