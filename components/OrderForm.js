'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveOrder } from '@/app/actions';
import { ORDER_STATUS, METHODS } from '@/lib/util';

async function compress(file, max = 1280) {
  const img = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = img.width * s; c.height = img.height * s;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(new File([b], 'img.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.8));
}

export default function OrderForm({ o = {}, shipments, defShipment }) {
  const router = useRouter();
  const [keep, setKeep] = useState(o.images || []);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function addFiles(e) {
    const list = await Promise.all([...e.target.files].map((x) => compress(x)));
    setFiles((p) => [...p, ...list]); e.target.value = '';
  }
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const fd = new FormData(e.target);
    keep.forEach((u) => fd.append('keep', u));
    files.forEach((x) => fd.append('images', x));
    try { const id = await saveOrder(fd); router.push('/orders/' + id); router.refresh(); }
    catch (x) { setErr(x.message); setBusy(false); }
  }
  const I = (name, label, p = {}) => (
    <label className={p.full ? 'full' : ''}>{label}<input name={name} defaultValue={o[name] ?? p.def ?? ''} {...p} full={undefined} def={undefined} /></label>
  );
  return (
    <form onSubmit={submit} className="card">
      {o.id && <input type="hidden" name="id" value={o.id} />}
      <label className="mute" style={{ fontSize: 12 }}>Product images (used to identify the order)</label>
      <div className="thumbs" style={{ margin: '6px 0 14px' }}>
        {keep.map((u) => <div className="t" key={u}><img src={u} alt="" /><button type="button" className="x" onClick={() => setKeep(keep.filter((k) => k !== u))}>×</button></div>)}
        {files.map((x, i) => <div className="t" key={i}><img src={URL.createObjectURL(x)} alt="" /><button type="button" className="x" onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</button></div>)}
        <label className="btn btn2" style={{ width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          + Add photo<input type="file" accept="image/*" multiple hidden onChange={addFiles} />
        </label>
      </div>
      <div className="form">
        {I('customer', 'Customer name *', { required: true })}
        {I('phone', 'Mobile')}
        {I('source', 'Order from', { def: 'Page', list: 'src' })}
        <datalist id="src"><option>Page</option><option>Personal ID</option><option>WhatsApp</option></datalist>
        <label>Shipment<select name="shipment_id" defaultValue={String(o.shipment_id ?? defShipment ?? '')}>
          <option value="">— none —</option>{shipments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        {I('product', 'Product (brand, model, size, colour) *', { required: true, full: true })}
        {I('qty', 'Qty', { type: 'number', def: 1 })}
        {I('buy_rm', 'Buying price (RM)', { type: 'number', step: '0.01' })}
        {I('bill', 'Total bill (৳)', { type: 'number' })}
        {I('delivery_charge', 'Delivery charge (৳)', { type: 'number' })}
        {I('cod_charge', 'COD charge (৳, our cost)', { type: 'number' })}
        {!o.id && <>{I('advance', 'Advance received (৳)', { type: 'number' })}
          <label>Advance via<select name="method">{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label></>}
        <label>Status<select name="status" defaultValue={o.status || 'pending'}>{ORDER_STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
        {I('order_date', 'Order date', { type: 'date', def: new Date().toISOString().slice(0, 10) })}
        {I('address', 'Delivery address', { full: true })}
        <label className="full">Note<textarea name="note" rows={3} defaultValue={o.note || ''} /></label>
      </div>
      {err && <p className="due">{err}</p>}
      <p><button disabled={busy}>{busy ? 'Saving…' : 'Save order'}</button></p>
    </form>
  );
}
