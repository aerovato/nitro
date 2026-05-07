import { describe, it, expect, vi, beforeEach } from "vitest";
import { CaptureStream } from "./helpers";

vi.mock("../../src/logic/settings", () => ({
  loadSettings: () => ({ maxOutputTokens: 1000, reasoningEffort: "med" }),
  isEulaAgreed: () => true,
  getSystemPrompt: () => "system prompt",
}));
vi.mock("../../src/logic/llm", () => ({
  getDefaultChatProvider: () => ({
    name: "mock",
    apiType: "openai-compatible",
  }),
  generateCompletion: vi.fn(),
}));
vi.mock("../../src/tools/bash", async () => {
  const actual: object = await vi.importActual("../../src/tools/bash");
  return {
    ...actual,
    bashTool: {
      ...(actual as { bashTool: object }).bashTool,
      execute: vi.fn(),
    },
  };
});

import { generateCompletion } from "../../src/logic/llm";
import { bashTool } from "../../src/tools/bash";
import { runHeadless } from "../../src/headless/runHeadless";

const mockedGenerate = vi.mocked(generateCompletion);
/* eslint-disable-next-line @typescript-eslint/unbound-method -- vi.mocked with
   shallow=true is needed to spy on bashTool.execute without losing the mock
   setup in vi.mock(). The method is never called with a wrong `this`. */
const mockedExecute = vi.mocked(bashTool.execute, true);

/**
 * Build a fake streamText() return value.
 *
 * The real AI SDK returns an object with fullStream (async generator),
 * response (Promise), toolCalls (Promise), and usage (Promise).
 * We mock just enough for the headless loop to consume.
 */
function fakeResult(opts: {
  toolCalls?: { toolCallId: string; toolName: string; args: string }[];
  text?: string;
}) {
  const messages = [{ role: "assistant" as const, content: opts.text ?? "" }];
  return {
    fullStream: (async function* () {
      /* no-op drain */
    })(),
    response: Promise.resolve({ messages }),
    toolCalls: Promise.resolve(opts.toolCalls ?? []),
    usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runHeadless", () => {
  it("returns 0 and writes Answer when model emits text without tool calls", async () => {
    mockedGenerate.mockReturnValue(fakeResult({ text: "Hello" }));
    const out = new CaptureStream(),
      err = new CaptureStream();

    const code = await runHeadless({
      request: "hi",
      yes: false,
      streams: { stdout: out, stderr: err },
    });

    expect(code).toBe(0);
    expect(out.text()).toContain("Answer: Hello");
  });

  it("auto-runs a Read Only tool call without --yes", async () => {
    mockedGenerate
      .mockReturnValueOnce(
        fakeResult({
          toolCalls: [
            {
              toolCallId: "1",
              toolName: "Bash",
              args: JSON.stringify({
                command: "ls",
                explanation: "list",
                riskLevel: "Read Only",
                behaviorTags: ["Safe"],
                timeout: 30000,
              }),
            },
          ],
        }),
      )
      .mockReturnValueOnce(fakeResult({ text: "Done." }));
    mockedExecute.mockResolvedValue({
      command: "ls",
      approved: true,
      commandOutput: "out:\tfile1\nout:\tfile2",
      exitCode: 0,
    });

    const out = new CaptureStream(),
      err = new CaptureStream();
    const code = await runHeadless({
      request: "list",
      yes: false,
      streams: { stdout: out, stderr: err },
    });

    expect(code).toBe(0);
    expect(mockedExecute).toHaveBeenCalledTimes(1);
    expect(out.text()).toContain("$ ls");
    expect(out.text()).toContain("file1");
    expect(out.text()).toContain("file2");
    expect(out.text()).toContain("Answer: Done.");
    expect(err.text()).toContain("[risk: Read Only");
  });

  it("refuses a Dangerous tool call without --yes and exits 2", async () => {
    mockedGenerate.mockReturnValue(
      fakeResult({
        toolCalls: [
          {
            toolCallId: "1",
            toolName: "Bash",
            args: JSON.stringify({
              command: "rm -rf /tmp/x",
              explanation: "wipe",
              riskLevel: "Dangerous",
              behaviorTags: ["Delete"],
              timeout: 30000,
            }),
          },
        ],
      }),
    );

    const out = new CaptureStream(),
      err = new CaptureStream();
    const code = await runHeadless({
      request: "wipe",
      yes: false,
      streams: { stdout: out, stderr: err },
    });

    expect(code).toBe(2);
    expect(mockedExecute).not.toHaveBeenCalled();
    expect(err.text()).toContain("Refused: rm -rf /tmp/x (Dangerous)");
    expect(err.text()).toContain("--yes");
  });

  it("auto-runs Dangerous when --yes is set", async () => {
    mockedGenerate
      .mockReturnValueOnce(
        fakeResult({
          toolCalls: [
            {
              toolCallId: "1",
              toolName: "Bash",
              args: JSON.stringify({
                command: "rm /tmp/x",
                explanation: "delete",
                riskLevel: "Dangerous",
                behaviorTags: ["Delete"],
                timeout: 30000,
              }),
            },
          ],
        }),
      )
      .mockReturnValueOnce(fakeResult({ text: "Removed." }));
    mockedExecute.mockResolvedValue({
      command: "rm /tmp/x",
      approved: true,
      commandOutput: "",
      exitCode: 0,
    });

    const out = new CaptureStream(),
      err = new CaptureStream();
    const code = await runHeadless({
      request: "delete",
      yes: true,
      streams: { stdout: out, stderr: err },
    });

    expect(code).toBe(0);
    expect(mockedExecute).toHaveBeenCalledTimes(1);
  });

  it("chains multiple tool calls across turns", async () => {
    mockedGenerate
      .mockReturnValueOnce(
        fakeResult({
          toolCalls: [
            {
              toolCallId: "1",
              toolName: "Bash",
              args: JSON.stringify({
                command: "ls",
                explanation: "1",
                riskLevel: "Read Only",
                behaviorTags: ["Safe"],
                timeout: 30000,
              }),
            },
          ],
        }),
      )
      .mockReturnValueOnce(
        fakeResult({
          toolCalls: [
            {
              toolCallId: "2",
              toolName: "Bash",
              args: JSON.stringify({
                command: "pwd",
                explanation: "2",
                riskLevel: "Read Only",
                behaviorTags: ["Safe"],
                timeout: 30000,
              }),
            },
          ],
        }),
      )
      .mockReturnValueOnce(fakeResult({ text: "Both done." }));
    mockedExecute
      .mockResolvedValueOnce({
        command: "ls",
        approved: true,
        commandOutput: "out:\tfile",
        exitCode: 0,
      })
      .mockResolvedValueOnce({
        command: "pwd",
        approved: true,
        commandOutput: "out:\t/home",
        exitCode: 0,
      });

    const out = new CaptureStream(),
      err = new CaptureStream();
    const code = await runHeadless({
      request: "do two",
      yes: false,
      streams: { stdout: out, stderr: err },
    });

    expect(code).toBe(0);
    expect(mockedExecute).toHaveBeenCalledTimes(2);
    expect(out.text()).toMatch(/\$ ls[\s\S]*\$ pwd[\s\S]*Answer: Both done\./);
  });

  it("returns 1 with stderr message when generateCompletion throws", async () => {
    mockedGenerate.mockImplementation(() => {
      throw new Error("API rate limit exceeded");
    });

    const out = new CaptureStream(),
      err = new CaptureStream();
    const code = await runHeadless({
      request: "hi",
      yes: false,
      streams: { stdout: out, stderr: err },
    });

    expect(code).toBe(1);
    expect(err.text()).toContain("rate limit");
  });

  // Amendment 6: max-turn guard
  it("stops at max turns and returns 1 when model keeps requesting tool calls", async () => {
    // Always return a tool call -- the model never converges to an answer
    mockedGenerate.mockReturnValue(
      fakeResult({
        toolCalls: [
          {
            toolCallId: "loop",
            toolName: "Bash",
            args: JSON.stringify({
              command: "echo loop",
              explanation: "loop",
              riskLevel: "Read Only",
              behaviorTags: ["Safe"],
              timeout: 30000,
            }),
          },
        ],
      }),
    );
    mockedExecute.mockResolvedValue({
      command: "echo loop",
      approved: true,
      commandOutput: "out:\tloop",
      exitCode: 0,
    });

    const out = new CaptureStream(),
      err = new CaptureStream();
    const code = await runHeadless({
      request: "keep going",
      yes: false,
      streams: { stdout: out, stderr: err },
    });

    expect(code).toBe(1);
    expect(err.text()).toContain("Max turns");
    expect(err.text()).toContain("NITRO_MAX_TURNS");
    // Default max is 20, so generateCompletion should be called exactly 20 times
    expect(mockedGenerate).toHaveBeenCalledTimes(20);
  });
});
