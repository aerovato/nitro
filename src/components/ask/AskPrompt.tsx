import * as React from "react";
import { Box, useInput } from "ink";

import { Question as QuestionComponent } from "./Question";
import { CustomText } from "../custom";

import { BG_PRIMARY, BG_SECONDARY, PURPLE } from "../../colors";
import {
  askTool,
  AskUserModelInput,
  AskUserToolOutput,
  AskUserUserInput,
} from "../../tools";
import type { ToolPromptProps } from "../../tools/tool";

export type AskPromptProps = ToolPromptProps<
  AskUserModelInput,
  AskUserToolOutput
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

  const handleAnswer = async (answer: string, choiceIndex: number) => {
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
        const output = await askTool.execute(modelInput, userInput);
        onSubmit(output);
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
    <Box
      flexDirection="column"
      paddingX={3}
      paddingY={1}
      rowGap={1}
      backgroundColor={BG_SECONDARY}
    >
      {questions.length > 1 && (
        <Box>
          <CustomText color={BG_PRIMARY} backgroundColor={PURPLE}>
            {` Question ${activeIndex + 1} of ${questions.length} `}
          </CustomText>
          <CustomText> </CustomText>
          {responses.map((response, i) => (
            <CustomText key={i} dimColor={activeIndex !== i}>
              {response ? " [*]" : " [ ]"}
            </CustomText>
          ))}
        </Box>
      )}
      {questions.map((question, i) => {
        const active = i === activeIndex;
        return (
          <QuestionComponent
            active={active}
            question={question}
            response={responses[activeIndex]}
            onAnswer={active ? handleAnswer : async () => {}}
            key={i}
          />
        );
      })}
      <Box flexDirection="row" columnGap={2}>
        {questions.length > 1 && (
          <Box flexDirection="row">
            <CustomText>⇆</CustomText>
            <CustomText dimColor>{" navigate"}</CustomText>
          </Box>
        )}
        <Box flexDirection="row">
          <CustomText>↑↓</CustomText>
          <CustomText dimColor>{" select"}</CustomText>
        </Box>
        <Box flexDirection="row">
          <CustomText>↵</CustomText>
          <CustomText dimColor>{" submit"}</CustomText>
        </Box>
      </Box>
    </Box>
  );
}
