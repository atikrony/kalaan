import { orderView } from '@/lib/store';
import { tk, due, code, fmtDate, live, n, waNumber } from '@/lib/util';
import Icon from '@/components/Icon';
export const dynamic = 'force-dynamic';

export default async function Customers({ searchParams }) {
  const sp = await searchParams;
  const orders = await orderView();
  const map = new Map();
  for (const o of orders) {
    const key = (o.phone || '').replace(/\D/g, '') || 'name:' + (o.customer || '').trim().toLowerCase();
    if (!map.has(key)) map.set(key, { name: o.customer, phone: o.phone, address: o.address, orders: [], bills: 0, paid: 0, due: 0, last: '' });
    const c = map.get(key);
    c.orders.push(o); c.paid += n(o.paid);
    if (live(o)) { c.bills += n(o.bill) + n(o.delivery_charge); c.due += Math.max(0, due(o)); }
    if ((o.order_date || '') > c.last) { c.last = o.order_date || ''; c.name = o.customer || c.name; c.address = o.address || c.address; }
  }
  let list = [...map.values()];
  const q = (sp.q || '').trim().toLowerCase();
  if (q) list = list.filter((c) => [c.name, c.phone, c.address].join(' ').toLowerCase().includes(q));
  if (sp.due === '1') list = list.filter((c) => c.due > 0);
  const sort = sp.sort || 'last';
  list.sort((a, b) => sort === 'due' ? b.due - a.due : sort === 'bills' ? b.bills - a.bills : sort === 'orders' ? b.orders.length - a.orders.length : b.last.localeCompare(a.last));
  const shown = list.slice(0, +sp.n || 200);

  return (<>
    <div className="page-head"><div><h1>Customers</h1><p>{map.size} customers · grouped by mobile number</p></div></div>
    <section className="card">
      <form className="toolbar">
        <Icon n="search" size="sm" className="mute" />
        <input name="q" defaultValue={sp.q} placeholder="Name, phone or address" style={{ flex: '1 1 220px' }} />
        <select name="sort" defaultValue={sort}><option value="last">Latest order</option><option value="due">Highest due</option><option value="bills">Top spenders</option><option value="orders">Most orders</option></select>
        <label className="row" style={{ gap: 6 }}><input type="checkbox" name="due" value="1" defaultChecked={sp.due === '1'} />Has due</label>
        <button className="btn ghost sm">Apply</button>
      </form>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Customer</th><th>Contact</th><th className="r">Orders</th><th className="r">Billed</th><th className="r">Paid</th><th className="r">Due</th><th>Last order</th><th>Recent</th></tr></thead>
        <tbody>{shown.map((c) => {
          const wa = waNumber(c.phone);
          return <tr key={(c.phone || '') + c.name}>
            <td><a className="strong" href={`/?q=${encodeURIComponent(c.phone || c.name)}`}>{c.name}</a><div className="mute ell" style={{ fontSize: 12, maxWidth: 280 }}>{c.address}</div></td>
            <td className="nowrap"><div className="row" style={{ gap: 6 }}>{c.phone || <span className="mute">—</span>}
              {wa && <a className="btn okb xs" href={`https://wa.me/${wa}`} target="_blank" title="WhatsApp"><Icon n="chat" size="sm" /></a>}</div></td>
            <td className="r money">{c.orders.length}</td><td className="r money">{tk(c.bills)}</td><td className="r money ok">{tk(c.paid)}</td>
            <td className={`r money strong ${c.due > 0 ? 'warn' : 'mute'}`}>{tk(c.due)}</td>
            <td className="nowrap mute">{fmtDate(c.last)}</td>
            <td><div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>{c.orders.slice(0, 4).map((o) => <a key={o.id} href={`/?o=${o.id}`} className="badge b-blue" title={o.product}>{code(o.id)}</a>)}</div></td>
          </tr>;
        })}</tbody>
      </table>{!list.length && <div className="empty">No customers match.</div>}</div>
      {list.length > shown.length && <div className="more"><a className="btn ghost sm" href={`?${new URLSearchParams({ ...sp, n: String((+sp.n || 200) + 200) })}`}>Show more</a></div>}
    </section>
  </>);
}
