export interface IconProps {
  /** Icon glyph name, e.g. 'check', 'trash', 'mail'. See Icon.prompt.md for the full list. */
  name: string;
  size?: number;
  color?: string;
  /** Apply the hand-drawn wobble filter to the stroke. Default true. */
  rough?: boolean;
}
export declare function Icon(props: IconProps): JSX.Element;
