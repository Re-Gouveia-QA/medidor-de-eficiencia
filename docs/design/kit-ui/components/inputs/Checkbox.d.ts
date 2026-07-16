export interface CheckboxProps {
  label?: string;
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;
