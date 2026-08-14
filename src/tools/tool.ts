import { z } from "zod";

import type { Settings } from "../logic/settings";

export type ToolPromptProps<TModelInput, TUserInput> = {
  modelInput: TModelInput;
  onSubmit: (userInput: TUserInput) => void;
};

type ObjectSchema = z.ZodType<Record<string, unknown>>;

export interface ToolDefinition<
  TModelInput extends ObjectSchema,
  TUserInput extends ObjectSchema,
  TOutput extends ObjectSchema,
> {
  readonly name: string;
  readonly description: string;
  readonly modelInputSchema: TModelInput;
  readonly userInputSchema: TUserInput;
  readonly outputSchema: TOutput;
  execute(
    modelInput: z.infer<TModelInput>,
    userInput: z.infer<TUserInput>,
  ): Promise<z.infer<TOutput>>;
  autoApproveInput?(
    modelInput: z.infer<TModelInput>,
    settings: Settings,
  ): z.infer<TUserInput> | null;
  runningLabel?(
    modelInput: z.infer<TModelInput>,
    userInput: z.infer<TUserInput>,
  ): string | null;
}

export function defineTool<
  TDefinition extends ToolDefinition<ObjectSchema, ObjectSchema, ObjectSchema>,
>(definition: TDefinition): TDefinition {
  return definition;
}

export function validationError(
  result: z.ZodSafeParseError<unknown>,
): Record<string, unknown> {
  return z.treeifyError(result.error);
}

export function toolNotFoundError(toolName: string): string {
  return `Unknown tool "${toolName}". Available tools: AskUser, Bash`;
}
