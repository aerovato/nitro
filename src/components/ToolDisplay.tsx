import * as React from "react";

import { AskPrompt } from "./ask/AskPrompt";
import { BashPrompt } from "./bash/BashPrompt";
import type { ToolPrompt } from "../logic/agent";
import type { AskUserModelInput, BashModelInput } from "../tools";

export interface ToolDisplayProps {
  prompt: ToolPrompt;
  onSubmit: (userInput: unknown) => void;
}

export function ToolDisplay({
  prompt,
  onSubmit,
}: ToolDisplayProps): React.ReactElement | null {
  if (prompt.toolName === "AskUser") {
    return (
      <AskPrompt
        key={prompt.toolCallId}
        modelInput={prompt.modelInput as AskUserModelInput}
        onSubmit={onSubmit}
      />
    );
  }
  if (prompt.toolName === "Bash") {
    return (
      <BashPrompt
        key={prompt.toolCallId}
        modelInput={prompt.modelInput as BashModelInput}
        onSubmit={onSubmit}
      />
    );
  }
  return null;
}
