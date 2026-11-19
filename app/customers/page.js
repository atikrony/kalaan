import { all, get, orderView, byIdDesc } from '@/lib/store';
import { tk, due } from '@/lib/util';
export const dynamic = 'force-dynamic';
export default async function Customers({ searchParams }) {
  const sp = await searchParams;
  const orders = await orderView();
  const map = {};
  for (const o of orders) {
    const k = (o.phone || o.customer).trim().toLowerCase();
    const c = (map[k] ||= { name: o.customer, phone: o.phone, orders: 0, bill: 0, due: 0, last: '' });
    c.orders++; c.bill += +o.bill;
    if (!['cancelled', 'refunded'].includes(o.status)) c.due += Math.max(0, due(o));
    if ((o.order_date || '') > c.last) c.last = o.order_date;
  }
  let list = Object.values(map).sort((a, b) => b.bill - a.bill);
  if (sp.q) list = list.filter((c) => (c.name + c.phone).toLowerCase().includes(sp.q.toLowerCase()));
  return (<>
    <h1>Customers ({list.length})</h1>
    <form className="row card" style={{ marginBottom: 14 }}><input name="q" defaultValue={sp.q} placeholder="Search" style={{ flex: 1 }} /><button>Search</button></form>
    <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Name</th><th>Mobile</th><th>Orders</th><th>Total spent</th><th>Due</th><th>Last order</th></tr></thead>
      <tbody>{list.map((c, i) => <tr key={i}>
        <td><a href={`/orders?q=${encodeURIComponent(c.phone || c.name)}`}><b>{c.name}</b></a></td><td>{c.phone}</td><td>{c.orders}</td>
        <td>{tk(c.bill)}</td><td className={c.due > 0 ? 'due' : 'paid'}>{tk(c.due)}</td><td>{c.last}</td></tr>)}</tbody></table></div>
  </>);
}
