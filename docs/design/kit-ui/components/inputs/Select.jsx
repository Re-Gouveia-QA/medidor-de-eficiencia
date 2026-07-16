import React from 'react';
import { Icon } from '../icons/Icon.jsx';

export function Select({ label, options = [], error, helperText, id, ...rest }) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={'field' + (error ? ' field-error' : '')}>
      {label && <label className="field-label" htmlFor={selectId}>{label}</label>}
      <div className="sketch-edge" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px' }}>
        <select id={selectId} className="select" {...rest}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Icon name="chevron-down" size={16} color="var(--ink-soft)" />
      </div>
      {error ? <span className="field-error-text">{error}</span> : helperText ? <span className="field-helper">{helperText}</span> : null}
    </div>
  );
}
