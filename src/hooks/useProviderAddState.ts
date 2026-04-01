import * as React from "react";
import { listProviders, setProvider, type ApiType } from "../logic/provider";
import {
  fetchModels,
  DEFAULT_PROVIDERS,
  type DefaultProvider,
} from "../logic/defaultProviders";
import {
  type Step,
  type ProviderForm,
  getNextStep,
} from "../screens/ProviderAddScreen/types";

interface ProviderAddState {
  step: Step;
  form: ProviderForm;
  error: string | null;
  textInput: string;
  focusedIndex: number;
  models: string[];
  modelsLoading: boolean;
  existingProviders: string[];
}

interface ProviderAddActions {
  setStep: (step: Step) => void;
  setError: (error: string | null) => void;
  setTextInput: (text: string) => void;
  setFocusedIndex: (index: number) => void;
  advanceStep: () => void;
  handleSelection: (value: string) => void;
  handleNameSubmit: (value: string) => void;
  handleBaseURLSubmit: (value: string) => void;
  handleApiTypeSelect: (value: string) => void;
  handleApiKeySubmit: (value: string) => void;
  handleModelSelect: (value: string) => void;
  handleModelTextSubmit: (value: string) => void;
}

export function useProviderAddState(): ProviderAddState & ProviderAddActions {
  const [step, setStep] = React.useState<Step>("selection");
  const [form, setForm] = React.useState<ProviderForm>({
    name: "",
    baseURL: "",
    apiKey: "",
    model: "",
    apiType: "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [textInput, setTextInput] = React.useState("");
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const [models, setModels] = React.useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = React.useState(false);
  const [modelsFetchAttempted, setModelsFetchAttempted] = React.useState(false);
  const [renameMode, setRenameMode] = React.useState(false);

  const existingProviders = React.useMemo(() => listProviders(), []);

  React.useEffect(() => {
    if (step === "model" && !modelsFetchAttempted && form.apiKey) {
      setModelsLoading(true);
      setModelsFetchAttempted(true);
      fetchModels(form.baseURL, form.apiKey, form.apiType as ApiType)
        .then(fetched => {
          setModels(fetched);
          setModelsLoading(false);
        })
        .catch(() => {
          setModels([]);
          setModelsLoading(false);
        });
    }
  }, [step, modelsFetchAttempted, form.baseURL, form.apiKey, form.apiType]);

  const advanceStep = () => {
    const next = getNextStep(step);
    if (next) {
      setStep(next);
      setError(null);
      setTextInput("");
      setFocusedIndex(0);
    }
  };

  const applyPreset = (provider: DefaultProvider) => {
    setForm(prev => ({
      ...prev,
      name: provider.name,
      baseURL: provider.baseURL,
      apiType: provider.apiType,
    }));
  };

  const handleSelection = (value: string) => {
    if (value === "custom") {
      advanceStep();
      return;
    }
    const provider = DEFAULT_PROVIDERS.find(p => p.name === value);
    if (provider) {
      applyPreset(provider);
      setFocusedIndex(0);
      if (existingProviders.includes(provider.name)) {
        setRenameMode(true);
        setStep("name");
        setError(
          `Provider "${provider.name}" already exists. Enter a different name.`,
        );
        setTextInput(provider.name);
      } else {
        setStep("apiKey");
      }
    }
  };

  const handleNameSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Provider name is required");
      return;
    }
    if (existingProviders.includes(trimmed)) {
      setError(`Provider "${trimmed}" already exists. Enter a different name.`);
      return;
    }
    setForm(prev => ({ ...prev, name: trimmed }));
    if (renameMode) {
      setRenameMode(false);
      setFocusedIndex(0);
      setStep("apiKey");
    } else {
      advanceStep();
    }
  };

  const handleBaseURLSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Base URL is required");
      return;
    }
    setForm(prev => ({ ...prev, baseURL: trimmed }));
    advanceStep();
  };

  const handleApiTypeSelect = (value: string) => {
    setForm(prev => ({ ...prev, apiType: value as ApiType }));
    advanceStep();
  };

  const handleApiKeySubmit = (value: string) => {
    setForm(prev => ({ ...prev, apiKey: value }));
    advanceStep();
  };

  const handleModelSelect = (value: string) => {
    if (value === "__custom__") {
      setModels([]);
      return;
    }
    setForm(prev => ({ ...prev, model: value }));
    setProvider(form.name, {
      baseURL: form.baseURL,
      apiKey: form.apiKey,
      model: value,
      apiType: form.apiType as ApiType,
    });
    setStep("done");
  };

  const handleModelTextSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Model is required");
      return;
    }
    setForm(prev => ({ ...prev, model: trimmed }));
    setProvider(form.name, {
      baseURL: form.baseURL,
      apiKey: form.apiKey,
      model: trimmed,
      apiType: form.apiType as ApiType,
    });
    setStep("done");
  };

  return {
    step,
    form,
    error,
    textInput,
    focusedIndex,
    models,
    modelsLoading,
    existingProviders,
    setStep,
    setError,
    setTextInput,
    setFocusedIndex,
    advanceStep,
    handleSelection,
    handleNameSubmit,
    handleBaseURLSubmit,
    handleApiTypeSelect,
    handleApiKeySubmit,
    handleModelSelect,
    handleModelTextSubmit,
  };
}
