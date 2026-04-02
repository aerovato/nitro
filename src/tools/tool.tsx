import type React from "react";
import { z } from "zod";
import { tool, type Tool } from "ai";
import type { ToolResultOutput } from "@ai-sdk/provider-utils";

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

  // Note: only "json", "error-text", and "error-json" tool outputs are currently supported.
  formatOutput(output: ToolResultOutput): React.ReactElement {
    if (output.type === "json") {
      const validated = this.outputSchema.safeParse(output.value);
      if (!validated.success) {
        return (
          <CustomText color={RED}>
            Error: {this.name} returned unrecognized output.
          </CustomText>
        );
      } else {
        return this.formatSafeOutput(validated.data);
      }
    }
    if (output.type === "error-text") {
      return (
        <CustomText color={RED}>
          Error: {this.name} tool call failed: {output.value}
        </CustomText>
      );
    }
    if (output.type === "error-json") {
      const summary =
        typeof output.value === "string" && output.value.trim().length > 0
          ? output.value.trim()
          : "Tool call failed validation.";
      return (
        <CustomText color={RED}>
          Error: {this.name} tool call failed: {summary}
        </CustomText>
      );
    }
    return (
      <CustomText color={RED}>
        Error: Unsupported tool output type "{output.type}". Only "json" and
        "error-json" are currently supported.
      </CustomText>
    );
  }
}
