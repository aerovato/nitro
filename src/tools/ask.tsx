import { z } from "zod";

import { CustomText } from "../components/custom/CustomText";
import { YELLOW } from "../colors";
import { NitroTool } from "./tool";

const ASK_TOOL_DESCRIPTION = `
Ask the user one or more questions. Each question should come with predetermined choices for users to choose from. If no choices are adequate, users can choose to type their own answer.
Use this tool to clarify ambiguous requests or gather user decisions.

Tool Usage Guidelines:
- Use the tool only if:
  - The user's intention is unclear and cannot be determined with 80% accuracy; or
  - The user's request is dangerous and may result in unintended consequences.
- Do not use the tool if the user's intention is clear and the request is reasonably safe or reversible.
- **Do not manually add a "Type your own answer" option. This option is automatically provided by the UI.**

Example Usage:
<example>
Context:
- The user wants to remove all "old files" inside a projects folder to reclaim disk space
- The definition of "old" is ambiguous. What is old? 3 months? 1 year?
- In addition, you notice that most of the disk space is occupied by node_modules folders; may be better to only delete node_modules

Agent Action: Ask two questions:

"What is the specific timeframe for 'old'?"
Choices:
- 3 months
- 6 months
- 1 year

"Should I remove entire projects or only the node_modules folders? The node_modules folders are taking up a majority of the space."
Choices:
- Remove entire projects
- Remove only node_modules folders
</example>
`.trim();

const QuestionSchema = z.object({
  title: z
    .string()
    .describe("Short title describing the question (5 words max)"),
  question: z
    .string()
    .describe("Question for the user to answer. Limit to 1 to 3 sentences."),
  choices: z
    .array(
      z.object({
        label: z
          .string()
          .describe("Short label describing the choice (5 words max)"),
        description: z
          .string()
          .optional()
          .describe(
            "1 to 2 sentence description of the choice. Provide this if the label is not self-explanatory.",
          ),
      }),
    )
    .describe(
      "Choices the user can select to answer the question. Limit choices to 2-4. Provide only the most common choices; if none are adequate, the user can type their own answer. The user may select only one choice per question.",
    ),
});

const ModelInputSchema = z.object({
  questions: z.array(QuestionSchema),
});

const QuestionResponseSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const UserInputSchema = z.object({
  answers: z.array(QuestionResponseSchema),
});
const OutputSchema = z.object({
  answers: z.array(QuestionResponseSchema),
});

export type Question = z.infer<typeof QuestionSchema>;
export type QuestionChoice = Question["choices"][number];
export type QuestionResponse = z.infer<typeof QuestionResponseSchema>;
export type AskUserModelInput = z.infer<typeof ModelInputSchema>;
export type AskUserUserInput = z.infer<typeof UserInputSchema>;
export type AskUserToolOutput = z.infer<typeof OutputSchema>;

export class AskTool extends NitroTool<
  typeof ModelInputSchema,
  typeof UserInputSchema,
  typeof OutputSchema
> {
  readonly name = "AskUser";
  readonly description = ASK_TOOL_DESCRIPTION;
  readonly modelInputSchema = ModelInputSchema;
  readonly userInputSchema = UserInputSchema;
  readonly outputSchema = OutputSchema;

  async execute(
    _modelInput: AskUserModelInput,
    userInput: AskUserUserInput,
  ): Promise<AskUserToolOutput> {
    return Promise.resolve(userInput);
  }

  override formatSafeOutput(output: AskUserToolOutput): React.ReactElement {
    const numberQuestions = output.answers.length;
    return (
      <CustomText color={YELLOW}>
        {this.name}: Answered {numberQuestions} question
        {numberQuestions !== 1 ? "s" : ""}
      </CustomText>
    );
  }
}

export const askTool = new AskTool();
