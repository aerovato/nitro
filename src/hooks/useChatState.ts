import * as React from "react";
import type {
  AssistantContent,
  AssistantModelMessage,
  ToolModelMessage,
} from "ai";

import type { ProviderInfoWithName } from "../logic/provider";
import type { Settings } from "../logic/settings";
import { transformInput } from "../logic/llm";
import { prependWorkspaceContext } from "../logic/environment";
import { saveConversation, loadConversation } from "../logic/conversation";
import { exitWithError } from "../utils";
import {
  runAgentTurn,
  type AgentConfig,
  type AgentEvent,
  type NonSystemModelMessage,
  type ToolPrompt,
} from "../logic/agent";
import { useTokenUsage } from "../components";

export type { NonSystemModelMessage };

export type ChatState =
  | { pending: "user"; messages: NonSystemModelMessage[] }
  | { pending: "provider"; messages: NonSystemModelMessage[] }
  | { pending: "tool"; messages: NonSystemModelMessage[]; prompt: ToolPrompt }
  | { pending: "executing"; messages: NonSystemModelMessage[]; label: string };

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
  submitToolInput: (userInput: unknown) => boolean;
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

  const configRef = React.useRef<AgentConfig>({
    provider,
    settings,
    systemPrompt,
  });
  const messagesRef = React.useRef<NonSystemModelMessage[]>(state.messages);
  const streamingRef = React.useRef<AssistantModelMessage | null>(null);
  const pendingRef = React.useRef<ChatState["pending"]>("user");
  const conversationFilenameRef = React.useRef<string | null>(
    initialFilename ?? null,
  );
  const resolveToolInputRef = React.useRef<
    ((userInput: unknown) => void) | null
  >(null);
  const { addUsage } = useTokenUsage();

  const setPendingState = (next: ChatState): void => {
    pendingRef.current = next.pending;
    setState(next);
  };

  const appendDelta = (type: "reasoning" | "text", text: string): void => {
    let streaming = streamingRef.current;
    if (streaming === null) {
      streaming = { role: "assistant", content: [] };
      streamingRef.current = streaming;
    }
    const content = streaming.content as Exclude<AssistantContent, string>;
    const last = content[content.length - 1];
    if (last && last.type === type) {
      content[content.length - 1] = { ...last, text: last.text + text };
    } else {
      content.push({ type, text });
    }
    setPendingState({
      pending: "provider",
      messages: [...messagesRef.current, { ...streaming }],
    });
  };

  const runTurn = async (): Promise<void> => {
    setPendingState({
      pending: "provider",
      messages: messagesRef.current,
    });
    const generator = runAgentTurn(configRef.current, messagesRef.current);
    let generatorInput: unknown = undefined;
    try {
      while (true) {
        const step = await generator.next(generatorInput);
        generatorInput = undefined;
        if (step.done) {
          const messages = step.value;
          messagesRef.current = messages;
          streamingRef.current = null;
          conversationFilenameRef.current = saveConversation(
            messages,
            conversationFilenameRef.current ?? undefined,
          );
          setPendingState({ pending: "user", messages });
          return;
        }

        const event: AgentEvent = step.value;
        switch (event.type) {
          case "reasoning-delta":
            appendDelta("reasoning", event.text);
            break;
          case "text-delta":
            appendDelta("text", event.text);
            break;
          case "assistant-message": {
            streamingRef.current = null;
            messagesRef.current = [...messagesRef.current, event.message];
            setPendingState({
              pending: "provider",
              messages: messagesRef.current,
            });
            break;
          }
          case "tool-prompt": {
            setPendingState({
              pending: "tool",
              messages: messagesRef.current,
              prompt: event.prompt,
            });
            generatorInput = await new Promise<unknown>(resolve => {
              resolveToolInputRef.current = resolve;
            });
            resolveToolInputRef.current = null;
            setPendingState({
              pending: "provider",
              messages: messagesRef.current,
            });
            break;
          }
          case "tool-running": {
            setPendingState({
              pending: "executing",
              messages: messagesRef.current,
              label: event.label,
            });
            break;
          }
          case "tool-result": {
            const toolMessage: ToolModelMessage = {
              role: "tool",
              content: [event.result],
            };
            messagesRef.current = [...messagesRef.current, toolMessage];
            setPendingState({
              pending: "provider",
              messages: messagesRef.current,
            });
            break;
          }
          case "usage":
            addUsage(event.usage);
            break;
        }
      }
    } catch {
      streamingRef.current = null;
      console.error("Error: Failed to generate completion.");
      setPendingState({ pending: "user", messages: messagesRef.current });
    }
  };

  const submitMessage = (message: string): boolean => {
    const transformed = transformInput(message);
    if (!transformed || pendingRef.current !== "user") return false;
    messagesRef.current = [
      ...messagesRef.current,
      { role: "user", content: prependWorkspaceContext(transformed) },
    ];
    void runTurn();
    return true;
  };

  const submitToolInput = (userInput: unknown): boolean => {
    const resolve = resolveToolInputRef.current;
    if (resolve === null) return false;
    resolve(userInput);
    return true;
  };

  return {
    state,
    submitMessage,
    submitToolInput,
  };
}
