import React, { useState } from 'react';
import { Icon } from '../icons/Icon.jsx';

export function Input({ label, type = 'text', error, helperText, icon, id, ...rest }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={'field' + (error ? ' field-error' : '')}>
      {label && <label className="field-label" htmlFor={inputId}>{label}</label>}
      <div className="sketch-edge" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px' }}>
        {icon && <Icon name={icon} size={17} color="var(--ink-soft)" />}
        <input id={inputId} type={isPassword ? (show ? 'text' : 'password') : type} className="input" {...rest} />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', display: 'flex' }} aria-label="Mostrar senha">
            <Icon name={show ? 'eye-off' : 'eye'} size={17} />
          </button>
        )}
      </div>
      {error ? <span className="field-error-text">{error}</span> : helperText ? <span className="field-helper">{helperText}</span> : null}
    </div>
  );
}
