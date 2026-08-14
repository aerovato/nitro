import * as React from "react";
import { Box, Text, useApp } from "ink";

import { runProviderDefaultScreen } from "./ProviderDefaultScreen";
import {
  MessageList,
  ToolDisplay,
  TokenUsageProvider,
  useTokenUsage,
} from "../components";

import { getDefaultProvider } from "../logic/provider";
import { useChatState } from "../hooks/useChatState";
import { renderWithColor } from "../utils";
import { GREEN, YELLOW } from "../colors";
import {
  ChatConfigProvider,
  useChatConfig,
} from "../components/ChatConfigContext";

interface ChatScreenProps {
  initialRequest: string;
  initialFilename?: string;
  hidePreviousMessages?: boolean;
}

function ChatScreenInner({
  initialRequest,
  initialFilename,
  hidePreviousMessages,
}: ChatScreenProps): React.ReactElement | null {
  const { exit } = useApp();
  const chatConfig = useChatConfig();
  const { usage } = useTokenUsage();
  const { state, submitMessage, submitToolInput } = useChatState({
    ...chatConfig,
    initialFilename,
  });
  const messages = state.messages;

  const usageRef = React.useRef(usage);
  const showTokenSummaryRef = React.useRef(
    chatConfig.settings.showTokenSummary,
  );
  React.useEffect(() => {
    usageRef.current = usage;
    showTokenSummaryRef.current = chatConfig.settings.showTokenSummary;
  }, [usage, chatConfig.settings.showTokenSummary]);

  React.useEffect(() => {
    return () => {
      if (showTokenSummaryRef.current && usageRef.current.inputTokens > 0) {
        console.log("\nToken Usage Summary:");
        console.log(`  Input:       ${usageRef.current.inputTokens}`);
        console.log(`  Output:      ${usageRef.current.outputTokens}`);
        console.log(`  Cache Read:  ${usageRef.current.cacheReadTokens}`);
        console.log(`  Cache Write: ${usageRef.current.cacheWriteTokens}`);
      }
    };
  }, []);

  const [sentInitial, setSentInitial] = React.useState(false);
  React.useEffect(() => {
    if (!sentInitial && initialRequest) {
      setSentInitial(true);
      submitMessage(initialRequest);
    }
  }, [sentInitial, initialRequest, submitMessage]);

  const prevPending = React.useRef(state.pending);
  React.useEffect(() => {
    if (prevPending.current !== "user" && state.pending === "user") {
      exit();
    }
    prevPending.current = state.pending;
  }, [state.pending, exit]);

  const [initialMessageCount] = React.useState<number>(
    hidePreviousMessages ? messages.length : 0,
  );
  const displayedMessages = hidePreviousMessages
    ? messages.slice(initialMessageCount ?? 0)
    : messages;

  let assistantFooter: React.ReactNode = null;
  if (state.pending === "tool") {
    assistantFooter = (
      <ToolDisplay prompt={state.prompt} onSubmit={submitToolInput} />
    );
  } else if (state.pending === "executing") {
    assistantFooter = (
      <Box
        borderStyle="single"
        borderTop={false}
        borderRight={false}
        borderBottom={false}
        borderColor={YELLOW}
        paddingLeft={2}
      >
        <Text color={GREEN}>{state.label}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <MessageList
        messages={displayedMessages}
        assistantFooter={assistantFooter}
      />
    </Box>
  );
}

export function ChatScreen(props: ChatScreenProps): React.ReactElement {
  return (
    <TokenUsageProvider>
      <ChatScreenInner {...props} />
    </TokenUsageProvider>
  );
}

export interface RunChatScreenOptions {
  initialRequest: string;
  initialFilename?: string;
  hidePreviousMessages?: boolean;
  strictMode?: boolean;
}

export async function runChatScreen(
  options: RunChatScreenOptions,
): Promise<void> {
  // Check if default provider exists, if not prompt user to select
  const defaultProvider = getDefaultProvider();
  if (!defaultProvider) {
    await runProviderDefaultScreen();
    // If user does not configure default provider
    const newProvider = getDefaultProvider();
    if (!newProvider) {
      return;
    }
  }

  const settingsOverride = options.strictMode
    ? { alwaysConfirm: true }
    : undefined;

  const { waitUntilExit } = await renderWithColor(
    <ChatConfigProvider settingsOverride={settingsOverride}>
      <ChatScreen
        initialRequest={options.initialRequest}
        initialFilename={options.initialFilename}
        hidePreviousMessages={options.hidePreviousMessages}
      />
    </ChatConfigProvider>,
  );
  await waitUntilExit();
}
