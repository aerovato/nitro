import { describe, it, expect } from "vitest";
import { isHeadlessContext } from "../../src/headless/tty";

describe("isHeadlessContext (v1: --headless flag only)", () => {
  it("returns true when --headless is set", () => {
    expect(
      isHeadlessContext({
        flags: { headless: true, tty: false, yes: false },
        stdinIsTTY: true,
      }),
    ).toBe(true);
  });

  it("returns false when no flags set even with stdinIsTTY=false (autodetect arrives in branch 3)", () => {
    expect(
      isHeadlessContext({
        flags: { headless: false, tty: false, yes: false },
        stdinIsTTY: false,
      }),
    ).toBe(false);
  });

  it("returns false when --tty overrides --headless", () => {
    expect(
      isHeadlessContext({
        flags: { headless: true, tty: true, yes: false },
        stdinIsTTY: false,
      }),
    ).toBe(false);
  });
});
