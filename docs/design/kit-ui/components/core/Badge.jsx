import React from 'react';

export function Badge({ children, color = 'blue', ...rest }) {
  return <span className={'badge sketch-edge badge-' + color} {...rest}>{children}</span>;
}
