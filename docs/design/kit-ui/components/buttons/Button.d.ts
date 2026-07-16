export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  iconLeft?: string;
  iconRight?: string;
  loading?: boolean;
}
export declare function Button(props: ButtonProps): JSX.Element;
