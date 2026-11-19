import { db } from '@/lib/db';
import { SHIP_STATUS, ORDER_STATUS, tk, rm, due, n } from '@/lib/util';
import { saveShipment, bulkStatus, addPurchase, deletePurchase } from '@/app/actions';
import OrderCard from '@/components/OrderCard';
export const dynamic = 'force-dynamic';
export default async function Shipment({ params }) {
  const { id } = await params;
  const [{ data: s }, { data: all = [] }, { data: buys = [] }] = await Promise.all([
    db().from('shipments').select('*').eq('id', id).single(),
    db().from('order_view').select('*').eq('shipment_id', id).order('id'),
    db().from('purchases').select('*').eq('shipment_id', id).order('bought_on'),
  ]);
  if (!s) return <p>Not found.</p>;
  const orders = all.filter((o) => !['cancelled', 'refunded'].includes(o.status));
  const sum = (arr, fn) => arr.reduce((a, x) => a + n(fn(x)), 0);
  const bills = sum(orders, (o) => o.bill), spentRm = sum(buys, (b) => b.amount_rm) || sum(orders, (o) => o.buy_rm);
  const cost = spentRm * n(s.rate) + n(s.cargo_cost) + sum(orders, (o) => o.cod_charge);
  return (<>
    <div className="row"><h1>{s.name}</h1><span className="badge">{s.status}</span><span className="sp" />
      <a className="btn btn2 noprint" href={`/orders?shipment=${s.id}&view=table`}>Table</a>
      <a className="btn noprint" href={`/orders/new?shipment=${s.id}`}>+ Order</a></div>
    <div className="stats">
      <div className="card stat"><small>Orders</small><b>{orders.length}</b></div>
      <div className="card stat"><small>Total bills</small><b>{tk(bills)}</b></div>
      <div className="card stat"><small>Collected</small><b className="paid">{tk(sum(all, (o) => o.paid))}</b></div>
      <div className="card stat"><small>Customer due</small><b className="due">{tk(sum(orders, (o) => Math.max(0, due(o))))}</b></div>
      <div className="card stat"><small>Spent in Malaysia</small><b>{rm(spentRm)}</b></div>
      <div className="card stat"><small>Est. profit</small><b>{s.rate ? tk(bills - cost) : 'set rate'}</b></div>
    </div>
    <details className="card noprint"><summary><b>Shipment settings</b></summary>
      <form action={saveShipment} className="form" style={{ marginTop: 10 }}>
        <input type="hidden" name="id" value={s.id} />
        <label>Name<input name="name" defaultValue={s.name} /></label>
        <label>Status<select name="status" defaultValue={s.status}>{SHIP_STATUS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Rate (BDT per RM)<input name="rate" type="number" step="0.01" defaultValue={s.rate} /></label>
        <label>Cargo / customs cost (৳)<input name="cargo_cost" type="number" defaultValue={s.cargo_cost} /></label>
        <label className="full">Note<input name="note" defaultValue={s.note || ''} /></label>
        <div><button>Save</button></div>
      </form>
      <form action={bulkStatus} className="row" style={{ marginTop: 12 }}>
        <input type="hidden" name="shipment_id" value={s.id} />Mark all open orders as
        <select name="status">{ORDER_STATUS.map((x) => <option key={x}>{x}</option>)}</select><button className="btn2">Apply</button>
      </form>
    </details>
    <h2>Order images <small className="mute noprint">(Ctrl+P prints an identification sheet)</small></h2>
    <div className="grid">{all.map((o) => <OrderCard key={o.id} o={o} />)}</div>
    <h2>Malaysia purchases</h2>
    <div className="card">
      <table><tbody>{buys.map((b) => <tr key={b.id}><td>{b.bought_on}</td><td>{b.item}</td><td>{rm(b.amount_rm)}</td>
        <td className="noprint"><form action={deletePurchase}><input type="hidden" name="id" value={b.id} /><button className="btn2" style={{ padding: '2px 8px' }}>×</button></form></td></tr>)}
        <tr><td></td><td><b>Total</b></td><td><b>{rm(sum(buys, (b) => b.amount_rm))}</b></td><td></td></tr></tbody></table>
      <form action={addPurchase} className="row noprint" style={{ marginTop: 10 }}>
        <input type="hidden" name="shipment_id" value={s.id} />
        <input name="item" placeholder="e.g. vincci 4 watches" required style={{ flex: 1 }} />
        <input name="amount_rm" type="number" step="0.01" placeholder="RM" required style={{ width: 100 }} />
        <input name="bought_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        <button>Add</button>
      </form>
    </div>
  </>);
}
