export interface RadioProps {
  label?: string;
  name?: string;
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
}
export declare function Radio(props: RadioProps): JSX.Element;
