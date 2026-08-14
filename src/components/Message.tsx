import {
  ReasoningPart,
  ToolModelMessage,
  ToolResultPart,
  UserModelMessage,
} from "@ai-sdk/provider-utils";
import { AssistantModelMessage, ModelMessage, TextPart } from "ai";
import { Box } from "ink";
import React from "react";
import { CustomText } from "./custom";
import { ToolResultDisplay } from "./ToolResultDisplay";
import { BG_PRIMARY, BG_SECONDARY, FG_PRIMARY } from "../colors";
import { useChatConfig } from "./ChatConfigContext";

type AssistantTurnMessage = AssistantModelMessage | ToolModelMessage;

interface AssistantTurnData {
  role: "assistant";
  messages: AssistantTurnMessage[];
}

interface UserTurnData {
  role: "user";
  message: UserModelMessage;
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
    <Box flexDirection="column" rowGap={1}>
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
  return <CustomText dimColor>{text.trim()}</CustomText>;
}

function TextPartBlock({ text }: { text: string }): React.ReactElement {
  return <CustomText>{text.trim()}</CustomText>;
}

function UserMessage({
  message,
}: {
  message: UserModelMessage;
}): React.ReactElement {
  const parts: TextPart[] = [];
  const content = message.content;
  if (typeof content === "string") {
    parts.push({ type: "text", text: content });
  } else {
    parts.push(...content.filter(part => part.type === "text"));
  }
  return (
    <Box
      flexDirection="column"
      width="100%"
      backgroundColor={BG_SECONDARY}
      paddingX={3}
      paddingY={1}
    >
      {parts.map((part, i) => (
        <CustomText key={i} color={FG_PRIMARY}>
          {part.text.trim()}
        </CustomText>
      ))}
    </Box>
  );
}

function ToolMessage({
  parts,
}: {
  parts: ToolResultPart[];
}): React.ReactElement {
  const { settings } = useChatConfig();
  return (
    <Box flexDirection="column" width="100%" rowGap={1}>
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
    <Box
      flexDirection="column"
      width="100%"
      backgroundColor={BG_PRIMARY}
      rowGap={1}
      paddingX={3}
      paddingY={1}
    >
      {content}
      {footer}
    </Box>
  );
}

function groupMessages(messages: ModelMessage[]): TurnData[] {
  const turns: TurnData[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      turns.push({ role: "user", message });
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
        turn.role === "user" ? (
          <UserMessage key={index} message={turn.message} />
        ) : (
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
