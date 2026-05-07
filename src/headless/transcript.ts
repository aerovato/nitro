/**
 * Transcript -- output routing for headless (non-interactive) mode.
 *
 * Every public method writes to exactly one of two injected streams:
 *   stdout  -> the user-visible transcript (commands, answers, command output)
 *   stderr  -> metadata channel (risks, refusals, errors, stray tool lines)
 *
 * DESIGN DECISION: Streams are injected via the constructor rather than
 * importing `process.stdout`/`process.stderr` directly. This keeps the
 * class unit-testable without spying on globals and lets future output
 * modes (quiet, json, etc.) swap stream implementations at the boundary
 * without changing any helper logic.
 *
 * PREFIX CONVENTION: BashTool.executeBashCommand internally tags every
 * line with `out:\t` (stdout) or `err:\t` (stderr) so the model can
 * distinguish them in the tool result. This module strips those prefixes
 * and routes to the correct stream. Unprefixed lines (e.g., "Tool Error:
 * Command timed out") are routed to stderr per amendment 8.
 */

import type { Writable } from "node:stream";

import type { RiskLevel, BehaviorTag } from "../tools/bash";

/** The two output sinks every Transcript writes to. */
export interface TranscriptStreams {
  stdout: Writable;
  stderr: Writable;
}

// NOTE: These prefixes match the string literals in BashTool.executeBashCommand
// (src/tools/bash.tsx lines 227, 234). They are NOT yet exported as named
// constants from bash.tsx; when they are, import them here to avoid drift.
const STDOUT_PREFIX = "out:\t";
const STDERR_PREFIX = "err:\t";

export class Transcript {
  constructor(private readonly streams: TranscriptStreams) {}

  /** Print the command being executed to the transcript. */
  writeCommand(command: string): void {
    this.streams.stdout.write(`$ ${command}\n`);
  }

  /** Emit the risk assessment to the metadata channel. */
  writeRisk(level: RiskLevel, tags: BehaviorTag[]): void {
    const tagsStr = tags.length === 0 ? "-" : tags.join(", ");
    this.streams.stderr.write(`[risk: ${level}, tags: ${tagsStr}]\n`);
  }

  /**
   * Parse the raw tool output from BashTool.executeBashCommand, strip the
   * `out:\t` / `err:\t` prefixes, and route each line to the correct stream.
   *
   * Amendment 8: Unprefixed lines (e.g., "Tool Error: Command timed out")
   * route to stderr rather than being silently dropped.
   */
  writeBashOutput(toolOutput: string): void {
    for (const rawLine of toolOutput.split("\n")) {
      if (rawLine.length === 0) continue;
      if (rawLine.startsWith(STDOUT_PREFIX)) {
        this.streams.stdout.write(rawLine.slice(STDOUT_PREFIX.length) + "\n");
      } else if (rawLine.startsWith(STDERR_PREFIX)) {
        this.streams.stderr.write(rawLine.slice(STDERR_PREFIX.length) + "\n");
      } else {
        // Unprefixed lines go to stderr (amendment 8)
        this.streams.stderr.write(rawLine + "\n");
      }
    }
  }

  /** Print a refusal notice to the metadata channel. */
  writeRefusal(command: string, riskLevel: RiskLevel): void {
    this.streams.stderr.write(
      `Refused: ${command} (${riskLevel}). Re-run with --yes to allow.\n`,
    );
  }

  /**
   * Emit the model's final answer to the transcript.
   * Prepends a blank line for visual separation from command output.
   * No-op for empty / whitespace-only input.
   */
  writeAnswer(text: string): void {
    if (text.trim().length === 0) return;
    this.streams.stdout.write(`\nAnswer: ${text}\n`);
  }

  /** Print a fatal/non-recoverable error to the metadata channel. */
  writeError(message: string): void {
    this.streams.stderr.write(`nitro: ${message}\n`);
  }
}
