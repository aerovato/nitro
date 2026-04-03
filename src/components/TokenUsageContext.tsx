import * as React from "react";
import type { LanguageModelUsage } from "ai";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export const TokenUsageContext = React.createContext<{
  usage: TokenUsage;
  addUsage: (stepUsage: LanguageModelUsage) => void;
} | null>(null);

interface TokenUsageProviderProps {
  children: React.ReactNode;
}

export function TokenUsageProvider({
  children,
}: TokenUsageProviderProps): React.ReactElement {
  const [usage, setUsage] = React.useState<TokenUsage>(() => ({
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  }));

  const addUsage = React.useCallback((stepUsage: LanguageModelUsage) => {
    setUsage(prev => ({
      inputTokens: prev.inputTokens + (stepUsage.inputTokens ?? 0),
      outputTokens: prev.outputTokens + (stepUsage.outputTokens ?? 0),
      cacheReadTokens:
        prev.cacheReadTokens
        + (stepUsage.inputTokenDetails?.cacheReadTokens ?? 0),
      cacheWriteTokens:
        prev.cacheWriteTokens
        + (stepUsage.inputTokenDetails?.cacheWriteTokens ?? 0),
    }));
  }, []);

  return (
    <TokenUsageContext.Provider value={{ usage, addUsage }}>
      {children}
    </TokenUsageContext.Provider>
  );
}

export function useTokenUsage(): {
  usage: TokenUsage;
  addUsage: (stepUsage: LanguageModelUsage) => void;
} {
  const context = React.useContext(TokenUsageContext);
  if (context === null) {
    throw new Error("useTokenUsage must be used within a TokenUsageProvider");
  }
  return context;
}
