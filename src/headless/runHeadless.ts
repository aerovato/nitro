/**
 * runHeadless -- entry point for non-interactive (headless) mode.
 *
 * ARCHITECTURE: Split into two phases:
 *   1. preflight()  -- synchronous validation (EULA, provider). Returns a
 *                      discriminated union so the caller owns exit semantics.
 *   2. runHeadless() -- async multi-turn chat loop. Calls preflight()
 *                      internally and delegates tool execution to BashTool.
 *
 * DESIGN DECISION: preflight returns a Result ({ ok: true | false }) instead
 * of throwing or calling process.exit(). This keeps the function pure and
 * testable -- callers decide how to handle failures. See Task 8 design notes.
 *
 * EULA is checked before the provider check because an unaccepted EULA is a
 * deliberate user decline that should not be overshadowed by a more "fixable"
 * provider-missing error.
 */

import type { Writable } from "node:stream";
import type { ModelMessage, ToolSet } from "ai";
import { tool as makeAiSdkTool } from "ai";

import { loadSettings, isEulaAgreed, getSystemPrompt } from "../logic/settings";
import { generateCompletion, getDefaultChatProvider } from "../logic/llm";
import type { ProviderInfoWithName } from "../logic/provider";
import type { Settings } from "../logic/settings";
import { bashTool, type BashModelInput, type BashToolOutput } from "../tools/bash";
import { decide } from "./riskGate";
import { Transcript } from "./transcript";

// ---------------------------------------------------------------------------
// Preflight types
// ---------------------------------------------------------------------------

export interface PreflightStreams {
  stdout: Writable;
  stderr: Writable;
}

/** Discriminated union: callers can narrow on `ok` to access payload vs error. */
export type PreflightResult =
  | { ok: true; settings: Settings; provider: ProviderInfoWithName }
  | { ok: false; exitCode: number };

// ---------------------------------------------------------------------------
// Preflight implementation
// ---------------------------------------------------------------------------

const EULA_NOT_ACCEPTED_MESSAGE =
  "EULA not yet accepted. Run 'nitro' interactively once to review and " +
  "accept it, then re-run your headless request.";

const NO_PROVIDER_MESSAGE =
  "Default provider not configured. Run 'nitro provider add' interactively " +
  "to configure one, then re-run your headless request.";

/**
 * Validate that the runtime environment is ready for headless execution.
 *
 * Checks (in order):
 *   1. EULA has been accepted for the current version.
 *   2. A default LLM provider is configured.
 *
 * Returns a discriminated result. On failure, writes a human-readable message
 * to stderr via the Transcript helper.
 */
export function preflight(streams: PreflightStreams): PreflightResult {
  const t = new Transcript(streams);

  const settings = loadSettings();
  if (!isEulaAgreed(settings)) {
    t.writeError(EULA_NOT_ACCEPTED_MESSAGE);
    return { ok: false, exitCode: 1 };
  }

  const provider = getDefaultChatProvider();
  if (!provider) {
    t.writeError(NO_PROVIDER_MESSAGE);
    return { ok: false, exitCode: 1 };
  }

  return { ok: true, settings, provider };
}

// ---------------------------------------------------------------------------
// Main loop types
// ---------------------------------------------------------------------------

export interface RunHeadlessArgs {
  request: string;
  yes: boolean;
  streams: PreflightStreams;
}

// ---------------------------------------------------------------------------
// Main loop implementation
// ---------------------------------------------------------------------------

/**
 * Build the AI SDK ToolSet containing only the Bash tool.
 *
 * WHY a dedicated function instead of an inline object? The `tool()` factory
 * from `ai` is used to create a tool definition that the SDK's streamText()
 * accepts. Wrapping it here isolates the SDK coupling and makes it trivial
 * to add more tools later (e.g., file read/write) by extending this set.
 */
function buildBashOnlyToolSet(): ToolSet {
  return {
    [bashTool.name]: makeAiSdkTool({
      description: bashTool.description,
      inputSchema: bashTool.modelInputSchema,
    }),
  };
}

/**
 * Extract plain text from assistant messages returned by the AI SDK.
 *
 * The SDK returns AssistantModelMessage.content as either a plain string or
 * an array of typed parts (TextPart, ToolCallPart, etc.). This helper
 * concatenates all TextPart.text values, which is the model's prose output
 * distinct from tool invocations.
 */
function extractAssistantText(messages: readonly ModelMessage[]): string {
  const parts: string[] = [];
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    if (typeof m.content === "string") {
      parts.push(m.content);
    } else if (Array.isArray(m.content)) {
      for (const p of m.content as Array<{ type: string; text?: string }>) {
        if (p.type === "text" && p.text) parts.push(p.text);
      }
    }
  }
  return parts.join("");
}

/**
 * Run the headless chat loop: preflight -> multi-turn LLM interaction.
 *
 * EXIT CODES:
 *   0  -- model produced a final answer (with or without tool calls)
 *   1  -- preflight failure or runtime error (e.g., API error)
 *   2  -- risk gate refused a Dangerous/Extremely Dangerous tool call
 *
 * The loop drains fullStream on every turn (amendment 11) to prevent memory
 * leaks from unconsumed async generators.
 */
export async function runHeadless(args: RunHeadlessArgs): Promise<number> {
  const t = new Transcript(args.streams);
  const pre = preflight(args.streams);
  if (!pre.ok) return pre.exitCode;

  const { settings, provider } = pre;
  const systemPrompt = getSystemPrompt();
  const tools = buildBashOnlyToolSet();

  const messages: ModelMessage[] = [
    { role: "user", content: args.request },
  ];

  try {
    while (true) {
      const result = generateCompletion(
        provider,
        messages,
        systemPrompt,
        {
          maxOutputTokens: settings.maxOutputTokens,
          reasoningEffort: settings.reasoningEffort,
        },
        tools,
      );

      // Drain fullStream into null sink (amendment 11: prevents memory leak
      // from unconsumed async generators in the AI SDK's streamText result).
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _event of result.fullStream) {
        /* drain */
      }

      const responseMessages = (await result.response).messages;
      const toolCalls = await result.toolCalls;

      // Append the SDK's response messages (assistant + tool-call parts)
      // to our conversation history so subsequent turns see full context.
      messages.push(...(responseMessages as ModelMessage[]));

      const assistantText = extractAssistantText(responseMessages);

      // No tool calls means the model is done -- emit the answer and exit.
      if (toolCalls.length === 0) {
        t.writeAnswer(assistantText);
        return 0;
      }

      // If the model produced text alongside tool calls, echo it to stdout
      // so the user sees intermediate reasoning (e.g., "Let me check...").
      if (assistantText.trim().length > 0) {
        args.streams.stdout.write(`${assistantText}\n`);
      }

      for (const call of toolCalls) {
        // Amendment 7: Reject any tool that isn't Bash. Headless mode only
        // supports shell commands; other tools (AskUser, file ops) make no
        // sense without an interactive UI.
        if (call.toolName !== "Bash") {
          t.writeError(
            `Unknown tool: ${call.toolName}. Only Bash is available in headless mode.`,
          );
          return 1;
        }

        // Parse the tool call input. The AI SDK's StaticToolCall carries
        // `input` (already-parsed object), but test mocks use `args` (JSON
        // string). Handle both for correctness and testability.
        const rawInput =
          "input" in call
            ? (call as { input: unknown }).input
            : typeof (call as { args: unknown }).args === "string"
              ? JSON.parse((call as { args: string }).args)
              : (call as { args: unknown }).args;

        const parsed = bashTool.modelInputSchema.safeParse(rawInput);
        if (!parsed.success) {
          t.writeError(
            `Model returned invalid Bash tool input: ${parsed.error.message}`,
          );
          return 1;
        }
        const input: BashModelInput = parsed.data;

        t.writeCommand(input.command);
        t.writeRisk(input.riskLevel, input.behaviorTags);

        const decision = decide(input.riskLevel, { yes: args.yes });
        if (decision === "refuse") {
          t.writeRefusal(input.command, input.riskLevel);
          return 2;
        }

        // Amendment 12: Audit-log auto-approved Dangerous+ commands so
        // operators can review what --yes allowed after the fact.
        if (
          args.yes &&
          (input.riskLevel === "Dangerous" ||
            input.riskLevel === "Extremely Dangerous")
        ) {
          args.streams.stderr.write(
            `[--yes active: auto-approved ${input.riskLevel} command: ${input.command}]\n`,
          );
        }

        const output: BashToolOutput = await bashTool.execute(input, {
          approved: true,
        });
        if (output.approved) {
          t.writeBashOutput(output.commandOutput);
        }

        // Feed the tool result back into the conversation so the model
        // can decide what to do next (another tool call or final answer).
        messages.push({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: call.toolCallId,
              toolName: call.toolName,
              output: {
                type: "json",
                value: output as unknown as Record<string, unknown>,
              },
            },
          ],
        });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    t.writeError(message);
    // In debug mode, dump the stack trace to stderr for diagnosis.
    if (process.env.DEBUG === "1" && err instanceof Error && err.stack) {
      args.streams.stderr.write(err.stack + "\n");
    }
    return 1;
  }
}
