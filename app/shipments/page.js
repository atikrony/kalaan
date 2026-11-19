import { db } from '@/lib/db';
import { SHIP_STATUS, tk, rm, due } from '@/lib/util';
import { saveShipment } from '@/app/actions';
export const dynamic = 'force-dynamic';
export default async function Shipments() {
  const [{ data: ships = [] }, { data: orders = [] }, { data: buys = [] }] = await Promise.all([
    db().from('shipments').select('*').order('id', { ascending: false }),
    db().from('order_view').select('shipment_id,bill,delivery_charge,paid,status'),
    db().from('purchases').select('shipment_id,amount_rm'),
  ]);
  const sum = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);
  return (<>
    <h1>Shipments</h1>
    <form action={saveShipment} className="row card" style={{ marginBottom: 14 }}>
      <input name="name" placeholder="e.g. Dec 1st shipment (12th)" required style={{ flex: 1 }} />
      <input name="rate" type="number" step="0.01" placeholder="BDT per RM" />
      <select name="status">{SHIP_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
      <button>+ Create shipment</button>
    </form>
    <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Shipment</th><th>Status</th><th>Orders</th><th>Bills</th><th>Collected</th><th>Due</th><th>Spent (RM)</th></tr></thead>
      <tbody>{ships.map((s) => {
        const os = orders.filter((o) => o.shipment_id === s.id && o.status !== 'cancelled');
        return <tr key={s.id}><td><a href={`/shipments/${s.id}`}><b>{s.name}</b></a></td><td><span className="badge">{s.status}</span></td>
          <td>{os.length}</td><td>{tk(sum(os, (o) => +o.bill))}</td><td>{tk(sum(os, (o) => +o.paid))}</td>
          <td className="due">{tk(sum(os, (o) => Math.max(0, due(o))))}</td>
          <td>{rm(sum(buys.filter((b) => b.shipment_id === s.id), (b) => +b.amount_rm))}</td></tr>;
      })}</tbody></table></div>
  </>);
}
