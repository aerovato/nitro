import * as React from "react";
import type {
  AssistantContent,
  AssistantModelMessage,
  ModelMessage,
  SystemModelMessage,
  ToolCallPart,
  ToolResultPart,
} from "ai";

import type { ProviderInfoWithName } from "../logic/provider";
import type { Settings } from "../logic/settings";
import { generateCompletion, transformInput } from "../logic/llm";
import { saveConversation, loadConversation } from "../logic/conversation";
import { exitWithError } from "../utils";
import { createToolSet } from "../tools";
import { useTokenUsage } from "../components";

export type NonSystemModelMessage = Exclude<ModelMessage, SystemModelMessage>;

export type ChatState =
  | { pending: "user"; messages: NonSystemModelMessage[] }
  | {
      pending: "provider";
      messages: NonSystemModelMessage[];
    }
  | {
      pending: "tool";
      messages: NonSystemModelMessage[];
      toolCalls: ToolCallPart[];
    };

export interface UseChatStateArgs {
  provider: ProviderInfoWithName;
  settings: Settings;
  systemPrompt: string;
  initialFilename?: string;
}

function getInitialMessages(filename?: string): NonSystemModelMessage[] {
  if (!filename) return [];
  const conversation = loadConversation(filename);
  if (!conversation) {
    exitWithError("Error: Failed to load conversation.");
  }
  return conversation.messages as NonSystemModelMessage[];
}

export interface UseChatStateResult {
  state: ChatState;
  submitMessage: (message: string) => boolean;
  submitToolResults: (toolResults: ToolResultPart[]) => boolean;
}

export function useChatState({
  provider,
  settings,
  systemPrompt,
  initialFilename,
}: UseChatStateArgs): UseChatStateResult {
  const [state, setState] = React.useState<ChatState>(() => ({
    pending: "user",
    messages: getInitialMessages(initialFilename),
  }));
  const conversationFilename = React.useRef<string | null>(
    initialFilename ?? null,
  );
  const toolSet = React.useMemo(() => createToolSet(), []);
  const { addUsage } = useTokenUsage();

  const send = React.useCallback(
    async (input: string | ToolResultPart[]) => {
      let completedMessages: NonSystemModelMessage[];
      if (typeof input === "string") {
        completedMessages = [
          ...state.messages,
          { role: "user", content: input },
        ];
      } else if (Array.isArray(input)) {
        completedMessages = [
          ...state.messages,
          { role: "tool", content: input },
        ];
      } else {
        throw new Error("Error: Invalid input to send()");
      }

      const content: Exclude<AssistantContent, string> = [];
      const streamingMessage: AssistantModelMessage = {
        role: "assistant",
        content,
      };

      setState({
        pending: "provider",
        messages: [...completedMessages, streamingMessage],
      });

      try {
        const result = generateCompletion(
          provider,
          completedMessages,
          systemPrompt,
          {
            maxOutputTokens: settings.maxOutputTokens,
            reasoningEffort: settings.reasoningEffort,
          },
          toolSet,
        );

        const appendDelta = (type: "reasoning" | "text", text: string) => {
          const last = content[content.length - 1];
          if (last && last.type === type) {
            content[content.length - 1] = {
              ...last,
              text: last.text + text,
            };
          } else {
            content.push({ type, text });
          }
        };

        for await (const part of result.fullStream) {
          if (part.type === "reasoning-delta") {
            appendDelta("reasoning", part.text);
          } else if (part.type === "text-delta") {
            appendDelta("text", part.text);
          } else {
            continue;
          }
          setState({
            pending: "provider",
            messages: [...completedMessages, { ...streamingMessage }],
          });
        }

        const officialMessages = (await result.response).messages;
        const toolCalls = await result.toolCalls;
        const usage = await result.usage;

        if (usage) {
          addUsage(usage);
        }

        completedMessages = [...completedMessages, ...officialMessages];
        if (toolCalls.length > 0) {
          setState({ pending: "tool", messages: completedMessages, toolCalls });
        } else {
          setState({ pending: "user", messages: completedMessages });

          conversationFilename.current = saveConversation(
            completedMessages,
            conversationFilename.current ?? undefined,
          );
        }
      } catch {
        throw new Error("Error: generateCompletion() failed to execute.");
      }
    },
    [provider, settings, systemPrompt, state, toolSet, addUsage],
  );

  const submitMessage = React.useCallback(
    (message: string): boolean => {
      const transformed = transformInput(message);
      if (!transformed || state.pending !== "user") return false;
      void send(transformed);
      return true;
    },
    [send, state.pending],
  );

  const submitToolResults = React.useCallback(
    (toolResults: ToolResultPart[]): boolean => {
      if (state.pending !== "tool") return false;
      void send(toolResults);
      return true;
    },
    [send, state.pending],
  );

  return {
    state,
    submitMessage,
    submitToolResults,
  };
}
