import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AssistantModelMessage, ToolCallPart } from "ai";

import { runAgentTurn } from "../src/logic/agent";
import { generateCompletion } from "../src/logic/llm";
import type { ProviderInfoWithName } from "../src/logic/provider";
import { DEFAULT_SETTINGS } from "../src/logic/settings";

vi.mock("../src/logic/llm", () => ({
  generateCompletion: vi.fn(),
}));

const mockGenerateCompletion = vi.mocked(generateCompletion);

const provider: ProviderInfoWithName = {
  name: "test",
  apiKey: "test",
  baseURL: "http://test",
  model: "test",
  apiType: "openai-compatible",
};

type StreamPart =
  | { type: "text-delta"; text: string }
  | { type: "reasoning-delta"; text: string };

interface FakeCompletion {
  parts?: StreamPart[];
  assistantMessages?: AssistantModelMessage[];
  toolCalls?: ToolCallPart[];
}

function fakeCompletion({
  parts = [],
  assistantMessages = [],
  toolCalls = [],
}: FakeCompletion) {
  return {
    fullStream: (async function* () {
      await Promise.resolve();
      for (const part of parts) {
        yield part;
      }
    })(),
    response: Promise.resolve({ messages: assistantMessages }),
    toolCalls: Promise.resolve(toolCalls),
    usage: Promise.resolve(undefined),
  };
}

const bashCall = (
  toolCallId: string,
  input: Record<string, unknown>,
): ToolCallPart => ({
  type: "tool-call",
  toolCallId,
  toolName: "Bash",
  input: input as never,
});

describe("runAgentTurn", () => {
  beforeEach(() => {
    mockGenerateCompletion.mockReset();
  });

  it("streams deltas and returns history without tool calls", async () => {
    const assistant: AssistantModelMessage = {
      role: "assistant",
      content: [{ type: "text", text: "Hello" }],
    };
    mockGenerateCompletion.mockReturnValueOnce(
      fakeCompletion({
        parts: [
          { type: "reasoning-delta", text: "hmm" },
          { type: "text-delta", text: "Hello" },
        ],
        assistantMessages: [assistant],
      }) as never,
    );

    const events = [];
    const generator = runAgentTurn(
      { provider, settings: DEFAULT_SETTINGS, systemPrompt: "test" },
      [{ role: "user", content: "hi" }],
    );
    let step = await generator.next();
    while (!step.done) {
      events.push(step.value);
      step = await generator.next();
    }

    expect(events).toEqual([
      { type: "reasoning-delta", text: "hmm" },
      { type: "text-delta", text: "Hello" },
      { type: "assistant-message", message: assistant },
    ]);
    expect(step.value).toEqual([{ role: "user", content: "hi" }, assistant]);
  });

  it("auto-approves read-only bash calls and feeds results back to the model", async () => {
    const toolCallAssistant: AssistantModelMessage = {
      role: "assistant",
      content: [],
    };
    const finalAssistant: AssistantModelMessage = {
      role: "assistant",
      content: [{ type: "text", text: "done" }],
    };
    mockGenerateCompletion
      .mockReturnValueOnce(
        fakeCompletion({
          assistantMessages: [toolCallAssistant],
          toolCalls: [
            bashCall("call-1", {
              command: "ls",
              explanation: "List files.",
              behaviorTags: [],
              riskLevel: "Read Only",
              timeout: 30000,
            }),
          ],
        }) as never,
      )
      .mockReturnValueOnce(
        fakeCompletion({
          parts: [{ type: "text-delta", text: "done" }],
          assistantMessages: [finalAssistant],
        }) as never,
      );

    const events = [];
    const generator = runAgentTurn(
      { provider, settings: DEFAULT_SETTINGS, systemPrompt: "test" },
      [{ role: "user", content: "list files" }],
    );
    let step = await generator.next();
    while (!step.done) {
      events.push(step.value);
      step = await generator.next();
    }

    // Second model call receives the tool result in its history
    const secondCallMessages = mockGenerateCompletion.mock.calls[1]?.[1];
    expect(secondCallMessages).toHaveLength(3);
    expect(secondCallMessages?.[2]).toMatchObject({ role: "tool" });

    // Auto-approved: no tool-prompt event, but running label and result exist
    const types = events.map(event => (event as { type: string }).type);
    expect(types).toContain("tool-running");
    expect(types).not.toContain("tool-prompt");
    const toolResult = events.find(event => event.type === "tool-result");
    expect(toolResult).toMatchObject({
      result: {
        toolCallId: "call-1",
        toolName: "Bash",
        output: { type: "json" },
      },
    });
    expect(step.value).toHaveLength(4);
  });

  it("prompts the user for non-read-only calls and uses their response", async () => {
    const assistant: AssistantModelMessage = { role: "assistant", content: [] };
    mockGenerateCompletion.mockReturnValueOnce(
      fakeCompletion({
        assistantMessages: [assistant],
        toolCalls: [
          bashCall("call-2", {
            command: "rm file.txt",
            explanation: "Delete file.",
            behaviorTags: ["Delete"],
            riskLevel: "Dangerous",
            timeout: 30000,
          }),
        ],
      }) as never,
    );

    const generator = runAgentTurn(
      { provider, settings: DEFAULT_SETTINGS, systemPrompt: "test" },
      [{ role: "user", content: "delete" }],
    );

    let step = await generator.next();
    expect(step.value).toMatchObject({ type: "assistant-message" });
    step = await generator.next();
    expect(step.done).toBe(false);
    expect(step.value).toMatchObject({
      type: "tool-prompt",
      prompt: { toolCallId: "call-2", toolName: "Bash" },
    });

    const afterInput = await generator.next({
      approved: false,
      rejectionMessage: "no",
    });
    expect(afterInput.done).toBe(false);
    expect(afterInput.value).toMatchObject({
      type: "tool-result",
      result: {
        output: {
          type: "json",
          value: { approved: false, rejectionMessage: "no" },
        },
      },
    });
  });

  it("returns an error result for unknown tools", async () => {
    const assistant: AssistantModelMessage = { role: "assistant", content: [] };
    mockGenerateCompletion.mockReturnValueOnce(
      fakeCompletion({
        assistantMessages: [assistant],
        toolCalls: [
          {
            type: "tool-call",
            toolCallId: "call-3",
            toolName: "NotATool",
            input: {},
          },
        ],
      }) as never,
    );

    const generator = runAgentTurn(
      { provider, settings: DEFAULT_SETTINGS, systemPrompt: "test" },
      [{ role: "user", content: "hi" }],
    );

    await generator.next();
    const step = await generator.next();
    expect(step.done).toBe(false);
    expect(step.value).toMatchObject({
      type: "tool-result",
      result: { output: { type: "error-json" } },
    });
  });
});
