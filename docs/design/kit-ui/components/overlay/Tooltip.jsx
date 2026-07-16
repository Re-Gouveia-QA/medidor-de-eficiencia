import React, { useState } from 'react';

export function Tooltip({ content, children }) {
  const [show, setShow] = useState(false);
  return (
    <span className="tooltip-wrap" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && <span className="tooltip-bubble sketch-edge">{content}</span>}
    </span>
  );
}
