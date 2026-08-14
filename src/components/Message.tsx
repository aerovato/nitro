import {
  ReasoningPart,
  ToolModelMessage,
  ToolResultPart,
} from "@ai-sdk/provider-utils";
import { AssistantModelMessage, ModelMessage, TextPart } from "ai";
import { Box, Text } from "ink";
import React from "react";
import { ToolResultDisplay } from "./ToolResultDisplay";
import { useChatConfig } from "./ChatConfigContext";
import { AQUA, YELLOW } from "../colors";

type AssistantTurnMessage = AssistantModelMessage | ToolModelMessage;

interface AssistantTurnData {
  role: "assistant";
  messages: AssistantTurnMessage[];
}

interface UserTurnData {
  role: "user";
}

type TurnData = AssistantTurnData | UserTurnData;

function getDisplayedAssistantParts(
  message: AssistantModelMessage,
  showThinking: boolean,
): (ReasoningPart | TextPart)[] {
  const content = message.content;
  const parts =
    typeof content === "string"
      ? [{ type: "text", text: content } as TextPart]
      : content.filter(
          (part): part is ReasoningPart | TextPart =>
            part.type === "text" || part.type === "reasoning",
        );
  return parts.filter(
    part =>
      part.text.trim().length > 0
      && (showThinking || part.type !== "reasoning"),
  );
}

function getToolResultParts(message: ToolModelMessage): ToolResultPart[] {
  return message.content.filter(part => part.type === "tool-result");
}

function AssistantMessage({
  parts,
}: {
  parts: (ReasoningPart | TextPart)[];
}): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      width="100%"
      borderStyle="single"
      borderTop={false}
      borderRight={false}
      borderBottom={false}
      borderColor={AQUA}
      paddingLeft={2}
    >
      {parts.map((part, i) => {
        if (part.type === "reasoning") {
          return <ReasoningPartBlock key={i} text={part.text} />;
        }
        return <TextPartBlock key={i} text={part.text} />;
      })}
    </Box>
  );
}

function ReasoningPartBlock({ text }: { text: string }): React.ReactElement {
  return <Text dimColor>{text.trim()}</Text>;
}

function TextPartBlock({ text }: { text: string }): React.ReactElement {
  return <Text>{text.trim()}</Text>;
}

function ToolMessage({
  parts,
}: {
  parts: ToolResultPart[];
}): React.ReactElement {
  const { settings } = useChatConfig();
  return (
    <Box
      flexDirection="column"
      width="100%"
      borderStyle="single"
      borderTop={false}
      borderRight={false}
      borderBottom={false}
      borderColor={YELLOW}
      paddingLeft={2}
    >
      {parts.map((part, i) => (
        <ToolResultDisplay
          key={i}
          toolName={part.toolName}
          output={part.output}
          settings={settings}
        />
      ))}
    </Box>
  );
}

function AssistantTurn({
  messages,
  footer,
}: {
  messages: AssistantTurnMessage[];
  footer: React.ReactNode;
}): React.ReactElement | null {
  const { settings } = useChatConfig();
  const content = messages.map((message, index) => {
    if (message.role === "assistant") {
      const parts = getDisplayedAssistantParts(message, settings.showThinking);
      return parts.length > 0 ? (
        <AssistantMessage key={index} parts={parts} />
      ) : null;
    }
    const parts = getToolResultParts(message);
    return parts.length > 0 ? <ToolMessage key={index} parts={parts} /> : null;
  });

  if (content.every(item => item === null) && footer === null) {
    return null;
  }

  return (
    <Box flexDirection="column" width="100%">
      {content}
      {footer}
    </Box>
  );
}

function groupMessages(messages: ModelMessage[]): TurnData[] {
  const turns: TurnData[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      turns.push({ role: "user" });
      continue;
    }
    if (message.role !== "assistant" && message.role !== "tool") {
      continue;
    }
    const lastTurn = turns[turns.length - 1];
    if (lastTurn?.role === "assistant") {
      lastTurn.messages.push(message);
    } else {
      turns.push({ role: "assistant", messages: [message] });
    }
  }
  return turns;
}

export interface MessageListProps {
  messages: ModelMessage[];
  assistantFooter?: React.ReactNode;
}

export function MessageList({
  messages,
  assistantFooter = null,
}: MessageListProps): React.ReactElement {
  const turns = groupMessages(messages);
  const lastTurn = turns[turns.length - 1];
  if (assistantFooter !== null && lastTurn?.role !== "assistant") {
    turns.push({ role: "assistant", messages: [] });
  }

  return (
    <Box flexDirection="column">
      {turns.map((turn, index) =>
        turn.role === "user" ? null : (
          <AssistantTurn
            key={index}
            messages={turn.messages}
            footer={index === turns.length - 1 ? assistantFooter : null}
          />
        ),
      )}
    </Box>
  );
}
