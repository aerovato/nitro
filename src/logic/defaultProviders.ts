import type { ApiType } from "./provider";

export interface DefaultProvider {
  name: string;
  baseURL: string;
  apiType: ApiType;
}

export const DEFAULT_PROVIDERS: DefaultProvider[] = [
  {
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    apiType: "openai-responses",
  },
  {
    name: "anthropic",
    baseURL: "https://api.anthropic.com/v1",
    apiType: "anthropic",
  },
  {
    name: "zai-coding-plan",
    baseURL: "https://api.z.ai/api/anthropic/v1",
    apiType: "anthropic",
  },
  {
    name: "zai-api",
    baseURL: "https://api.z.ai/api/paas/v4",
    apiType: "openai-compatible",
  },
  {
    name: "qwen-us",
    baseURL: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
    apiType: "openai-compatible",
  },
  {
    name: "deepseek",
    baseURL: "https://api.deepseek.com/v1",
    apiType: "openai-compatible",
  },
  {
    name: "mistral",
    baseURL: "https://api.mistral.ai/v1",
    apiType: "openai-compatible",
  },
  {
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiType: "openai-compatible",
  },
];

const FETCH_MODELS_TIMEOUT_MS = 2000;

function isModelsResponse(
  data: unknown,
): data is { data: Array<{ id: string }> } {
  if (typeof data !== "object" || data === null || !("data" in data)) {
    return false;
  }
  const arr = (data as Record<string, unknown>).data;
  if (!Array.isArray(arr)) {
    return false;
  }
  return arr.every(
    (item: unknown) =>
      typeof item === "object" && item !== null && "id" in item,
  );
}

export async function fetchModels(
  baseURL: string,
  apiKey: string,
  apiType: ApiType,
): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    FETCH_MODELS_TIMEOUT_MS,
  );

  const headers: Record<string, string> =
    apiType === "anthropic"
      ? {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        }
      : { Authorization: `Bearer ${apiKey}` };

  try {
    const response = await fetch(`${baseURL}/models`, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data: unknown = await response.json();
    return isModelsResponse(data) ? data.data.map(m => m.id) : [];
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}
