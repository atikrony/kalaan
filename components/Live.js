'use client';
// Small interactive islands used inside server-rendered pages.
import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { openModal } from './TopBar';
import { compress } from './OrderModal';
import { updateOrderField, deleteOrder, deletePayment, addOrderImages, removeOrderImage, bulkStatus, deletePurchase } from '@/app/actions';
import { ORDER_STATUS, label } from '@/lib/util';

export function OpenModal({ kind, data, className = 'btn', children, title }) {
  return <button type="button" className={className} title={title} onClick={(e) => { e.stopPropagation(); openModal(kind, data); }}>{children}</button>;
}

export function RowLink({ href, on, children }) {
  const router = useRouter();
  return <tr className={on ? 'on' : ''} onClick={() => router.push(href, { scroll: false })}>{children}</tr>;
}

export function ClosePanel({ href }) {
  const router = useRouter();
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && !document.querySelector('.modal-bg') && router.push(href, { scroll: false });
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [href, router]);
  return <>
    <a href={href} className="btn ghost icon" aria-label="Close" onClick={(e) => { e.preventDefault(); router.push(href, { scroll: false }); }}><Icon n="x" /></a>
  </>;
}
export function PanelBackdrop({ href }) {
  const router = useRouter();
  return <div className="backdrop-panel" onClick={() => router.push(href, { scroll: false })} />;
}

function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const run = (fn) => start(async () => { setErr(''); try { await fn(); router.refresh(); } catch (e) { setErr(e.message || 'Failed'); } });
  return { pending, err, run };
}

export function FieldSelect({ id, field, value, options, className = 'inline-select' }) {
  const { pending, err, run } = useSave();
  return <>
    <select className={className} defaultValue={value ?? ''} disabled={pending} key={String(value)}
      onChange={(e) => run(() => updateOrderField(id, { [field]: e.target.value }))}>
      {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>{err && <div className="bad" style={{ fontSize: 12 }}>{err}</div>}
  </>;
}
export const StatusSelect = ({ id, value }) => <FieldSelect id={id} field="status" value={value} options={ORDER_STATUS.map((s) => [s, label(s)])} />;

export function NoteBox({ id, value }) {
  const { pending, err, run } = useSave();
  const [v, setV] = useState(value || '');
  const [saved, setSaved] = useState(false);
  useEffect(() => { setV(value || ''); }, [value]);
  return <>
    <textarea value={v} onChange={(e) => { setV(e.target.value); setSaved(false); }} placeholder="Add an internal note…"
      onBlur={() => v !== (value || '') && run(async () => { await updateOrderField(id, { note: v }); setSaved(true); })} />
    <div className="note-save">{pending ? 'Saving…' : err ? <span className="bad">{err}</span> : saved ? '✓ Saved' : 'Saves automatically'}</div>
  </>;
}

export function ImageTools({ id, images }) {
  const { pending, err, run } = useSave();
  async function add(e) {
    const list = await Promise.all([...e.target.files].map((x) => compress(x)));
    e.target.value = '';
    const fd = new FormData(); fd.append('id', id); list.forEach((f) => fd.append('images', f));
    run(() => addOrderImages(fd));
  }
  return <div className="gallery">
    {images.map((u) => <div className="g" key={u}><a href={u} target="_blank" style={{ backgroundImage: `url(${u})` }} />
      <button type="button" title="Remove photo" onClick={() => confirm('Remove this photo?') && run(() => removeOrderImage(id, u))}>×</button></div>)}
    <label className="btn ghost sm" style={{ height: 56, minWidth: 56 }}>{pending ? '…' : <><Icon n="image" size="sm" />Add</>}
      <input type="file" accept="image/*" multiple hidden onChange={add} /></label>
    {err && <span className="bad">{err}</span>}
  </div>;
}

export function DeleteOrder({ id, back }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <button className="btn danger sm" disabled={busy} onClick={async () => {
    if (!confirm('Delete this order and all its payments? This cannot be undone.')) return;
    setBusy(true); await deleteOrder(id); router.push(back, { scroll: false }); router.refresh();
  }}><Icon n="trash" size="sm" />Delete order</button>;
}

export function DelBtn({ kind, id }) {
  const { pending, run } = useSave();
  const fn = kind === 'payment' ? deletePayment : deletePurchase;
  return <button className="btn ghost xs" disabled={pending} title="Delete" onClick={() => confirm(`Delete this ${kind}?`) && run(() => fn(id))}>×</button>;
}

export function BulkStatus({ sid }) {
  const { pending, err, run } = useSave();
  const [msg, setMsg] = useState('');
  return <div className="row" style={{ gap: 8 }}>
    <span className="mute">Mark all open orders as</span>
    <select className="inline-select" defaultValue="" disabled={pending} onChange={(e) => {
      const s = e.target.value; e.target.value = '';
      if (s && confirm(`Set every open order in this shipment to "${label(s)}"?`)) run(async () => setMsg(`${await bulkStatus(sid, s)} orders updated`));
    }}><option value="" disabled>Choose…</option>{ORDER_STATUS.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
    {msg && <span className="ok">{msg}</span>}{err && <span className="bad">{err}</span>}
  </div>;
}

export function SubmitBtn({ children, className = 'btn sm' }) {
  return <button className={className}>{children}</button>;
}
