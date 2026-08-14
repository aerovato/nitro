import * as React from "react";
import { Box, Text, useInput } from "ink";

import { Question as QuestionComponent } from "./Question";

import { PURPLE } from "../../colors";
import type { AskUserModelInput, AskUserUserInput } from "../../tools";
import type { ToolPromptProps } from "../../tools/tool";

export type AskPromptProps = ToolPromptProps<
  AskUserModelInput,
  AskUserUserInput
>;

export interface QuestionSelection {
  question: string;
  answer: string;
  choiceIndex: number;
}

export function AskPrompt({
  modelInput,
  onSubmit,
}: AskPromptProps): React.ReactElement {
  const questions = modelInput.questions;
  const [activeIndex, setIndex] = React.useState(0);
  const [responses, setResponses] = React.useState<QuestionSelection[]>(
    new Array(questions.length).fill(undefined),
  );

  const question = questions[activeIndex]!;

  const handleAnswer = (answer: string, choiceIndex: number) => {
    const updated = [...responses];
    updated[activeIndex] = {
      question: question.question,
      answer,
      choiceIndex,
    };
    setResponses(updated);
    if (activeIndex < questions.length - 1) {
      setIndex(activeIndex + 1);
    } else {
      const unansweredIndex = updated.findIndex(
        element => element === undefined,
      );
      if (unansweredIndex !== -1) {
        setIndex(unansweredIndex);
      } else {
        const userInput: AskUserUserInput = {
          answers: updated.map(r => ({
            question: r.question,
            answer: r.answer,
          })),
        };
        onSubmit(userInput);
      }
    }
  };

  useInput((_input, key) => {
    if (key.leftArrow && activeIndex > 0) {
      setIndex(activeIndex - 1);
    }
    if (key.rightArrow && activeIndex < questions.length - 1) {
      setIndex(activeIndex + 1);
    }
  });

  return (
    <Box flexDirection="column" rowGap={1}>
      {questions.length > 1 && (
        <Box>
          <Text color={PURPLE} bold>
            {`[Question ${activeIndex + 1} of ${questions.length}]`}
          </Text>
          <Text> </Text>
          {responses.map((response, i) => (
            <Text key={i} dimColor={activeIndex !== i}>
              {response ? " [*]" : " [ ]"}
            </Text>
          ))}
        </Box>
      )}
      <QuestionComponent
        active
        question={question}
        response={responses[activeIndex]}
        onAnswer={handleAnswer}
      />
      <Box flexDirection="row" columnGap={2}>
        {questions.length > 1 && (
          <Box flexDirection="row">
            <Text>⇆</Text>
            <Text dimColor>{" navigate"}</Text>
          </Box>
        )}
        <Box flexDirection="row">
          <Text>↑↓</Text>
          <Text dimColor>{" select"}</Text>
        </Box>
        <Box flexDirection="row">
          <Text>↵</Text>
          <Text dimColor>{" submit"}</Text>
        </Box>
      </Box>
    </Box>
  );
}
