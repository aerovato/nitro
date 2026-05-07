import { describe, it, expect, vi, beforeEach } from "vitest";
import { CaptureStream } from "./helpers";

vi.mock("../../src/logic/settings", async () => {
  const actual: object = await vi.importActual("../../src/logic/settings");
  return { ...actual, loadSettings: vi.fn(), isEulaAgreed: vi.fn() };
});
vi.mock("../../src/logic/llm", async () => {
  const actual: object = await vi.importActual("../../src/logic/llm");
  return { ...actual, getDefaultChatProvider: vi.fn() };
});

import { loadSettings, isEulaAgreed } from "../../src/logic/settings";
import { getDefaultChatProvider } from "../../src/logic/llm";
import { preflight } from "../../src/headless/runHeadless";

const mockedLoadSettings = vi.mocked(loadSettings);
const mockedIsEulaAgreed = vi.mocked(isEulaAgreed);
const mockedGetProvider = vi.mocked(getDefaultChatProvider);

beforeEach(() => {
  vi.clearAllMocks();
  mockedLoadSettings.mockReturnValue({} as never);
});

describe("preflight", () => {
  it("returns ok=true when EULA accepted and provider configured", () => {
    mockedIsEulaAgreed.mockReturnValue(true);
    mockedGetProvider.mockReturnValue({ name: "openai" } as never);
    const out = new CaptureStream(),
      err = new CaptureStream();
    const result = preflight({ stdout: out, stderr: err });
    expect(result.ok).toBe(true);
    expect(err.text()).toBe("");
  });

  it("returns ok=false + writes EULA message + exitCode 1 when EULA not agreed", () => {
    mockedIsEulaAgreed.mockReturnValue(false);
    mockedGetProvider.mockReturnValue({ name: "openai" } as never);
    const out = new CaptureStream(),
      err = new CaptureStream();
    const result = preflight({ stdout: out, stderr: err });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.exitCode).toBe(1);
    expect(err.text()).toContain("EULA not yet accepted");
    expect(err.text()).toContain("Run 'nitro' interactively");
  });

  it("returns ok=false + writes provider hint + exitCode 1 when no default provider", () => {
    mockedIsEulaAgreed.mockReturnValue(true);
    mockedGetProvider.mockReturnValue(null);
    const out = new CaptureStream(),
      err = new CaptureStream();
    const result = preflight({ stdout: out, stderr: err });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.exitCode).toBe(1);
    expect(err.text()).toContain("Default provider not configured");
    expect(err.text()).toContain("nitro provider add");
  });

  it("checks EULA before provider (EULA error wins if both fail)", () => {
    mockedIsEulaAgreed.mockReturnValue(false);
    mockedGetProvider.mockReturnValue(null);
    const out = new CaptureStream(),
      err = new CaptureStream();
    preflight({ stdout: out, stderr: err });
    expect(err.text()).toContain("EULA not yet accepted");
    expect(err.text()).not.toContain("provider add");
  });
});
