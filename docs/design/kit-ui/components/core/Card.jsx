import React from 'react';

export function Card({ title, children, footer, tilt = 'none', ...rest }) {
  const style = tilt !== 'none' ? { '--tilt': tilt === 'left' ? '-0.7deg' : '0.7deg', transform: 'rotate(var(--tilt))' } : undefined;
  return (
    <div className="card sketch-edge" style={style} {...rest}>
      {title && <h3 className="card-title">{title}</h3>}
      {children}
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}
