import { describe, it, expect } from "vitest";
import { isHeadlessContext } from "../../src/headless/tty";

describe("isHeadlessContext", () => {
  it("returns true when --headless is set", () => {
    expect(
      isHeadlessContext({
        flags: { headless: true, tty: false, yes: false },
        stdinIsTTY: true,
      }),
    ).toBe(true);
  });

  it("returns true when stdin is not a TTY (no flags)", () => {
    expect(
      isHeadlessContext({
        flags: { headless: false, tty: false, yes: false },
        stdinIsTTY: false,
      }),
    ).toBe(true);
  });

  it("returns false when stdin is a TTY (no flags)", () => {
    expect(
      isHeadlessContext({
        flags: { headless: false, tty: false, yes: false },
        stdinIsTTY: true,
      }),
    ).toBe(false);
  });

  it("--tty forces TUI even when stdin is not a TTY (escape hatch)", () => {
    expect(
      isHeadlessContext({
        flags: { headless: false, tty: true, yes: false },
        stdinIsTTY: false,
      }),
    ).toBe(false);
  });

  it("--tty wins over --headless if both are set", () => {
    expect(
      isHeadlessContext({
        flags: { headless: true, tty: true, yes: false },
        stdinIsTTY: false,
      }),
    ).toBe(false);
  });
});
