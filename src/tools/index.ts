import type { ToolSet } from "ai";
import type { z } from "zod";

import { askTool } from "./ask";
import { bashTool } from "./bash";
import { NitroTool } from "./tool";

export * from "./ask";
export * from "./bash";
export * from "./tool";

type AnyNitroTool = NitroTool<
  z.ZodType<Record<string, unknown>>,
  z.ZodType<Record<string, unknown>>,
  z.ZodType<Record<string, unknown>>
>;

const ALL_TOOLS: Record<string, AnyNitroTool> = {
  [askTool.name]: askTool,
  [bashTool.name]: bashTool,
};

export function getToolInstance(toolName: string): AnyNitroTool | null {
  const tool = ALL_TOOLS[toolName];
  if (!tool) {
    return null;
  }
  return tool;
}

export function createToolSet(): ToolSet {
  const toolSet: ToolSet = {};
  Object.entries(ALL_TOOLS).forEach(([name, tool]) => {
    toolSet[name] = tool.createTool();
  });
  return toolSet;
}
