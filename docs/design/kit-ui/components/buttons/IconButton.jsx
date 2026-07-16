import React from 'react';
import { Icon } from '../icons/Icon.jsx';

export function IconButton({ icon, variant = 'secondary', size = 'md', ariaLabel, disabled, ...rest }) {
  const cls = ['icon-btn', 'sketch-edge', 'sketch-hover', 'btn-' + variant, size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''].filter(Boolean).join(' ');
  return (
    <button className={cls} aria-label={ariaLabel || icon} disabled={disabled} {...rest}>
      <Icon name={icon} size={size === 'lg' ? 22 : size === 'sm' ? 15 : 18} />
    </button>
  );
}
