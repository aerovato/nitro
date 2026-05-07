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

import { loadSettings, isEulaAgreed } from "../logic/settings";
import { getDefaultChatProvider } from "../logic/llm";
import type { ProviderInfoWithName } from "../logic/provider";
import type { Settings } from "../logic/settings";
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
