import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "ink-testing-library";
import { SettingsScreen } from "../src/screens/SettingsScreen";

vi.mock("../src/logic/settings", () => ({
  loadSettings: () => ({
    alwaysConfirm: false,
    showThinking: false,
    setupCompleted: false,
    maxOutputTokens: 32000,
    reasoningEffort: "med",
  }),
  saveSettings: vi.fn(),
  SETTINGS_META: [
    {
      key: "alwaysConfirm",
      label: "Always Confirm",
      description: "Prompt for confirmation before all commands",
      type: "boolean" as const,
    },
  ],
}));

describe("SettingsScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders settings menu", () => {
    const { lastFrame } = render(<SettingsScreen />);
    const output = lastFrame();
    expect(output).toContain("Select a setting to configure");
  });
});
