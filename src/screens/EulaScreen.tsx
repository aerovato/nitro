import * as React from "react";
import { Box, Text, render, useApp } from "ink";

import { CustomSelect } from "../components";
import { GREEN, RED } from "../colors";
import { loadSettings, saveSettings } from "../logic/settings";
import { EULA_TEXT, EULA_VERSION } from "../eula";

const ACCEPT_VALUE = "accept";
const DECLINE_VALUE = "decline";

type EulaStep =
  | { type: "prompt" }
  | { type: "accepted" }
  | { type: "declined" };

export function EulaScreen(): React.ReactElement {
  const { exit } = useApp();
  const [step, setStep] = React.useState<EulaStep>({ type: "prompt" });
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  React.useEffect(() => {
    if (step.type === "accepted" || step.type === "declined") {
      exit();
    }
  }, [step, exit]);

  const options = [
    { value: ACCEPT_VALUE, label: "Accept", color: GREEN },
    { value: DECLINE_VALUE, label: "Decline", color: RED },
  ];

  const handleSelect = (value: string) => {
    if (value === ACCEPT_VALUE) {
      const settings = loadSettings();
      saveSettings({ ...settings, agreedToEula: EULA_VERSION });
      setStep({ type: "accepted" });
    } else {
      setStep({ type: "declined" });
    }
  };

  if (step.type === "declined") {
    return (
      <Text color={RED}>
        EULA declined. Nitro cannot be used without accepting the EULA.
      </Text>
    );
  }

  if (step.type === "accepted") {
    return <Text color={GREEN}>EULA accepted. Welcome to Nitro!</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text bold>End User License Agreement</Text>
      <Box marginTop={1} flexDirection="column">
        {EULA_TEXT.split("\n").map((line, i) => (
          <Text key={i} dimColor>
            {line}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Do you accept the EULA?</Text>
      </Box>
      <CustomSelect
        options={options}
        focusedIndex={focusedIndex}
        onChange={handleSelect}
        onFocusedIndexChange={setFocusedIndex}
      />
    </Box>
  );
}

export async function runEulaScreen(): Promise<boolean> {
  const { waitUntilExit } = render(<EulaScreen />);
  await waitUntilExit();
  const settings = loadSettings();
  return settings.agreedToEula === EULA_VERSION;
}
