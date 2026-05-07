import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// WHY mock at module level rather than with vi.mock inside describe?
// vitest hoists vi.mock() calls to the top of the file automatically, so the
// mocked versions are in place before the import of `main` resolves. This is
// the standard vitest pattern for mocking dependencies of the module under test.
// ---------------------------------------------------------------------------

vi.mock("../../src/screens/ChatScreen", () => ({
  runChatScreen: vi.fn(),
}));
vi.mock("../../src/screens/EulaScreen", () => ({
  runEulaScreen: vi.fn().mockResolvedValue(true),
}));
vi.mock("../../src/screens/SettingsScreen", () => ({
  runSettingsScreen: vi.fn(),
}));
vi.mock("../../src/screens/ProviderRouter", () => ({
  runProviderScreen: vi.fn(),
}));
vi.mock("../../src/logic/conversation", () => ({
  getLastConversationFilename: vi.fn(),
}));
vi.mock("../../src/logic/settings", () => ({
  loadSettings: () => ({}),
  isEulaAgreed: () => true,
  getSystemPrompt: () => "",
}));
vi.mock("../../src/headless/runHeadless", () => ({
  runHeadless: vi.fn().mockResolvedValue(0),
}));

import { runChatScreen } from "../../src/screens/ChatScreen";
import { runHeadless } from "../../src/headless/runHeadless";
import { main } from "../../src/index";

const mockedChatScreen = vi.mocked(runChatScreen);
const mockedHeadless = vi.mocked(runHeadless);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("dispatcher: --headless flag routing", () => {
  it("--headless 'find files' calls runHeadless, not runChatScreen", async () => {
    await main(["--headless", "find files"]);
    expect(mockedHeadless).toHaveBeenCalledTimes(1);
    expect(mockedChatScreen).not.toHaveBeenCalled();
  });

  it("--headless --yes 'rm /tmp/x' passes yes=true", async () => {
    await main(["--headless", "--yes", "rm /tmp/x"]);
    expect(mockedHeadless).toHaveBeenCalledWith(
      expect.objectContaining({ request: "rm /tmp/x", yes: true }),
    );
  });

  it("--headless 'one-word' bypasses the include-space heuristic", async () => {
    await main(["--headless", "ls"]);
    expect(mockedHeadless).toHaveBeenCalledWith(
      expect.objectContaining({ request: "ls" }),
    );
  });

  it("'find files' (no flag) still goes to runChatScreen", async () => {
    await main(["find files"]);
    expect(mockedChatScreen).toHaveBeenCalledTimes(1);
    expect(mockedHeadless).not.toHaveBeenCalled();
  });

  it("'help' is unaffected", async () => {
    await main(["help"]);
    expect(mockedChatScreen).not.toHaveBeenCalled();
    expect(mockedHeadless).not.toHaveBeenCalled();
  });

  it("--headless 'interactive' is treated as subcommand, not request", async () => {
    // Amendment 2: the KNOWN_SUBCOMMANDS whitelist prevents misrouting
    await main(["--headless", "interactive"]);
    expect(mockedHeadless).not.toHaveBeenCalled();
  });
});
