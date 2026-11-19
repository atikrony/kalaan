'use client';
import { useState, useRef } from 'react';
import { updateOrderField, createOrderQuick, quickPayment, addOrderImage } from '@/app/actions';
import { ORDER_STATUS, code, tk } from '@/lib/util';

const dueOf = (o) => (+o.bill || 0) + (+o.delivery_charge || 0) - (+o.paid || 0);

async function compress(file, max = 1280) {
  const img = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = img.width * s; c.height = img.height * s;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(new File([b], 'img.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.8));
}

// Column definitions (shared by desktop grid + mobile accordion)
const COLS = [
  { k: 'customer', label: 'Customer', w: '1.3fr' },
  { k: 'phone', label: 'Mobile', w: '1fr' },
  { k: 'product', label: 'Product', w: '2fr' },
  { k: 'shipment_id', label: 'Shipment', w: '1.1fr', type: 'ship' },
  { k: 'buy_rm', label: 'Buy (RM)', w: '.7fr', num: true },
  { k: 'bill', label: 'Bill ৳', w: '.8fr', num: true },
  { k: 'delivery_charge', label: 'Deliv. ৳', w: '.65fr', num: true },
  { k: 'paid', label: 'Paid ৳', w: '.9fr', type: 'paid' },
  { k: 'due', label: 'Due ৳', w: '.75fr', type: 'due' },
  { k: 'status', label: 'Status', w: '1fr', type: 'status' },
  { k: 'note', label: 'Note', w: '1.5fr' },
];
const TEMPLATE = '64px 70px ' + COLS.map((c) => c.w).join(' ');

function Cell({ c, o, ships, onSave, onPay }) {
  const [pay, setPay] = useState('');
  if (c.type === 'due') { const d = dueOf(o); return <span className={d > 0 ? 'due' : 'paid'}>{tk(d)}</span>; }
  if (c.type === 'paid') return (
    <div className="paycell"><span>{tk(o.paid)}</span>
      <input inputMode="numeric" placeholder="+ pay" value={pay} onChange={(e) => setPay(e.target.value.replace(/[^\d.]/g, ''))}
        onKeyDown={(e) => { if (e.key === 'Enter' && pay) { onPay(pay); setPay(''); } }}
        onBlur={() => { if (pay) { onPay(pay); setPay(''); } }} title="Type amount, press Enter to record a payment" />
    </div>);
  const common = { defaultValue: o[c.k] ?? '', onBlur: (e) => String(e.target.value) !== String(o[c.k] ?? '') && onSave({ [c.k]: e.target.value }) };
  if (c.type === 'ship') return (
    <select {...common} onBlur={undefined} onChange={(e) => onSave({ shipment_id: e.target.value })} defaultValue={String(o.shipment_id ?? '')}>
      <option value="">—</option>{ships.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>);
  if (c.type === 'status') return (
    <select {...common} onBlur={undefined} className={`st b-${o.status}`} onChange={(e) => onSave({ status: e.target.value })}>
      {ORDER_STATUS.map((s) => <option key={s}>{s}</option>)}</select>);
  return <input {...common} inputMode={c.num ? 'decimal' : undefined} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} />;
}

function Row({ o, ships, setRow }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(''); // '', 'saving', 'saved', 'error'
  const fileRef = useRef();
  const run = async (fn) => {
    setState('saving');
    try { await fn(); setState('saved'); setTimeout(() => setState(''), 1200); }
    catch (e) { setState('error'); alert(e.message); }
  };
  const onSave = (patch) => run(async () => { const r = await updateOrderField(o.id, patch); setRow({ ...o, ...r, paid: o.paid }); });
  const onPay = (amt) => run(async () => { await quickPayment(o.id, amt, +o.paid ? 'payment' : 'advance'); setRow({ ...o, paid: +o.paid + +amt }); });
  const onImg = (e) => run(async () => {
    const fd = new FormData(); fd.append('id', o.id);
    for (const f of e.target.files) fd.append('images', await compress(f));
    e.target.value = '';
    setRow({ ...o, images: await addOrderImage(fd) });
  });
  const d = dueOf(o);
  return (
    <div className={`srow ${open ? 'open' : ''} ${state}`}>
      {/* mobile summary (accordion header) */}
      <button type="button" className="ssum" onClick={() => setOpen(!open)}>
        <span className="sthumb" style={o.images?.[0] ? { backgroundImage: `url(${o.images[0]})` } : {}} />
        <span className="sinfo"><b>{code(o.id)} · {o.customer}</b><small>{o.product}</small></span>
        <span className="sright"><span className={`badge b-${o.status}`}>{o.status}</span><span className={d > 0 ? 'due' : 'paid'}>{d > 0 ? tk(d) : 'Paid'}</span></span>
        <span className="chev">▾</span>
      </button>
      <div className="scells" style={{ '--tpl': TEMPLATE }}>
        <div className="cell img" data-label="Photo">
          <span className="sthumb big" style={o.images?.[0] ? { backgroundImage: `url(${o.images[0]})` } : {}} onClick={() => fileRef.current.click()} title="Add photo">{!o.images?.[0] && '+📷'}</span>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onImg} />
        </div>
        <div className="cell" data-label="ID"><a href={`/orders/${o.id}`} className="idlink">{code(o.id)}</a></div>
        {COLS.map((c) => <div key={c.k} className={`cell ${c.num ? 'num' : ''}`} data-label={c.label}><Cell key={String(o[c.k] ?? '')} c={c} o={o} ships={ships} onSave={onSave} onPay={onPay} /></div>)}
      </div>
    </div>
  );
}

function AddRow({ ships, defShip, onAdd }) {
  const blank = { shipment_id: defShip ?? '', status: '' };
  const [v, setV] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const submit = async (e) => {
    e?.preventDefault();
    if (!v.customer || !v.product) return alert('Customer and product are required');
    setBusy(true);
    try { onAdd(await createOrderQuick(v)); setV({ ...blank, shipment_id: v.shipment_id }); }
    catch (x) { alert(x.message); }
    setBusy(false);
  };
  const enter = (e) => e.key === 'Enter' && submit(e);
  return (
    <form className={`srow addrow ${open ? 'open' : ''}`} onSubmit={submit}>
      <button type="button" className="ssum" onClick={() => setOpen(!open)}><span className="sinfo"><b>＋ Add new order</b><small>Fill the row and press Enter</small></span><span className="chev">▾</span></button>
      <div className="scells" style={{ '--tpl': TEMPLATE }}>
        <div className="cell img" data-label=""><button disabled={busy} title="Add">{busy ? '…' : '＋'}</button></div>
        <div className="cell" data-label="ID"><span className="mute">new</span></div>
        <div className="cell" data-label="Customer *"><input value={v.customer || ''} onChange={set('customer')} onKeyDown={enter} placeholder="Customer *" /></div>
        <div className="cell" data-label="Mobile"><input value={v.phone || ''} onChange={set('phone')} onKeyDown={enter} placeholder="01…" inputMode="tel" /></div>
        <div className="cell" data-label="Product *"><input value={v.product || ''} onChange={set('product')} onKeyDown={enter} placeholder="Product *" /></div>
        <div className="cell" data-label="Shipment"><select value={String(v.shipment_id ?? '')} onChange={set('shipment_id')}><option value="">—</option>{ships.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="cell num" data-label="Buy (RM)"><input value={v.buy_rm || ''} onChange={set('buy_rm')} onKeyDown={enter} inputMode="decimal" placeholder="RM" /></div>
        <div className="cell num" data-label="Bill ৳"><input value={v.bill || ''} onChange={set('bill')} onKeyDown={enter} inputMode="decimal" placeholder="৳" /></div>
        <div className="cell num" data-label="Deliv. ৳"><input value={v.delivery_charge || ''} onChange={set('delivery_charge')} onKeyDown={enter} inputMode="decimal" placeholder="৳" /></div>
        <div className="cell num" data-label="Advance ৳"><input value={v.advance || ''} onChange={set('advance')} onKeyDown={enter} inputMode="decimal" placeholder="advance" /></div>
        <div className="cell" data-label="Due ৳"><span className="mute">{tk((+v.bill || 0) + (+v.delivery_charge || 0) - (+v.advance || 0))}</span></div>
        <div className="cell" data-label="Status"><select value={v.status} onChange={set('status')}><option value="">auto</option>{ORDER_STATUS.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="cell" data-label="Note"><input value={v.note || ''} onChange={set('note')} onKeyDown={enter} placeholder="Note" /></div>
        <div className="cell mobile-only full"><button disabled={busy} style={{ width: '100%' }}>{busy ? 'Saving…' : 'Add order'}</button></div>
      </div>
    </form>
  );
}

export default function Sheet({ orders: initial, ships, defShip }) {
  const [rows, setRows] = useState(initial);
  const [limit, setLimit] = useState(100);
  const setRow = (r) => setRows((rs) => rs.map((x) => (x.id === r.id ? r : x)));
  return (
    <div className="sheet">
      <div className="shead" style={{ '--tpl': TEMPLATE }}>
        <div>Photo</div><div>ID</div>{COLS.map((c) => <div key={c.k} className={c.num ? 'num' : ''}>{c.label}</div>)}
      </div>
      <AddRow ships={ships} defShip={defShip} onAdd={(o) => setRows((rs) => [o, ...rs])} />
      {rows.slice(0, limit).map((o) => <Row key={o.id} o={o} ships={ships} setRow={setRow} />)}
      {rows.length > limit && <button type="button" className="btn2" style={{ margin: 12 }} onClick={() => setLimit(limit + 100)}>Show more ({rows.length - limit} left)</button>}
    </div>
  );
}
