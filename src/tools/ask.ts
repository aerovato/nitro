import { z } from "zod";

import { defineTool } from "./tool";

const ASK_TOOL_DESCRIPTION = `
Ask the user one or more questions. Each question should come with predetermined choices for users to choose from. If no choices are adequate, users can choose to type their own answer.

Tool Usage Guidelines:
- Default: do not ask. Act with sensible defaults.
- Ask only if:
  - Intent is unclear (<80% confidence) and a wrong guess is costly; or
  - Action is destructive/hard to reverse and the target set is ambiguous.
- Never ask to confirm tool choice, flags, or formats the user already implied
  (e.g. "convert demo.mov to mp4" → run ffmpeg; no format/codec questions unless required).
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

export const askTool = defineTool({
  name: "AskUser",
  description: ASK_TOOL_DESCRIPTION,
  modelInputSchema: ModelInputSchema,
  userInputSchema: UserInputSchema,
  outputSchema: OutputSchema,
  execute(
    modelInput: AskUserModelInput,
    userInput: AskUserUserInput,
  ): Promise<AskUserToolOutput> {
    void modelInput;
    return Promise.resolve(userInput);
  },
});
