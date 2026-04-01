import * as React from "react";
import { Box, useApp } from "ink";
import { Select } from "@inkjs/ui";

import { CustomSelect, CustomText, CustomTextInput } from "../components";

import {
  loadSettings,
  saveSettings,
  SETTINGS_META,
  type Settings,
  type SettingMeta,
} from "../logic/settings";
import { renderWithColor } from "../utils";
import { RED } from "../colors";

const DONE_VALUE = "__done__";

function formatValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "On" : "Off";
  }
  return String(value);
}

type SettingsStep =
  | { type: "menu" }
  | { type: "edit-select"; meta: SettingMeta }
  | { type: "edit-text"; meta: SettingMeta; error?: string }
  | { type: "done" };

export function SettingsScreen(): React.ReactElement {
  const { exit } = useApp();
  const [settings, setSettings] = React.useState<Settings>(() =>
    loadSettings(),
  );
  const [step, setStep] = React.useState<SettingsStep>({ type: "menu" });
  const [textInput, setTextInput] = React.useState("");
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  React.useEffect(() => {
    if (step.type === "done") {
      exit();
    }
  }, [step, exit]);

  const menuOptions = React.useMemo(() => {
    const options: { value: string; label: string }[] = SETTINGS_META.map(
      (meta: SettingMeta) => ({
        value: meta.key,
        label: `${meta.label}: ${formatValue(settings[meta.key])}`,
      }),
    );
    options.push({ value: DONE_VALUE, label: "Done" });
    return options;
  }, [settings]);

  const handleMenuSelect = (value: string) => {
    if (value === DONE_VALUE) {
      setStep({ type: "done" });
      return;
    }
    const meta = SETTINGS_META.find(m => m.key === value);
    if (!meta) return;

    if (meta.type === "boolean") {
      const currentValue = settings[meta.key] as boolean;
      const newSettings = { ...settings, [meta.key]: !currentValue };
      setSettings(newSettings);
      saveSettings(newSettings);
    } else if (meta.type === "select") {
      setStep({ type: "edit-select", meta });
    } else if (meta.type === "text") {
      setTextInput(String(settings[meta.key]));
      setStep({ type: "edit-text", meta });
    }
  };

  const handleSelectOption = (value: string) => {
    if (step.type !== "edit-select") return;
    const newSettings = { ...settings, [step.meta.key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
    setStep({ type: "menu" });
  };

  const handleTextSubmit = (value: string) => {
    if (step.type !== "edit-text") return;
    const meta = step.meta;
    if (!meta.validate) {
      setStep({ type: "menu" });
      return;
    }
    const result = meta.validate(value);
    if (result.success) {
      const newSettings = { ...settings, [meta.key]: result.value };
      setSettings(newSettings);
      saveSettings(newSettings);
      setStep({ type: "menu" });
    } else {
      setStep({ ...step, error: result.error });
    }
  };

  if (step.type === "menu") {
    return (
      <Box flexDirection="column">
        <CustomText dimColor>
          Select a setting to configure. Select Done to exit.
        </CustomText>
        <CustomSelect
          options={menuOptions}
          focusedIndex={focusedIndex}
          onChange={handleMenuSelect}
          onFocusedIndexChange={setFocusedIndex}
          visibleOptionCount={20}
        />
      </Box>
    );
  }

  if (step.type === "edit-select") {
    const options =
      step.meta.options?.map(opt => ({
        value: String(opt.value),
        label: opt.label,
      })) ?? [];
    return (
      <Box flexDirection="column">
        <CustomText dimColor>{step.meta.label}</CustomText>
        <Select options={options} onChange={handleSelectOption} />
      </Box>
    );
  }

  if (step.type === "edit-text") {
    return (
      <Box flexDirection="column">
        <CustomText dimColor>
          {step.meta.label}: {step.meta.description}
        </CustomText>
        {step.error && <CustomText color={RED}>{step.error}</CustomText>}
        <Box>
          <CustomText dimColor>Value: </CustomText>
          <CustomTextInput
            value={textInput}
            onChange={setTextInput}
            onSubmit={handleTextSubmit}
          />
        </Box>
      </Box>
    );
  }

  return <CustomText>Settings saved.</CustomText>;
}

export async function runSettingsScreen(): Promise<void> {
  const { waitUntilExit } = await renderWithColor(<SettingsScreen />);
  await waitUntilExit();
}
