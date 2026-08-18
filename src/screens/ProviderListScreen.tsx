import * as React from "react";
import { Box, Text, render } from "ink";

import {
  getDefaultProvider,
  getProvider,
  listProviders,
  type ProviderInfoWithName,
} from "../logic/provider";
import { AQUA, PURPLE } from "../colors";

function censorApiKey(apiKey: string): string {
  if (apiKey === "") {
    return "(none)";
  }
  if (apiKey.length <= 10) {
    return apiKey;
  }
  const first5 = apiKey.slice(0, 5);
  const last5 = apiKey.slice(-5);
  return `${first5}*****${last5}`;
}

function ProviderDisplay({
  provider,
  isDefault,
}: {
  provider: ProviderInfoWithName;
  isDefault: boolean;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Box>
        <Text color={isDefault ? PURPLE : AQUA}>
          {provider.name}
          {isDefault ? " (default)" : ""}
        </Text>
      </Box>
      <Box paddingLeft={2} flexDirection="column">
        <Box>
          <Text dimColor>Base URL:</Text>
          <Text>{provider.baseURL}</Text>
        </Box>
        <Box>
          <Text dimColor>API Key:</Text>
          <Text>{censorApiKey(provider.apiKey)}</Text>
        </Box>
        <Box>
          <Text dimColor>Model:</Text>
          <Text>{provider.model}</Text>
        </Box>
        <Box>
          <Text dimColor>API Type:</Text>
          <Text>{provider.apiType}</Text>
        </Box>
      </Box>
    </Box>
  );
}

export function ProviderListScreen(): React.ReactElement {
  const providers = React.useMemo(() => listProviders(), []);
  const defaultProvider = React.useMemo(() => getDefaultProvider(), []);

  if (providers.length === 0) {
    return <Text dimColor>No providers configured</Text>;
  }

  return (
    <Box flexDirection="column" rowGap={1}>
      {defaultProvider && (
        <ProviderDisplay provider={defaultProvider} isDefault={true} />
      )}
      {providers
        .filter(name => !defaultProvider || name !== defaultProvider.name)
        .map((name, i) => {
          const provider = getProvider(name);
          if (!provider) return null;
          return (
            <ProviderDisplay
              key={i}
              provider={{ ...provider, name }}
              isDefault={false}
            />
          );
        })}
    </Box>
  );
}

export async function runProviderListScreen(): Promise<void> {
  const { waitUntilExit } = render(<ProviderListScreen />);
  await waitUntilExit();
}
