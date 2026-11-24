import { orderView, get } from '@/lib/store';
import { getUser } from '@/lib/session';
import { code, due, live } from '@/lib/util';
export const dynamic = 'force-dynamic';

const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export async function GET(req) {
  if (!(await getUser())) return new Response('Unauthorized', { status: 401 });
  const sp = new URL(req.url).searchParams;
  let rows = await orderView();
  const s = sp.get('s');
  let name = 'all-orders';
  if (s === 'none') { rows = rows.filter((o) => !o.shipment_id); name = 'unassigned'; }
  else if (s) { rows = rows.filter((o) => o.shipment_id === +s); name = ((await get('shipments', s))?.name || 'shipment-' + s); }
  const q = (sp.get('q') || '').trim().toLowerCase();
  if (q) {
    const idm = q.match(/^kl-?0*(\d+)$/);
    rows = idm ? rows.filter((o) => o.id === +idm[1]) : rows.filter((o) => [o.customer, o.phone, o.product, o.address, o.note].join(' ').toLowerCase().includes(q));
  }
  if (sp.get('st')) rows = rows.filter((o) => o.status === sp.get('st'));
  if (sp.get('due') === '1') rows = rows.filter((o) => live(o) && due(o) > 0);
  rows.sort((a, b) => a.id - b.id);

  const head = ['Order ID', 'Date', 'Order from', 'Customer', 'Phone', 'Address', 'Product', 'Qty', 'Buying (RM)', 'Bill (BDT)', 'Delivery (BDT)', 'COD (BDT)', 'Paid (BDT)', 'Remaining (BDT)', 'Status', 'Shipment', 'Note'];
  const lines = rows.map((o) => [code(o.id), o.order_date, o.source, o.customer, o.phone, o.address, o.product, o.qty, o.buy_rm, o.bill, o.delivery_charge, o.cod_charge, o.paid, due(o), o.status, o.shipment_name, o.note].map(esc).join(','));
  const csv = '﻿' + [head.join(','), ...lines].join('\r\n');
  const file = name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'manifest';
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${file}.csv"` } });
}
