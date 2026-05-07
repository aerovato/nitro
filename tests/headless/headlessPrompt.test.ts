import { describe, it, expect } from "vitest";
import { getHeadlessSystemPrompt } from "../../src/headless/runHeadless";

/**
 * Tests for getHeadlessSystemPrompt (Amendment C1).
 *
 * NOTE: This file does NOT mock getSystemPrompt because we need the real
 * base prompt to verify the transformations. The tradeoff is that it
 * reads from the filesystem (settings.ts loads system_prompt.md if it
 * exists). This is acceptable for a unit test of pure string transformation.
 */
describe("getHeadlessSystemPrompt", () => {
  it("removes the single-turn directive from the base prompt", () => {
    const prompt = getHeadlessSystemPrompt();
    // The base prompt contains "within **a single turn**" (settings.ts line 24).
    // After transformation, this should be replaced with multi-turn guidance.
    expect(prompt).not.toContain("within **a single turn**");
    expect(prompt).toContain(
      "across as many turns as needed, using the Bash tool iteratively",
    );
  });

  it("removes AskUser tool references", () => {
    const prompt = getHeadlessSystemPrompt();
    // The base prompt has an "## AskUser" section and several lines mentioning it.
    expect(prompt).not.toContain("## AskUser");
    expect(prompt).not.toContain("use the AskUser tool");
  });

  it("preserves the Bash tool section", () => {
    const prompt = getHeadlessSystemPrompt();
    expect(prompt).toContain("## Bash");
    expect(prompt).toContain("Execute shell commands");
  });

  it("preserves environment details", () => {
    const prompt = getHeadlessSystemPrompt();
    expect(prompt).toContain("Today's date:");
    expect(prompt).toContain("Current working directory:");
  });
});
