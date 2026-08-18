import {
  streamText,
  type ToolSet,
  type ModelMessage,
  type SystemModelMessage,
} from "ai";
import {
  createOpenAICompatible,
  OpenAICompatibleProviderOptions,
} from "@ai-sdk/openai-compatible";
import { createOpenAI, OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { AnthropicProviderOptions, createAnthropic } from "@ai-sdk/anthropic";

import { type ProviderInfoWithName, type ProviderInfo } from "./provider";
import { type ReasoningEffort } from "./settings";

function addCacheControl<T extends ModelMessage>(
  message: T,
  providerName: string,
): T {
  return {
    ...message,
    providerOptions: {
      ...message.providerOptions,
      [providerName]: {
        cacheControl: { type: "ephemeral" },
      },
    } satisfies AnthropicProviderOptions,
  };
}

function createSystemMessage(systemPrompt: string): SystemModelMessage {
  const systemMessage: SystemModelMessage = {
    role: "system",
    content: systemPrompt,
  };
  return systemMessage;
}

export interface GenerationOptions {
  maxOutputTokens?: number;
  reasoningEffort?: ReasoningEffort;
}

function createClient(name: string, provider: ProviderInfo) {
  switch (provider.apiType) {
    case "openai-responses":
      return createOpenAI({
        name,
        baseURL: provider.baseURL,
        apiKey: provider.apiKey,
      });
    case "anthropic":
      return createAnthropic({
        name,
        baseURL: provider.baseURL,
        apiKey: provider.apiKey,
      });
    case "openai-compatible":
    default:
      return createOpenAICompatible({
        name,
        baseURL: provider.baseURL,
        apiKey: provider.apiKey,
      });
  }
}

function getProviderOptions(
  provider: ProviderInfoWithName,
  reasoningEffort?: ReasoningEffort,
) {
  if (!reasoningEffort) {
    return {};
  }
  switch (provider.apiType) {
    case "openai-compatible": {
      const options: OpenAICompatibleProviderOptions = {
        reasoningEffort: reasoningEffort,
      };
      return options;
    }
    case "openai-responses": {
      const options: OpenAIResponsesProviderOptions = {
        reasoningEffort: reasoningEffort,
      };
      return options;
    }
    case "anthropic": {
      const options: AnthropicProviderOptions = {
        thinking: { type: "adaptive" },
        effort: reasoningEffort,
      };
      return options;
    }
  }
}

export function generateCompletion(
  provider: ProviderInfoWithName,
  messages: ModelMessage[],
  systemPrompt: string,
  options?: GenerationOptions,
  tools?: ToolSet,
) {
  const client = createClient(provider.name, provider);

  const providerOptions = getProviderOptions(
    provider,
    options?.reasoningEffort,
  );

  const isAnthropic = provider.apiType === "anthropic";
  const systemMessage = isAnthropic
    ? addCacheControl(createSystemMessage(systemPrompt), provider.name)
    : createSystemMessage(systemPrompt);

  const cachedMessages =
    isAnthropic && messages.length > 0
      ? [
          ...messages.slice(0, -1),
          addCacheControl(messages[messages.length - 1]!, provider.name),
        ]
      : messages;

  return streamText({
    model: client(provider.model),
    messages: cachedMessages,
    system: systemMessage,
    maxOutputTokens: options?.maxOutputTokens,
    tools,
    providerOptions: {
      [provider.name]: providerOptions,
    },
  });
}
