// eslint-disable-next-line
import { Text, TextProps } from "ink";
import { FG_PRIMARY, FG_SECONDARY } from "../../colors";

export function CustomText(props: TextProps): React.ReactElement {
  const color = props.color ?? (props.dimColor ? FG_SECONDARY : FG_PRIMARY);
  const propsNoColor = { ...props };
  delete propsNoColor["color"];
  return <Text color={color} {...propsNoColor} />;
}
