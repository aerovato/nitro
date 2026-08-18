import * as React from "react";
import { Box, Text, render, useApp } from "ink";

import { CustomSelect, CustomSelectOption } from "../components";

import {
  listProviders,
  removeProvider,
  getDefaultProvider,
} from "../logic/provider";
import { RED, YELLOW } from "../colors";

const CANCEL_OPTION_VALUE = "__cancel__";

type RemoveStep =
  | { type: "select" }
  | { type: "confirm"; provider: string }
  | { type: "done"; provider: string; removed: boolean }
  | { type: "cancel" };

export function ProviderRemoveScreen(): React.ReactElement {
  const { exit } = useApp();
  const providers = React.useMemo(() => listProviders(), []);
  const defaultProvider = React.useMemo(() => getDefaultProvider(), []);
  const [step, setStep] = React.useState<RemoveStep>({ type: "select" });
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
      filteredProviderOptions.push({
        value: defaultProviderName,
        label: `${defaultProviderName} (default)`,
        color: RED,
      });
    }
    filteredProviderOptions.push({
      value: CANCEL_OPTION_VALUE,
      label: "Cancel",
      color: YELLOW,
    });
    return filteredProviderOptions;
  }, [providers, defaultProvider]);

  const confirmOptions: CustomSelectOption[] = [
    { value: "yes", label: "Yes", color: RED },
    { value: "no", label: "No" },
  ];

  const handleProviderSelect = (value: string) => {
    if (value === CANCEL_OPTION_VALUE) {
      setStep({ type: "cancel" });
    } else {
      setStep({ type: "confirm", provider: value });
      setFocusedIndex(0);
    }
  };

  const handleConfirmSelect = (value: string) => {
    const s = step as { type: "confirm"; provider: string };
    if (value === "no") {
      setStep({ type: "done", provider: s.provider, removed: false });
      return;
    }
    const removed = removeProvider(s.provider);
    setStep({ type: "done", provider: s.provider, removed });
  };

  if (providers.length === 0) {
    return <Text color={RED}>No providers configured</Text>;
  }

  if (step.type === "cancel") {
    return <Text dimColor>Cancelled</Text>;
  }

  if (step.type === "done") {
    if (step.removed) {
      return <Text color={YELLOW}>Provider "{step.provider}" removed</Text>;
    } else {
      return <Text dimColor>Cancelled</Text>;
    }
  }

  return (
    <Box flexDirection="column">
      {step.type === "select" && (
        <>
          <Text dimColor>Select provider to remove:</Text>
          <CustomSelect
            options={selectOptions}
            focusedIndex={focusedIndex}
            onChange={handleProviderSelect}
            onFocusedIndexChange={setFocusedIndex}
          />
        </>
      )}

      {step.type === "confirm" && (
        <>
          <Text dimColor>Remove provider "{step.provider}"?</Text>
          <CustomSelect
            options={confirmOptions}
            focusedIndex={focusedIndex}
            onChange={handleConfirmSelect}
            onFocusedIndexChange={setFocusedIndex}
          />
        </>
      )}
    </Box>
  );
}

export async function runProviderRemoveScreen(): Promise<void> {
  const { waitUntilExit } = render(<ProviderRemoveScreen />);
  await waitUntilExit();
}
