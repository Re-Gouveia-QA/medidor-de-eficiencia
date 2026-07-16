export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Icon name shown at the left of the field. */
  icon?: string;
}
export declare function Input(props: InputProps): JSX.Element;
