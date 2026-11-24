'use client';
import { useEffect } from 'react';
import Icon from './Icon';

export default function Modal({ title, sub, onClose, children, foot, size = '', onSubmit }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);
  const Wrap = onSubmit ? 'form' : 'div';
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Wrap className={`modal ${size}`} onSubmit={onSubmit} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="sp"><h2>{title}</h2>{sub && <div className="mute" style={{ marginTop: 2 }}>{sub}</div>}</div>
          <button type="button" className="btn ghost icon" onClick={onClose} aria-label="Close"><Icon n="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {foot && <div className="modal-foot">{foot}</div>}
      </Wrap>
    </div>
  );
}
