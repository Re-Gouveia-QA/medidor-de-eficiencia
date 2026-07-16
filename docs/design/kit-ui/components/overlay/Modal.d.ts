export interface ModalProps {
  open: boolean;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
}
export declare function Modal(props: ModalProps): JSX.Element | null;
