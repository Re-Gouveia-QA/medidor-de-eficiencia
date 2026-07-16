export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: 'blue' | 'red' | 'green' | 'yellow' | 'neutral';
}
export declare function Badge(props: BadgeProps): JSX.Element;
