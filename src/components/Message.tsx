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
import { BG_PRIMARY, BG_SECONDARY, FG_PRIMARY, RED } from "../colors";
import { getToolInstance } from "../tools/index";
import { useChatConfig } from "./ChatConfigContext";

function AssistantMessage({
  message,
}: {
  message: AssistantModelMessage;
}): React.ReactElement {
  const { settings } = useChatConfig();
  const content = message.content;
  let parts: (ReasoningPart | TextPart)[] =
    typeof content === "string"
      ? [{ type: "text", text: content }]
      : content.filter(
          part => part.type === "text" || part.type === "reasoning",
        );
  if (!settings.showThinking) {
    parts = parts.filter(part => part.type !== "reasoning");
  }
  return (
    <Box
      flexDirection="column"
      backgroundColor={BG_PRIMARY}
      rowGap={1}
      paddingX={3}
      paddingY={1}
    >
      {parts.length === 0 && <CustomText dimColor>Generating...</CustomText>}
      {parts.map((part, i) => {
        if (part.type === "reasoning") {
          return <ReasoningPartBlock key={i} text={part.text} />;
        } else if (part.type === "text") {
          return <TextPartBlock key={i} text={part.text} />;
        }
      })}
    </Box>
  );
}

function ReasoningPartBlock({ text }: { text: string }): React.ReactElement {
  text = text.trim();
  return text ? <CustomText dimColor>{text}</CustomText> : <></>;
}

function TextPartBlock({ text }: { text: string }): React.ReactElement {
  text = text.trim();
  return text ? <CustomText>{text.trim()}</CustomText> : <></>;
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
  message,
}: {
  message: ToolModelMessage;
}): React.ReactElement {
  const parts: ToolResultPart[] = [];
  const content = message.content;
  parts.push(
    ...content.filter(toolResult => toolResult.type === "tool-result"),
  );
  return (
    <Box
      flexDirection="column"
      width="100%"
      backgroundColor={BG_PRIMARY}
      paddingX={3}
    >
      {parts.map((part, i) => {
        const toolName = part.toolName;
        const tool = getToolInstance(toolName);
        if (tool) {
          return (
            <React.Fragment key={i}>
              {tool.formatOutput(
                "value" in part.output ? part.output.value : undefined,
              )}
            </React.Fragment>
          );
        }
        return (
          <CustomText key={i} color={RED}>
            Error: Unknown tool called {toolName}
          </CustomText>
        );
      })}
    </Box>
  );
}

export interface MessageListProps {
  messages: ModelMessage[];
}

export function MessageList({
  messages,
}: MessageListProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      {messages.map((msg, i) => {
        if (msg.role === "user") {
          return <UserMessage key={i} message={msg} />;
        } else if (msg.role === "assistant") {
          return <AssistantMessage key={i} message={msg} />;
        } else if (msg.role === "tool") {
          return <ToolMessage key={i} message={msg} />;
        }
      })}
    </Box>
  );
}
