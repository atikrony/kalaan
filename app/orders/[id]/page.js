import { all, get, orderView, byIdDesc } from '@/lib/store';
import { ORDER_STATUS, PAY_KINDS, METHODS, code, due, tk, rm } from '@/lib/util';
import { setStatus, addPayment, deletePayment, deleteOrder } from '@/app/actions';
import OrderForm from '@/components/OrderForm';
export const dynamic = 'force-dynamic';
export default async function Order({ params, searchParams }) {
  const { id } = await params; const sp = await searchParams;
  const [orders, allPays, ships] = await Promise.all([orderView(), all('payments'), all('shipments')]);
  const o = orders.find((x) => x.id === +id);
  const pays = allPays.filter((p) => p.order_id === +id).sort((a, b) => (a.paid_on > b.paid_on ? 1 : -1));
  ships.sort(byIdDesc);
  if (!o) return <p>Order not found.</p>;
  if (sp.edit) return (<><h1>Edit {code(o.id)}</h1><OrderForm o={o} shipments={ships} /></>);
  const d = due(o);
  return (<>
    <div className="row"><h1>{code(o.id)} · {o.customer}</h1><span className="sp" />
      <a className="btn btn2" href={`/logs?id=${o.id}`}>History</a><a className="btn btn2" href="?edit=1">Edit</a>
      <form action={deleteOrder} className="inline"><input type="hidden" name="id" value={o.id} /><button className="danger">Delete</button></form></div>
    <div className="two">
      <div>
        {o.images?.[0] ? <img className="big" src={o.images[0]} alt="" /> : <div className="card mute">No image – edit to add one</div>}
        <div className="thumbs" style={{ marginTop: 8 }}>{o.images?.slice(1).map((u) => <a key={u} href={u} target="_blank"><img src={u} alt="" /></a>)}</div>
      </div>
      <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
        <div className="card">
          <div className="row"><span className={`badge b-${o.status}`}>{o.status}</span><span className="mute">{o.shipment_name || 'No shipment'}</span></div>
          <p style={{ fontSize: 16 }}><b>{o.product}</b> × {o.qty}</p>
          <div className="mute">{o.phone} · {o.source} · {o.order_date}</div>
          {o.address && <div>{o.address}</div>}
          {o.note && <p style={{ background: '#fff8e1', padding: 8, borderRadius: 6 }}>{o.note}</p>}
          <form action={setStatus} className="status-row"><input type="hidden" name="id" value={o.id} />
            {ORDER_STATUS.map((s) => <button key={s} name="status" value={s} className={s === o.status ? '' : 'btn2'}>{s}</button>)}</form>
        </div>
        <div className="card stats" style={{ margin: 0 }}>
          <div className="stat"><small>Buying</small><b>{rm(o.buy_rm)}</b></div>
          <div className="stat"><small>Bill + delivery</small><b>{tk(+o.bill + +o.delivery_charge)}</b></div>
          <div className="stat"><small>Paid</small><b className="paid">{tk(o.paid)}</b></div>
          <div className="stat"><small>Remaining</small><b className={d > 0 ? 'due' : 'paid'}>{tk(d)}</b></div>
        </div>
        <div className="card">
          <b>Payments</b>
          <table><tbody>{pays.map((p) => <tr key={p.id}><td>{p.paid_on}</td><td>{p.kind}</td><td>{p.method}</td>
            <td className={p.kind === 'refund' ? 'due' : ''}>{tk(p.amount)}</td><td className="mute">{p.note}</td>
            <td><form action={deletePayment}><input type="hidden" name="id" value={p.id} /><button className="btn2" style={{ padding: '2px 8px' }}>×</button></form></td></tr>)}</tbody></table>
          <form action={addPayment} className="row" style={{ marginTop: 10 }}>
            <input type="hidden" name="order_id" value={o.id} />
            <input name="amount" type="number" placeholder="Amount ৳" defaultValue={d > 0 ? d : ''} required style={{ width: 110 }} />
            <select name="kind" defaultValue={pays.length ? 'payment' : 'advance'}>{PAY_KINDS.map((k) => <option key={k}>{k}</option>)}</select>
            <select name="method">{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
            <input name="paid_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            <input name="note" placeholder="Note / TrxID" style={{ width: 120 }} />
            <button>Add</button>
          </form>
        </div>
      </div>
    </div>
  </>);
}
