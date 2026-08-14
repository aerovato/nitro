/* eslint-disable @typescript-eslint/no-unsafe-return */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { main } from "../src/index";

const mockRunChatScreen = vi.fn().mockResolvedValue(undefined);
const mockRunSettingsScreen = vi.fn().mockResolvedValue(undefined);
const mockRunProviderScreen = vi.fn().mockResolvedValue(undefined);
const mockGetLastConversationFilename = vi.fn();
const mockOutputError = vi.fn();

vi.mock("../src/screens/ChatScreen", () => ({
  runChatScreen: (...args: unknown[]) => mockRunChatScreen(...args),
}));

vi.mock("../src/screens/SettingsScreen", () => ({
  runSettingsScreen: () => mockRunSettingsScreen(),
}));

vi.mock("../src/screens/ProviderRouter", () => ({
  runProviderScreen: (...args: unknown[]) => mockRunProviderScreen(...args),
}));

vi.mock("../src/screens/EulaScreen", () => ({
  runEulaScreen: () => Promise.resolve(true),
}));

vi.mock("../src/logic/conversation", () => ({
  getLastConversationFilename: () => mockGetLastConversationFilename(),
}));

vi.mock("../src/logic/settings", () => ({
  loadSettings: () => ({ agreedToEula: 1 }),
  isEulaAgreed: () => true,
}));

vi.mock("../src/utils", () => ({
  outputError: (msg: string) => mockOutputError(msg),
}));

// eslint-disable-next-line @typescript-eslint/unbound-method
const originalExit = process.exit;

beforeEach(() => {
  vi.clearAllMocks();
  process.exit = vi.fn((code?: number) => {
    throw new Error(`EXIT:${code ?? 0}`);
  }) as typeof process.exit;
});

afterEach(() => {
  process.exit = originalExit;
});

describe("CLI routing", () => {
  describe("help", () => {
    it("prints usage when no args", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await main([]);
      expect(consoleSpy).toHaveBeenCalled();
      const output: unknown = consoleSpy.mock.calls[0]?.[0];
      expect(output).toContain("Usage: nitro");
      expect(output).not.toContain("interactive");
      expect(output).not.toContain("resume");
      consoleSpy.mockRestore();
    });

    it("prints usage for help command", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await main(["help"]);
      expect(consoleSpy).toHaveBeenCalled();
      const output: unknown = consoleSpy.mock.calls[0]?.[0];
      expect(output).toContain("Usage: nitro");
      consoleSpy.mockRestore();
    });
  });

  describe("settings", () => {
    it("runs settings screen", async () => {
      await main(["settings"]);
      expect(mockRunSettingsScreen).toHaveBeenCalled();
    });
  });

  describe("provider", () => {
    it("runs provider screen with subcommands", async () => {
      await main(["provider", "add"]);
      expect(mockRunProviderScreen).toHaveBeenCalledWith(["add"]);
    });
  });

  describe("request (default)", () => {
    it("runs chat screen non-interactive for multi-word request", async () => {
      await main(["hello world"]);
      expect(mockRunChatScreen).toHaveBeenCalledWith({
        initialRequest: "hello world",
      });
    });
  });

  describe("continue", () => {
    it("errors without request", async () => {
      try {
        await main(["continue"]);
      } catch (e) {
        expect((e as Error).message).toBe("EXIT:1");
      }
      expect(mockOutputError).toHaveBeenCalledWith(
        "Error: continue requires a request argument.",
      );
    });

    it("errors without conversation", async () => {
      mockGetLastConversationFilename.mockReturnValue(null);
      try {
        await main(["continue", "follow up"]);
      } catch (e) {
        expect((e as Error).message).toBe("EXIT:1");
      }
      expect(mockOutputError).toHaveBeenCalledWith(
        "Error: No conversation to continue.",
      );
    });

    it("runs chat screen with filename and request", async () => {
      mockGetLastConversationFilename.mockReturnValue("123.json");
      await main(["continue", "follow up"]);
      expect(mockRunChatScreen).toHaveBeenCalledWith({
        initialRequest: "follow up",
        initialFilename: "123.json",
        hidePreviousMessages: true,
      });
    });

    it("'c' alias works", async () => {
      mockGetLastConversationFilename.mockReturnValue("456.json");
      await main(["c", "another request"]);
      expect(mockRunChatScreen).toHaveBeenCalledWith({
        initialRequest: "another request",
        initialFilename: "456.json",
        hidePreviousMessages: true,
      });
    });
  });

  describe("strict", () => {
    it("requires a request", async () => {
      await expect(main(["strict"])).rejects.toThrow("EXIT:1");
      expect(mockOutputError).toHaveBeenCalledWith(
        "Error: strict requires a request argument.",
      );
    });

    it("runs one request with strict mode enabled", async () => {
      await main(["strict", "check everything"]);
      expect(mockRunChatScreen).toHaveBeenCalledWith({
        initialRequest: "check everything",
        strictMode: true,
      });
    });

    it("supports the 's' alias", async () => {
      await main(["s", "check everything"]);
      expect(mockRunChatScreen).toHaveBeenCalledWith({
        initialRequest: "check everything",
        strictMode: true,
      });
    });
  });

  describe("removed commands", () => {
    it.each(["interactive", "i", "resume", "r"])(
      "treats %s as unknown",
      async command => {
        const consoleSpy = vi
          .spyOn(console, "log")
          .mockImplementation(() => {});
        await main([command]);
        expect(mockOutputError).toHaveBeenCalledWith(
          `Unknown subcommand: ${command}`,
        );
        expect(mockRunChatScreen).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      },
    );
  });

  describe("unknown command", () => {
    it("errors for unknown single-word command", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await main(["unknown"]);
      expect(mockOutputError).toHaveBeenCalledWith(
        "Unknown subcommand: unknown",
      );
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
