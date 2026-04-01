import * as React from "react";
import { Box, useApp } from "ink";
import { CustomSelect, CustomText, CustomTextInput } from "../../components";
import { renderWithColor } from "../../utils";
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
          <CustomText dimColor>Provider Name: </CustomText>
          <CustomText>{form.name}</CustomText>
        </Box>
      )}
      {isPastStep(step, "baseURL") && (
        <Box>
          <CustomText dimColor>Base URL: </CustomText>
          <CustomText>{form.baseURL}</CustomText>
        </Box>
      )}
      {isPastStep(step, "apiType") && (
        <Box>
          <CustomText dimColor>API Type: </CustomText>
          <CustomText>{form.apiType}</CustomText>
        </Box>
      )}
      {isPastStep(step, "apiKey") && (
        <Box>
          <CustomText dimColor>API Key: </CustomText>
          <CustomText>{form.apiKey || "(none)"}</CustomText>
        </Box>
      )}
      {isPastStep(step, "model") && (
        <Box>
          <CustomText dimColor>Model: </CustomText>
          <CustomText>{form.model}</CustomText>
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
      {error && <CustomText color={RED}>{error}</CustomText>}
      <Box>
        <CustomText dimColor>{label}: </CustomText>
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
      <CustomText dimColor>{label}</CustomText>
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
      {error && <CustomText color={RED}>{error}</CustomText>}
      {modelsLoading ? (
        <CustomText color={YELLOW}>Fetching models...</CustomText>
      ) : models.length > 0 ? (
        <>
          <CustomText dimColor>Select a model:</CustomText>
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
          <CustomText dimColor>Model: </CustomText>
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
    return (
      <CustomText color={GREEN}>Provider "{state.form.name}" added</CustomText>
    );
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
  const { waitUntilExit } = await renderWithColor(<ProviderAddScreen />);
  await waitUntilExit();
}
