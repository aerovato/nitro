import type { ToolSet, ToolCallPart } from "ai";
import type { z } from "zod";

import { askTool } from "./ask";
import { bashTool } from "./bash";
import { NitroTool } from "./tool";

export * from "./ask";
export * from "./bash";
export * from "./tool";

const ALL_TOOLS = {
  [askTool.name]: askTool,
  [bashTool.name]: bashTool,
} satisfies Record<
  string,
  NitroTool<
    z.ZodType<Record<string, unknown>>,
    z.ZodType<Record<string, unknown>>,
    z.ZodType<Record<string, unknown>>
  >
>;

type ALL_TOOL_NAMES = keyof typeof ALL_TOOLS;

export function getToolInstance(toolName: string) {
  const tool = ALL_TOOLS[toolName as ALL_TOOL_NAMES];
  if (!tool) {
    return null;
  }
  return tool;
}

export function validateToolCall(toolCall: ToolCallPart) {
  const tool = ALL_TOOLS[toolCall.toolName as ALL_TOOL_NAMES];
  if (!tool) {
    return null;
  }
  return tool.validateModelInput(toolCall.input);
}

export function createToolSet(): ToolSet {
  const toolSet: ToolSet = {};
  Object.entries(ALL_TOOLS).forEach(([name, tool]) => {
    toolSet[name] = tool.createTool();
  });
  return toolSet;
}
