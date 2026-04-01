import { Box } from "ink";
import { BG_SECONDARY } from "../colors";
import { CustomTextInput } from "./custom";

export interface InputBoxProps {
  inputValue: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export function ChatBox({
  inputValue,
  placeholder,
  onChange,
  onSubmit,
}: InputBoxProps): React.ReactElement {
  return (
    <Box backgroundColor={BG_SECONDARY} paddingY={1} paddingX={3}>
      <CustomTextInput
        value={inputValue}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder}
      />
    </Box>
  );
}
