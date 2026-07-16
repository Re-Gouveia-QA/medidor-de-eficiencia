export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  footer?: React.ReactNode;
  /** Slight hand-placed rotation. Default 'none'. */
  tilt?: 'left' | 'right' | 'none';
}
export declare function Card(props: CardProps): JSX.Element;
