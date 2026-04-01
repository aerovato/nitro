import * as React from "react";
import { Box, Newline, useInput } from "ink";

import { CustomText, CustomTextInput } from "../custom";

import type { Question } from "../../tools";
import { FG_PRIMARY, BLUE, PURPLE, GREEN, AQUA } from "../../colors";
import { QuestionSelection } from "./AskPrompt";

const CUSTOM_LABEL = "Type your own answer...";

interface OptionRowProps {
  index: number;
  label: string;
  description?: string;
  focused: boolean;
  previouslySubmitted: boolean;
  maybeInput?: false | React.ReactElement;
}

function OptionRow({
  index,
  label,
  description,
  focused,
  previouslySubmitted,
  maybeInput,
}: OptionRowProps) {
  const labelColor =
    focused && previouslySubmitted
      ? AQUA
      : focused
        ? BLUE
        : previouslySubmitted
          ? GREEN
          : FG_PRIMARY;
  return (
    <Box flexDirection="row">
      <CustomText dimColor={!focused} color={labelColor}>
        {index}.{" "}
      </CustomText>
      <Box flexDirection="column">
        <CustomText bold={focused} color={labelColor}>
          {label}
          {previouslySubmitted ? " (selected)" : ""}
        </CustomText>
        {description && <CustomText dimColor>{description}</CustomText>}
        {maybeInput}
      </Box>
    </Box>
  );
}

export interface QuestionProps {
  active: boolean;
  question: Question;
  response?: QuestionSelection;
  onAnswer: (answer: string, index: number) => Promise<void>;
}

export function Question({
  active,
  question,
  response,
  onAnswer,
}: QuestionProps): React.ReactElement {
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const [editing, setEditing] = React.useState(false);
  const choices = question.choices;
  const customIndex = choices.length;
  const [inputValue, setInputValue] = React.useState(
    response?.choiceIndex === customIndex ? response.answer : "",
  );

  useInput(
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (_input, key) => {
      if (editing) {
        if (key.escape) {
          setEditing(false);
        }
        if (key.return) {
          const trimmed = inputValue.trim();
          if (trimmed.length > 0) {
            setEditing(false);
            await onAnswer(trimmed, focusedIndex);
          }
        }
        return;
      }
      if (key.upArrow) {
        setFocusedIndex(i => (i > 0 ? i - 1 : customIndex));
      }
      if (key.downArrow) {
        setFocusedIndex(i => (i < customIndex ? i + 1 : 0));
      }
      if (key.return) {
        if (focusedIndex === customIndex) {
          setEditing(true);
        } else {
          setEditing(false);
          await onAnswer(choices[focusedIndex]!.label, focusedIndex);
        }
      }
    },
    { isActive: active },
  );

  const customFocused = focusedIndex === customIndex;

  return active ? (
    <Box flexDirection="column">
      <CustomText bold color={PURPLE}>
        {question.title}
      </CustomText>
      <CustomText>
        {question.question}
        <Newline />
      </CustomText>
      {choices.map((choice, i) => (
        <OptionRow
          key={i}
          index={i + 1}
          label={choice.label}
          description={choice.description}
          focused={focusedIndex === i}
          previouslySubmitted={response?.choiceIndex === i}
        />
      ))}
      <OptionRow
        index={customIndex + 1}
        label={CUSTOM_LABEL}
        focused={customFocused}
        previouslySubmitted={response?.choiceIndex === customIndex}
        maybeInput={
          <CustomTextInput
            dimColor={!customFocused}
            value={inputValue}
            onChange={setInputValue}
            placeholder="Type your answer..."
            focus={editing}
            showCursor={editing}
          />
        }
      />
    </Box>
  ) : (
    <></>
  );
}
