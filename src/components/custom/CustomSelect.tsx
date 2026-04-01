import { Box, useInput } from "ink";
import * as React from "react";
import { CustomText } from "./CustomText";

export interface CustomSelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface CustomSelectProps {
  options: CustomSelectOption[];
  focusedIndex: number;
  onChange: (value: string) => void;
  onFocusedIndexChange: (index: number) => void;
  visibleOptionCount?: number;
}

export function CustomSelect({
  options,
  focusedIndex,
  onChange,
  onFocusedIndexChange,
  visibleOptionCount = 10,
}: CustomSelectProps): React.ReactElement {
  useInput((_input, key) => {
    if (key.upArrow) {
      const newIndex = focusedIndex > 0 ? focusedIndex - 1 : options.length - 1;
      onFocusedIndexChange(newIndex);
    }
    if (key.downArrow) {
      const newIndex = focusedIndex < options.length - 1 ? focusedIndex + 1 : 0;
      onFocusedIndexChange(newIndex);
    }
    if (key.return && options[focusedIndex]) {
      onChange(options[focusedIndex].value);
    }
  });

  const startIndex = Math.max(
    0,
    Math.min(
      focusedIndex - Math.floor(visibleOptionCount / 2),
      options.length - visibleOptionCount,
    ),
  );
  const endIndex = Math.min(options.length, startIndex + visibleOptionCount);
  const visibleOptions = options.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column">
      {visibleOptions.map((option, i) => {
        const actualIndex = startIndex + i;
        const isFocused = actualIndex === focusedIndex;
        const color = option.color;
        const dimColor = !isFocused;
        return (
          <Box key={option.value}>
            <CustomText dimColor={isFocused}>
              {isFocused ? "❯ " : "  "}
            </CustomText>
            <CustomText bold={isFocused} color={color} dimColor={dimColor}>
              {option.label}
            </CustomText>
          </Box>
        );
      })}
    </Box>
  );
}
