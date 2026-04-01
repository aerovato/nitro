#!/usr/bin/env node

import { runSettingsScreen } from "./screens/SettingsScreen";
import { runProviderScreen } from "./screens/ProviderRouter";
import { runChatScreen } from "./screens/ChatScreen";
import { outputError } from "./utils";
import { getLastConversationFilename } from "./logic/conversation";
import { dangerouslyEnableExecutionDoNotInvokeOrYourSystemWillGetNuked } from "./tools/bash";

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
      const request = args[1] ?? "";
      await runChatScreen({ initialRequest: request, quitOnFinish: false });
      return;
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
      const request = args[1] ?? "";
      await runChatScreen({
        initialRequest: request,
        quitOnFinish: false,
        strictMode: true,
      });
      return;
    }
    case "resume":
    case "r": {
      const request = args[1] ?? "";
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
