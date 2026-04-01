import type React from "react";
import { z } from "zod";
import { tool, type Tool } from "ai";

import { CustomText } from "../components/custom/CustomText";
import { RED } from "../colors";

export type ToolPromptProps<TModelInput, TOutput> = {
  modelInput: TModelInput;
  onSubmit: (output: TOutput) => void;
};

type ObjectSchema = z.ZodType<Record<string, unknown>>;

export abstract class NitroTool<
  TModelInput extends ObjectSchema,
  TUserInput extends ObjectSchema,
  TOutput extends ObjectSchema,
> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly modelInputSchema: TModelInput;
  abstract readonly userInputSchema: TUserInput;
  abstract readonly outputSchema: TOutput;

  abstract execute(
    modelInput: z.infer<TModelInput>,
    userInput: z.infer<TUserInput>,
  ): Promise<z.infer<TOutput>>;

  createTool(): Tool {
    return tool({
      description: this.description,
      inputSchema: this.modelInputSchema,
    });
  }

  validateModelInput(
    input: unknown,
  ): z.ZodSafeParseResult<z.core.output<TModelInput>> {
    return this.modelInputSchema.safeParse(input);
  }

  static validationError(
    result: z.ZodSafeParseError<unknown>,
  ): Record<string, unknown> {
    return z.treeifyError(result.error);
  }

  static toolNotFoundError(toolName: string): string {
    return `Unknown tool "${toolName}". Available tools: AskUser, Bash`;
  }

  abstract formatSafeOutput(output: z.infer<TOutput>): React.ReactElement;

  formatOutput(output: unknown): React.ReactElement {
    const validated = this.outputSchema.safeParse(output);
    if (!validated.success) {
      return (
        <CustomText color={RED}>
          Error: {this.name} returned unrecognized output.
        </CustomText>
      );
    }
    return this.formatSafeOutput(validated.data);
  }
}
