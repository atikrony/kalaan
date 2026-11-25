'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from './Modal';
import Icon from './Icon';
import { saveShipment, deleteShipment } from '@/app/actions';
import { SHIP_STATUS, MODES, TRACK, label } from '@/lib/util';

export default function ShipmentModal({ ship = {}, onClose, isAdmin }) {
  const router = useRouter();
  const edit = !!ship.id;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const v = (k, d = '') => ship[k] ?? d;
  const [track, setTrackSel] = useState(ship.track || '');
  const ti = TRACK.findIndex((x) => x.k === track);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const id = await saveShipment(new FormData(e.currentTarget));
      onClose(); router.push(`/?s=${id}`, { scroll: false }); router.refresh();
    } catch (x) { setErr(x.message || 'Could not save'); setBusy(false); }
  }
  async function remove() {
    if (!confirm(`Delete shipment "${ship.name}"? This cannot be undone.`)) return;
    setBusy(true); setErr('');
    try { await deleteShipment(ship.id); onClose(); router.push('/'); router.refresh(); }
    catch (x) { setErr(x.message || 'Could not delete'); setBusy(false); }
  }

  return (
    <Modal size="sm" title={edit ? 'Shipment settings' : 'New shipment batch'} sub={edit ? ship.name : 'Group pre-orders into one consolidated shipment'}
      onClose={onClose} onSubmit={submit}
      foot={<>
        {edit && isAdmin && <button type="button" className="btn danger" onClick={remove} disabled={busy}><Icon n="trash" size="sm" />Delete</button>}
        {err && <span className="err">{err}</span>}<span className="sp" />
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={busy}><Icon n={edit ? 'edit' : 'truck'} size="sm" />{busy ? 'Saving…' : edit ? 'Save' : 'Create shipment'}</button></>}>
      {edit && <input type="hidden" name="id" value={ship.id} />}
      <div className="form-grid">
        <label className="field full">Shipment name *<input name="name" defaultValue={v('name')} required autoFocus placeholder="e.g. Dec 1st shipment (12th)" /></label>
        <label className="field">Status<select name="status" defaultValue={v('status', 'collecting')}>{SHIP_STATUS.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label>
        <label className="field">Freight mode<select name="mode" defaultValue={v('mode', '')}><option value="">—</option>{MODES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <div className="field full">Parcel tracking<small>Where the parcel is now. Set the date each step happened.</small>
          <select name="track" value={track} onChange={(e) => setTrackSel(e.target.value)}>
            <option value="">Not sent yet (still with staff)</option>
            {TRACK.map((x, j) => <option key={x.k} value={x.k}>{j + 1}. {x.t}</option>)}
          </select>
          {ti >= 0 && <div className="trk-dates">{TRACK.slice(0, ti + 1).map((x) =>
            <label key={x.k}><span>{x.short}</span><input type="date" name={'at_' + x.k} defaultValue={ship.track_at?.[x.k] || new Date().toISOString().slice(0, 10)} /></label>)}</div>}
        </div>
        <label className="field">Carrier<input name="carrier" defaultValue={v('carrier')} placeholder="Cargo agent / airline" /></label>
        <label className="field">AWB / tracking no.<input name="tracking" defaultValue={v('tracking')} /></label>
        <label className="field">ETA<input type="date" name="eta" defaultValue={v('eta')} /></label>
        <label className="field">Rate (৳ per RM)<input type="number" step="0.01" name="rate" defaultValue={v('rate')} placeholder="e.g. 27.5" /></label>
        <label className="field full">Cargo / customs cost (৳)<small>Split equally across the batch's orders as freight share</small><input type="number" name="cargo_cost" defaultValue={v('cargo_cost')} placeholder="0" /></label>
        <label className="field full">Note<textarea name="note" rows={2} defaultValue={v('note')} /></label>
      </div>
    </Modal>
  );
}
