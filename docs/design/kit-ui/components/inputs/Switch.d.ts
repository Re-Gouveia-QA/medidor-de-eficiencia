export interface SwitchProps {
  label?: string;
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
}
export declare function Switch(props: SwitchProps): JSX.Element;
