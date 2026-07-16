import React from 'react';
import { IconButton } from '../buttons/IconButton.jsx';

export function Modal({ open, title, children, footer, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box sketch-edge" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="modal-title">{title}</h3>
          <IconButton icon="x" variant="ghost" size="sm" ariaLabel="Fechar" onClick={onClose} />
        </div>
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
