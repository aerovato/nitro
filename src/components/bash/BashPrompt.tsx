import * as React from "react";
import { Box, useApp, useInput } from "ink";

import { CustomText, CustomTextInput } from "../custom";

import type {
  BashModelInput,
  BashToolOutput,
  RiskLevel,
  BehaviorTag,
} from "../../tools/bash";
import type { ToolPromptProps } from "../../tools/tool";
import { bashTool } from "../../tools/bash";
import { ChatConfigContext } from "../ChatConfigContext";
import {
  BG_PRIMARY,
  BG_SECONDARY,
  FG_PRIMARY,
  FG_SECONDARY,
  RED,
  ORANGE,
  YELLOW,
  GREEN,
  BLUE,
  AQUA,
  PURPLE,
} from "../../colors";

const RISK_COLORS: Record<RiskLevel, string> = {
  "Read Only": GREEN,
  Normal: YELLOW,
  Dangerous: ORANGE,
  "Extremely Dangerous": RED,
};

const BEHAVIOR_TAG_COLORS: Record<BehaviorTag, string> = {
  Safe: GREEN,
  Reversible: AQUA,
  Write: YELLOW,
  Delete: RED,
  Overwrite: ORANGE,
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

export type BashPromptProps = ToolPromptProps<BashModelInput, BashToolOutput>;

export function BashPrompt({
  modelInput,
  onSubmit,
}: BashPromptProps): React.ReactElement {
  const { exit } = useApp();
  const chatConfig = React.useContext(ChatConfigContext);
  const { command, explanation, behaviorTags, riskLevel } = modelInput;
  const riskColor = RISK_COLORS[riskLevel];

  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const [editing, setEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [autoApproved, setAutoApproved] = React.useState(false);

  // Auto-approve "Read Only" commands when not in strict mode
  React.useEffect(() => {
    if (autoApproved) return;

    const shouldAutoApprove =
      riskLevel === "Read Only" && !chatConfig?.settings.alwaysConfirm;

    if (shouldAutoApprove) {
      setAutoApproved(true);
      void bashTool.execute(modelInput, { approved: true }).then(output => {
        onSubmit(output);
      });
    }
  }, [riskLevel, chatConfig, modelInput, onSubmit, autoApproved]);

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  useInput(async (_input, key) => {
    if (editing) {
      if (key.escape) {
        setEditing(false);
      }
      if (key.return) {
        const trimmed = inputValue.trim();
        setEditing(false);
        const output = await bashTool.execute(modelInput, {
          approved: false,
          rejectionMessage: trimmed.length > 0 ? trimmed : undefined,
        });
        onSubmit(output);
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
        const output = await bashTool.execute(modelInput, { approved: true });
        onSubmit(output);
      } else if (action.value === "reject") {
        setEditing(true);
      } else {
        exit();
      }
    }
  });

  // If auto-approved, show a simple executing message
  if (autoApproved) {
    return (
      <Box flexDirection="column" paddingX={3} paddingY={1}>
        <CustomText color={GREEN}>Executing: {command}</CustomText>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      paddingX={3}
      paddingY={1}
      rowGap={1}
      backgroundColor={BG_SECONDARY}
    >
      <Box
        paddingX={3}
        paddingY={1}
        backgroundColor={BG_PRIMARY}
        flexDirection="column"
      >
        <CustomText>{command}</CustomText>
      </Box>

      <CustomText color={FG_SECONDARY}>{explanation}</CustomText>

      <Box flexDirection="row" columnGap={1}>
        <CustomText color={BG_PRIMARY} backgroundColor={riskColor}>
          {` ${riskLevel} `}
        </CustomText>
        <BehaviorTags behaviorTags={behaviorTags} />
      </Box>

      <Box flexDirection="column">
        {ACTIONS.map((action, i) => {
          const focused = focusedIndex === i;
          return (
            <Box key={action.value} flexDirection="row">
              <CustomText
                dimColor={!focused}
                color={focused ? BLUE : FG_PRIMARY}
              >
                {i + 1}.{" "}
              </CustomText>
              <Box flexDirection="column">
                <CustomText bold={focused} color={focused ? BLUE : FG_PRIMARY}>
                  {action.label}
                </CustomText>
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

function BehaviorTags({
  behaviorTags,
}: {
  behaviorTags: BehaviorTag[];
}): React.ReactElement {
  return (
    <>
      {behaviorTags.length > 0
        && behaviorTags.map(tag => (
          <CustomText
            key={tag}
            color={BEHAVIOR_TAG_COLORS[tag]}
            backgroundColor={BG_PRIMARY}
          >
            {` ${tag} `}
          </CustomText>
        ))}
    </>
  );
}
