import * as React from "react";
import { Box, useApp } from "ink";

import { CustomSelect, CustomText } from "../components";
import { renderWithColor } from "../utils";
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
      <CustomText color={RED}>
        EULA declined. Nitro cannot be used without accepting the EULA.
      </CustomText>
    );
  }

  if (step.type === "accepted") {
    return (
      <CustomText color={GREEN}>EULA accepted. Welcome to Nitro!</CustomText>
    );
  }

  return (
    <Box flexDirection="column">
      <CustomText bold>End User License Agreement</CustomText>
      <Box marginTop={1} flexDirection="column">
        {EULA_TEXT.split("\n").map((line, i) => (
          <CustomText key={i} dimColor>
            {line}
          </CustomText>
        ))}
      </Box>
      <Box marginTop={1}>
        <CustomText dimColor>Do you accept the EULA?</CustomText>
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
  const { waitUntilExit } = await renderWithColor(<EulaScreen />);
  await waitUntilExit();
  const settings = loadSettings();
  return settings.agreedToEula === EULA_VERSION;
}
