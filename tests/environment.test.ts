import { describe, expect, it } from "vitest";
import { cwd } from "node:process";

import {
  getWorkspaceSnapshot,
  prependWorkspaceContext,
} from "../src/logic/environment";

describe("environment", () => {
  it("includes cwd and ls listing", () => {
    const snapshot = getWorkspaceSnapshot();
    expect(snapshot.startsWith("<system-context>")).toBe(true);
    expect(snapshot.endsWith("</system-context>")).toBe(true);
    expect(snapshot).toContain("Current working directory:");
    expect(snapshot).toContain(cwd());
    expect(snapshot).toContain("Directory listing (ls -la):");
    expect(snapshot).toMatch(/package\.json|README\.md|src/);
  });

  it("prepends snapshot before the user message", () => {
    const wrapped = prependWorkspaceContext("convert demo.mov to mp4");
    expect(wrapped.endsWith("convert demo.mov to mp4")).toBe(true);
    expect(wrapped).toContain("---");
    expect(wrapped).toContain(cwd());
  });
});
