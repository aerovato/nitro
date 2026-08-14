import * as React from "react";
import { Box, Text, useApp, useInput } from "ink";

import { CustomTextInput } from "../custom";

import type {
  BashModelInput,
  BashUserInput,
  RiskLevel,
  BehaviorTag,
} from "../../tools/bash";
import type { ToolPromptProps } from "../../tools/tool";
import { RED, BLUE, GREEN, YELLOW, AQUA, PURPLE } from "../../colors";

const RISK_COLORS: Record<RiskLevel, string> = {
  "Read Only": GREEN,
  Normal: AQUA,
  Dangerous: YELLOW,
  "Extremely Dangerous": RED,
};

const BEHAVIOR_TAG_COLORS: Record<BehaviorTag, string> = {
  Safe: GREEN,
  Reversible: AQUA,
  Write: YELLOW,
  Delete: RED,
  Overwrite: YELLOW,
  "Side Effects": PURPLE,
  Exfiltration: RED,
};

type BashAction = "approve" | "reject" | "cancel";

const ACTIONS: { value: BashAction; label: string }[] = [
  {
    value: "approve",
    label: "Approve and Run",
  },
  {
    value: "reject",
    label: "Reject with Message",
  },
  {
    value: "cancel",
    label: "Cancel and Exit",
  },
];

export type BashPromptProps = ToolPromptProps<BashModelInput, BashUserInput>;

export function BashPrompt({
  modelInput,
  onSubmit,
}: BashPromptProps): React.ReactElement {
  const { exit } = useApp();
  const { command, explanation, behaviorTags, riskLevel } = modelInput;
  const riskColor = RISK_COLORS[riskLevel];

  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const [editing, setEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  useInput((_input, key) => {
    if (editing) {
      if (key.escape) {
        setEditing(false);
      }
      if (key.return) {
        const trimmed = inputValue.trim();
        setEditing(false);
        onSubmit({
          approved: false,
          rejectionMessage: trimmed.length > 0 ? trimmed : undefined,
        });
      }
      return;
    }
    if (key.upArrow) {
      setFocusedIndex(i => (i > 0 ? i - 1 : ACTIONS.length - 1));
    }
    if (key.downArrow) {
      setFocusedIndex(i => (i < ACTIONS.length - 1 ? i + 1 : 0));
    }
    if (key.return) {
      const action = ACTIONS[focusedIndex]!;
      if (action.value === "approve") {
        onSubmit({ approved: true });
      } else if (action.value === "reject") {
        setEditing(true);
      } else {
        exit();
      }
    }
  });

  return (
    <Box
      flexDirection="column"
      width="100%"
      borderStyle="single"
      borderTop={false}
      borderRight={false}
      borderBottom={false}
      borderColor={PURPLE}
      paddingLeft={2}
      rowGap={1}
    >
      <Text dimColor>{`# ${explanation}`}</Text>

      <Text color={GREEN}>{`$ ${command}`}</Text>

      <Box flexDirection="row" columnGap={1}>
        <Text color={riskColor} bold>
          {`[${riskLevel}]`}
        </Text>
        <BehaviorTags behaviorTags={behaviorTags} />
      </Box>

      <Box flexDirection="column">
        {ACTIONS.map((action, i) => {
          const focused = focusedIndex === i;
          return (
            <Box key={action.value} flexDirection="row">
              <Text dimColor={!focused} color={focused ? BLUE : undefined}>
                {i + 1}.{" "}
              </Text>
              <Box flexDirection="column">
                <Text bold={focused} color={focused ? BLUE : undefined}>
                  {action.label}
                </Text>
                {editing && action.value === "reject" && (
                  <CustomTextInput
                    value={inputValue}
                    onChange={setInputValue}
                    placeholder="Rejection reason (optional)..."
                    focus={editing}
                    showCursor={editing}
                  />
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box flexDirection="row" columnGap={2}>
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

function BehaviorTags({
  behaviorTags,
}: {
  behaviorTags: BehaviorTag[];
}): React.ReactElement {
  return (
    <>
      {behaviorTags.length > 0
        && behaviorTags.map(tag => (
          <Text key={tag} color={BEHAVIOR_TAG_COLORS[tag]}>
            {`[${tag}]`}
          </Text>
        ))}
    </>
  );
}
