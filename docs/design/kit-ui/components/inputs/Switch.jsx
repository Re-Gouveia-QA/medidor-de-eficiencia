import React from 'react';

export function Switch({ label, checked, onChange, disabled, ...rest }) {
  return (
    <label className="switch-row" style={disabled ? { opacity: .5, cursor: 'not-allowed' } : undefined}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ display: 'none' }} {...rest} />
      <span className={'switch-track sketch-edge' + (checked ? ' is-on' : '')} style={{ '--radius': 'var(--radius-pill)' }}>
        <span className="switch-thumb" />
      </span>
      {label}
    </label>
  );
}
