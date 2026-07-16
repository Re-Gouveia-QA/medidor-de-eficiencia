import React from 'react';

export function Radio({ label, name, checked, onChange, disabled, ...rest }) {
  return (
    <label className="radio-row" style={disabled ? { opacity: .5, cursor: 'not-allowed' } : undefined}>
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} style={{ display: 'none' }} {...rest} />
      <span className="radio-box sketch-edge">{checked && <span className="radio-dot" />}</span>
      {label}
    </label>
  );
}
