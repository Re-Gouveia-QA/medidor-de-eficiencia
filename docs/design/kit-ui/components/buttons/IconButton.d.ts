export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
