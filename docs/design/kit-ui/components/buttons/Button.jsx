import React from 'react';
import { Icon } from '../icons/Icon.jsx';

export function Button({ variant = 'primary', size = 'md', iconLeft, iconRight, loading, disabled, children, ...rest }) {
  const cls = ['btn', 'sketch-edge', 'sketch-hover', 'btn-' + variant, size !== 'md' ? 'btn-' + size : '', loading ? 'btn-loading' : ''].filter(Boolean).join(' ');
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {iconLeft && !loading && <Icon name={iconLeft} size={size === 'lg' ? 20 : 16} />}
      {loading ? 'Carregando…' : children}
      {iconRight && !loading && <Icon name={iconRight} size={size === 'lg' ? 20 : 16} />}
    </button>
  );
}
