import { describe, it, expect } from "vitest";
import { parseFlags } from "../../src/headless/flags";

describe("parseFlags", () => {
  it("recognizes --headless and strips it", () => {
    expect(parseFlags(["--headless", "find files"])).toEqual({
      flags: { headless: true, tty: false, yes: false },
      remaining: ["find files"],
    });
  });

  it("recognizes --tty and strips it", () => {
    expect(parseFlags(["--tty", "find files"])).toEqual({
      flags: { headless: false, tty: true, yes: false },
      remaining: ["find files"],
    });
  });

  it("recognizes --yes and strips it", () => {
    expect(parseFlags(["--yes", "find files"])).toEqual({
      flags: { headless: false, tty: false, yes: true },
      remaining: ["find files"],
    });
  });

  it("recognizes flags in any order, multiple at once", () => {
    expect(parseFlags(["--yes", "--headless", "find files"])).toEqual({
      flags: { headless: true, tty: false, yes: true },
      remaining: ["find files"],
    });
    expect(parseFlags(["--headless", "find files", "--yes"])).toEqual({
      flags: { headless: true, tty: false, yes: true },
      remaining: ["find files"],
    });
  });

  it("returns empty flags + identical argv when no flags present", () => {
    expect(parseFlags(["help"])).toEqual({
      flags: { headless: false, tty: false, yes: false },
      remaining: ["help"],
    });
    expect(parseFlags([])).toEqual({
      flags: { headless: false, tty: false, yes: false },
      remaining: [],
    });
  });
});
