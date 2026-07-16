import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const ICONS = { success: 'check', error: 'alert-triangle', warning: 'alert-triangle', info: 'info' };

export function Alert({ variant = 'info', title, children, onClose }) {
  return (
    <div className={'alert sketch-edge alert-' + variant}>
      <Icon name={ICONS[variant]} size={20} />
      <div>
        {title && <p className="alert-title">{title}</p>}
        {children}
      </div>
      {onClose && <button className="alert-close" onClick={onClose} aria-label="Fechar"><Icon name="x" size={16} rough={false} /></button>}
    </div>
  );
}
