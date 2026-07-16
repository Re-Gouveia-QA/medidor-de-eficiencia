import React from 'react';
import { Icon } from '../icons/Icon.jsx';

export function Pagination({ page = 1, totalPages = 1, onChange }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="pagination">
      <button className="page-btn sketch-edge" disabled={page <= 1} onClick={() => onChange?.(page - 1)} aria-label="Anterior">
        <Icon name="chevron-right" size={14} style={{ transform: 'rotate(180deg)' }} />
      </button>
      {pages.map(p => (
        <button key={p} className={'page-btn sketch-edge' + (p === page ? ' is-active' : '')} onClick={() => onChange?.(p)}>{p}</button>
      ))}
      <button className="page-btn sketch-edge" disabled={page >= totalPages} onClick={() => onChange?.(page + 1)} aria-label="Proxima">
        <Icon name="chevron-right" size={14} />
      </button>
    </div>
  );
}
