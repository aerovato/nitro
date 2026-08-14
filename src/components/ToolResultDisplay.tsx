import * as React from "react";
import type { ToolResultOutput } from "@ai-sdk/provider-utils";
import { Box, Text } from "ink";

import { RED, YELLOW } from "../colors";
import type { Settings } from "../logic/settings";
import type { AskUserToolOutput, BashToolOutput } from "../tools";
import { getToolDefinition } from "../tools";
import { expandTabs } from "../utils";

export interface ToolResultDisplayProps {
  toolName: string;
  output: ToolResultOutput;
  settings: Settings;
}

export function ToolResultDisplay({
  toolName,
  output,
  settings,
}: ToolResultDisplayProps): React.ReactElement {
  const definition = getToolDefinition(toolName);
  if (definition === null) {
    return <Text color={RED}>Error: Unknown tool called {toolName}</Text>;
  }

  if (output.type === "error-text") {
    return (
      <Text color={RED}>
        Error: {toolName} tool call failed: {output.value}
      </Text>
    );
  }

  if (output.type === "error-json") {
    const summary =
      typeof output.value === "string" && output.value.trim().length > 0
        ? output.value.trim()
        : "Tool call failed validation.";
    return (
      <Text color={RED}>
        Error: {toolName} tool call failed: {summary}
      </Text>
    );
  }

  if (output.type !== "json") {
    return (
      <Text color={RED}>
        Error: Unsupported tool output type "{output.type}".
      </Text>
    );
  }

  const validated = definition.outputSchema.safeParse(output.value);
  if (!validated.success) {
    return (
      <Text color={RED}>Error: {toolName} returned unrecognized output.</Text>
    );
  }

  if (toolName === "AskUser") {
    return <AskResult output={validated.data as AskUserToolOutput} />;
  }
  if (toolName === "Bash") {
    return (
      <BashResult
        output={validated.data as BashToolOutput}
        showCommandOutput={settings.showCommandOutput}
      />
    );
  }
  return <Text color={RED}>Error: No renderer for tool {toolName}</Text>;
}

function AskResult({
  output,
}: {
  output: AskUserToolOutput;
}): React.ReactElement {
  const numberQuestions = output.answers.length;
  return (
    <Text color={YELLOW}>
      Answered {numberQuestions} question
      {numberQuestions !== 1 ? "s" : ""}
    </Text>
  );
}

function BashResult({
  output,
  showCommandOutput,
}: {
  output: BashToolOutput;
  showCommandOutput: boolean;
}): React.ReactElement {
  if (!output.approved) {
    return <Text color={RED}>[Denied] $ {output.command}</Text>;
  }

  const header = <Text color={YELLOW}>$ {output.command}</Text>;
  if (!showCommandOutput) {
    return header;
  }

  let truncatedOutput = output.commandOutput.split("\n");
  if (truncatedOutput.length > 16) {
    truncatedOutput = [
      ...truncatedOutput.slice(0, 8),
      "out:\t...",
      ...truncatedOutput.slice(-8),
    ];
  }
  const cleanedOutput = truncatedOutput
    .map(line => line.substring(5))
    .join("\n");
  const tabFixedOutput = expandTabs(cleanedOutput);
  if (tabFixedOutput.trim().length === 0) {
    return header;
  }
  return (
    <Box flexDirection="column" rowGap={1}>
      {header}
      <Text dimColor>{tabFixedOutput}</Text>
    </Box>
  );
}
