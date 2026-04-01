import * as React from "react";
import { Box, useApp } from "ink";

import { CustomSelect, CustomSelectOption, CustomText } from "../components";
import { renderWithColor } from "../utils";
import { YELLOW, FG_SECONDARY } from "../colors";

const CANCEL_VALUE = "__cancel__";
const DEFAULT_VALUE = "default";
const LIST_VALUE = "list";
const ADD_VALUE = "add";
const EDIT_VALUE = "edit";
const REMOVE_VALUE = "remove";

const OPTIONS: CustomSelectOption[] = [
  { value: DEFAULT_VALUE, label: "Set default provider" },
  { value: LIST_VALUE, label: "List providers" },
  { value: ADD_VALUE, label: "Add new provider" },
  { value: EDIT_VALUE, label: "Edit existing provider" },
  { value: REMOVE_VALUE, label: "Remove existing provider" },
  { value: CANCEL_VALUE, label: "Cancel", color: YELLOW },
];

export type ProviderSubcommand = "default" | "list" | "add" | "edit" | "remove";

type ScreenState =
  | { type: "selecting" }
  | { type: "selected"; subcommand: ProviderSubcommand | null };

function ProviderRouterScreenInternal({
  onSelect,
}: {
  onSelect: (subcommand: ProviderSubcommand | null) => void;
}): React.ReactElement {
  const { exit } = useApp();
  const [state, setState] = React.useState<ScreenState>({ type: "selecting" });
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  React.useEffect(() => {
    if (state.type === "selected") {
      onSelect(state.subcommand);
      exit();
    }
  }, [state, onSelect, exit]);

  const handleChange = (value: string) => {
    if (value === CANCEL_VALUE) {
      setState({ type: "selected", subcommand: null });
    } else if (
      value === DEFAULT_VALUE
      || value === LIST_VALUE
      || value === ADD_VALUE
      || value === EDIT_VALUE
      || value === REMOVE_VALUE
    ) {
      setState({ type: "selected", subcommand: value as ProviderSubcommand });
    }
  };

  if (state.type === "selected" && state.subcommand === null) {
    return <CustomText color={FG_SECONDARY}>Cancelled</CustomText>;
  }

  return (
    <Box flexDirection="column">
      <CustomText dimColor>Select an action:</CustomText>
      <CustomSelect
        options={OPTIONS}
        focusedIndex={focusedIndex}
        onChange={handleChange}
        onFocusedIndexChange={setFocusedIndex}
      />
    </Box>
  );
}

export async function runProviderRouterScreen(): Promise<ProviderSubcommand | null> {
  let result: ProviderSubcommand | null = null;

  const { waitUntilExit } = await renderWithColor(
    <ProviderRouterScreenInternal
      onSelect={subcommand => {
        result = subcommand;
      }}
    />,
  );
  await waitUntilExit();
  console.log();
  console.log("---");
  console.log();
  return result;
}
