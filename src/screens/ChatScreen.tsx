import * as React from "react";
import { Box, useApp } from "ink";

import { runProviderDefaultScreen } from "./ProviderDefaultScreen";
import { ChatBox, MessageList, ToolDisplay } from "../components";

import { getDefaultProvider } from "../logic/provider";
import { useChatState } from "../hooks/useChatState";
import { renderWithColor } from "../utils";
import { BG_PRIMARY } from "../colors";
import {
  ChatConfigProvider,
  useChatConfig,
} from "../components/ChatConfigContext";

interface ChatScreenProps {
  initialRequest: string;
  quitOnFinish: boolean;
  initialFilename?: string;
  hidePreviousMessages?: boolean;
}

export function ChatScreen({
  initialRequest,
  quitOnFinish,
  initialFilename,
  hidePreviousMessages,
}: ChatScreenProps): React.ReactElement | null {
  const { exit } = useApp();
  const chatConfig = useChatConfig();
  const { state, submitMessage, submitToolResults } = useChatState({
    ...chatConfig,
    initialFilename,
  });
  const messages = state.messages;

  const [sentInitial, setSentInitial] = React.useState(false);
  React.useEffect(() => {
    if (!sentInitial) {
      setSentInitial(true);
      if (initialRequest) {
        submitMessage(initialRequest);
      }
    }
  }, [sentInitial, state.pending, initialRequest, submitMessage]);

  const prevPending = React.useRef(state.pending);
  React.useEffect(() => {
    if (
      quitOnFinish
      && prevPending.current === "provider"
      && state.pending === "user"
    ) {
      exit();
    }
    prevPending.current = state.pending;
  }, [quitOnFinish, state.pending, exit]);

  const [inputValue, setInputValue] = React.useState("");

  const [initialMessageCount] = React.useState<number>(
    hidePreviousMessages ? messages.length : 0,
  );
  const displayedMessages = hidePreviousMessages
    ? messages.slice(initialMessageCount ?? 0)
    : messages;

  return (
    <Box flexDirection="column" backgroundColor={BG_PRIMARY}>
      <MessageList messages={displayedMessages} />
      {state.pending === "tool" && (
        <ToolDisplay
          toolCalls={state.toolCalls}
          submitToolResults={submitToolResults}
        />
      )}
      {state.pending === "user" && !quitOnFinish && (
        <ChatBox
          inputValue={inputValue}
          placeholder={
            messages.length === 0
              ? "Ask for anything..."
              : "Send another request..."
          }
          onChange={setInputValue}
          onSubmit={() => {
            if (submitMessage(inputValue)) {
              setInputValue("");
            }
          }}
        />
      )}
    </Box>
  );
}

export interface RunChatScreenOptions {
  initialRequest?: string;
  quitOnFinish: boolean;
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
        initialRequest={options.initialRequest ?? ""}
        quitOnFinish={options.quitOnFinish}
        initialFilename={options.initialFilename}
        hidePreviousMessages={options.hidePreviousMessages}
      />
    </ChatConfigProvider>,
  );
  await waitUntilExit();
}
