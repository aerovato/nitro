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
import {
  startUpdateCheck,
  getUpdateResult,
  formatUpdateMessage,
} from "./logic/updateCheck";
import { dangerouslyEnableExecutionDoNotInvokeOrYourSystemWillGetNuked } from "./tools/bash";

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
  ];
  console.log(lines.join("\n"));
}

async function main(args: string[]): Promise<void> {
  const eulaAccepted = await checkEula();
  if (!eulaAccepted) {
    process.exit(1);
  }

  if (args.length === 0 || args[0] === "help") {
    printUsage();
    return;
  }

  const command = args[0]!;

  switch (command) {
    case "settings":
      await runSettingsScreen();
      return;
    case "provider":
      await runProviderScreen(args.slice(1));
      return;
    case "interactive":
    case "i": {
      void startUpdateCheck();
      const request = args[1] ?? "";
      await runChatScreen({ initialRequest: request, quitOnFinish: false });
      break;
    }
    case "continue":
    case "c": {
      const request = args[1];
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
      void startUpdateCheck();
      await runChatScreen({
        initialRequest: request,
        quitOnFinish: true,
        initialFilename: filename,
        hidePreviousMessages: true,
      });
      break;
    }
    case "strict":
    case "s": {
      void startUpdateCheck();
      const request = args[1] ?? "";
      await runChatScreen({
        initialRequest: request,
        quitOnFinish: false,
        strictMode: true,
      });
      break;
    }
    case "resume":
    case "r": {
      const request = args[1] ?? "";
      const filename = getLastConversationFilename();
      if (!filename) {
        outputError("Error: No conversation to resume.");
        process.exit(1);
      }
      void startUpdateCheck();
      await runChatScreen({
        initialRequest: request,
        quitOnFinish: false,
        initialFilename: filename,
      });
      break;
    }
    default:
      if (command.includes(" ")) {
        void startUpdateCheck();
        await runChatScreen({ initialRequest: command, quitOnFinish: true });
        break;
      }
      outputError(`Unknown subcommand: ${command}`);
      printUsage();
      return;
  }

  const latestVersion = getUpdateResult();
  if (latestVersion) {
    console.warn(formatUpdateMessage(latestVersion));
  }
}

if (require.main === module) {
  dangerouslyEnableExecutionDoNotInvokeOrYourSystemWillGetNuked();
  await main(process.argv.slice(2));
}

export { main };
