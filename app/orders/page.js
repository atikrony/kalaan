import { db } from '@/lib/db';
import { ORDER_STATUS, due, tk, code } from '@/lib/util';
import OrderCard from '@/components/OrderCard';
export const dynamic = 'force-dynamic';
export default async function Orders({ searchParams }) {
  const sp = await searchParams;
  let q = db().from('order_view').select('*').order('id', { ascending: false });
  if (sp.shipment) q = q.eq('shipment_id', sp.shipment);
  if (sp.status) q = q.eq('status', sp.status);
  if (sp.q) {
    const s = sp.q.replace(/[,()%]/g, ' ').trim(), idm = s.match(/^(kl-?)?0*(\d+)$/i);
    q = idm && idm[1] ? q.eq('id', idm[2]) : q.or(`customer.ilike.%${s}%,phone.ilike.%${s}%,product.ilike.%${s}%`);
  }
  const [{ data: orders = [] }, { data: ships = [] }] = await Promise.all([q, db().from('shipments').select('id,name').order('id', { ascending: false })]);
  const list = sp.due ? orders.filter((o) => due(o) > 0) : orders;
  const view = sp.view || 'grid';
  const link = (v) => '?' + new URLSearchParams({ ...sp, view: v });
  return (<>
    <div className="row"><h1>Orders ({list.length})</h1><span className="sp" />
      <a className="btn btn2" href={link(view === 'grid' ? 'table' : 'grid')}>{view === 'grid' ? 'Table view' : 'Image view'}</a>
      <a className="btn" href="/orders/new">+ New order</a></div>
    <form className="row card noprint" style={{ marginBottom: 14 }}>
      <input name="q" defaultValue={sp.q} placeholder="Search name, phone, product, KL-0012" style={{ flex: 1, minWidth: 200 }} />
      <select name="shipment" defaultValue={sp.shipment}><option value="">All shipments</option>{ships.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <select name="status" defaultValue={sp.status}><option value="">All status</option>{ORDER_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
      <label className="row"><input type="checkbox" name="due" value="1" defaultChecked={!!sp.due} /> Has due</label>
      <input type="hidden" name="view" value={view} /><button>Filter</button>
    </form>
    {view === 'grid' ? <div className="grid">{list.map((o) => <OrderCard key={o.id} o={o} />)}</div> :
      <div style={{ overflowX: 'auto' }}><table><thead><tr><th></th><th>ID</th><th>Customer</th><th>Product</th><th>Shipment</th><th>RM</th><th>Bill</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead>
        <tbody>{list.map((o) => <tr key={o.id}>
          <td>{o.images?.[0] && <img src={o.images[0]} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} />}</td>
          <td><a href={`/orders/${o.id}`}><b>{code(o.id)}</b></a></td><td>{o.customer}<div className="mute">{o.phone}</div></td>
          <td>{o.product}</td><td>{o.shipment_name}</td><td>{o.buy_rm}</td><td>{tk(o.bill)}</td><td>{tk(o.paid)}</td>
          <td className={due(o) > 0 ? 'due' : 'paid'}>{tk(due(o))}</td><td><span className={`badge b-${o.status}`}>{o.status}</span></td></tr>)}</tbody></table></div>}
  </>);
}
