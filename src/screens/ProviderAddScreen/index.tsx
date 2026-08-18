import * as React from "react";
import { Box, Text, render, useApp } from "ink";
import { CustomSelect, CustomTextInput } from "../../components";
import { RED, GREEN, YELLOW } from "../../colors";
import { useProviderAddState } from "../../hooks/useProviderAddState";
import {
  type Step,
  type ProviderForm,
  isPastStep,
  API_TYPE_OPTIONS,
  SELECTION_OPTIONS,
} from "./types";

function FormSummary({
  step,
  form,
}: {
  step: Step;
  form: ProviderForm;
}): React.ReactElement | null {
  return (
    <>
      {isPastStep(step, "name") && (
        <Box>
          <Text dimColor>Provider Name: </Text>
          <Text>{form.name}</Text>
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
          <Text>{form.apiKey || "(none)"}</Text>
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
  error,
  textInput,
  setTextInput,
  onSubmit,
}: {
  label: string;
  error: string | null;
  textInput: string;
  setTextInput: (text: string) => void;
  onSubmit: (value: string) => void;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      {error && <Text color={RED}>{error}</Text>}
      <Box>
        <Text dimColor>{label}: </Text>
        <CustomTextInput
          value={textInput}
          onChange={setTextInput}
          onSubmit={onSubmit}
        />
      </Box>
    </Box>
  );
}

function SelectStep({
  label,
  options,
  focusedIndex,
  setFocusedIndex,
  onSelect,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  onSelect: (value: string) => void;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text dimColor>{label}</Text>
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
          />
        </Box>
      )}
    </Box>
  );
}

export function ProviderAddScreen(): React.ReactElement {
  const { exit } = useApp();
  const state = useProviderAddState();

  React.useEffect(() => {
    if (state.step === "done") {
      exit();
    }
  }, [state.step, exit]);

  if (state.step === "done") {
    return <Text color={GREEN}>Provider "{state.form.name}" added</Text>;
  }

  return (
    <Box flexDirection="column">
      <FormSummary step={state.step} form={state.form} />

      {state.step === "selection" && (
        <SelectStep
          label="Select a provider:"
          options={SELECTION_OPTIONS}
          focusedIndex={state.focusedIndex}
          setFocusedIndex={state.setFocusedIndex}
          onSelect={state.handleSelection}
        />
      )}

      {state.step === "name" && (
        <TextStep
          label="Provider Name"
          error={state.error}
          textInput={state.textInput}
          setTextInput={state.setTextInput}
          onSubmit={state.handleNameSubmit}
        />
      )}

      {state.step === "baseURL" && (
        <TextStep
          label="Base URL"
          error={state.error}
          textInput={state.textInput}
          setTextInput={state.setTextInput}
          onSubmit={state.handleBaseURLSubmit}
        />
      )}

      {state.step === "apiType" && (
        <SelectStep
          label="API Type:"
          options={API_TYPE_OPTIONS}
          focusedIndex={state.focusedIndex}
          setFocusedIndex={state.setFocusedIndex}
          onSelect={state.handleApiTypeSelect}
        />
      )}

      {state.step === "apiKey" && (
        <TextStep
          label="API Key"
          error={null}
          textInput={state.textInput}
          setTextInput={state.setTextInput}
          onSubmit={state.handleApiKeySubmit}
        />
      )}

      {state.step === "model" && (
        <ModelStep
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

export async function runProviderAddScreen(): Promise<void> {
  const { waitUntilExit } = render(<ProviderAddScreen />);
  await waitUntilExit();
}
