'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import Modal from './Modal';
import { openModal } from './TopBar';
import { sysadDelete, sysadUpdate } from '@/app/actions';
import { tk, rm, code, fmtDate, label } from '@/lib/util';

const TABS = [['shipments', 'Shipments'], ['orders', 'Orders'], ['payments', 'Payments'], ['purchases', 'Purchases']];
const KIND = { shipments: 'shipment', orders: 'order', payments: 'payment', purchases: 'purchase' };

// What each row shows, and what deleting it does
const VIEW = {
  shipments: {
    cols: ['Shipment', 'Status', 'Orders', 'ETA'],
    row: (s) => [<b key="n">{s.name}</b>, label(s.status), s.order_count, s.eta ? fmtDate(s.eta) : '—'],
    name: (s) => `shipment "${s.name}"`,
    warn: (s) => `Its Malaysia purchase entries will be deleted too.${s.order_count ? ` Its ${s.order_count} order(s) will NOT be deleted; they move to "Unassigned orders".` : ''}`,
  },
  orders: {
    cols: ['Order', 'Customer', 'Product', 'Bill'],
    row: (o) => [<b key="c">{code(o.id)}</b>, o.customer || '—', o.product || '—', tk(o.bill)],
    name: (o) => `order ${code(o.id)} (${o.customer || 'no customer'})`,
    warn: () => 'All payments recorded on this order will be deleted too.',
  },
  payments: {
    cols: ['Order', 'Kind', 'Amount', 'Date'],
    row: (p) => [<b key="o">{code(p.order_id)}</b>, label(p.kind || 'payment'), tk(p.amount), p.paid_on ? fmtDate(p.paid_on) : '—'],
    name: (p) => `${p.kind || 'payment'} of ${tk(p.amount)} on ${code(p.order_id)}`,
    warn: () => "The order's paid and due amounts will change.",
  },
  purchases: {
    cols: ['Shipment', 'Item', 'Amount', 'Date'],
    row: (p) => [<b key="s">{p.shipment_name || `#${p.shipment_id}`}</b>, p.item || '—', rm(p.amount_rm), p.bought_on ? fmtDate(p.bought_on) : '—'],
    name: (p) => `purchase "${p.item || 'item'}" (${rm(p.amount_rm)})`,
    warn: () => 'Shipment cost totals will change.',
  },
};

export default function DataAdmin({ data }) {
  const router = useRouter();
  const [tab, setTab] = useState('shipments');
  const [q, setQ] = useState('');
  const [del, setDel] = useState(null);   // row pending delete
  const [edit, setEdit] = useState(null); // payment / purchase being edited
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const v = VIEW[tab];

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = data[tab] || [];
    return s ? list.filter((r) => JSON.stringify(r).toLowerCase().includes(s) || code(r.id).toLowerCase().includes(s)) : list;
  }, [data, tab, q]);

  const onEdit = (r) => {
    if (tab === 'shipments') openModal('shipment', r);
    else if (tab === 'orders') openModal('order', r);
    else { setErr(''); setEdit(r); }
  };
  async function confirmDelete() {
    setBusy(true); setErr('');
    try { await sysadDelete(KIND[tab], del.id); setDel(null); router.refresh(); }
    catch (x) { setErr(x.message || 'Could not delete'); }
    setBusy(false);
  }
  async function saveEdit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await sysadUpdate(KIND[tab], edit.id, Object.fromEntries(new FormData(e.currentTarget))); setEdit(null); router.refresh(); }
    catch (x) { setErr(x.message || 'Could not save'); }
    setBusy(false);
  }

  return (
    <section className="card wide" style={{ marginTop: 20 }}>
      <div className="card-head"><Icon n="layers" className="pri" /><h3>Data management</h3><span className="badge b-red">sysad only</span></div>
      <p className="mute" style={{ margin: 0, padding: '0 16px 10px', fontSize: 13 }}>Fix or remove wrong entries. Every edit and delete is recorded in the activity log.</p>
      <div className="toolbar">
        <div className="tabs">{TABS.map(([k, t]) => <button key={k} type="button" className={`btn sm ${tab === k ? '' : 'ghost'}`} onClick={() => { setTab(k); setQ(''); }}>{t} ({data[k].length})</button>)}</div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ width: 200 }} />
      </div>
      <div className="tbl-wrap" style={{ maxHeight: 480, overflowY: 'auto' }}><table>
        <thead><tr>{v.cols.map((c) => <th key={c}>{c}</th>)}<th className="r">Actions</th></tr></thead>
        <tbody>{rows.slice(0, 300).map((r) => <tr key={r.id}>
          {v.row(r).map((c, i) => <td key={i}>{c}</td>)}
          <td className="r nowrap">
            <button type="button" className="btn ghost sm" onClick={() => onEdit(r)}><Icon n="edit" size="sm" />Edit</button>{' '}
            <button type="button" className="btn danger sm" onClick={() => { setErr(''); setDel(r); }}><Icon n="trash" size="sm" />Delete</button>
          </td>
        </tr>)}</tbody>
      </table>{!rows.length && <div className="empty">Nothing found.</div>}
        {rows.length > 300 && <div className="empty">Showing first 300 — search to narrow down.</div>}</div>

      {del && <Modal size="sm" title="Delete permanently?" onClose={() => !busy && setDel(null)}
        foot={<>{err && <span className="err">{err}</span>}<span className="sp" />
          <button type="button" className="btn ghost" onClick={() => setDel(null)} disabled={busy}>Cancel</button>
          <button type="button" className="btn danger" onClick={confirmDelete} disabled={busy}><Icon n="trash" size="sm" />{busy ? 'Deleting…' : 'Yes, delete it'}</button></>}>
        <div className="err" style={{ marginBottom: 12 }}><b>Warning:</b> this cannot be undone.</div>
        <p style={{ margin: '0 0 8px' }}>You are about to delete the <b>{v.name(del)}</b>.</p>
        <p className="mute" style={{ margin: 0 }}>{v.warn(del)}</p>
      </Modal>}

      {edit && <Modal size="sm" title={`Edit ${KIND[tab]}`} onClose={() => !busy && setEdit(null)} onSubmit={saveEdit}
        foot={<>{err && <span className="err">{err}</span>}<span className="sp" />
          <button type="button" className="btn ghost" onClick={() => setEdit(null)} disabled={busy}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
        <div className="form-grid">
          {tab === 'payments' ? <>
            <label className="field">Amount (৳)<input type="number" name="amount" defaultValue={edit.amount} required /></label>
            <label className="field">Kind<select name="kind" defaultValue={edit.kind || 'payment'}>{['advance', 'payment', 'refund'].map((k) => <option key={k} value={k}>{label(k)}</option>)}</select></label>
            <label className="field">Method<input name="method" defaultValue={edit.method || ''} /></label>
            <label className="field">Date<input type="date" name="paid_on" defaultValue={edit.paid_on || ''} /></label>
            <label className="field full">Note<input name="note" defaultValue={edit.note || ''} /></label>
          </> : <>
            <label className="field full">Item<input name="item" defaultValue={edit.item || ''} /></label>
            <label className="field">Amount (RM)<input type="number" step="0.01" name="amount_rm" defaultValue={edit.amount_rm} required /></label>
            <label className="field">Date<input type="date" name="bought_on" defaultValue={edit.bought_on || ''} /></label>
          </>}
        </div>
      </Modal>}
    </section>
  );
}
