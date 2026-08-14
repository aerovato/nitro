import type {
  AssistantModelMessage,
  ModelMessage,
  ToolCallPart,
  ToolModelMessage,
} from "ai";
import { Text } from "ink";
import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";

import { ChatConfigContext } from "../src/components/ChatConfigContext";
import { MessageList } from "../src/components/Message";
import type { ProviderInfoWithName } from "../src/logic/provider";
import { DEFAULT_SETTINGS } from "../src/logic/settings";

const provider: ProviderInfoWithName = {
  name: "test",
  apiKey: "test",
  baseURL: "http://test",
  model: "test",
  apiType: "openai-compatible",
};

function normalize(frame: string | undefined): string[] {
  return (
    (frame ?? "")
      // eslint-disable-next-line no-control-regex
      .replace(/\x1B\[[0-9;]*[A-Za-z]/g, "")
      .split("\n")
      .map(line => line.trimEnd())
  );
}

function renderMessages(
  messages: ModelMessage[],
  showThinking: boolean,
  assistantFooter: React.ReactNode = null,
): string[] {
  const result = render(
    <ChatConfigContext.Provider
      value={{
        provider,
        settings: {
          ...DEFAULT_SETTINGS,
          showThinking,
          showCommandOutput: true,
        },
        systemPrompt: "",
      }}
    >
      <MessageList messages={messages} assistantFooter={assistantFooter} />
    </ChatConfigContext.Provider>,
  );
  return normalize(result.lastFrame());
}

function bashCall(toolCallId: string): ToolCallPart {
  return {
    type: "tool-call",
    toolCallId,
    toolName: "Bash",
    input: {},
  };
}

function bashResult(toolCallId: string): ToolModelMessage {
  return {
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId,
        toolName: "Bash",
        output: {
          type: "json",
          value: {
            command: "pwd",
            approved: true,
            commandOutput: "out:\t/root/project",
            exitCode: 0,
          },
        },
      },
    ],
  };
}

describe("message spacing", () => {
  it("hides user turns and borders assistant parts", () => {
    const assistant: AssistantModelMessage = {
      role: "assistant",
      content: [
        { type: "reasoning", text: "Thinking" },
        { type: "text", text: "Answer" },
      ],
    };

    expect(
      renderMessages([{ role: "user", content: "Request" }, assistant], true),
    ).toEqual(["│  Thinking", "│  Answer"]);
  });

  it("keeps tool activity inside one assistant turn", () => {
    const messages: ModelMessage[] = [
      { role: "user", content: "Request" },
      {
        role: "assistant",
        content: [{ type: "text", text: "Checking" }, bashCall("call-1")],
      },
      bashResult("call-1"),
      { role: "assistant", content: [{ type: "text", text: "Finished" }] },
    ];

    expect(renderMessages(messages, false)).toEqual([
      "│  Checking",
      "│  Bash: pwd",
      "│",
      "│  /root/project",
      "│  Finished",
    ]);
  });

  it("does not render phantom tool-call or hidden-reasoning rows", () => {
    const messages: ModelMessage[] = [
      { role: "user", content: "Request" },
      { role: "assistant", content: [bashCall("call-1")] },
      {
        role: "assistant",
        content: [{ type: "reasoning", text: "Hidden" }],
      },
    ];

    expect(
      renderMessages(messages, false, <Text>Running Bash...</Text>),
    ).toEqual(["Running Bash..."]);
  });
});
