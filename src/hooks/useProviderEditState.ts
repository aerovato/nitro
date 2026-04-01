import * as React from "react";
import {
  getProvider,
  listProviders,
  setProvider,
  type ApiType,
  type ProviderInfo,
} from "../logic/provider";
import { fetchModels } from "../logic/defaultProviders";
import {
  type Step,
  type EditForm,
  getNextStep,
} from "../screens/ProviderEditScreen/types";

interface ProviderEditState {
  step: Step;
  providerName: string;
  original: ProviderInfo | null;
  form: EditForm;
  error: string | null;
  textInput: string;
  focusedIndex: number;
  models: string[];
  modelsLoading: boolean;
  providers: string[];
}

interface ProviderEditActions {
  setStep: (step: Step) => void;
  setError: (error: string | null) => void;
  setTextInput: (text: string) => void;
  setFocusedIndex: (index: number) => void;
  advanceStep: () => void;
  handleProviderSelect: (name: string) => void;
  handleBaseURLSubmit: (value: string) => void;
  handleApiTypeSelect: (value: string) => void;
  handleApiKeySubmit: (value: string) => void;
  handleModelSelect: (value: string) => void;
  handleModelTextSubmit: (value: string) => void;
}

export function useProviderEditState(): ProviderEditState
  & ProviderEditActions {
  const [step, setStep] = React.useState<Step>("select");
  const [providerName, setProviderName] = React.useState("");
  const [original, setOriginal] = React.useState<ProviderInfo | null>(null);
  const [form, setForm] = React.useState<EditForm>({
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

  const providers = React.useMemo(() => listProviders(), []);

  const effectiveBaseURL = form.baseURL;
  const effectiveApiKey = form.apiKey || original?.apiKey || "";
  const effectiveApiType =
    form.apiType || original?.apiType || "openai-compatible";

  React.useEffect(() => {
    if (
      step === "model"
      && !modelsFetchAttempted
      && effectiveApiKey
      && effectiveBaseURL
    ) {
      setModelsLoading(true);
      setModelsFetchAttempted(true);
      fetchModels(effectiveBaseURL, effectiveApiKey, effectiveApiType)
        .then(fetched => {
          setModels(fetched);
          setModelsLoading(false);
        })
        .catch(() => {
          setModels([]);
          setModelsLoading(false);
        });
    }
  }, [
    step,
    modelsFetchAttempted,
    effectiveBaseURL,
    effectiveApiKey,
    effectiveApiType,
  ]);

  const advanceStep = () => {
    const next = getNextStep(step);
    if (next) {
      setStep(next);
      setError(null);
      setTextInput("");
      setFocusedIndex(0);
    }
  };

  const handleProviderSelect = (name: string) => {
    const provider = getProvider(name);
    if (!provider) return;
    setProviderName(name);
    setOriginal(provider);
    setForm({
      baseURL: provider.baseURL,
      apiKey: "",
      model: provider.model,
      apiType: "",
    });
    advanceStep();
  };

  const handleBaseURLSubmit = (value: string) => {
    const newBaseURL = value.trim() || original?.baseURL || "";
    setForm(prev => ({ ...prev, baseURL: newBaseURL }));
    advanceStep();
  };

  const handleApiTypeSelect = (value: string) => {
    const newApiType = (value
      || original?.apiType
      || "openai-compatible") as ApiType;
    setForm(prev => ({ ...prev, apiType: newApiType }));
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
    const newModel = value || original?.model || "";
    const newApiKey = form.apiKey || original?.apiKey || "";
    const newApiType = form.apiType || original?.apiType || "openai-compatible";
    setProvider(providerName, {
      baseURL: form.baseURL,
      apiKey: newApiKey,
      model: newModel,
      apiType: newApiType,
    });
    setStep("done");
  };

  const handleModelTextSubmit = (value: string) => {
    const newModel = value.trim() || original?.model || "";
    const newApiKey = form.apiKey || original?.apiKey || "";
    const newApiType = form.apiType || original?.apiType || "openai-compatible";
    setProvider(providerName, {
      baseURL: form.baseURL,
      apiKey: newApiKey,
      model: newModel,
      apiType: newApiType,
    });
    setStep("done");
  };

  return {
    step,
    providerName,
    original,
    form,
    error,
    textInput,
    focusedIndex,
    models,
    modelsLoading,
    providers,
    setStep,
    setError,
    setTextInput,
    setFocusedIndex,
    advanceStep,
    handleProviderSelect,
    handleBaseURLSubmit,
    handleApiTypeSelect,
    handleApiKeySubmit,
    handleModelSelect,
    handleModelTextSubmit,
  };
}
