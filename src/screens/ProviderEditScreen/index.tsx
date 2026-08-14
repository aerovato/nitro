import * as React from "react";
import { Box, Text, useApp } from "ink";
import { CustomSelect, CustomTextInput } from "../../components";
import { renderWithColor } from "../../utils";
import { RED, GREEN, YELLOW } from "../../colors";
import { useProviderEditState } from "../../hooks/useProviderEditState";
import {
  type Step,
  type EditForm,
  isPastStep,
  API_TYPE_OPTIONS,
} from "./types";

function censorApiKey(apiKey: string): string {
  if (apiKey === "") return "(none)";
  if (apiKey.length <= 10) return apiKey;
  return `${apiKey.slice(0, 5)}*****${apiKey.slice(-5)}`;
}

function FormSummary({
  step,
  form,
  providerName,
}: {
  step: Step;
  form: EditForm;
  providerName: string;
}): React.ReactElement | null {
  return (
    <>
      {isPastStep(step, "select") && (
        <Box>
          <Text dimColor>Provider: </Text>
          <Text bold>{providerName}</Text>
        </Box>
      )}
      {isPastStep(step, "baseURL") && (
        <Box>
          <Text dimColor>Base URL: </Text>
          <Text>{form.baseURL}</Text>
        </Box>
      )}
      {isPastStep(step, "apiType") && (
        <Box>
          <Text dimColor>API Type: </Text>
          <Text>{form.apiType}</Text>
        </Box>
      )}
      {isPastStep(step, "apiKey") && (
        <Box>
          <Text dimColor>API Key: </Text>
          <Text>{form.apiKey ? censorApiKey(form.apiKey) : "(preserve)"}</Text>
        </Box>
      )}
      {isPastStep(step, "model") && (
        <Box>
          <Text dimColor>Model: </Text>
          <Text>{form.model}</Text>
        </Box>
      )}
    </>
  );
}

function TextStep({
  label,
  currentValue,
  error,
  textInput,
  setTextInput,
  onSubmit,
  placeholder,
}: {
  label: string;
  currentValue: string;
  error: string | null;
  textInput: string;
  setTextInput: (text: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text dimColor>
        Current {label}: {currentValue}
      </Text>
      {error && <Text color={RED}>{error}</Text>}
      <Box>
        <Text dimColor>{label}: </Text>
        <CustomTextInput
          value={textInput}
          onChange={setTextInput}
          onSubmit={onSubmit}
          placeholder={placeholder}
        />
      </Box>
    </Box>
  );
}

function SelectStep({
  label,
  currentValue,
  options,
  focusedIndex,
  setFocusedIndex,
  onSelect,
}: {
  label: string;
  currentValue: string;
  options: Array<{ value: string; label: string }>;
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  onSelect: (value: string) => void;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text dimColor>
        Current {label}: {currentValue}
      </Text>
      <Text dimColor>{label}:</Text>
      <CustomSelect
        options={options}
        focusedIndex={focusedIndex}
        onChange={onSelect}
        onFocusedIndexChange={setFocusedIndex}
      />
    </Box>
  );
}

function ModelStep({
  originalModel,
  error,
  models,
  modelsLoading,
  focusedIndex,
  setFocusedIndex,
  textInput,
  setTextInput,
  onSelect,
  onTextSubmit,
}: {
  originalModel: string;
  error: string | null;
  models: string[];
  modelsLoading: boolean;
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  textInput: string;
  setTextInput: (text: string) => void;
  onSelect: (value: string) => void;
  onTextSubmit: (value: string) => void;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text dimColor>Current Model: {originalModel}</Text>
      {error && <Text color={RED}>{error}</Text>}
      {modelsLoading ? (
        <Text color={YELLOW}>Fetching models...</Text>
      ) : models.length > 0 ? (
        <>
          <Text dimColor>Select a model:</Text>
          <CustomSelect
            options={[
              ...models.map(m => ({ value: m, label: m })),
              { value: "__custom__", label: "Custom Model ID" },
            ]}
            focusedIndex={focusedIndex}
            onChange={onSelect}
            onFocusedIndexChange={setFocusedIndex}
          />
        </>
      ) : (
        <Box>
          <Text dimColor>Model: </Text>
          <CustomTextInput
            value={textInput}
            onChange={setTextInput}
            onSubmit={onTextSubmit}
            placeholder={originalModel}
          />
        </Box>
      )}
    </Box>
  );
}

export function ProviderEditScreen(): React.ReactElement {
  const { exit } = useApp();
  const state = useProviderEditState();

  React.useEffect(() => {
    if (state.step === "done") {
      exit();
    }
  }, [state.step, exit]);

  if (state.providers.length === 0) {
    return <Text color={RED}>No providers configured</Text>;
  }

  if (state.step === "done") {
    return <Text color={GREEN}>Provider "{state.providerName}" updated</Text>;
  }

  const selectOptions = state.providers.map(p => ({ value: p, label: p }));

  return (
    <Box flexDirection="column">
      <FormSummary
        step={state.step}
        form={state.form}
        providerName={state.providerName}
      />

      {state.step === "select" && (
        <Box flexDirection="column">
          <Text dimColor>Select provider to edit:</Text>
          <CustomSelect
            options={selectOptions}
            focusedIndex={state.focusedIndex}
            onChange={state.handleProviderSelect}
            onFocusedIndexChange={state.setFocusedIndex}
          />
        </Box>
      )}

      {state.step === "baseURL" && state.original && (
        <TextStep
          label="Base URL"
          currentValue={state.original.baseURL}
          error={null}
          textInput={state.textInput}
          setTextInput={state.setTextInput}
          onSubmit={state.handleBaseURLSubmit}
          placeholder={state.original.baseURL}
        />
      )}

      {state.step === "apiType" && state.original && (
        <SelectStep
          label="API Type"
          currentValue={state.original.apiType}
          options={API_TYPE_OPTIONS}
          focusedIndex={state.focusedIndex}
          setFocusedIndex={state.setFocusedIndex}
          onSelect={state.handleApiTypeSelect}
        />
      )}

      {state.step === "apiKey" && state.original && (
        <TextStep
          label="API Key"
          currentValue={censorApiKey(state.original.apiKey)}
          error={null}
          textInput={state.textInput}
          setTextInput={state.setTextInput}
          onSubmit={state.handleApiKeySubmit}
          placeholder="(preserve)"
        />
      )}

      {state.step === "model" && state.original && (
        <ModelStep
          originalModel={state.original.model}
          error={state.error}
          models={state.models}
          modelsLoading={state.modelsLoading}
          focusedIndex={state.focusedIndex}
          setFocusedIndex={state.setFocusedIndex}
          textInput={state.textInput}
          setTextInput={state.setTextInput}
          onSelect={state.handleModelSelect}
          onTextSubmit={state.handleModelTextSubmit}
        />
      )}
    </Box>
  );
}

export async function runProviderEditScreen(): Promise<void> {
  const { waitUntilExit } = await renderWithColor(<ProviderEditScreen />);
  await waitUntilExit();
}
