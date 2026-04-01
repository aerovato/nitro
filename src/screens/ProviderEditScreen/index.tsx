import * as React from "react";
import { Box, useApp } from "ink";
import { CustomSelect, CustomText, CustomTextInput } from "../../components";
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
          <CustomText dimColor>Provider: </CustomText>
          <CustomText bold>{providerName}</CustomText>
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
          <CustomText>
            {form.apiKey ? censorApiKey(form.apiKey) : "(preserve)"}
          </CustomText>
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
      <CustomText dimColor>
        Current {label}: {currentValue}
      </CustomText>
      {error && <CustomText color={RED}>{error}</CustomText>}
      <Box>
        <CustomText dimColor>{label}: </CustomText>
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
      <CustomText dimColor>
        Current {label}: {currentValue}
      </CustomText>
      <CustomText dimColor>{label}:</CustomText>
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
      <CustomText dimColor>Current Model: {originalModel}</CustomText>
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
    return <CustomText color={RED}>No providers configured</CustomText>;
  }

  if (state.step === "done") {
    return (
      <CustomText color={GREEN}>
        Provider "{state.providerName}" updated
      </CustomText>
    );
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
          <CustomText dimColor>Select provider to edit:</CustomText>
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
