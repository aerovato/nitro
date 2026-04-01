import { exitWithError } from "../utils";
import { runProviderAddScreen } from "./ProviderAddScreen";
import { runProviderEditScreen } from "./ProviderEditScreen";
import { runProviderRemoveScreen } from "./ProviderRemoveScreen";
import { runProviderDefaultScreen } from "./ProviderDefaultScreen";
import { runProviderListScreen } from "./ProviderListScreen";
import {
  runProviderRouterScreen,
  type ProviderSubcommand,
} from "./ProviderRouterScreen";

const SUBCOMMAND_MAP: Record<ProviderSubcommand, () => Promise<void>> = {
  add: runProviderAddScreen,
  list: runProviderListScreen,
  edit: runProviderEditScreen,
  remove: runProviderRemoveScreen,
  default: runProviderDefaultScreen,
};

export async function runProviderScreen(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (subcommand && subcommand in SUBCOMMAND_MAP) {
    await SUBCOMMAND_MAP[subcommand as ProviderSubcommand]();
    return;
  }

  if (subcommand) {
    const lines = [
      `Unknown provider subcommand: ${subcommand}`,
      "",
      "Usage: nitro provider <add|list|edit|remove|default>",
    ];
    exitWithError(lines.join("\n"));
  }

  const selected = await runProviderRouterScreen();
  if (selected) {
    await SUBCOMMAND_MAP[selected]();
  }
}
