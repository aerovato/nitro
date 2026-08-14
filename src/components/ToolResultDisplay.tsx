import * as React from "react";
import type { ToolResultOutput } from "@ai-sdk/provider-utils";

import { CustomText } from "./custom";
import { FG_SECONDARY, RED, YELLOW } from "../colors";
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
    return (
      <CustomText color={RED}>Error: Unknown tool called {toolName}</CustomText>
    );
  }

  if (output.type === "error-text") {
    return (
      <CustomText color={RED}>
        Error: {toolName} tool call failed: {output.value}
      </CustomText>
    );
  }

  if (output.type === "error-json") {
    const summary =
      typeof output.value === "string" && output.value.trim().length > 0
        ? output.value.trim()
        : "Tool call failed validation.";
    return (
      <CustomText color={RED}>
        Error: {toolName} tool call failed: {summary}
      </CustomText>
    );
  }

  if (output.type !== "json") {
    return (
      <CustomText color={RED}>
        Error: Unsupported tool output type "{output.type}".
      </CustomText>
    );
  }

  const validated = definition.outputSchema.safeParse(output.value);
  if (!validated.success) {
    return (
      <CustomText color={RED}>
        Error: {toolName} returned unrecognized output.
      </CustomText>
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
  return (
    <CustomText color={RED}>Error: No renderer for tool {toolName}</CustomText>
  );
}

function AskResult({
  output,
}: {
  output: AskUserToolOutput;
}): React.ReactElement {
  const numberQuestions = output.answers.length;
  return (
    <CustomText color={YELLOW}>
      AskUser: Answered {numberQuestions} question
      {numberQuestions !== 1 ? "s" : ""}
    </CustomText>
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
    return <CustomText color={RED}>[Denied] Bash: {output.command}</CustomText>;
  }

  const header = <CustomText color={YELLOW}>Bash: {output.command}</CustomText>;
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
  return (
    <>
      {header}
      <CustomText color={FG_SECONDARY}>{tabFixedOutput}</CustomText>
    </>
  );
}
