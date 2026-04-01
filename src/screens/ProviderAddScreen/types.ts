import type { ApiType } from "../../logic/provider";
import { DEFAULT_PROVIDERS } from "../../logic/defaultProviders";

export type Step =
  | "selection"
  | "name"
  | "baseURL"
  | "apiType"
  | "apiKey"
  | "model"
  | "done";

export const STEP_ORDER: Step[] = [
  "selection",
  "name",
  "baseURL",
  "apiType",
  "apiKey",
  "model",
  "done",
];

export const API_TYPE_OPTIONS: { value: ApiType; label: string }[] = [
  { value: "openai-compatible", label: "OpenAI Compatible" },
  { value: "openai-responses", label: "OpenAI Responses" },
  { value: "anthropic", label: "Anthropic" },
];

export const SELECTION_OPTIONS = [
  { value: "custom", label: "New Custom Provider" },
  ...DEFAULT_PROVIDERS.map(p => ({ value: p.name, label: p.name })),
];

export interface ProviderForm {
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
  apiType: ApiType | "";
}

export function isPastStep(current: Step, target: Step): boolean {
  return STEP_ORDER.indexOf(current) > STEP_ORDER.indexOf(target);
}

export function getNextStep(current: Step): Step | undefined {
  const idx = STEP_ORDER.indexOf(current);
  return STEP_ORDER[idx + 1];
}
