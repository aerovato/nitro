import type {
  AssistantModelMessage,
  JSONValue,
  LanguageModelUsage,
  ModelMessage,
  SystemModelMessage,
  ToolCallPart,
  ToolResultPart,
} from "ai";

import { generateCompletion } from "./llm";
import type { ProviderInfoWithName } from "./provider";
import type { Settings } from "./settings";
import {
  createToolSet,
  getToolDefinition,
  toolNotFoundError,
  validationError,
} from "../tools";

export type NonSystemModelMessage = Exclude<ModelMessage, SystemModelMessage>;

export interface ToolPrompt {
  toolCallId: string;
  toolName: string;
  modelInput: Record<string, unknown>;
}

export type AgentEvent =
  | { type: "reasoning-delta"; text: string }
  | { type: "text-delta"; text: string }
  | { type: "assistant-message"; message: AssistantModelMessage }
  | { type: "tool-prompt"; prompt: ToolPrompt }
  | { type: "tool-running"; label: string }
  | { type: "tool-result"; result: ToolResultPart }
  | { type: "usage"; usage: LanguageModelUsage };

export interface AgentConfig {
  provider: ProviderInfoWithName;
  settings: Settings;
  systemPrompt: string;
}

function errorResult(call: ToolCallPart, error: unknown): ToolResultPart {
  return {
    type: "tool-result",
    toolCallId: call.toolCallId,
    toolName: call.toolName,
    output: { type: "error-json", value: error as JSONValue },
  };
}

async function* runToolCall(
  call: ToolCallPart,
  settings: Settings,
): AsyncGenerator<AgentEvent, ToolResultPart, unknown> {
  const definition = getToolDefinition(call.toolName);
  if (!definition) {
    const result = errorResult(call, toolNotFoundError(call.toolName));
    yield { type: "tool-result", result };
    return result;
  }

  const validated = definition.modelInputSchema.safeParse(call.input);
  if (!validated.success) {
    const result = errorResult(call, validationError(validated));
    yield { type: "tool-result", result };
    return result;
  }
  const modelInput = validated.data;

  const autoInput = definition.autoApproveInput?.(modelInput, settings) ?? null;
  let userInput: unknown;
  if (autoInput !== null) {
    userInput = autoInput;
  } else {
    userInput = yield {
      type: "tool-prompt",
      prompt: {
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        modelInput,
      },
    };
  }

  const validatedUserInput = definition.userInputSchema.safeParse(userInput);
  if (!validatedUserInput.success) {
    const result = errorResult(call, validationError(validatedUserInput));
    yield { type: "tool-result", result };
    return result;
  }

  const label =
    definition.runningLabel?.(modelInput, validatedUserInput.data) ?? null;
  if (label !== null) {
    yield { type: "tool-running", label };
  }

  const output = await definition.execute(modelInput, validatedUserInput.data);
  const result: ToolResultPart = {
    type: "tool-result",
    toolCallId: call.toolCallId,
    toolName: call.toolName,
    output: { type: "json", value: output as JSONValue },
  };
  yield { type: "tool-result", result };
  return result;
}

/**
 * Runs a single agent turn: streams model responses, executes tool calls
 * (requesting user input via yielded "tool-prompt" events), and feeds tool
 * results back to the model until the turn completes without tool calls.
 * Returns the complete message history.
 */
export async function* runAgentTurn(
  config: AgentConfig,
  messages: NonSystemModelMessage[],
): AsyncGenerator<AgentEvent, NonSystemModelMessage[], unknown> {
  const { provider, settings, systemPrompt } = config;
  let history = messages;

  while (true) {
    const completion = generateCompletion(
      provider,
      history,
      systemPrompt,
      {
        maxOutputTokens: settings.maxOutputTokens,
        reasoningEffort: settings.reasoningEffort,
      },
      createToolSet(),
    );

    for await (const part of completion.fullStream) {
      if (part.type === "reasoning-delta") {
        yield { type: "reasoning-delta", text: part.text };
      } else if (part.type === "text-delta") {
        yield { type: "text-delta", text: part.text };
      }
    }

    const response = await completion.response;
    const usage = await completion.usage;
    if (usage) {
      yield { type: "usage", usage };
    }

    const assistantMessages = response.messages.filter(
      (message): message is AssistantModelMessage =>
        message.role === "assistant",
    );
    history = [...history, ...assistantMessages];
    for (const message of assistantMessages) {
      yield { type: "assistant-message", message };
    }

    const toolCalls = await completion.toolCalls;
    if (toolCalls.length === 0) {
      return history;
    }

    const toolResults: ToolResultPart[] = [];
    for (const call of toolCalls) {
      const result = yield* runToolCall(call, settings);
      toolResults.push(result);
    }
    history = [...history, { role: "tool", content: toolResults }];
  }
}
