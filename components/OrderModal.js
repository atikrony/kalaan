'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from './Modal';
import Icon from './Icon';
import { saveOrder } from '@/app/actions';
import { act } from '@/lib/act';
import { ORDER_STATUS, METHODS, SOURCES, label, tk, today } from '@/lib/util';

export async function compress(file, max = 1280) {
  const img = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = img.width * s; c.height = img.height * s;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(new File([b], 'img.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.8));
}

export default function OrderModal({ order = {}, ships, onClose }) {
  const router = useRouter();
  const edit = !!order.id;
  const [keep, setKeep] = useState(order.images || []);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [money, setMoney] = useState({ bill: order.bill ?? '', delivery_charge: order.delivery_charge ?? '', advance: '' });
  const m = (k) => (e) => setMoney({ ...money, [k]: e.target.value });
  const total = (+money.bill || 0) + (+money.delivery_charge || 0);
  const remaining = total - (edit ? +order.paid || 0 : +money.advance || 0);

  async function addFiles(e) {
    const list = await Promise.all([...e.target.files].map((x) => compress(x)));
    setFiles((p) => [...p, ...list]); e.target.value = '';
  }
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const fd = new FormData(e.currentTarget);
    keep.forEach((u) => fd.append('keep', u));
    files.forEach((x) => fd.append('images', x));
    try {
      const r = await act(saveOrder(fd));
      onClose();
      router.push(`/?s=${r.shipment_id ?? 'none'}&o=${r.id}`, { scroll: false });
      router.refresh();
    } catch (x) { setErr(x.message || 'Could not save'); setBusy(false); }
  }
  const v = (k, d = '') => order[k] ?? d;

  return (
    <Modal title={edit ? `Edit order` : 'New pre-order'} sub={edit ? `${order.customer} · ${order.product}` : 'Log a customer pre-order and its advance payment'}
      onClose={onClose} onSubmit={submit}
      foot={<>{err && <span className="err sp">{err}</span>}
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={busy}><Icon n={edit ? 'edit' : 'plus'} size="sm" />{busy ? 'Saving…' : edit ? 'Save changes' : 'Create order'}</button></>}>
      {edit && <input type="hidden" name="id" value={order.id} />}

      <div className="modal-sec">
        <div className="eyebrow">Product photos <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>— used to identify the order</span></div>
        <div className="photos">
          {keep.map((u) => <div className="ph" key={u} style={{ backgroundImage: `url(${u})` }}><button type="button" onClick={() => setKeep(keep.filter((k) => k !== u))}>×</button></div>)}
          {files.map((x, i) => <div className="ph" key={i} style={{ backgroundImage: `url(${URL.createObjectURL(x)})` }}><button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</button></div>)}
          <label className="add"><Icon n="image" />Add photo<input type="file" accept="image/*" multiple hidden onChange={addFiles} /></label>
        </div>
      </div>

      <div className="modal-sec">
        <div className="eyebrow">Customer</div>
        <div className="form-grid">
          <label className="field">Customer name *<input name="customer" defaultValue={v('customer')} required autoFocus={!edit} /></label>
          <label className="field">Mobile<input name="phone" defaultValue={v('phone')} inputMode="tel" placeholder="01XXXXXXXXX" /></label>
          <label className="field">Order from<select name="source" defaultValue={v('source', 'Page')}>
            {[...new Set([...SOURCES, v('source', 'Page')])].map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="field">Order date<input type="date" name="order_date" defaultValue={v('order_date', today())} /></label>
          <label className="field full">Delivery address<input name="address" defaultValue={v('address')} /></label>
        </div>
      </div>

      <div className="modal-sec">
        <div className="eyebrow">Product & procurement</div>
        <div className="form-grid">
          <label className="field full">Product *<small>Brand, model, size, colour</small><input name="product" defaultValue={v('product')} required /></label>
          <label className="field">Shipment batch<select name="shipment_id" defaultValue={String(v('shipment_id', ''))}>
            <option value="">— Unassigned —</option>{ships.map((s) => <option key={s.id} value={s.id}>{s.name}{s.status === 'closed' ? ' (closed)' : ''}</option>)}</select></label>
          <label className="field">Quantity<input type="number" min="1" name="qty" defaultValue={v('qty', 1)} /></label>
          <label className="field">Buying price (RM)<input type="number" step="0.01" name="buy_rm" defaultValue={v('buy_rm')} placeholder="0.00" /></label>
          <label className="field">Status<select name="status" defaultValue={v('status', '')}>
            {!edit && <option value="">Auto (confirmed if advance paid)</option>}
            {ORDER_STATUS.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label>
        </div>
      </div>

      <div className="modal-sec">
        <div className="eyebrow">Billing (৳)</div>
        <div className="form-grid">
          <label className="field">Total bill<input type="number" name="bill" value={money.bill} onChange={m('bill')} placeholder="0" /></label>
          <label className="field">Delivery charge<small>Charged to customer</small><input type="number" name="delivery_charge" value={money.delivery_charge} onChange={m('delivery_charge')} placeholder="0" /></label>
          <label className="field">COD charge<small>Our courier cost</small><input type="number" name="cod_charge" defaultValue={v('cod_charge')} placeholder="0" /></label>
          {!edit && <>
            <label className="field">Advance received<input type="number" name="advance" value={money.advance} onChange={m('advance')} placeholder="0" /></label>
            <label className="field">Advance via<select name="method">{METHODS.map((x) => <option key={x}>{x}</option>)}</select></label>
          </>}
        </div>
        <div className="calc">
          <div><small>Customer pays</small><b>{tk(total)}</b></div>
          <div><small>{edit ? 'Paid so far' : 'Advance'}</small><b className="ok">{tk(edit ? order.paid : money.advance)}</b></div>
          <div><small>Remaining</small><b className={remaining > 0 ? 'warn' : 'ok'}>{tk(remaining)}</b></div>
        </div>
      </div>

      <label className="field">Internal note<textarea name="note" rows={3} defaultValue={v('note')} placeholder="Size, colour, special requests…" /></label>
    </Modal>
  );
}
