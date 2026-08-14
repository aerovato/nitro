import { Box } from "ink";
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
    <Box width="100%" paddingY={1}>
      <Box
        width="100%"
        borderStyle="single"
        borderTop={false}
        borderRight={false}
        borderBottom={false}
        borderColor="gray"
        paddingLeft={2}
      >
        <CustomTextInput
          value={inputValue}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder={placeholder}
        />
      </Box>
    </Box>
  );
}
