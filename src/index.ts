#!/usr/bin/env node

if (process.env.NODE_ENV === "production") {
  globalThis.AI_SDK_LOG_WARNINGS = false;
}

import { runSettingsScreen } from "./screens/SettingsScreen";
import { runProviderScreen } from "./screens/ProviderRouter";
import { runChatScreen } from "./screens/ChatScreen";
import { runEulaScreen } from "./screens/EulaScreen";
import { outputError } from "./utils";
import { getLastConversationFilename } from "./logic/conversation";
import { loadSettings, isEulaAgreed } from "./logic/settings";
import { dangerouslyEnableExecutionDoNotInvokeOrYourSystemWillGetNuked } from "./tools/bash";
import { parseFlags } from "./headless/flags";
import { isHeadlessContext } from "./headless/tty";
import { runHeadless } from "./headless/runHeadless";

async function checkEula(): Promise<boolean> {
  const settings = loadSettings();
  if (isEulaAgreed(settings)) {
    return true;
  }
  return runEulaScreen();
}

function printUsage(): void {
  const lines = [
    "Usage: nitro <command> [subcommand]",
    "",
    "Commands:",
    `  "<request>"                    Execute request and exit (2+ words)`,
    "  interactive, i [<request>]     Start interactive session",
    "  continue, c <request>          Continue last conversation",
    "  resume, r [<request>]          Resume last conversation interactively",
    "  strict, s [<request>]          Run in strict mode (always confirm commands)",
    "  help                           Print this help message",
    "  settings                       Configure Nitro settings",
    "  provider                       Manage AI providers",
    "",
    "Provider Subcommands:",
    "  provider add                   Add a new provider",
    "  provider list                  List all providers",
    "  provider edit                  Edit a provider",
    "  provider remove                Remove a provider",
    "  provider default               Set default provider",
    "",
    "Flags:",
    "  --headless    Force headless mode (no TUI, plain text output)",
    "  --tty         Force TUI mode even without a TTY (testing only)",
    "  --yes         Auto-approve all risk levels in headless mode",
  ];
  console.log(lines.join("\n"));
}

// Known subcommands that should never be treated as one-shot requests,
// even with --headless. Amendment 2: prevents --headless interactive misrouting.
const KNOWN_SUBCOMMANDS = new Set([
  "settings", "provider", "interactive", "i", "continue", "c",
  "resume", "r", "strict", "s", "help",
]);

// Decide whether the (post-strip) argv constitutes a one-shot request.
function pickOneShotRequest(
  flags: ReturnType<typeof parseFlags>["flags"],
  remaining: string[],
): string | null {
  // Amendment 14: if --headless but no remaining args, return null (falls to printUsage)
  if (remaining.length === 0) return null;

  // Amendment 2: subcommand whitelist check
  if (KNOWN_SUBCOMMANDS.has(remaining[0]!)) return null;

  if (flags.headless) {
    // With --headless: bypass "must include a space" heuristic
    return remaining.join(" ");
  }
  // Without --headless: existing heuristic (single arg containing a space)
  if (remaining.length === 1 && remaining[0]!.includes(" ")) {
    return remaining[0]!;
  }
  return null;
}

async function main(args: string[]): Promise<void> {
  const { flags, remaining } = parseFlags(args);

  // Headless one-shot path
  const oneShotRequest = pickOneShotRequest(flags, remaining);
  if (
    oneShotRequest !== null &&
    isHeadlessContext({ flags, stdinIsTTY: process.stdin.isTTY ?? false })
  ) {
    const code = await runHeadless({
      request: oneShotRequest,
      yes: flags.yes,
      streams: { stdout: process.stdout, stderr: process.stderr },
    });
    if (code !== 0) process.exit(code);
    return;
  }

  // Amendment 14: --headless with no request -> print usage + exit 0
  if (flags.headless && remaining.length === 0) {
    printUsage();
    return;
  }

  // Non-headless path: unchanged from before
  const eulaAccepted = await checkEula();
  if (!eulaAccepted) {
    process.exit(1);
  }

  if (remaining.length === 0 || remaining[0] === "help") {
    printUsage();
    return;
  }

  const command = remaining[0]!;

  switch (command) {
    case "settings":
      await runSettingsScreen();
      return;
    case "provider":
      await runProviderScreen(remaining.slice(1));
      return;
    case "interactive":
    case "i": {
      const request = remaining[1] ?? "";
      await runChatScreen({ initialRequest: request, quitOnFinish: false });
      return;
    }
    case "continue":
    case "c": {
      const request = remaining[1];
      if (!request) {
        outputError("Error: continue requires a request argument.");
        outputError("Use resume to interactively resume.");
        process.exit(1);
      }
      const filename = getLastConversationFilename();
      if (!filename) {
        outputError("Error: No conversation to continue.");
        process.exit(1);
      }
      await runChatScreen({
        initialRequest: request,
        quitOnFinish: true,
        initialFilename: filename,
        hidePreviousMessages: true,
      });
      return;
    }
    case "strict":
    case "s": {
      const request = remaining[1] ?? "";
      await runChatScreen({
        initialRequest: request,
        quitOnFinish: false,
        strictMode: true,
      });
      return;
    }
    case "resume":
    case "r": {
      const request = remaining[1] ?? "";
      const filename = getLastConversationFilename();
      if (!filename) {
        outputError("Error: No conversation to resume.");
        process.exit(1);
      }
      await runChatScreen({
        initialRequest: request,
        quitOnFinish: false,
        initialFilename: filename,
      });
      return;
    }
    default:
      if (command.includes(" ")) {
        await runChatScreen({ initialRequest: command, quitOnFinish: true });
        return;
      }
  }

  outputError(`Unknown subcommand: ${command}`);
  printUsage();
}

if (require.main === module) {
  dangerouslyEnableExecutionDoNotInvokeOrYourSystemWillGetNuked();
  await main(process.argv.slice(2));
}

export { main };
