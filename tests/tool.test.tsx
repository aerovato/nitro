import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { ToolResultDisplay } from "../src/components/ToolResultDisplay";
import { DEFAULT_SETTINGS } from "../src/logic/settings";

describe("Tool output formatting", () => {
  it("renders error-json output as a tool error summary", () => {
    const { lastFrame } = render(
      <ToolResultDisplay
        toolName="Bash"
        output={{ type: "error-json", value: { error: true } }}
        settings={DEFAULT_SETTINGS}
      />,
    );
    const output = lastFrame() ?? "";
    expect(output).toContain(
      "Error: Bash tool call failed: Tool call failed validation.",
    );
    expect(output).not.toContain("Error: Bash returned unrecognized output.");
  });

  it("hides command output by default", () => {
    const { lastFrame } = render(
      <ToolResultDisplay
        toolName="Bash"
        output={{
          type: "json",
          value: {
            command: "pwd",
            approved: true,
            commandOutput: "out:\t/root/project",
            exitCode: 0,
          },
        }}
        settings={DEFAULT_SETTINGS}
      />,
    );
    const output = lastFrame() ?? "";
    expect(output).toContain("$ pwd");
    expect(output).not.toContain("/root/project");
  });

  it("shows command output when enabled", () => {
    const { lastFrame } = render(
      <ToolResultDisplay
        toolName="Bash"
        output={{
          type: "json",
          value: {
            command: "pwd",
            approved: true,
            commandOutput: "out:\t/root/project",
            exitCode: 0,
          },
        }}
        settings={{ ...DEFAULT_SETTINGS, showCommandOutput: true }}
      />,
    );
    expect(lastFrame()).toContain("/root/project");
  });
});
