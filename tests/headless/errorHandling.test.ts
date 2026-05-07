import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CaptureStream } from "./helpers";

vi.mock("../../src/logic/settings", () => ({
  loadSettings: () => ({ maxOutputTokens: 1000, reasoningEffort: "med" }),
  isEulaAgreed: () => true,
  getSystemPrompt: () => "system",
}));
vi.mock("../../src/logic/llm", () => ({
  getDefaultChatProvider: () => ({ name: "mock" }),
  generateCompletion: vi.fn(() => {
    const e = new Error("boom");
    e.stack = "Error: boom\n    at fake\n";
    throw e;
  }),
}));

import { runHeadless } from "../../src/headless/runHeadless";

describe("runHeadless error handling", () => {
  let originalDebug: string | undefined;

  beforeEach(() => {
    originalDebug = process.env.DEBUG;
  });
  afterEach(() => {
    if (originalDebug === undefined) delete process.env.DEBUG;
    else process.env.DEBUG = originalDebug;
  });

  it("hides stack by default", async () => {
    delete process.env.DEBUG;
    const out = new CaptureStream(),
      err = new CaptureStream();
    const code = await runHeadless({
      request: "x",
      yes: false,
      streams: { stdout: out, stderr: err },
    });
    expect(code).toBe(1);
    expect(err.text()).toContain("nitro: boom");
    expect(err.text()).not.toContain("at fake");
  });

  it("shows stack when DEBUG=1", async () => {
    process.env.DEBUG = "1";
    const out = new CaptureStream(),
      err = new CaptureStream();
    const code = await runHeadless({
      request: "x",
      yes: false,
      streams: { stdout: out, stderr: err },
    });
    expect(code).toBe(1);
    expect(err.text()).toContain("nitro: boom");
    expect(err.text()).toContain("at fake");
  });
});
