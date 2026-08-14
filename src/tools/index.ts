import { tool, type ToolSet } from "ai";
import type { z } from "zod";

import { askTool } from "./ask";
import { bashTool } from "./bash";
import type { ToolDefinition } from "./tool";

export * from "./ask";
export * from "./bash";
export * from "./tool";

export type AnyToolDefinition = ToolDefinition<
  z.ZodType<Record<string, unknown>>,
  z.ZodType<Record<string, unknown>>,
  z.ZodType<Record<string, unknown>>
>;

const TOOL_DEFINITIONS: Record<string, AnyToolDefinition> = {
  [askTool.name]: askTool,
  [bashTool.name]: bashTool,
};

export function getToolDefinition(toolName: string): AnyToolDefinition | null {
  const definition = TOOL_DEFINITIONS[toolName];
  if (!definition) {
    return null;
  }
  return definition;
}

export function createToolSet(): ToolSet {
  const toolSet: ToolSet = {};
  Object.entries(TOOL_DEFINITIONS).forEach(([name, definition]) => {
    toolSet[name] = tool({
      description: definition.description,
      inputSchema: definition.modelInputSchema,
    });
  });
  return toolSet;
}
