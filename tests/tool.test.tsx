import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { bashTool } from "../src/tools/bash";

describe("Tool output formatting", () => {
  it("renders error-json output as a tool error summary", () => {
    const { lastFrame } = render(
      <>
        {bashTool.formatOutput({ type: "error-json", value: { error: true } })}
      </>,
    );
    const output = lastFrame() ?? "";
    expect(output).toContain(
      "Error: Bash tool call failed: Tool call failed validation.",
    );
    expect(output).not.toContain("Error: Bash returned unrecognized output.");
  });
});
