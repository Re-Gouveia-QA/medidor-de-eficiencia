import React from 'react';
import { Icon } from '../icons/Icon.jsx';

export function Checkbox({ label, checked, onChange, disabled, ...rest }) {
  return (
    <label className="check-row" style={disabled ? { opacity: .5, cursor: 'not-allowed' } : undefined}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ display: 'none' }} {...rest} />
      <span className="check-box sketch-edge">{checked && <Icon name="check" size={14} />}</span>
      {label}
    </label>
  );
}
