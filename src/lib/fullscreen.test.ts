import { describe, expect, it } from "vitest";
import { fullscreenSupported, isFullscreen } from "./fullscreen";

describe("tela cheia", () => {
  it("não quebra em ambientes sem suporte", () => {
    expect(typeof fullscreenSupported()).toBe("boolean");
    expect(isFullscreen()).toBe(false);
  });
});
