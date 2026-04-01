import * as React from "react";
import { getSystemPrompt, loadSettings, Settings } from "../logic/settings";
import { ProviderInfoWithName } from "../logic/provider";
import { getDefaultChatProvider } from "../logic/llm";
import { exitWithError } from "../utils";

export interface ChatConfig {
  settings: Settings;
  provider: ProviderInfoWithName;
  systemPrompt: string;
}

export const ChatConfigContext = React.createContext<ChatConfig | null>(null);

interface ChatConfigProviderProps {
  children: React.ReactNode;
  settingsOverride?: Partial<Settings>;
}

export function ChatConfigProvider({
  children,
  settingsOverride,
}: ChatConfigProviderProps): React.ReactElement {
  const [config] = React.useState<ChatConfig>(() => {
    const settings = { ...loadSettings(), ...settingsOverride };
    const provider = getDefaultChatProvider();
    const systemPrompt = getSystemPrompt();

    if (provider === null) {
      exitWithError(
        "Error: Default provider not configured. Please configure with `nitro provider default`.",
      );
    }

    return {
      settings,
      provider: provider,
      systemPrompt,
    };
  });

  return (
    <ChatConfigContext.Provider value={config}>
      {children}
    </ChatConfigContext.Provider>
  );
}

export function useChatConfig(): ChatConfig {
  const context = React.useContext(ChatConfigContext);
  if (context === null) {
    throw new Error("useChatConfig must be used within a ChatConfigProvider");
  }
  return context;
}
