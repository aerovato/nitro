import * as React from "react";
import { Box } from "ink";

import { CustomText } from "../components";

import {
  getDefaultProvider,
  getProvider,
  listProviders,
  type ProviderInfoWithName,
} from "../logic/provider";
import { renderWithColor } from "../utils";
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
        <CustomText color={isDefault ? PURPLE : AQUA}>
          {provider.name}
          {isDefault ? " (default)" : ""}
        </CustomText>
      </Box>
      <Box paddingLeft={2} flexDirection="column">
        <Box>
          <CustomText dimColor>Base URL:</CustomText>
          <CustomText>{provider.baseURL}</CustomText>
        </Box>
        <Box>
          <CustomText dimColor>API Key:</CustomText>
          <CustomText>{censorApiKey(provider.apiKey)}</CustomText>
        </Box>
        <Box>
          <CustomText dimColor>Model:</CustomText>
          <CustomText>{provider.model}</CustomText>
        </Box>
        <Box>
          <CustomText dimColor>API Type:</CustomText>
          <CustomText>{provider.apiType}</CustomText>
        </Box>
      </Box>
    </Box>
  );
}

export function ProviderListScreen(): React.ReactElement {
  const providers = React.useMemo(() => listProviders(), []);
  const defaultProvider = React.useMemo(() => getDefaultProvider(), []);

  if (providers.length === 0) {
    return <CustomText dimColor>No providers configured</CustomText>;
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
  const { waitUntilExit } = await renderWithColor(<ProviderListScreen />);
  await waitUntilExit();
}
