import * as React from "react";
import { Box, useApp } from "ink";

import { CustomSelect, CustomSelectOption, CustomText } from "../components";

import {
  listProviders,
  setDefaultProvider,
  getDefaultProvider,
} from "../logic/provider";
import { renderWithColor } from "../utils";
import { RED, GREEN, YELLOW, FG_SECONDARY } from "../colors";

const CANCEL_OPTION_VALUE = "__cancel__";

type DefaultStep =
  | { type: "select" }
  | { type: "done"; provider: string; success: boolean }
  | { type: "cancel" };

export function ProviderDefaultScreen(): React.ReactElement {
  const { exit } = useApp();
  const providers = React.useMemo(() => listProviders(), []);
  const defaultProvider = React.useMemo(() => getDefaultProvider(), []);
  const [step, setStep] = React.useState<DefaultStep>({ type: "select" });
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  React.useEffect(() => {
    if (step.type === "done" || step.type === "cancel") {
      exit();
    }
  }, [step, exit]);

  const selectOptions: CustomSelectOption[] = React.useMemo(() => {
    const defaultProviderName = defaultProvider?.name;
    const filteredProviders = providers.filter(p => p !== defaultProviderName);
    const filteredProviderOptions: CustomSelectOption[] = filteredProviders.map(
      p => ({ value: p, label: p }),
    );
    if (defaultProviderName) {
      filteredProviderOptions.unshift({
        value: defaultProviderName,
        label: `${defaultProviderName} (default)`,
        color: GREEN,
      });
    }
    filteredProviderOptions.push({
      value: CANCEL_OPTION_VALUE,
      label: "Cancel",
      color: YELLOW,
    });
    return filteredProviderOptions;
  }, [providers, defaultProvider]);

  const handleProviderSelect = (value: string) => {
    if (value === CANCEL_OPTION_VALUE) {
      setStep({ type: "cancel" });
    } else {
      const success = setDefaultProvider(value);
      setStep({ type: "done", provider: value, success });
    }
  };

  if (providers.length === 0) {
    return <CustomText color={RED}>No providers configured</CustomText>;
  }

  if (step.type === "cancel") {
    return <CustomText color={FG_SECONDARY}>Cancelled</CustomText>;
  }

  if (step.type === "done") {
    if (step.success) {
      return (
        <CustomText color={GREEN}>
          Default provider set to "{step.provider}"
        </CustomText>
      );
    } else {
      return (
        <CustomText color={RED}>
          Failed to set "{step.provider}" as default provider
        </CustomText>
      );
    }
  }

  return (
    <Box flexDirection="column">
      <CustomText dimColor>Select default provider:</CustomText>
      <CustomSelect
        options={selectOptions}
        focusedIndex={focusedIndex}
        onChange={handleProviderSelect}
        onFocusedIndexChange={setFocusedIndex}
      />
    </Box>
  );
}

export async function runProviderDefaultScreen(): Promise<void> {
  const { waitUntilExit } = await renderWithColor(<ProviderDefaultScreen />);
  await waitUntilExit();
}
