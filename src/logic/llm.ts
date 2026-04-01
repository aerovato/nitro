import { exit } from "node:process";

import { streamText, type ToolSet, type ModelMessage } from "ai";
import {
  createOpenAICompatible,
  OpenAICompatibleProviderOptions,
} from "@ai-sdk/openai-compatible";
import { createOpenAI, OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { AnthropicProviderOptions, createAnthropic } from "@ai-sdk/anthropic";

import {
  getDefaultProvider,
  type ProviderInfoWithName,
  type ProviderInfo,
} from "./provider";
import { type ReasoningEffort } from "./settings";

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
      const result: OpenAICompatibleProviderOptions = {
        reasoningEffort: reasoningEffort,
      };
      return result;
    }
    case "openai-responses": {
      const result: OpenAIResponsesProviderOptions = {
        reasoningEffort: reasoningEffort,
      };
      return result;
    }
    case "anthropic": {
      const effortMap: Record<
        ReasoningEffort,
        "low" | "high" | "medium" | "max"
      > = {
        low: "low",
        med: "medium",
        high: "high",
      };
      const result: AnthropicProviderOptions = {
        thinking: { type: "adaptive" },
        effort: effortMap[reasoningEffort],
      };
      return result;
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

  return streamText({
    model: client(provider.model),
    messages,
    system: systemPrompt,
    maxOutputTokens: options?.maxOutputTokens,
    tools,
    providerOptions: {
      [provider.name]: providerOptions,
    },
  });
}

export function getDefaultChatProvider(): ProviderInfoWithName | null {
  return getDefaultProvider() ?? null;
}

export function transformInput(input: string): string {
  const trimmed = input.trim();

  switch (trimmed) {
    case "/exit":
      exit(0);
      break;
    default:
      return input;
  }
}
