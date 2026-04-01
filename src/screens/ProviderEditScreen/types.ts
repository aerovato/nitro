import type { ApiType } from "../../logic/provider";

export type Step =
  | "select"
  | "baseURL"
  | "apiType"
  | "apiKey"
  | "model"
  | "done";

export const STEP_ORDER: Step[] = [
  "select",
  "baseURL",
  "apiType",
  "apiKey",
  "model",
  "done",
];

export const API_TYPE_OPTIONS = [
  { value: "", label: "(preserve)" },
  { value: "openai-compatible", label: "OpenAI Compatible" },
  { value: "openai-responses", label: "OpenAI Responses" },
  { value: "anthropic", label: "Anthropic" },
];

export interface EditForm {
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
