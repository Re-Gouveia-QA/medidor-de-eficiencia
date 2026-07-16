export interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children?: React.ReactNode;
  onClose?: () => void;
}
export declare function Alert(props: AlertProps): JSX.Element;
