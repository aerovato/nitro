import * as React from "react";
import { Box } from "ink";
import type { ToolCallPart, ToolResultPart, JSONValue } from "ai";

import { CustomText } from "./custom";
import { AskPrompt } from "./ask/AskPrompt";
import { BashPrompt } from "./bash/BashPrompt";
import { validateToolCall, NitroTool } from "../tools";
import type { AskUserModelInput, BashModelInput } from "../tools";

export interface ToolDisplayProps {
  toolCalls: ToolCallPart[];
  submitToolResults: (results: ToolResultPart[]) => void;
}

function ToolProgressIndicator({
  activeIndex,
  total,
}: {
  activeIndex: number;
  total: number;
}): React.ReactElement | null {
  if (total <= 1) return null;
  return (
    <Box paddingX={3}>
      <CustomText dimColor>
        Tool {activeIndex + 1} of {total}
      </CustomText>
    </Box>
  );
}

export function ToolDisplay({
  toolCalls,
  submitToolResults,
}: ToolDisplayProps): React.ReactElement | null {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [results, setResults] = React.useState<ToolResultPart[]>(
    new Array(toolCalls.length).fill(null),
  );

  const activeCall = toolCalls[activeIndex];

  const addResult = React.useCallback(
    (result: ToolResultPart) => {
      const updatedResults = [...results];
      updatedResults[activeIndex] = result;
      setResults(updatedResults);

      if (activeIndex < toolCalls.length - 1) {
        setActiveIndex(activeIndex + 1);
      } else {
        submitToolResults(updatedResults);
      }
    },
    [activeIndex, results, submitToolResults, toolCalls.length],
  );

  React.useEffect(() => {
    if (activeCall) {
      const validationResult = validateToolCall(activeCall);
      if (validationResult === null) {
        const error = NitroTool.toolNotFoundError(activeCall.toolName);
        addResult({
          type: "tool-result",
          toolCallId: activeCall.toolCallId,
          toolName: activeCall.toolName,
          output: { type: "error-json", value: error },
        });
      } else if (!validationResult.success) {
        const error = NitroTool.validationError(validationResult);
        addResult({
          type: "tool-result",
          toolCallId: activeCall.toolCallId,
          toolName: activeCall.toolName,
          output: { type: "error-json", value: error as JSONValue },
        });
      }
    }
  }, [activeCall, addResult]);

  if (!activeCall) {
    return null;
  }
  const validationResult = validateToolCall(activeCall);
  if (!validationResult || !validationResult.success) {
    return null;
  }

  const toolName = activeCall.toolName;

  const submitOutput = (output: unknown) => {
    const result: ToolResultPart = {
      type: "tool-result",
      toolCallId: activeCall.toolCallId,
      toolName: activeCall.toolName,
      output: { type: "json", value: output as JSONValue },
    };
    addResult(result);
  };

  return (
    <Box flexDirection="column">
      <ToolProgressIndicator
        activeIndex={activeIndex}
        total={toolCalls.length}
      />
      {toolName === "AskUser" && (
        <AskPrompt
          modelInput={validationResult.data as AskUserModelInput}
          onSubmit={submitOutput}
        />
      )}
      {toolName === "Bash" && (
        <BashPrompt
          modelInput={validationResult.data as BashModelInput}
          onSubmit={submitOutput}
        />
      )}
    </Box>
  );
}
