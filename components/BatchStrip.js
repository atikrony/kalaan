'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { openModal } from './TopBar';

// Horizontal strip of shipment cards: hidden scrollbar, mouse-wheel + drag scrolling, floating arrows on overflow
export default function BatchStrip({ children }) {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ l: false, r: false });

  useEffect(() => {
    const el = ref.current;
    const upd = () => setEdge({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    upd();
    const ro = new ResizeObserver(upd); ro.observe(el);
    el.addEventListener('scroll', upd, { passive: true });

    // vertical wheel scrolls the strip sideways while it still can move
    const wheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if ((e.deltaY > 0 && el.scrollLeft < max - 1) || (e.deltaY < 0 && el.scrollLeft > 1)) { e.preventDefault(); el.scrollLeft += e.deltaY; }
    };
    el.addEventListener('wheel', wheel, { passive: false });

    // drag with the mouse; a real drag cancels the click on the card underneath
    let down = null, moved = false;
    const pd = (e) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = { x: e.clientX, s: el.scrollLeft }; moved = false; };
    const pm = (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (!moved && Math.abs(dx) > 6) { moved = true; el.classList.add('dragging'); }
      if (moved) el.scrollLeft = down.s - dx;
    };
    const pu = () => { down = null; setTimeout(() => el.classList.remove('dragging'), 0); };
    const clk = (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
    const ds = (e) => e.preventDefault();
    el.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu);
    el.addEventListener('click', clk, true); el.addEventListener('dragstart', ds);
    return () => {
      ro.disconnect(); el.removeEventListener('scroll', upd); el.removeEventListener('wheel', wheel);
      el.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu);
      el.removeEventListener('click', clk, true); el.removeEventListener('dragstart', ds);
    };
  }, []);

  const go = (dir) => { const el = ref.current; el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' }); };
  return (
    <div className="batch-strip">
      {edge.l && <button type="button" className="strip-arrow left" onClick={() => go(-1)} aria-label="Scroll left"><Icon n="arrow" /></button>}
      <div className="batches" ref={ref}>{children}</div>
      {edge.r && <button type="button" className="strip-arrow right" onClick={() => go(1)} aria-label="Scroll right"><Icon n="arrow" /></button>}
    </div>
  );
}

// Single click selects the shipment; double click opens it for editing
export function BatchCard({ href, ship, className, children }) {
  const router = useRouter();
  return (
    <a href={href} className={className} title="Double-click to edit"
      onClick={(e) => { e.preventDefault(); router.push(href, { scroll: false }); }}
      onDoubleClick={(e) => { e.preventDefault(); openModal('shipment', ship); }}>
      {children}
    </a>
  );
}
